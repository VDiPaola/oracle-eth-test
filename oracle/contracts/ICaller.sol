// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICaller {
    function callback(bool _vatConfirmed, string calldata _country, uint _id) external;
}
