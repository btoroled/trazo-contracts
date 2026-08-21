import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("Counter", function () {
  it("deploys and updates its value", async function () {
    const counter = await ethers.deployContract("Counter");

    await expect(counter.incrementBy(2n))
      .to.emit(counter, "Incremented")
      .withArgs(2n, 2n);
    expect(await counter.value()).to.equal(2n);
  });

  it("rejects an empty increment", async function () {
    const counter = await ethers.deployContract("Counter");

    await expect(counter.incrementBy(0n)).to.be.revertedWith(
      "increment must be positive",
    );
  });
});
