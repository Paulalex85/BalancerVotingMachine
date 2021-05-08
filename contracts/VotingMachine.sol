pragma solidity ^0.5.13;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "./utils/interfaces/BToken.sol";

contract VotingMachine is ReentrancyGuard {
    using SafeMath for uint256;

    mapping(address => uint256) private balances;
    BToken public balancerLPToken;

    event Staked(address indexed user, uint256 amount);

    constructor(BToken _balancerLPToken) public {
        require(_balancerLPToken != BToken(0), "VotingMachine: LP token cannot be null");
        balancerLPToken = _balancerLPToken;
    }

    function stake(uint256 amount) public nonReentrant {
        require(amount > 0, "VotingMachine: cannot stake 0");
        balances[msg.sender] = balances[msg.sender].add(amount);
        balancerLPToken.transferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }
}
