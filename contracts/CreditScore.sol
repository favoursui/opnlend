// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CreditScore
 * @notice On-chain reputation scoring based on OPN Chain wallet history.
 * Score range: 0–1000
 *
 * Scoring breakdown:
 *   Baseline:                  +400
 *   Active wallet (tx >= 10):  +100
 *   Loan repayment history:    +50 per repayment (max +300)
 *   Long-term wallet (>=180d): +200
 *   Liquidations:              -400 each (clamped to 0)
 *
 * Tiers:
 *   Prime     800–1000  ×1.5 borrow multiplier  -2% APR discount
 *   Neutral   500–799   ×1.0                     base APR
 *   Subprime  300–499   ×0.75                    +3% APR surcharge
 *   High Risk 0–299     ×0.5                     +8% APR surcharge
 */
contract CreditScore is Ownable {
    struct WalletData {
        uint256 txCount;
        uint256 firstSeenTimestamp;
        uint256 totalRepayments;
        uint256 liquidations;
        uint256 lastUpdated;
        bool initialized;
    }

    mapping(address => WalletData) public walletData;

    address public loanManager;
    address public liquidator;

    uint256 public constant BASELINE = 400;
    uint256 public constant ACTIVE_WALLET_BONUS = 100;
    uint256 public constant ACTIVE_WALLET_TX_THRESHOLD = 10;
    uint256 public constant REPAYMENT_BONUS = 50;
    uint256 public constant MAX_REPAYMENT_BONUS = 300;
    uint256 public constant LONGTERM_BONUS = 200;
    uint256 public constant LONGTERM_THRESHOLD = 180 days;
    uint256 public constant LIQUIDATION_PENALTY = 400;
    uint256 public constant MAX_SCORE = 1000;

    event WalletInitialized(address indexed wallet, uint256 timestamp);
    event ScoreUpdated(address indexed wallet, uint256 newScore);
    event TxCountUpdated(address indexed wallet, uint256 txCount);

    modifier onlyAuthorized() {
        require(
            msg.sender == loanManager || msg.sender == liquidator || msg.sender == owner(),
            "CreditScore: unauthorized"
        );
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setLoanManager(address _loanManager) external onlyOwner {
        loanManager = _loanManager;
    }

    function setLiquidator(address _liquidator) external onlyOwner {
        liquidator = _liquidator;
    }

    //  Initialization 

    function initWallet(address wallet) external onlyAuthorized {
        if (!walletData[wallet].initialized) {
            walletData[wallet] = WalletData({
                txCount: 0,
                firstSeenTimestamp: block.timestamp,
                totalRepayments: 0,
                liquidations: 0,
                lastUpdated: block.timestamp,
                initialized: true
            });
            emit WalletInitialized(wallet, block.timestamp);
        }
    }

    //  Score Updates 

    function recordRepayment(address wallet) external onlyAuthorized {
        _ensureInit(wallet);
        walletData[wallet].totalRepayments += 1;
        walletData[wallet].lastUpdated = block.timestamp;
        emit ScoreUpdated(wallet, getScore(wallet));
    }

    function recordBorrow(address wallet) external onlyAuthorized {
        _ensureInit(wallet);
        walletData[wallet].lastUpdated = block.timestamp;
    }

    // @dev txCount is sourced from the wallet's real OPN-chain transaction count
    // (its nonce), seeded by the keeper via seedTxCount — not incremented per
    // protocol action, which would double-count and ignore non-protocol activity.

    function recordLiquidation(address wallet) external onlyAuthorized {
        _ensureInit(wallet);
        walletData[wallet].liquidations += 1;
        walletData[wallet].lastUpdated = block.timestamp;
        emit ScoreUpdated(wallet, getScore(wallet));
    }

    /// @notice Owner can manually seed tx count (e.g. from RPC snapshot)
    function seedTxCount(address wallet, uint256 txCount, uint256 firstSeenTimestamp) external onlyOwner {
        _ensureInit(wallet);
        walletData[wallet].txCount = txCount;
        if (firstSeenTimestamp > 0 && firstSeenTimestamp < walletData[wallet].firstSeenTimestamp) {
            walletData[wallet].firstSeenTimestamp = firstSeenTimestamp;
        }
        emit TxCountUpdated(wallet, txCount);
    }

    //  Score Computation 

    function getScore(address wallet) public view returns (uint256) {
        WalletData memory d = walletData[wallet];

        uint256 score = BASELINE;

        // Active wallet bonus
        if (d.txCount >= ACTIVE_WALLET_TX_THRESHOLD) {
            score += ACTIVE_WALLET_BONUS;
        }

        // Repayment bonus (capped)
        uint256 repBonus = d.totalRepayments * REPAYMENT_BONUS;
        score += repBonus > MAX_REPAYMENT_BONUS ? MAX_REPAYMENT_BONUS : repBonus;

        // Long-term wallet bonus
        if (d.initialized && block.timestamp >= d.firstSeenTimestamp + LONGTERM_THRESHOLD) {
            score += LONGTERM_BONUS;
        }

        // Liquidation penalty
        uint256 penalty = d.liquidations * LIQUIDATION_PENALTY;
        if (penalty >= score) return 0;
        score -= penalty;

        return score > MAX_SCORE ? MAX_SCORE : score;
    }

    function getTier(address wallet) public view returns (uint8) {
        uint256 score = getScore(wallet);
        if (score >= 800) return 3; // Prime
        if (score >= 500) return 2; // Neutral
        if (score >= 300) return 1; // Subprime
        return 0;                   // High Risk
    }

    /// @notice Borrow multiplier in bps (e.g. 15000 = 1.5x)
    function getBorrowMultiplierBps(address wallet) public view returns (uint256) {
        uint8 tier = getTier(wallet);
        if (tier == 3) return 15000; // 1.5x
        if (tier == 2) return 10000; // 1.0x
        if (tier == 1) return 7500;  // 0.75x
        return 5000;                  // 0.5x
    }

    /// @notice APR surcharge in bps (added to base rate)
    function getAprSurchargeBps(address wallet) public view returns (int256) {
        uint8 tier = getTier(wallet);
        if (tier == 3) return -200;  // -2% discount
        if (tier == 2) return 0;     // base
        if (tier == 1) return 300;   // +3%
        return 800;                   // +8%
    }

    function getScoreBreakdown(address wallet) external view returns (
        uint256 baseline,
        uint256 activeWalletBonus,
        uint256 repaymentBonus,
        uint256 longtermBonus,
        uint256 liquidationPenalty,
        uint256 total
    ) {
        WalletData memory d = walletData[wallet];
        baseline = BASELINE;
        activeWalletBonus = d.txCount >= ACTIVE_WALLET_TX_THRESHOLD ? ACTIVE_WALLET_BONUS : 0;
        uint256 rb = d.totalRepayments * REPAYMENT_BONUS;
        repaymentBonus = rb > MAX_REPAYMENT_BONUS ? MAX_REPAYMENT_BONUS : rb;
        longtermBonus = (d.initialized && block.timestamp >= d.firstSeenTimestamp + LONGTERM_THRESHOLD) ? LONGTERM_BONUS : 0;
        liquidationPenalty = d.liquidations * LIQUIDATION_PENALTY;
        total = getScore(wallet);
    }

    function getWalletData(address wallet) external view returns (WalletData memory) {
        return walletData[wallet];
    }

    function _ensureInit(address wallet) internal {
        if (!walletData[wallet].initialized) {
            walletData[wallet] = WalletData({
                txCount: 0,
                firstSeenTimestamp: block.timestamp,
                totalRepayments: 0,
                liquidations: 0,
                lastUpdated: block.timestamp,
                initialized: true
            });
        }
    }
}
