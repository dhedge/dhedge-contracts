pragma solidity ^0.6.2;

import "./MockSynth.sol";

contract SbtcToken is MockSynth {
    constructor() public {
        MockSynth.initialize("Synthetic Btc", "sBTC");
    }
}
