const { ethers } = require("hardhat");

async function main() {

    // Deploy MockERC20
    const MockERC20 = await ethers.getContractFactory("MockERC20");

    const token = await MockERC20.deploy();

    await token.waitForDeployment();

    const tokenAddress = await token.getAddress();

    console.log("MockERC20 deployed to:", tokenAddress);

    // Deploy CommunityLending
    const CommunityLending = await ethers.getContractFactory("CommunityLending");

    const lending = await CommunityLending.deploy(tokenAddress);

    await lending.waitForDeployment();

    console.log(
        "CommunityLending deployed to:",
        await lending.getAddress()
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});