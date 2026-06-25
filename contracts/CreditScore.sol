// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CreditScore
 * @notice On-chain reputation scoring based on OPN Chain wallet history.
 * Score range: 0–1000
 *
 * Scoring breakdown:
 *   Baseline:                  +200
 *   Active wallet (tx >= 10):  +25
 *   Loan repayment:            +20 per repayment
 *   Supply:                    +10 per supply  (reversed on withdrawal)
 *   Collateral deposit:        +10 per deposit (reversed on withdrawal)
 *   Borrow:                    +10 per borrow
 *   Yield claim:               +0   (no score effect)
 *   Long-term wallet (>=180d): +25
 *   Liquidations:              -200 each (clamped to 0)
 *
 * Tiers:
 *   Prime     1000      ×1.5 borrow multiplier  -2% APR discount
 *   Neutral   320–999   ×1.0                     base APR
 *   Subprime  250–319   ×0.75                    +3% APR surcharge
 *   High Risk 0–249     ×0.5                     +8% APR surcharge
 */
contract CreditScore is Ownable {
    struct WalletData {
        uint256 txCount;
        uint256 firstSeenTimestamp;
        uint256 totalRepayments;
        uint256 totalSupplies;
        uint256 totalDeposits;
        uint256 totalBorrows;
        uint256 liquidations;
        uint256 lastUpdated;
        bool initialized;
    }

    mapping(address => WalletData) public walletData;

    address public loanManager;
    address public liquidator;
    address public lendingPool;

    uint256 public constant BASELINE = 200;
    uint256 public constant ACTIVE_WALLET_BONUS = 25;
    uint256 public constant ACTIVE_WALLET_TX_THRESHOLD = 10;
    uint256 public constant REPAYMENT_BONUS = 20;
    uint256 public constant SUPPLY_BONUS = 10;
    uint256 public constant DEPOSIT_BONUS = 10;
    uint256 public constant BORROW_BONUS = 10;
    uint256 public constant LONGTERM_BONUS = 25;
    uint256 public constant LONGTERM_THRESHOLD = 180 days;
    uint256 public constant LIQUIDATION_PENALTY = 200;
    uint256 public constant MAX_SCORE = 1000;

    event WalletInitialized(address indexed wallet, uint256 timestamp);
    event ScoreUpdated(address indexed wallet, uint256 newScore);
    event TxCountUpdated(address indexed wallet, uint256 txCount);

    modifier onlyAuthorized() {
        require(
            msg.sender == loanManager ||
                msg.sender == liquidator ||
                msg.sender == lendingPool ||
                msg.sender == owner(),
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

    function setLendingPool(address _lendingPool) external onlyOwner {
        lendingPool = _lendingPool;
    }

    //  Initialization

    function initWallet(address wallet) external onlyAuthorized {
        if (!walletData[wallet].initialized) {
            _init(wallet);
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

    function recordSupply(address wallet) external onlyAuthorized {
        _ensureInit(wallet);
        walletData[wallet].totalSupplies += 1;
        walletData[wallet].lastUpdated = block.timestamp;
        emit ScoreUpdated(wallet, getScore(wallet));
    }

    function recordDeposit(address wallet) external onlyAuthorized {
        _ensureInit(wallet);
        walletData[wallet].totalDeposits += 1;
        walletData[wallet].lastUpdated = block.timestamp;
        emit ScoreUpdated(wallet, getScore(wallet));
    }

    /// @notice Reverse one supply bonus when a lender withdraws. Floored at 0 so a
    /// wallet can never go negative (e.g. withdrawing more times than it supplied).
    function recordSupplyWithdrawal(address wallet) external onlyAuthorized {
        _ensureInit(wallet);
        if (walletData[wallet].totalSupplies > 0) {
            walletData[wallet].totalSupplies -= 1;
        }
        walletData[wallet].lastUpdated = block.timestamp;
        emit ScoreUpdated(wallet, getScore(wallet));
    }

    /// @notice Reverse one collateral-deposit bonus when a borrower withdraws
    /// collateral. Floored at 0 for the same reason as supply withdrawals.
    function recordCollateralWithdrawal(address wallet) external onlyAuthorized {
        _ensureInit(wallet);
        if (walletData[wallet].totalDeposits > 0) {
            walletData[wallet].totalDeposits -= 1;
        }
        walletData[wallet].lastUpdated = block.timestamp;
        emit ScoreUpdated(wallet, getScore(wallet));
    }

    function recordBorrow(address wallet) external onlyAuthorized {
        _ensureInit(wallet);
        walletData[wallet].totalBorrows += 1;
        walletData[wallet].lastUpdated = block.timestamp;
        emit ScoreUpdated(wallet, getScore(wallet));
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

        // Per-action activity bonuses (uncapped)
        score += d.totalRepayments * REPAYMENT_BONUS;
        score += d.totalSupplies * SUPPLY_BONUS;
        score += d.totalDeposits * DEPOSIT_BONUS;
        score += d.totalBorrows * BORROW_BONUS;

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
        if (score >= 1000) return 3; // Prime
        if (score >= 320) return 2;  // Neutral
        if (score >= 250) return 1;  // Subprime
        return 0;                    // High Risk
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
        uint256 supplyBonus,
        uint256 depositBonus,
        uint256 borrowBonus,
        uint256 longtermBonus,
        uint256 liquidationPenalty,
        uint256 total
    ) {
        WalletData memory d = walletData[wallet];
        baseline = BASELINE;
        activeWalletBonus = d.txCount >= ACTIVE_WALLET_TX_THRESHOLD ? ACTIVE_WALLET_BONUS : 0;
        repaymentBonus = d.totalRepayments * REPAYMENT_BONUS;
        supplyBonus = d.totalSupplies * SUPPLY_BONUS;
        depositBonus = d.totalDeposits * DEPOSIT_BONUS;
        borrowBonus = d.totalBorrows * BORROW_BONUS;
        longtermBonus = (d.initialized && block.timestamp >= d.firstSeenTimestamp + LONGTERM_THRESHOLD) ? LONGTERM_BONUS : 0;
        liquidationPenalty = d.liquidations * LIQUIDATION_PENALTY;
        total = getScore(wallet);
    }

    function getWalletData(address wallet) external view returns (WalletData memory) {
        return walletData[wallet];
    }

    function _ensureInit(address wallet) internal {
        if (!walletData[wallet].initialized) {
            _init(wallet);
        }
    }

    function _init(address wallet) internal {
        walletData[wallet] = WalletData({
            txCount: 0,
            firstSeenTimestamp: block.timestamp,
            totalRepayments: 0,
            totalSupplies: 0,
            totalDeposits: 0,
            totalBorrows: 0,
            liquidations: 0,
            lastUpdated: block.timestamp,
            initialized: true
        });
    }
}
