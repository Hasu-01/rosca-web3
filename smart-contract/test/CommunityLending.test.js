const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CommunityLending - ROSCA Standard Rule", function () {
    let token;
    let lending;
    let owner;
    let user1;
    let user2;
    let user3;
    let user4;

    const contribution = ethers.parseEther("10");

    beforeEach(async function () {
        [owner, user1, user2, user3, user4] = await ethers.getSigners();

        const MockERC20 = await ethers.getContractFactory("MockERC20");
        token = await MockERC20.deploy();
        await token.waitForDeployment();

        const CommunityLending = await ethers.getContractFactory("CommunityLending");
        lending = await CommunityLending.deploy(await token.getAddress());
        await lending.waitForDeployment();
    });

    async function mintAndApprove(user, amount = ethers.parseEther("1000")) {
        await token.mint(user.address, amount);
        await token
            .connect(user)
            .approve(await lending.getAddress(), amount);
    }

    async function createAndStartThreeMemberPool() {
        await lending.createPool("Student Hui", contribution, 3);

        await lending.connect(user1).joinPool(1);
        await lending.connect(user2).joinPool(1);
        await lending.connect(user3).joinPool(1);

        await lending.startPool(1);

        await mintAndApprove(user1);
        await mintAndApprove(user2);
        await mintAndApprove(user3);
    }

    async function payRound1AllMembers() {
        await lending.connect(user1).deposit(1);
        await lending.connect(user2).deposit(1);
        await lending.connect(user3).deposit(1);
    }

    it("Should create pool", async function () {
        await lending.createPool("Student Hui", contribution, 3);

        const pool = await lending.pools(1);

        expect(pool.name).to.equal("Student Hui");
        expect(pool.maxMembers).to.equal(3);
        expect(pool.totalRounds).to.equal(3);
        expect(pool.status).to.equal(0); // OPEN
    });

    it("Should join pool", async function () {
        await lending.createPool("Student Hui", contribution, 3);

        await lending.connect(user1).joinPool(1);

        const members = await lending.getPoolMembers(1);

        expect(members.length).to.equal(1);
        expect(members[0].wallet).to.equal(user1.address);
    });

    it("Should reject duplicate join", async function () {
        await lending.createPool("Student Hui", contribution, 3);

        await lending.connect(user1).joinPool(1);

        await expect(
            lending.connect(user1).joinPool(1)
        ).to.be.revertedWith("Duplicate member");
    });

    it("Should reject join when pool is full", async function () {
        await lending.createPool("Student Hui", contribution, 2);

        await lending.connect(user1).joinPool(1);
        await lending.connect(user2).joinPool(1);

        await expect(
            lending.connect(user3).joinPool(1)
        ).to.be.revertedWith("Pool full");
    });

    it("Should start pool only when full", async function () {
        await lending.createPool("Student Hui", contribution, 3);

        await lending.connect(user1).joinPool(1);

        await expect(
            lending.startPool(1)
        ).to.be.revertedWith("Pool not full");

        await lending.connect(user2).joinPool(1);
        await lending.connect(user3).joinPool(1);

        await lending.startPool(1);

        const pool = await lending.pools(1);
        expect(pool.status).to.equal(1); // ACTIVE
    });

    it("Should accept deposits and open offer phase when all members paid", async function () {
        await createAndStartThreeMemberPool();

        await payRound1AllMembers();

        const pool = await lending.pools(1);

        expect(pool.poolBalance).to.equal(ethers.parseEther("30"));
        expect(pool.phase).to.equal(2); // OFFERING
        expect(await lending.getRequiredPaymentsForCurrentRound(1)).to.equal(3);
    });

    it("Should reject double deposit in same round", async function () {
        await createAndStartThreeMemberPool();

        await lending.connect(user1).deposit(1);

        await expect(
            lending.connect(user1).deposit(1)
        ).to.be.revertedWith("Already paid this round");
    });

    it("Should not allow withdrawal before all members paid", async function () {
        await createAndStartThreeMemberPool();

        await lending.connect(user1).deposit(1);
        await lending.connect(user2).deposit(1);

        await expect(
            lending.connect(user1).submitWithdrawalOffer(1, ethers.parseEther("25"))
        ).to.be.revertedWith("Offer phase is not open");
    });

    it("Should select the member accepting the lowest payout", async function () {
        await createAndStartThreeMemberPool();
        await payRound1AllMembers();

        await lending.connect(user1).submitWithdrawalOffer(1, ethers.parseEther("28"));
        await lending.connect(user2).submitWithdrawalOffer(1, ethers.parseEther("25"));
        await lending.connect(user3).skipWithdrawalOffer(1);

        const selected = await lending.getCurrentSelectedReceiver(1);

        expect(selected[0]).to.equal(user2.address);
        expect(selected[1]).to.equal(ethers.parseEther("25"));
    });

    it("Should reject duplicate accepted payout amount in the same round", async function () {
        await createAndStartThreeMemberPool();
        await payRound1AllMembers();

        await lending.connect(user1).submitWithdrawalOffer(1, ethers.parseEther("28"));

        await expect(
            lending.connect(user2).submitWithdrawalOffer(1, ethers.parseEther("28"))
        ).to.be.revertedWith("Accepted payout already used");
    });

    it("Should not complete round until all eligible members respond", async function () {
        await createAndStartThreeMemberPool();
        await payRound1AllMembers();

        await lending.connect(user1).submitWithdrawalOffer(1, ethers.parseEther("28"));

        await expect(
            lending.withdrawCurrentRound(1)
        ).to.be.revertedWith("Waiting for all eligible member responses");
    });

    it("Should complete normal round and retain difference for final receiver", async function () {
        await createAndStartThreeMemberPool();
        await payRound1AllMembers();

        await lending.connect(user1).submitWithdrawalOffer(1, ethers.parseEther("28"));
        await lending.connect(user2).submitWithdrawalOffer(1, ethers.parseEther("25"));
        await lending.connect(user3).skipWithdrawalOffer(1);

        const beforeUser2 = await token.balanceOf(user2.address);

        await lending.withdrawCurrentRound(1);

        const afterUser2 = await token.balanceOf(user2.address);
        const pool = await lending.pools(1);

        expect(afterUser2 - beforeUser2).to.equal(ethers.parseEther("25"));
        expect(pool.currentRound).to.equal(2);
        expect(pool.phase).to.equal(1); // CONTRIBUTING
        expect(pool.finalReceiverReserve).to.equal(ethers.parseEther("5"));
        expect(await lending.hasReceivedPayout(1, user2.address)).to.equal(true);
    });

    it("Should not allow a previous receiver to offer again", async function () {
        await createAndStartThreeMemberPool();

        // Round 1: user2 receives
        await payRound1AllMembers();

        await lending.connect(user1).submitWithdrawalOffer(1, ethers.parseEther("28"));
        await lending.connect(user2).submitWithdrawalOffer(1, ethers.parseEther("25"));
        await lending.connect(user3).skipWithdrawalOffer(1);

        await lending.withdrawCurrentRound(1);

        // Round 2 deposits
        await lending.connect(user1).deposit(1);
        await lending.connect(user2).deposit(1);
        await lending.connect(user3).deposit(1);

        await expect(
            lending.connect(user2).submitWithdrawalOffer(1, ethers.parseEther("25"))
        ).to.be.revertedWith("Member already received payout");
    });

    it("Should automatically pay final receiver after final required deposit", async function () {
        await createAndStartThreeMemberPool();

        // Round 1: user2 receives 25, reserve = 5
        await payRound1AllMembers();
        await lending.connect(user1).submitWithdrawalOffer(1, ethers.parseEther("28"));
        await lending.connect(user2).submitWithdrawalOffer(1, ethers.parseEther("25"));
        await lending.connect(user3).skipWithdrawalOffer(1);
        await lending.withdrawCurrentRound(1);

        // Round 2: user1 receives 27, reserve += 3
        await lending.connect(user1).deposit(1);
        await lending.connect(user2).deposit(1);
        await lending.connect(user3).deposit(1);

        await lending.connect(user1).submitWithdrawalOffer(1, ethers.parseEther("27"));
        await lending.connect(user3).skipWithdrawalOffer(1);
        await lending.withdrawCurrentRound(1);

        const beforeUser3 = await token.balanceOf(user3.address);

        // Round 3 final: only previous receivers user1 and user2 deposit
        await lending.connect(user1).deposit(1);

        let poolBeforeLastDeposit = await lending.pools(1);
        expect(poolBeforeLastDeposit.status).to.equal(1); // ACTIVE

        await lending.connect(user2).deposit(1);

        const afterUser3 = await token.balanceOf(user3.address);
        const pool = await lending.pools(1);

        // Final payout = 2 deposits * 10 + reserve 8 = 28
        expect(afterUser3 - beforeUser3).to.equal(ethers.parseEther("28"));
        expect(pool.status).to.equal(2); // COMPLETED
        expect(pool.phase).to.equal(3); // COMPLETED
        expect(pool.poolBalance).to.equal(0);
        expect(pool.finalReceiverReserve).to.equal(0);
    });

    it("Should reject final receiver paying in final round", async function () {
        await createAndStartThreeMemberPool();

        // Round 1: user2 receives
        await payRound1AllMembers();
        await lending.connect(user1).submitWithdrawalOffer(1, ethers.parseEther("28"));
        await lending.connect(user2).submitWithdrawalOffer(1, ethers.parseEther("25"));
        await lending.connect(user3).skipWithdrawalOffer(1);
        await lending.withdrawCurrentRound(1);

        // Round 2: user1 receives
        await lending.connect(user1).deposit(1);
        await lending.connect(user2).deposit(1);
        await lending.connect(user3).deposit(1);

        await lending.connect(user1).submitWithdrawalOffer(1, ethers.parseEther("27"));
        await lending.connect(user3).skipWithdrawalOffer(1);
        await lending.withdrawCurrentRound(1);

        // Round 3 final: user3 is final receiver and must not pay
        await expect(
            lending.connect(user3).deposit(1)
        ).to.be.revertedWith("Final receiver does not pay final round");
    });
});