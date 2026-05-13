// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CommunityLending is Ownable, ReentrancyGuard {

    IERC20 public token;

    uint256 public poolCount;

    struct Pool {
        uint256 id;
        string name;
        address creator;
        uint256 contributionAmount;
        uint256 maxMembers;
        uint256 currentMembers;
        bool isActive;
    }

    struct Member {
        address wallet;
        bool hasReceived;
    }

    mapping(uint256 => Pool) public pools;

    mapping(uint256 => Member[]) public poolMembers;

    mapping(uint256 => mapping(address => bool)) public hasJoined;

    event PoolCreated(
        uint256 poolId,
        string name,
        address creator
    );

    event JoinedPool(
        uint256 poolId,
        address member
    );

    event Deposited(
        uint256 poolId,
        address member,
        uint256 amount
    );

    constructor(address _tokenAddress)
        Ownable(msg.sender)
    {
        token = IERC20(_tokenAddress);
    }

    function createPool(
        string memory _name,
        uint256 _contributionAmount,
        uint256 _maxMembers
    ) public {

        poolCount++;

        pools[poolCount] = Pool({
            id: poolCount,
            name: _name,
            creator: msg.sender,
            contributionAmount: _contributionAmount,
            maxMembers: _maxMembers,
            currentMembers: 0,
            isActive: true
        });

        emit PoolCreated(
            poolCount,
            _name,
            msg.sender
        );
    }

    function joinPool(uint256 _poolId) public {

        Pool storage pool = pools[_poolId];

        require(pool.isActive, "Pool inactive");

        require(
            !hasJoined[_poolId][msg.sender],
            "Already joined"
        );

        require(
            pool.currentMembers < pool.maxMembers,
            "Pool full"
        );

        poolMembers[_poolId].push(
            Member({
                wallet: msg.sender,
                hasReceived: false
            })
        );

        hasJoined[_poolId][msg.sender] = true;

        pool.currentMembers++;

        emit JoinedPool(
            _poolId,
            msg.sender
        );
    }

    function deposit(uint256 _poolId)
        public
        nonReentrant
    {

        Pool storage pool = pools[_poolId];

        require(
            hasJoined[_poolId][msg.sender],
            "Not a member"
        );

        token.transferFrom(
            msg.sender,
            address(this),
            pool.contributionAmount
        );

        emit Deposited(
            _poolId,
            msg.sender,
            pool.contributionAmount
        );
    }

    function getPoolMembers(uint256 _poolId)
        public
        view
        returns (Member[] memory)
    {
        return poolMembers[_poolId];
    }
}