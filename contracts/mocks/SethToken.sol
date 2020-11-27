pragma solidity ^0.6.2;

import "./MockSynth.sol";

contract SethToken is MockSynth {
    constructor() public {
        MockSynth.initialize("Synthetic Eth", "sETH");
    }
}
