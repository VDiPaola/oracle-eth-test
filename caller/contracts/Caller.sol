// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IOracle.sol";

contract Caller is Ownable {
  address private oracleAddress;
  IOracle private oracleContract;

  mapping(uint256=>bool) myRequests;
  
  event newOracleAddressEvent(address oracleAddress);
  event validatedVAT(bool confirmed, string country, uint id);

  function setOracleAddress (address _oracleContractAddress) public onlyOwner {
    oracleAddress = _oracleContractAddress;
    oracleContract = IOracle(oracleAddress);
    emit newOracleAddressEvent(oracleAddress);
  }

  modifier onlyOracle() {
    require(msg.sender == oracleAddress, "Must be called from oracle contract");
    _;
  }

  function validateVAT(string calldata _vatNumber) external returns(uint256){
    uint256 id = oracleContract.getValidateVAT(_vatNumber);
    myRequests[id] = true;
    return id;
  }

  function callback(bool _vatConfirmed, string calldata _country, uint _id) external onlyOracle {
    require(myRequests[_id], "This request is not in my pending list.");
    delete myRequests[_id];
    emit validatedVAT(_vatConfirmed, _country, _id);
  }
  
}
