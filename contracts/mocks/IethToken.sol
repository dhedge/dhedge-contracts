pragma solidity ^0.6.2;

import "./MockSynth.sol";

contract IethToken is MockSynth {
    constructor() public {
        MockSynth.initialize("Synthetic Inverse Eth", "iETH");
    }
}
