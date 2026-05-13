const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CommunityLending", function () {

    let token;
    let lending;

    let owner;
    let user1;
    let user2;

    beforeEach(async function () {

        [owner, user1, user2] = await ethers.getSigners();

        // Deploy MockERC20
        const MockERC20 = await ethers.getContractFactory("MockERC20");

        token = await MockERC20.deploy();

        await token.waitForDeployment();

        // Deploy CommunityLending
        const CommunityLending = await ethers.getContractFactory("CommunityLending");

        lending = await CommunityLending.deploy(
            await token.getAddress()
        );

        await lending.waitForDeployment();
    });

    it("Should create pool", async function () {

        await lending.createPool(
            "Student Fund",
            ethers.parseEther("10"),
            5
        );

        const pool = await lending.pools(1);

        expect(pool.name).to.equal("Student Fund");
    });

    it("Should join pool", async function () {

        await lending.createPool(
            "Student Fund",
            ethers.parseEther("10"),
            5
        );

        await lending.connect(user1).joinPool(1);

        const members = await lending.getPoolMembers(1);

        expect(members.length).to.equal(1);
    });

    it("Should deposit token", async function () {

        await lending.createPool(
            "Student Fund",
            ethers.parseEther("10"),
            5
        );

        await lending.connect(user1).joinPool(1);

        // Mint token cho user1
        await token.mint(
            user1.address,
            ethers.parseEther("100")
        );

        // Approve contract
        await token.connect(user1).approve(
            await lending.getAddress(),
            ethers.parseEther("10")
        );

        // Deposit
        await lending.connect(user1).deposit(1);

        const balance = await token.balanceOf(
            await lending.getAddress()
        );

        expect(balance).to.equal(
            ethers.parseEther("10")
        );
    });

    it("Should reject non-member deposit", async function () {

        await lending.createPool(
            "Student Fund",
            ethers.parseEther("10"),
            5
        );

        await expect(

            lending.connect(user1).deposit(1)

        ).to.be.revertedWith("Not a member");
    });

    it("Should reject join when pool is full", async function () {

        await lending.createPool(
            "Student Fund",
            ethers.parseEther("10"),
            1
        );

        await lending.connect(user1).joinPool(1);

        await expect(

            lending.connect(user2).joinPool(1)

        ).to.be.revertedWith("Pool full");
    });
});