import { network } from "hardhat";

const { ethers } = await network.create({ network: "localhost" });
const counter = await ethers.deployContract("Counter");

await counter.waitForDeployment();
console.log(`Counter deployed to ${await counter.getAddress()}`);
