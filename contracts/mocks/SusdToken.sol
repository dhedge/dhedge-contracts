pragma solidity ^0.6.2;

import "./MockSynth.sol";

contract SusdToken is MockSynth {
    constructor() public {
        MockSynth.initialize("Synthetic USD", "sUSD");
    }
}
