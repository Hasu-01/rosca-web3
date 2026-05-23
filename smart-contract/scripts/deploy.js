const hre = require("hardhat");

async function main() {
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy();

  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();

  console.log("MockERC20 deployed to:", tokenAddress);

  const CommunityLending = await hre.ethers.getContractFactory(
    "CommunityLending"
  );

  const rosca = await CommunityLending.deploy(tokenAddress);

  await rosca.waitForDeployment();

  console.log(
    "CommunityLending deployed to:",
    await rosca.getAddress()
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});