// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CommunityLending
 * @notice Smart contract mo phong vong hui / ROSCA.
 *
 * LUAT CHINH:
 * - Khong co APR, yield hay chia lai.
 * - Moi ky thuong: tat ca thanh vien dong tien, sau do nhung nguoi chua hot
 *   dua ra so tien ho chap nhan nhan.
 * - Nguoi chap nhan nhan it nhat duoc chon hot ky do.
 * - Phan tien nguoi hot truoc de lai duoc giu trong contract va CHI chuyen
 *   cho nguoi hot cuoi.
 * - Mot ky chi hoan thanh khi da du nguoi dong va da payout cho nguoi hot.
 * - Ky cuoi: chi nhung nguoi da hot truoc do dong; khi dong du, contract
 *   tu dong chuyen tien cho nguoi cuoi va ket thuc vong hui.
 */
contract CommunityLending is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    uint256 public poolCount;

    uint256 public constant MAX_MEMBERS = 20;

    enum PoolStatus {
        OPEN,
        ACTIVE,
        COMPLETED,
        CANCELLED
    }

    enum RoundPhase {
        NOT_STARTED,
        CONTRIBUTING,
        OFFERING,
        COMPLETED
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
        uint256 finalReceiverReserve;
        PoolStatus status;
        RoundPhase phase;
    }

    struct Member {
        address wallet;
        bool hasReceived;
    }

    mapping(uint256 => Pool) public pools;
    mapping(uint256 => Member[]) private poolMembers;

    mapping(uint256 => mapping(address => bool)) public hasJoined;
    mapping(uint256 => mapping(address => bool)) public hasReceivedPayout;

    // poolId => round => member => da dong tien ky nay hay chua
    mapping(uint256 => mapping(uint256 => mapping(address => bool)))
        public hasPaidInRound;

    // poolId => round => so nguoi da dong ky nay
    mapping(uint256 => mapping(uint256 => uint256))
        public paidCountInRound;

    // poolId => round => member => so tien member chap nhan nhan
    mapping(uint256 => mapping(uint256 => mapping(address => uint256)))
        public acceptedPayoutOffers;

    // poolId => round => member => da submit muc nhan hay chua
    mapping(uint256 => mapping(uint256 => mapping(address => bool)))
        public hasSubmittedOfferInRound;

    // poolId => round => member => da phan hoi (offer hoac skip) hay chua
    mapping(uint256 => mapping(uint256 => mapping(address => bool)))
        public hasRespondedInRound;

    // poolId => round => so nguoi chua hot da phan hoi
    mapping(uint256 => mapping(uint256 => uint256))
        public responseCountInRound;

    // poolId => round => muc nhan => da co nguoi su dung hay chua
    mapping(uint256 => mapping(uint256 => mapping(uint256 => bool)))
        public usedAcceptedPayout;

    // poolId => round => nguoi tam duoc chon do dang chap nhan nhan it nhat
    mapping(uint256 => mapping(uint256 => address))
        public selectedReceiver;

    // poolId => round => muc nhan thap nhat hien tai
    mapping(uint256 => mapping(uint256 => uint256))
        public lowestAcceptedPayout;

    mapping(address => uint256) public reputationScore;

    event PoolCreated(
        uint256 indexed poolId,
        string name,
        address indexed creator,
        uint256 contributionAmount,
        uint256 maxMembers
    );

    event MemberRegistered(
        uint256 indexed poolId,
        address indexed member
    );

    event PoolStarted(
        uint256 indexed poolId
    );

    event ContributionWindowOpened(
        uint256 indexed poolId,
        uint256 indexed round,
        uint256 requiredPayments
    );

    event ContributionPaid(
        uint256 indexed poolId,
        uint256 indexed round,
        address indexed member,
        uint256 amount
    );

    event OfferWindowOpened(
        uint256 indexed poolId,
        uint256 indexed round,
        uint256 eligibleReceivers
    );

    event WithdrawalOfferSubmitted(
        uint256 indexed poolId,
        uint256 indexed round,
        address indexed member,
        uint256 acceptedPayout
    );

    event WithdrawalOfferSkipped(
        uint256 indexed poolId,
        uint256 indexed round,
        address indexed member
    );

    event LowestPayoutSelected(
        uint256 indexed poolId,
        uint256 indexed round,
        address indexed selectedMember,
        uint256 acceptedPayout
    );

    event RoundCompleted(
        uint256 indexed poolId,
        uint256 indexed round,
        address indexed receiver,
        uint256 amountReceived,
        uint256 retainedForFinalReceiver
    );

    event FinalReceiverPaid(
        uint256 indexed poolId,
        uint256 indexed round,
        address indexed receiver,
        uint256 finalRoundContributions,
        uint256 retainedFromPreviousRounds,
        uint256 totalReceived
    );

    event PoolCompleted(
        uint256 indexed poolId
    );

    constructor(address _tokenAddress) Ownable(msg.sender) {
        require(_tokenAddress != address(0), "Invalid token address");
        token = IERC20(_tokenAddress);
    }

    // =========================================================
    // CREATE POOL
    // =========================================================

    function createPool(
        string memory _name,
        uint256 _contributionAmount,
        uint256 _maxMembers
    ) public whenNotPaused {
        _validatePoolInput(_name, _contributionAmount, _maxMembers);

        uint256 newPoolId = _createEmptyPool(
            _name,
            _contributionAmount,
            _maxMembers
        );

        emit PoolCreated(
            newPoolId,
            _name,
            msg.sender,
            _contributionAmount,
            _maxMembers
        );
    }

    /**
     * @notice Tien ich cho demo nhieu nguoi:
     * creator nhap san danh sach dia chi vi, khong can tung nguoi bam join.
     * Contract KHONG tu tao vi va KHONG tu lay tien cua cac vi nay.
     */
    function createPoolWithMembers(
        string memory _name,
        uint256 _contributionAmount,
        address[] calldata _members
    ) public whenNotPaused {
        _validatePoolInput(
            _name,
            _contributionAmount,
            _members.length
        );

        uint256 newPoolId = _createEmptyPool(
            _name,
            _contributionAmount,
            _members.length
        );

        for (uint256 i = 0; i < _members.length; i++) {
            _addMember(newPoolId, _members[i]);
        }

        emit PoolCreated(
            newPoolId,
            _name,
            msg.sender,
            _contributionAmount,
            _members.length
        );
    }

    function _validatePoolInput(
        string memory _name,
        uint256 _contributionAmount,
        uint256 _maxMembers
    ) internal pure {
        require(bytes(_name).length > 0, "Pool name required");
        require(_contributionAmount > 0, "Invalid contribution");
        require(_maxMembers > 1, "Minimum 2 members");
        require(_maxMembers <= MAX_MEMBERS, "Maximum 20 members");
    }

    function _createEmptyPool(
        string memory _name,
        uint256 _contributionAmount,
        uint256 _maxMembers
    ) internal returns (uint256) {
        poolCount++;
        uint256 newPoolId = poolCount;

        pools[newPoolId] = Pool({
            id: newPoolId,
            name: _name,
            creator: msg.sender,
            contributionAmount: _contributionAmount,
            maxMembers: _maxMembers,
            currentMembers: 0,
            currentRound: 1,
            totalRounds: _maxMembers,
            poolBalance: 0,
            finalReceiverReserve: 0,
            status: PoolStatus.OPEN,
            phase: RoundPhase.NOT_STARTED
        });

        return newPoolId;
    }

    // =========================================================
    // JOIN / REGISTER MEMBERS
    // =========================================================

    function joinPool(uint256 _poolId) public whenNotPaused {
        Pool storage pool = pools[_poolId];

        _requireExistingPool(pool);
        require(pool.status == PoolStatus.OPEN, "Pool not open");

        _addMember(_poolId, msg.sender);
    }

    function _addMember(
        uint256 _poolId,
        address _member
    ) internal {
        Pool storage pool = pools[_poolId];

        require(_member != address(0), "Invalid member address");
        require(!hasJoined[_poolId][_member], "Duplicate member");
        require(pool.currentMembers < pool.maxMembers, "Pool full");

        poolMembers[_poolId].push(
            Member({
                wallet: _member,
                hasReceived: false
            })
        );

        hasJoined[_poolId][_member] = true;
        pool.currentMembers++;

        emit MemberRegistered(_poolId, _member);
    }

    // =========================================================
    // START POOL
    // =========================================================

    function startPool(uint256 _poolId) public whenNotPaused {
        Pool storage pool = pools[_poolId];

        _requireExistingPool(pool);
        require(msg.sender == pool.creator, "Only creator can start");
        require(pool.status == PoolStatus.OPEN, "Pool not open");
        require(pool.currentMembers == pool.maxMembers, "Pool not full");

        pool.status = PoolStatus.ACTIVE;
        pool.phase = RoundPhase.CONTRIBUTING;

        emit PoolStarted(_poolId);
        emit ContributionWindowOpened(
            _poolId,
            pool.currentRound,
            _requiredPaymentsForCurrentRound(_poolId)
        );
    }

    // =========================================================
    // DEPOSIT / DONG HUI
    // =========================================================

    function deposit(uint256 _poolId)
        public
        nonReentrant
        whenNotPaused
    {
        Pool storage pool = pools[_poolId];

        _requireActivePool(pool);
        require(
            pool.phase == RoundPhase.CONTRIBUTING,
            "Current round is not accepting contributions"
        );
        require(hasJoined[_poolId][msg.sender], "Not a member");
        require(
            !hasPaidInRound[_poolId][pool.currentRound][msg.sender],
            "Already paid this round"
        );

        if (_isFinalRound(_poolId)) {
            require(
                hasReceivedPayout[_poolId][msg.sender],
                "Final receiver does not pay final round"
            );
        }

        token.safeTransferFrom(
            msg.sender,
            address(this),
            pool.contributionAmount
        );

        hasPaidInRound[_poolId][pool.currentRound][msg.sender] = true;
        paidCountInRound[_poolId][pool.currentRound]++;
        pool.poolBalance += pool.contributionAmount;
        reputationScore[msg.sender]++;

        emit ContributionPaid(
            _poolId,
            pool.currentRound,
            msg.sender,
            pool.contributionAmount
        );

        uint256 requiredPayments =
            _requiredPaymentsForCurrentRound(_poolId);

        if (
            paidCountInRound[_poolId][pool.currentRound] ==
            requiredPayments
        ) {
            if (_isFinalRound(_poolId)) {
                _completeFinalRound(_poolId);
            } else {
                pool.phase = RoundPhase.OFFERING;

                emit OfferWindowOpened(
                    _poolId,
                    pool.currentRound,
                    _eligibleReceiverCount(_poolId)
                );
            }
        }
    }

    // =========================================================
    // WITHDRAWAL OFFER / MUC TIEN CHAP NHAN HOT
    // =========================================================

    /**
     * @notice Nguoi chua tung hot dua ra so tien minh chap nhan nhan.
     * Nguoi dua ra muc nhan THAP NHAT se duoc chon.
     *
     * Moi nguoi chi duoc submit 1 muc nhan trong moi ky.
     * Neu da skip truoc do, nguoi do van duoc phep quay lai submit 1 muc nhan
     * de tranh truong hop ca ky bi ket vinh vien.
     */
    function submitWithdrawalOffer(
        uint256 _poolId,
        uint256 _acceptedPayout
    ) public whenNotPaused {
        Pool storage pool = pools[_poolId];

        _requireActivePool(pool);
        require(
            pool.phase == RoundPhase.OFFERING,
            "Offer phase is not open"
        );
        require(!_isFinalRound(_poolId), "Final round has no offer phase");
        require(hasJoined[_poolId][msg.sender], "Not a member");
        require(
            !hasReceivedPayout[_poolId][msg.sender],
            "Member already received payout"
        );
        require(
            !hasSubmittedOfferInRound[_poolId][pool.currentRound][msg.sender],
            "Member already submitted offer"
        );
        require(
            paidCountInRound[_poolId][pool.currentRound] ==
                _requiredPaymentsForCurrentRound(_poolId),
            "Contributions not complete"
        );

        uint256 fullRoundPot = _normalRoundPot(_poolId);

        require(_acceptedPayout > 0, "Accepted payout must be positive");
        require(
            _acceptedPayout < fullRoundPot,
            "Must retain at least one token unit"
        );
        require(
            !usedAcceptedPayout[_poolId][pool.currentRound][_acceptedPayout],
            "Accepted payout already used"
        );

        if (!hasRespondedInRound[_poolId][pool.currentRound][msg.sender]) {
            hasRespondedInRound[_poolId][pool.currentRound][msg.sender] = true;
            responseCountInRound[_poolId][pool.currentRound]++;
        }

        hasSubmittedOfferInRound[_poolId][pool.currentRound][msg.sender] = true;
        acceptedPayoutOffers[_poolId][pool.currentRound][msg.sender] =
            _acceptedPayout;
        usedAcceptedPayout[_poolId][pool.currentRound][_acceptedPayout] = true;

        emit WithdrawalOfferSubmitted(
            _poolId,
            pool.currentRound,
            msg.sender,
            _acceptedPayout
        );

        uint256 currentLowest =
            lowestAcceptedPayout[_poolId][pool.currentRound];

        if (
            currentLowest == 0 ||
            _acceptedPayout < currentLowest
        ) {
            lowestAcceptedPayout[_poolId][pool.currentRound] =
                _acceptedPayout;
            selectedReceiver[_poolId][pool.currentRound] =
                msg.sender;

            emit LowestPayoutSelected(
                _poolId,
                pool.currentRound,
                msg.sender,
                _acceptedPayout
            );
        }
    }

    /**
     * @notice Nguoi chua hot co the xac nhan khong muon hot o ky hien tai.
     * Tat ca nguoi chua hot phai offer hoac skip truoc khi chot ky,
     * tranh loi vua co nguoi offer dau tien da bi chot ngay.
     */
    function skipWithdrawalOffer(
        uint256 _poolId
    ) public whenNotPaused {
        Pool storage pool = pools[_poolId];

        _requireActivePool(pool);
        require(
            pool.phase == RoundPhase.OFFERING,
            "Offer phase is not open"
        );
        require(!_isFinalRound(_poolId), "Final round has no offer phase");
        require(hasJoined[_poolId][msg.sender], "Not a member");
        require(
            !hasReceivedPayout[_poolId][msg.sender],
            "Member already received payout"
        );
        require(
            !hasRespondedInRound[_poolId][pool.currentRound][msg.sender],
            "Member already responded"
        );

        hasRespondedInRound[_poolId][pool.currentRound][msg.sender] = true;
        responseCountInRound[_poolId][pool.currentRound]++;

        emit WithdrawalOfferSkipped(
            _poolId,
            pool.currentRound,
            msg.sender
        );
    }

    // =========================================================
    // COMPLETE NORMAL ROUND / HOT HUI KY THUONG
    // =========================================================

    /**
     * @notice Chot ky thuong va chuyen tien cho nguoi chap nhan lay it nhat.
     *
     * Dieu kien bao ve:
     * - Du nguoi dong tien.
     * - Tat ca nguoi chua hot da offer hoac skip.
     * - Phai co it nhat mot nguoi offer.
     * - Moi nguoi chi duoc hot mot lan.
     *
     * Sau khi payout thanh cong, ky sau moi duoc mo.
     */
    function withdrawCurrentRound(
        uint256 _poolId
    ) public nonReentrant whenNotPaused {
        Pool storage pool = pools[_poolId];

        _requireActivePool(pool);
        require(
            pool.phase == RoundPhase.OFFERING,
            "Current round is not ready for withdrawal"
        );
        require(!_isFinalRound(_poolId), "Final round pays automatically");
        require(
            hasJoined[_poolId][msg.sender] ||
                msg.sender == pool.creator,
            "Not authorized to complete round"
        );
        require(
            paidCountInRound[_poolId][pool.currentRound] ==
                _requiredPaymentsForCurrentRound(_poolId),
            "Not all required members paid"
        );

        uint256 eligibleReceivers =
            _eligibleReceiverCount(_poolId);

        require(
            responseCountInRound[_poolId][pool.currentRound] ==
                eligibleReceivers,
            "Waiting for all eligible member responses"
        );

        address receiver =
            selectedReceiver[_poolId][pool.currentRound];

        uint256 acceptedPayout =
            lowestAcceptedPayout[_poolId][pool.currentRound];

        require(receiver != address(0), "No member accepts withdrawal");
        require(acceptedPayout > 0, "No accepted payout");
        require(
            !hasReceivedPayout[_poolId][receiver],
            "Receiver already received payout"
        );

        uint256 fullRoundPot = _normalRoundPot(_poolId);
        uint256 retainedAmount =
            fullRoundPot - acceptedPayout;

        require(
            pool.poolBalance >= acceptedPayout,
            "Insufficient accounted balance"
        );

        hasReceivedPayout[_poolId][receiver] = true;
        _markMemberReceived(_poolId, receiver);

        pool.finalReceiverReserve += retainedAmount;
        pool.poolBalance -= acceptedPayout;

        token.safeTransfer(receiver, acceptedPayout);

        emit RoundCompleted(
            _poolId,
            pool.currentRound,
            receiver,
            acceptedPayout,
            retainedAmount
        );

        /*
            Ky hien tai chi hoan thanh tai day:
            da dong du tien VA da chuyen tien cho nguoi hot.
            Bay gio moi mo ky tiep theo.
        */
        pool.currentRound++;
        pool.phase = RoundPhase.CONTRIBUTING;

        emit ContributionWindowOpened(
            _poolId,
            pool.currentRound,
            _requiredPaymentsForCurrentRound(_poolId)
        );
    }

    // =========================================================
    // FINAL ROUND / NGUOI HOT CUOI
    // =========================================================

    /**
     * @notice Kỳ cuối được gọi tự động ngay trong deposit()
     * khi toàn bộ những người đã hốt trước đó đóng xong lần cuối.
     *
     * Người cuối nhận:
     * - Toàn bộ tiền đóng của những người đã hốt trong kỳ cuối.
     * - Toàn bộ phần tiền những người hốt trước đã để lại.
     */
    function _completeFinalRound(
        uint256 _poolId
    ) internal {
        Pool storage pool = pools[_poolId];

        require(_isFinalRound(_poolId), "Not final round");
        require(
            pool.phase == RoundPhase.CONTRIBUTING,
            "Invalid final round phase"
        );
        require(
            paidCountInRound[_poolId][pool.currentRound] ==
                pool.maxMembers - 1,
            "Final contributions incomplete"
        );

        (address finalReceiver, uint256 remainingCount) =
            _findRemainingReceiver(_poolId);

        require(remainingCount == 1, "Final receiver is not unique");
        require(finalReceiver != address(0), "Final receiver not found");
        require(
            !hasReceivedPayout[_poolId][finalReceiver],
            "Final receiver already paid"
        );

        uint256 finalRoundContributions =
            pool.contributionAmount * (pool.maxMembers - 1);

        uint256 retainedFromPreviousRounds =
            pool.finalReceiverReserve;

        uint256 finalPayout =
            finalRoundContributions +
            retainedFromPreviousRounds;

        require(
            pool.poolBalance == finalPayout,
            "Pool accounting mismatch"
        );

        hasReceivedPayout[_poolId][finalReceiver] = true;
        _markMemberReceived(_poolId, finalReceiver);

        pool.poolBalance = 0;
        pool.finalReceiverReserve = 0;
        pool.status = PoolStatus.COMPLETED;
        pool.phase = RoundPhase.COMPLETED;

        token.safeTransfer(finalReceiver, finalPayout);

        emit FinalReceiverPaid(
            _poolId,
            pool.currentRound,
            finalReceiver,
            finalRoundContributions,
            retainedFromPreviousRounds,
            finalPayout
        );

        emit PoolCompleted(_poolId);
    }

    // =========================================================
    // VIEW FUNCTIONS
    // =========================================================

    function getPoolMembers(
        uint256 _poolId
    ) public view returns (Member[] memory) {
        return poolMembers[_poolId];
    }

    function getRequiredPaymentsForCurrentRound(
        uint256 _poolId
    ) public view returns (uint256) {
        Pool storage pool = pools[_poolId];
        _requireExistingPool(pool);

        return _requiredPaymentsForCurrentRound(_poolId);
    }

    function getEligibleReceiverCount(
        uint256 _poolId
    ) public view returns (uint256) {
        Pool storage pool = pools[_poolId];
        _requireExistingPool(pool);

        return _eligibleReceiverCount(_poolId);
    }

    function getCurrentSelectedReceiver(
        uint256 _poolId
    ) public view returns (address, uint256) {
        Pool storage pool = pools[_poolId];
        _requireExistingPool(pool);

        return (
            selectedReceiver[_poolId][pool.currentRound],
            lowestAcceptedPayout[_poolId][pool.currentRound]
        );
    }

    function getFinalReceiver(
        uint256 _poolId
    ) public view returns (address) {
        Pool storage pool = pools[_poolId];
        _requireExistingPool(pool);

        (address receiver, uint256 remainingCount) =
            _findRemainingReceiver(_poolId);

        if (remainingCount == 1) {
            return receiver;
        }

        return address(0);
    }

    function isFinalRound(
        uint256 _poolId
    ) public view returns (bool) {
        Pool storage pool = pools[_poolId];
        _requireExistingPool(pool);

        return _isFinalRound(_poolId);
    }

    // =========================================================
    // INTERNAL HELPERS
    // =========================================================

    function _normalRoundPot(
        uint256 _poolId
    ) internal view returns (uint256) {
        Pool storage pool = pools[_poolId];

        return pool.contributionAmount * pool.maxMembers;
    }

    function _requiredPaymentsForCurrentRound(
        uint256 _poolId
    ) internal view returns (uint256) {
        Pool storage pool = pools[_poolId];

        if (_isFinalRound(_poolId)) {
            return pool.maxMembers - 1;
        }

        return pool.maxMembers;
    }

    function _eligibleReceiverCount(
        uint256 _poolId
    ) internal view returns (uint256 count) {
        for (uint256 i = 0; i < poolMembers[_poolId].length; i++) {
            address memberWallet = poolMembers[_poolId][i].wallet;

            if (!hasReceivedPayout[_poolId][memberWallet]) {
                count++;
            }
        }
    }

    function _findRemainingReceiver(
        uint256 _poolId
    ) internal view returns (
        address receiver,
        uint256 remainingCount
    ) {
        for (uint256 i = 0; i < poolMembers[_poolId].length; i++) {
            address memberWallet = poolMembers[_poolId][i].wallet;

            if (!hasReceivedPayout[_poolId][memberWallet]) {
                receiver = memberWallet;
                remainingCount++;
            }
        }
    }

    function _markMemberReceived(
        uint256 _poolId,
        address _receiver
    ) internal {
        for (uint256 i = 0; i < poolMembers[_poolId].length; i++) {
            if (poolMembers[_poolId][i].wallet == _receiver) {
                require(
                    !poolMembers[_poolId][i].hasReceived,
                    "Member was already marked received"
                );

                poolMembers[_poolId][i].hasReceived = true;
                return;
            }
        }

        revert("Receiver not found");
    }

    function _isFinalRound(
        uint256 _poolId
    ) internal view returns (bool) {
        Pool storage pool = pools[_poolId];

        return pool.currentRound == pool.totalRounds;
    }

    function _requireExistingPool(
        Pool storage pool
    ) internal view {
        require(pool.id != 0, "Pool not found");
    }

    function _requireActivePool(
        Pool storage pool
    ) internal view {
        _requireExistingPool(pool);
        require(pool.status == PoolStatus.ACTIVE, "Pool not active");
    }

    // =========================================================
    // ADMIN
    // =========================================================

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
}