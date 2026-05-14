const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CommunityLending", function () {

    let token;
    let lending;

    let owner;
    let user1;
    let user2;
    let user3;

    beforeEach(async function () {

        [owner, user1, user2, user3] =
            await ethers.getSigners();

        // Deploy token
        const MockERC20 =
            await ethers.getContractFactory(
                "MockERC20"
            );

        token = await MockERC20.deploy();

        await token.waitForDeployment();

        // Deploy lending
        const CommunityLending =
            await ethers.getContractFactory(
                "CommunityLending"
            );

        lending =
            await CommunityLending.deploy(
                await token.getAddress()
            );

        await lending.waitForDeployment();
    });

    // =========================
    // CREATE POOL
    // =========================

    it("Should create pool", async function () {

        await lending.createPool(
            "Student Fund",
            ethers.parseEther("10"),
            2
        );

        const pool =
            await lending.pools(1);

        expect(pool.name)
            .to.equal("Student Fund");
    });

    // =========================
    // JOIN POOL
    // =========================

    it("Should join pool", async function () {

        await lending.createPool(
            "Student Fund",
            ethers.parseEther("10"),
            2
        );

        await lending
            .connect(user1)
            .joinPool(1);

        const members =
            await lending.getPoolMembers(1);

        expect(members.length)
            .to.equal(1);
    });

    it("Should reject duplicate join", async function () {

        await lending.createPool(
            "Student Fund",
            ethers.parseEther("10"),
            2
        );

        await lending
            .connect(user1)
            .joinPool(1);

        await expect(

            lending
                .connect(user1)
                .joinPool(1)

        ).to.be.revertedWith(
            "Already joined"
        );
    });

    it("Should reject join when pool full", async function () {

        await lending.createPool(
            "Student Fund",
            ethers.parseEther("10"),
            1
        );

        await lending
            .connect(user1)
            .joinPool(1);

        await expect(

            lending
                .connect(user2)
                .joinPool(1)

        ).to.be.revertedWith(
            "Pool full"
        );
    });

    // =========================
    // START POOL
    // =========================

    it("Should start pool", async function () {

        await lending.createPool(
            "Student Fund",
            ethers.parseEther("10"),
            2
        );

        await lending
            .connect(user1)
            .joinPool(1);

        await lending
            .connect(user2)
            .joinPool(1);

        await lending.startPool(1);

        const pool =
            await lending.pools(1);

        expect(pool.status)
            .to.equal(1);
    });

    it("Should reject start if not full", async function () {

        await lending.createPool(
            "Student Fund",
            ethers.parseEther("10"),
            3
        );

        await lending
            .connect(user1)
            .joinPool(1);

        await expect(

            lending.startPool(1)

        ).to.be.revertedWith(
            "Pool not full"
        );
    });

    // =========================
    // DEPOSIT
    // =========================

    it("Should deposit successfully", async function () {

        await lending.createPool(
            "Student Fund",
            ethers.parseEther("10"),
            2
        );

        await lending
            .connect(user1)
            .joinPool(1);

        await lending
            .connect(user2)
            .joinPool(1);

        await lending.startPool(1);

        // Mint token
        await token.mint(
            user1.address,
            ethers.parseEther("100")
        );

        // Approve
        await token
            .connect(user1)
            .approve(
                await lending.getAddress(),
                ethers.parseEther("10")
            );

        // Deposit
        await lending
            .connect(user1)
            .deposit(1);

        const balance =
            await token.balanceOf(
                await lending.getAddress()
            );

        expect(balance)
            .to.equal(
                ethers.parseEther("10")
            );
    });

    it("Should reject double deposit", async function () {

        await lending.createPool(
            "Student Fund",
            ethers.parseEther("10"),
            2
        );

        await lending
            .connect(user1)
            .joinPool(1);

        await lending
            .connect(user2)
            .joinPool(1);

        await lending.startPool(1);

        await token.mint(
            user1.address,
            ethers.parseEther("100")
        );

        await token
            .connect(user1)
            .approve(
                await lending.getAddress(),
                ethers.parseEther("100")
            );

        await lending
            .connect(user1)
            .deposit(1);

        await expect(

            lending
                .connect(user1)
                .deposit(1)

        ).to.be.revertedWith(
            "Already paid"
        );
    });

    // =========================
    // DISTRIBUTE FUNDS
    // =========================

    it("Should distribute funds", async function () {

        await lending.createPool(
            "Student Fund",
            ethers.parseEther("10"),
            2
        );

        await lending
            .connect(user1)
            .joinPool(1);

        await lending
            .connect(user2)
            .joinPool(1);

        await lending.startPool(1);

        // Mint tokens
        await token.mint(
            user1.address,
            ethers.parseEther("100")
        );

        await token.mint(
            user2.address,
            ethers.parseEther("100")
        );

        // Approve
        await token
            .connect(user1)
            .approve(
                await lending.getAddress(),
                ethers.parseEther("100")
            );

        await token
            .connect(user2)
            .approve(
                await lending.getAddress(),
                ethers.parseEther("100")
            );

        // Deposits
        await lending
            .connect(user1)
            .deposit(1);

        await lending
            .connect(user2)
            .deposit(1);

        const beforeBalance =
            await token.balanceOf(
                user1.address
            );

        // Distribute
        await lending
            .distributeFunds(1);

        const afterBalance =
            await token.balanceOf(
                user1.address
            );

        expect(afterBalance)
            .to.be.gt(beforeBalance);
    });

    // =========================
    // COMPLETE POOL
    // =========================

    it("Should complete pool after rounds", async function () {

        await lending.createPool(
            "Student Fund",
            ethers.parseEther("10"),
            2
        );

        await lending
            .connect(user1)
            .joinPool(1);

        await lending
            .connect(user2)
            .joinPool(1);

        await lending.startPool(1);

        // Mint tokens
        await token.mint(
            user1.address,
            ethers.parseEther("100")
        );

        await token.mint(
            user2.address,
            ethers.parseEther("100")
        );

        // Approve
        await token
            .connect(user1)
            .approve(
                await lending.getAddress(),
                ethers.parseEther("100")
            );

        await token
            .connect(user2)
            .approve(
                await lending.getAddress(),
                ethers.parseEther("100")
            );

        // ROUND 1
        await lending
            .connect(user1)
            .deposit(1);

        await lending
            .connect(user2)
            .deposit(1);

        await lending
            .distributeFunds(1);

        // ROUND 2
        await lending
            .connect(user1)
            .deposit(1);

        await lending
            .connect(user2)
            .deposit(1);

        await lending
            .distributeFunds(1);

        const pool =
            await lending.pools(1);

        expect(pool.status)
            .to.equal(2);
    });
});