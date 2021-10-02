// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ICaller.sol";

contract Oracle {
  uint private randNonce = 0;
  uint private modulus = 1000;
  mapping(uint256=>bool) pendingRequests;
  event GetValidateVAT(string vatNumber, address callerAddress, uint id);
  event SetValidateVAT(bool confirmed, string country, address callerAddress);
  function getValidateVAT(string calldata _vatNumber) external returns (uint256) {
    randNonce++;
    uint id = uint(keccak256(abi.encodePacked(block.timestamp, msg.sender, randNonce))) % modulus;
    pendingRequests[id] = true;
    emit GetValidateVAT(_vatNumber,msg.sender, id);
    return id;
  }
  function setValidateVAT(bool _confirmed, string calldata _country, address _callerAddress, uint256 _id) external {
    require(pendingRequests[_id], "This request is not in my pending list.");
    delete pendingRequests[_id];
    ICaller callerContract;
    callerContract = ICaller(_callerAddress);
    callerContract.callback(_confirmed, _country, _id);
    emit SetValidateVAT(_confirmed, _country, _callerAddress);
  }
}