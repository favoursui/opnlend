// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LendingPool.sol";
import "./CreditScore.sol";

/**
 * @title LoanManager
 * @notice Entry point for borrowers. Coordinates LendingPool + CreditScore.
 */
contract LoanManager is Ownable, ReentrancyGuard {
    LendingPool public lendingPool;
    CreditScore public creditScore;

    event BorrowExecuted(address indexed borrower, uint256 amount);
    event RepayExecuted(address indexed borrower, uint256 amount);

    constructor(address payable _lendingPool, address _creditScore) Ownable(msg.sender) {
        lendingPool = LendingPool(_lendingPool);
        creditScore = CreditScore(_creditScore);
    }

    function borrow(uint256 amount) external nonReentrant {
        creditScore.initWallet(msg.sender);
        creditScore.recordBorrow(msg.sender);
        lendingPool.borrow(msg.sender, amount);
        emit BorrowExecuted(msg.sender, amount);
    }

    function repay() external payable nonReentrant {
        require(msg.value > 0, "LoanManager: zero repayment");
        creditScore.recordRepayment(msg.sender);
        lendingPool.repay{value: msg.value}(msg.sender);
        emit RepayExecuted(msg.sender, msg.value);
    }
}
