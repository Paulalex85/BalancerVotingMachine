pragma solidity ^0.5.17;

import "@openzeppelin/contracts/math/SafeMath.sol";

contract VotingMachine {
    using SafeMath for uint256;

    address balancerPool;
    constructor(address _balancerPool) public {
        balancerPool = _balancerPool;
    }

}
