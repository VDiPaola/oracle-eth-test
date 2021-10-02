// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IOracle {
  function getValidateVAT(string calldata _vatNumber) external returns (uint256);
}