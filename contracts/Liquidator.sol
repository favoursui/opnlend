// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LendingPool.sol";
import "./CreditScore.sol";

/**
 * @title Liquidator
 * @notice Anyone can liquidate an unhealthy position and earn the liquidation bonus.
 */
contract Liquidator is Ownable, ReentrancyGuard {
    LendingPool public lendingPool;
    CreditScore public creditScore;

    event LiquidationExecuted(
        address indexed borrower,
        address indexed liquidatorAddr,
        uint256 debtRepaid,
        uint256 collateralSeized
    );

    constructor(address payable _lendingPool, address _creditScore) Ownable(msg.sender) {
        lendingPool = LendingPool(_lendingPool);
        creditScore = CreditScore(_creditScore);
    }

    /**
     * @notice Liquidate an unhealthy position.
     * Caller must send enough OPN to cover the debt (msg.value >= debt).
     * Caller receives collateral + 8% bonus.
     */
    function liquidate(address borrower) external payable nonReentrant {
        (, uint256 debt,,,) = lendingPool.getPosition(borrower);
        require(debt > 0, "Liquidator: no debt");
        require(msg.value >= debt, "Liquidator: insufficient OPN sent");
        require(lendingPool.healthFactor(borrower) < 1e18, "Liquidator: position is healthy");

        // Record liquidation on credit score
        creditScore.recordLiquidation(borrower);

        // Forward payment to pool; pool repays debt and sends collateral+bonus back to caller
        uint256 collateralSeized = lendingPool.liquidate{value: msg.value}(borrower, msg.sender);

        emit LiquidationExecuted(borrower, msg.sender, debt, collateralSeized);
    }

    function isLiquidatable(address borrower) external view returns (bool) {
        (, uint256 debt,,,) = lendingPool.getPosition(borrower);
        if (debt == 0) return false;
        return lendingPool.healthFactor(borrower) < 1e18;
    }

    receive() external payable {}
}
