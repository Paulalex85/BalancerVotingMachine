pragma solidity ^0.5.13;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "./utils/interfaces/BToken.sol";

contract VotingMachine is ReentrancyGuard {
    using SafeMath for uint256;

    enum VoteStatus {
        NONE, ACCEPT, REJECT
    }

    enum VotingResult {
        NONE, ACCEPT, REJECT, NOT_APPLIED
    }

    struct VotingDetails {
        uint256 totalSupply;
        uint256 createdAt;
        uint256 duration;
        uint256 totalAccepted;
        uint256 totalRejected;
        bool executed;
        string description;
        mapping(address => VoteStatus) voteByAccount;
    }

    uint256 votingIdsCounter;
    mapping(uint256 => VotingDetails) private votings;
    mapping(address => uint256) private balances;
    BToken public balancerLPToken;

    event VoteStarted(uint256 indexed votingId);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    constructor(BToken _balancerLPToken) public {
        require(_balancerLPToken != BToken(0), "VotingMachine: LP token cannot be null");
        balancerLPToken = _balancerLPToken;
    }

    function startVoting(uint256 duration, string calldata description) external {
        // checking inputs
        require(balanceOf(msg.sender) > 0, "VotingMachine: vote creator should have stake");

        // creating new voting
        uint256 votingId = votingIdsCounter++;

        votings[votingId] = VotingDetails(
            0,
            now,
            duration * 24 hours,
            0,
            0,
            false,
            description
        );

        emit VoteStarted(votingId);
    }

    function stake(uint256 amount) public nonReentrant {
        require(amount > 0, "VotingMachine: cannot stake 0");
        balances[msg.sender] = balances[msg.sender].add(amount);
        balancerLPToken.transferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public nonReentrant {
        require(amount > 0, "VotingMachine: Cannot withdraw 0");
        balances[msg.sender] = balances[msg.sender].sub(amount);
        balancerLPToken.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }

    function getVote(uint256 votingId) external view returns (
        uint256 createdAt,
        uint256 duration,
        string memory description,
        bool executed,
        uint256 totalAccepted,
        uint256 totalRejected
    ) {
        VotingDetails storage votingDetails = votings[votingId];

        return (
        votingDetails.createdAt,
        votingDetails.duration,
        votingDetails.description,
        votingDetails.executed,
        votingDetails.totalAccepted,
        votingDetails.totalRejected
        );
    }
}
