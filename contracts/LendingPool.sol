// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PriceOracle.sol";
import "./CreditScore.sol";

/**
 * @title LendingPool
 * @notice Lenders supply OPN to earn yield. Borrowers deposit OPN as collateral
 * and borrow against it with reputation-weighted limits.
 *
 * Interest model (index-based, Compound-style):
 *   - Debt accrues continuously at the pool borrow rate (base + utilisation).
 *   - Accrued interest is credited to suppliers, so the value of a supply share
 *     grows over time. Yield is only ever *paid out* from cash actually held,
 *     so the pool stays solvent (withdrawals/claims are gated by liquidity).
 *
 * Risk model:
 *   - Borrowers' lendable liquidity is segregated from collateral. Supplier
 *     withdrawals and new borrows can NEVER draw on borrowers' collateral.
 *   - Effective borrow LTV (CF × reputation multiplier) is capped strictly
 *     below the liquidation threshold, so a fresh borrow can never be
 *     immediately liquidatable.
 *
 * Base borrow APR = 4.38% + utilisation risk
 * Liquidation threshold = 83%   Liquidation bonus = 8%
 */
contract LendingPool is Ownable, ReentrancyGuard {
    PriceOracle public oracle;
    CreditScore public creditScore;

    //  Lender (supply) side 
    struct SupplyInfo {
        uint256 shares;      // pool shares owned
        uint256 principal;   // net principal deposited (for yield-earned accounting)
        uint256 lastUpdated;
    }
    mapping(address => SupplyInfo) public suppliers;
    uint256 public totalSupplied;  // total assets owned by suppliers (principal + accrued interest)
    uint256 public totalShares;

    //  Borrower side 
    struct Position {
        uint256 collateral;  // OPN deposited as collateral
        uint256 scaledDebt;  // debt normalised to borrowIndex; actual debt = scaledDebt × borrowIndex / 1e18
        uint256 lastUpdated;
    }
    mapping(address => Position) public positions;
    uint256 public totalCollateral;
    uint256 public totalScaledDebt;

    //  Interest accrual 
    uint256 public borrowIndex = 1e18;
    uint256 public lastAccrualTime;

    //  Rates 
    uint256 public constant BASE_BORROW_APR_BPS = 438;        // 4.38%
    uint256 public constant LIQUIDATION_THRESHOLD_BPS = 8300; // 83%
    uint256 public constant LIQUIDATION_BONUS_BPS = 800;      // 8%
    uint256 public constant BPS = 10_000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant COLLATERAL_FACTOR_BPS = 7500;     // 75% base CF
    // Hard cap on effective LTV. Must stay below LIQUIDATION_THRESHOLD_BPS so a
    // borrower at their max limit always has health factor > 1.
    uint256 public constant MAX_BORROW_LTV_BPS = 8000;        // 80%

    address public loanManager;
    address public liquidator;

    event Supplied(address indexed user, uint256 amount, uint256 shares);
    event SupplyWithdrawn(address indexed user, uint256 amount);
    event YieldClaimed(address indexed user, uint256 amount);
    event CollateralDeposited(address indexed user, uint256 amount);
    event CollateralWithdrawn(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount);
    event Repaid(address indexed user, uint256 amount);
    event Liquidated(address indexed borrower, address indexed liquidator, uint256 debtRepaid, uint256 collateralSeized);

    modifier onlyAuthorized() {
        require(msg.sender == loanManager || msg.sender == liquidator || msg.sender == owner(), "LendingPool: unauthorized");
        _;
    }

    constructor(address _oracle, address _creditScore) Ownable(msg.sender) {
        oracle = PriceOracle(_oracle);
        creditScore = CreditScore(_creditScore);
        lastAccrualTime = block.timestamp;
    }

    function setLoanManager(address _loanManager) external onlyOwner { loanManager = _loanManager; }
    function setLiquidator(address _liquidator) external onlyOwner { liquidator = _liquidator; }

    //  Interest accrual 

    /// @notice Fold accrued interest into borrowIndex and credit suppliers. Idempotent within a block.
    function accrueInterest() public {
        uint256 dt = block.timestamp - lastAccrualTime;
        if (dt == 0) return;
        uint256 borrowed = _storedTotalBorrowed();
        if (borrowed > 0) {
            uint256 interest = (borrowed * poolBorrowAprBps() * dt) / (BPS * SECONDS_PER_YEAR);
            if (interest > 0) {
                borrowIndex += (interest * 1e18) / borrowed;
                totalSupplied += interest; // suppliers' claim grows; realised as cash on repayment
            }
        }
        lastAccrualTime = block.timestamp;
    }

    //  Supply (lend) 

    function supply() external payable nonReentrant {
        require(msg.value > 0, "LendingPool: zero");
        accrueInterest();
        uint256 sharesToMint = totalShares == 0 ? msg.value : (msg.value * totalShares) / totalSupplied;
        SupplyInfo storage s = suppliers[msg.sender];
        s.shares += sharesToMint;
        s.principal += msg.value;
        s.lastUpdated = block.timestamp;
        totalShares += sharesToMint;
        totalSupplied += msg.value;
        emit Supplied(msg.sender, msg.value, sharesToMint);
    }

    function withdrawSupply(uint256 shareAmount) external nonReentrant {
        accrueInterest();
        SupplyInfo storage s = suppliers[msg.sender];
        require(shareAmount > 0 && s.shares >= shareAmount, "LendingPool: insufficient shares");
        uint256 amount = (shareAmount * totalSupplied) / totalShares;
        require(availableLiquidity() >= amount, "LendingPool: insufficient liquidity");

        // Reduce tracked principal proportionally to the shares being burned.
        uint256 principalPortion = (s.principal * shareAmount) / s.shares;
        s.principal -= principalPortion;
        s.shares -= shareAmount;
        s.lastUpdated = block.timestamp;
        totalShares -= shareAmount;
        totalSupplied -= amount;

        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "LendingPool: transfer failed");
        emit SupplyWithdrawn(msg.sender, amount);
    }

    /// @notice Withdraw only the yield earned so far, keeping principal supplied.
    function claimYield() external nonReentrant {
        accrueInterest();
        SupplyInfo storage s = suppliers[msg.sender];
        require(s.shares > 0, "LendingPool: nothing supplied");
        
        // Use live supplied (including pending interest) to match UI calculation
        uint256 pendingBorrowed = (totalScaledDebt * _currentBorrowIndex()) / 1e18;
        uint256 stored = _storedTotalBorrowed();
        uint256 liveSupplied = totalSupplied + (pendingBorrowed > stored ? pendingBorrowed - stored : 0);
        uint256 value = (s.shares * liveSupplied) / totalShares;
        require(value > s.principal, "LendingPool: no yield");
        uint256 earned = value - s.principal;
        require(availableLiquidity() >= earned, "LendingPool: insufficient liquidity");

        uint256 sharesToBurn = (earned * totalShares) / liveSupplied;
        s.shares -= sharesToBurn;
        s.lastUpdated = block.timestamp;
        totalShares -= sharesToBurn;
        totalSupplied -= earned;

        (bool ok,) = msg.sender.call{value: earned}("");
        require(ok, "LendingPool: transfer failed");
        emit YieldClaimed(msg.sender, earned);
    }

    //  Collateral 

    function depositCollateral() external payable nonReentrant {
        require(msg.value > 0, "LendingPool: zero");
        positions[msg.sender].collateral += msg.value;
        positions[msg.sender].lastUpdated = block.timestamp;
        totalCollateral += msg.value;
        emit CollateralDeposited(msg.sender, msg.value);
    }

    function withdrawCollateral(uint256 amount) external nonReentrant {
        accrueInterest();
        Position storage pos = positions[msg.sender];
        require(pos.collateral >= amount, "LendingPool: insufficient collateral");
        uint256 newCollateral = pos.collateral - amount;
        uint256 debt = _currentDebt(msg.sender);
        if (debt > 0) {
            uint256 threshold = (newCollateral * LIQUIDATION_THRESHOLD_BPS) / BPS;
            uint256 prospectiveHf = (threshold * 1e18) / debt;
            require(prospectiveHf >= 1e18, "LendingPool: would breach health factor");
        }
        pos.collateral = newCollateral;
        pos.lastUpdated = block.timestamp;
        totalCollateral -= amount;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "LendingPool: transfer failed");
        emit CollateralWithdrawn(msg.sender, amount);
    }

    //  Borrow / Repay 

    function borrow(address borrower, uint256 amount) external onlyAuthorized nonReentrant {
        accrueInterest();
        Position storage pos = positions[borrower];
        uint256 newDebt = _currentDebt(borrower) + amount;
        require(newDebt <= borrowLimit(borrower), "LendingPool: exceeds borrow limit");
        require(availableLiquidity() >= amount, "LendingPool: insufficient liquidity");
        _setDebt(pos, newDebt);
        pos.lastUpdated = block.timestamp;
        (bool ok,) = borrower.call{value: amount}("");
        require(ok, "LendingPool: disbursal failed");
        emit Borrowed(borrower, amount);
    }

    function repay(address borrower) external payable onlyAuthorized nonReentrant {
        accrueInterest();
        Position storage pos = positions[borrower];
        uint256 debt = _currentDebt(borrower);
        require(debt > 0, "LendingPool: no debt");
        uint256 repayAmount = msg.value > debt ? debt : msg.value;
        _setDebt(pos, debt - repayAmount);
        pos.lastUpdated = block.timestamp;
        // Repaid cash (principal + interest) now backs suppliers' grown claim.
        if (msg.value > repayAmount) {
            (bool ok,) = borrower.call{value: msg.value - repayAmount}("");
            require(ok, "LendingPool: refund failed");
        }
        emit Repaid(borrower, repayAmount);
    }

    //  Liquidation 

    function liquidate(address borrower, address liquidatorAddr) external payable onlyAuthorized nonReentrant returns (uint256 collateralSeized) {
        accrueInterest();
        Position storage pos = positions[borrower];
        uint256 debt = _currentDebt(borrower);
        require(debt > 0, "LendingPool: no debt");
        require(healthFactor(borrower) < 1e18, "LendingPool: position healthy");
        require(msg.value >= debt, "LendingPool: insufficient repayment");

        collateralSeized = (debt * (BPS + LIQUIDATION_BONUS_BPS)) / BPS;
        if (collateralSeized > pos.collateral) collateralSeized = pos.collateral;

        _setDebt(pos, 0);
        totalCollateral -= collateralSeized;
        pos.collateral -= collateralSeized;

        // Refund any excess sent beyond the debt
        if (msg.value > debt) {
            (bool refundOk,) = liquidatorAddr.call{value: msg.value - debt}("");
            require(refundOk, "LendingPool: refund failed");
        }

        (bool ok,) = liquidatorAddr.call{value: collateralSeized}("");
        require(ok, "LendingPool: liquidation transfer failed");

        emit Liquidated(borrower, liquidatorAddr, debt, collateralSeized);
    }

    //  Internal debt helpers 

    function _currentDebt(address user) internal view returns (uint256) {
        return (positions[user].scaledDebt * _currentBorrowIndex()) / 1e18;
    }

    /// @dev Set a position's debt to `newDebt` at the current (already-accrued) borrowIndex.
    function _setDebt(Position storage pos, uint256 newDebt) internal {
        totalScaledDebt -= pos.scaledDebt;
        uint256 scaled = (newDebt * 1e18) / borrowIndex;
        pos.scaledDebt = scaled;
        totalScaledDebt += scaled;
    }

    function _storedTotalBorrowed() internal view returns (uint256) {
        return (totalScaledDebt * borrowIndex) / 1e18;
    }

    /// @dev borrowIndex including not-yet-folded interest, for accurate view reads.
    function _currentBorrowIndex() internal view returns (uint256) {
        uint256 dt = block.timestamp - lastAccrualTime;
        uint256 borrowed = _storedTotalBorrowed();
        if (dt == 0 || borrowed == 0) return borrowIndex;
        uint256 interest = (borrowed * poolBorrowAprBps() * dt) / (BPS * SECONDS_PER_YEAR);
        return borrowIndex + (interest * 1e18) / borrowed;
    }

    //  Views 

    function borrowLimit(address user) public view returns (uint256) {
        Position memory pos = positions[user];
        uint256 repMul = creditScore.getBorrowMultiplierBps(user); // bps, e.g. 15000 = 1.5x
        uint256 effectiveLtvBps = (COLLATERAL_FACTOR_BPS * repMul) / BPS;
        if (effectiveLtvBps > MAX_BORROW_LTV_BPS) effectiveLtvBps = MAX_BORROW_LTV_BPS;
        return (pos.collateral * effectiveLtvBps) / BPS;
    }

    function healthFactor(address user) public view returns (uint256) {
        uint256 debt = _currentDebt(user);
        if (debt == 0) return type(uint256).max;
        uint256 threshold = (positions[user].collateral * LIQUIDATION_THRESHOLD_BPS) / BPS;
        return (threshold * 1e18) / debt;
    }

    function poolBorrowAprBps() public view returns (uint256) {
        return BASE_BORROW_APR_BPS + utilisationBps() / 10; // base + small utilisation risk component
    }

    function borrowAprBps(address user) public view returns (uint256) {
        int256 surcharge = creditScore.getAprSurchargeBps(user);
        int256 total = int256(poolBorrowAprBps()) + surcharge;
        return total < 0 ? 0 : uint256(total);
    }

    function supplyAprBps() public view returns (uint256) {
        return (poolBorrowAprBps() * utilisationBps()) / BPS;
    }

    function utilisationBps() public view returns (uint256) {
        if (totalSupplied == 0) return 0;
        return (_storedTotalBorrowed() * BPS) / totalSupplied;
    }

    /// @notice Total outstanding debt including pending interest.
    function totalBorrowed() public view returns (uint256) {
        return (totalScaledDebt * _currentBorrowIndex()) / 1e18;
    }

    /// @notice Cash available for new borrows and supply withdrawals. Excludes
    /// borrowers' collateral and is bounded by the contract's free balance.
    function availableLiquidity() public view returns (uint256) {
        uint256 borrowed = _storedTotalBorrowed();
        uint256 accounting = totalSupplied > borrowed ? totalSupplied - borrowed : 0;
        uint256 bal = address(this).balance;
        uint256 free = bal > totalCollateral ? bal - totalCollateral : 0;
        return accounting < free ? accounting : free;
    }

    function getPosition(address user) external view returns (
        uint256 collateral,
        uint256 debt,
        uint256 limit,
        uint256 hf,
        uint256 aprBps
    ) {
        return (
            positions[user].collateral,
            _currentDebt(user),
            borrowLimit(user),
            healthFactor(user),
            borrowAprBps(user)
        );
    }

    function getSupplyInfo(address user) external view returns (
        uint256 supplied,
        uint256 shares,
        uint256 yieldEarned,
        uint256 aprBps
    ) {
        SupplyInfo memory s = suppliers[user];
        return (
            s.principal,
            s.shares,
            _supplyYield(user),
            supplyAprBps()
        );
    }

    /// @notice Claimable yield = current share value minus principal still supplied.
    function _supplyYield(address user) internal view returns (uint256) {
        SupplyInfo memory s = suppliers[user];
        if (s.shares == 0 || totalShares == 0) return 0;
        // Reflect pending (not-yet-folded) interest so the UI updates continuously.
        uint256 pendingBorrowed = (totalScaledDebt * _currentBorrowIndex()) / 1e18;
        uint256 stored = _storedTotalBorrowed();
        uint256 liveSupplied = totalSupplied + (pendingBorrowed > stored ? pendingBorrowed - stored : 0);
        uint256 value = (s.shares * liveSupplied) / totalShares;
        return value > s.principal ? value - s.principal : 0;
    }

    receive() external payable {}
}
