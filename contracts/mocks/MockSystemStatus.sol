pragma solidity ^0.6.2;

import "../ISystemStatus.sol";

contract MockSystemStatus is ISystemStatus {

    bytes32
        private _sbtc = 0x7342544300000000000000000000000000000000000000000000000000000000;

    function requireSynthActive(bytes32 currencyKey) external view override {
        bool suspended = currencyKey == _sbtc;

        require(!suspended, "Synth is suspended. Operation prohibited");
    }

}