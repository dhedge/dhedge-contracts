pragma solidity ^0.6.2;

import "./MockSynth.sol";

contract IbtcToken is MockSynth {
    constructor() public {
        MockSynth.initialize("Synthetic Inverse Btc", "iBTC");
    }
}
