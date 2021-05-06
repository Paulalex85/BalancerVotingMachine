pragma solidity ^0.5.13;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./utils/interfaces/IConfigurableRightsPool.sol";

contract VotingMachine {
    using SafeMath for uint256;

    mapping(address => uint256) private balances;
    IConfigurableRightsPool     public  balancerPool;

    event Staked(address indexed user, uint256 amount);

    constructor(IConfigurableRightsPool _balancerPool) public {
        require(_balancerPool != IConfigurableRightsPool(0));
        balancerPool = _balancerPool;
    }

//    function stake(uint256 amount) public nonReentrant {
//        require(amount > 0, "VotingMachine: cannot stake 0");
//        _balances[msg.sender] = _balances[msg.sender].add(_amount);
//        balancerPool.transferFrom(msg.sender, address(this), amount);
//        emit Staked(msg.sender, amount);
//    }
}
