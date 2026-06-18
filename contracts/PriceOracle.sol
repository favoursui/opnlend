// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PriceOracle
 * @notice Simple manually-updatable price oracle for testnet.
 * Returns OPN/USD price with 8 decimals (e.g. 3200_00000000 = $3,200).
 */
contract PriceOracle is Ownable {
    uint256 public opnUsdPrice; // 8 decimals
    uint256 public lastUpdated;

    event PriceUpdated(uint256 oldPrice, uint256 newPrice, uint256 timestamp);

    constructor(uint256 _initialPrice) Ownable(msg.sender) {
        opnUsdPrice = _initialPrice;
        lastUpdated = block.timestamp;
    }

    function setPrice(uint256 _price) external onlyOwner {
        require(_price > 0, "PriceOracle: zero price");
        uint256 old = opnUsdPrice;
        opnUsdPrice = _price;
        lastUpdated = block.timestamp;
        emit PriceUpdated(old, _price, block.timestamp);
    }

    /// @notice Returns price with 8 decimals
    function getPrice() external view returns (uint256) {
        return opnUsdPrice;
    }

    /// @notice Convert OPN amount (18 dec) to USD value (8 dec)
    function opnToUsd(uint256 opnAmount) external view returns (uint256) {
        return (opnAmount * opnUsdPrice) / 1e18;
    }
}
