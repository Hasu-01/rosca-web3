// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract CommunityLending is
    Ownable,
    ReentrancyGuard,
    Pausable
{
    IERC20 public token;

    uint256 public poolCount;

    enum PoolStatus {
        OPEN,
        ACTIVE,
        COMPLETED,
        CANCELLED
    }

    struct Pool {
        uint256 id;
        string name;
        address creator;
        uint256 contributionAmount;
        uint256 maxMembers;
        uint256 currentMembers;
        uint256 currentRound;
        uint256 totalRounds;
        uint256 poolBalance;
        PoolStatus status;
    }

    struct Member {
        address wallet;
        bool hasReceived;
    }

    mapping(uint256 => Pool) public pools;

    mapping(uint256 => Member[]) public poolMembers;

    mapping(uint256 => mapping(address => bool))
        public hasJoined;

    // poolId => round => user => paid?
    mapping(uint256 => mapping(uint256 => mapping(address => bool)))
        public hasPaidInRound;

    // poolId => round => number paid
    mapping(uint256 => mapping(uint256 => uint256))
        public paidCountInRound;

    // Reputation score
    mapping(address => uint256)
        public reputationScore;

    event PoolCreated(
        uint256 indexed poolId,
        string name,
        address creator
    );

    event JoinedPool(
        uint256 indexed poolId,
        address member
    );

    event PoolStarted(
        uint256 indexed poolId
    );

    event Deposited(
        uint256 indexed poolId,
        uint256 round,
        address member,
        uint256 amount
    );

    event FundsDistributed(
        uint256 indexed poolId,
        uint256 round,
        address receiver,
        uint256 amount
    );

    event PoolCompleted(
        uint256 indexed poolId
    );

    constructor(address _tokenAddress)
        Ownable(msg.sender)
    {
        token = IERC20(_tokenAddress);
    }

    // =========================
    // CREATE POOL
    // =========================

    function createPool(
        string memory _name,
        uint256 _contributionAmount,
        uint256 _maxMembers
    ) public whenNotPaused {

        require(
            _maxMembers > 1,
            "Minimum 2 members"
        );

        poolCount++;

        pools[poolCount] = Pool({
            id: poolCount,
            name: _name,
            creator: msg.sender,
            contributionAmount: _contributionAmount,
            maxMembers: _maxMembers,
            currentMembers: 0,
            currentRound: 1,
            totalRounds: _maxMembers,
            poolBalance: 0,
            status: PoolStatus.OPEN
        });

        emit PoolCreated(
            poolCount,
            _name,
            msg.sender
        );
    }

    // =========================
    // JOIN POOL
    // =========================

    function joinPool(
        uint256 _poolId
    ) public whenNotPaused {

        Pool storage pool = pools[_poolId];

        require(
            pool.status == PoolStatus.OPEN,
            "Pool not open"
        );

        require(
            !hasJoined[_poolId][msg.sender],
            "Already joined"
        );

        require(
            pool.currentMembers <
            pool.maxMembers,
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

    // =========================
    // START POOL
    // =========================

    function startPool(
        uint256 _poolId
    ) public whenNotPaused {

        Pool storage pool = pools[_poolId];

        require(
            msg.sender == pool.creator,
            "Only creator"
        );

        require(
            pool.status == PoolStatus.OPEN,
            "Pool already started"
        );

        require(
            pool.currentMembers ==
            pool.maxMembers,
            "Pool not full"
        );

        pool.status = PoolStatus.ACTIVE;

        emit PoolStarted(_poolId);
    }

    // =========================
    // DEPOSIT
    // =========================

    function deposit(
        uint256 _poolId
    )
        public
        nonReentrant
        whenNotPaused
    {

        Pool storage pool = pools[_poolId];

        require(
            pool.status == PoolStatus.ACTIVE,
            "Pool not active"
        );

        require(
            hasJoined[_poolId][msg.sender],
            "Not member"
        );

        require(
            !hasPaidInRound[
                _poolId
            ][
                pool.currentRound
            ][
                msg.sender
            ],
            "Already paid"
        );

        token.transferFrom(
            msg.sender,
            address(this),
            pool.contributionAmount
        );

        hasPaidInRound[
            _poolId
        ][
            pool.currentRound
        ][
            msg.sender
        ] = true;

        paidCountInRound[
            _poolId
        ][
            pool.currentRound
        ]++;

        pool.poolBalance +=
            pool.contributionAmount;

        reputationScore[msg.sender]++;

        emit Deposited(
            _poolId,
            pool.currentRound,
            msg.sender,
            pool.contributionAmount
        );
    }

    // =========================
    // DISTRIBUTE FUNDS
    // =========================

    function distributeFunds(
        uint256 _poolId
    )
        public
        nonReentrant
        whenNotPaused
    {

        Pool storage pool = pools[_poolId];

        require(
            pool.status == PoolStatus.ACTIVE,
            "Pool not active"
        );

        require(
            paidCountInRound[
                _poolId
            ][
                pool.currentRound
            ] == pool.maxMembers,
            "Not all paid"
        );

        uint256 receiverIndex =
            pool.currentRound - 1;

        Member storage receiver =
            poolMembers[_poolId][receiverIndex];

        uint256 payout =
            pool.contributionAmount *
            pool.maxMembers;

        pool.poolBalance -= payout;

        receiver.hasReceived = true;

        token.transfer(
            receiver.wallet,
            payout
        );

        emit FundsDistributed(
            _poolId,
            pool.currentRound,
            receiver.wallet,
            payout
        );

        // Move to next round
        pool.currentRound++;

        // Pool completed
        if (
            pool.currentRound >
            pool.totalRounds
        ) {

            pool.status =
                PoolStatus.COMPLETED;

            emit PoolCompleted(
                _poolId
            );
        }
    }

    // =========================
    // ADMIN
    // =========================

    function pause()
        public
        onlyOwner
    {
        _pause();
    }

    function unpause()
        public
        onlyOwner
    {
        _unpause();
    }

    // =========================
    // VIEW FUNCTIONS
    // =========================

    function getPoolMembers(
        uint256 _poolId
    )
        public
        view
        returns (
            Member[] memory
        )
    {
        return poolMembers[_poolId];
    }

    function getCurrentReceiver(
        uint256 _poolId
    )
        public
        view
        returns (address)
    {
        Pool storage pool =
            pools[_poolId];

        uint256 receiverIndex =
            pool.currentRound - 1;

        return
            poolMembers[
                _poolId
            ][
                receiverIndex
            ].wallet;
    }
}