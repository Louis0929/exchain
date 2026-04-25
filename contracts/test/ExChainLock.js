const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ExChainLock", function () {
  let lock, usdc, partyA, partyB, other;
  const AMOUNT_A = ethers.parseUnits("1000", 6);
  const AMOUNT_B = ethers.parseUnits("1000", 6);
  const DURATION = 365 * 24 * 3600;

  beforeEach(async function () {
    [partyA, partyB, other] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USDC", "USDC", 6);
    await usdc.waitForDeployment();

    await usdc.mint(partyA.address, ethers.parseUnits("10000", 6));
    await usdc.mint(partyB.address, ethers.parseUnits("10000", 6));

    const ExChainLock = await ethers.getContractFactory("ExChainLock");
    lock = await ExChainLock.deploy(
      partyA.address,
      partyB.address,
      AMOUNT_A,
      AMOUNT_B,
      DURATION,
      10000,
      await usdc.getAddress()
    );
    await lock.waitForDeployment();

    await usdc.connect(partyA).approve(await lock.getAddress(), AMOUNT_A);
    await usdc.connect(partyB).approve(await lock.getAddress(), AMOUNT_B);
  });

  describe("Deployment", function () {
    it("sets correct parties and amounts", async function () {
      expect(await lock.partyA()).to.equal(partyA.address);
      expect(await lock.partyB()).to.equal(partyB.address);
      expect(await lock.amountA()).to.equal(AMOUNT_A);
      expect(await lock.amountB()).to.equal(AMOUNT_B);
      expect(await lock.splitRatio()).to.equal(10000);
      expect(await lock.isActive()).to.equal(false);
    });
  });

  describe("Deposits", function () {
    it("allows partyA to deposit", async function () {
      await expect(lock.connect(partyA).depositA())
        .to.emit(lock, "Deposited")
        .withArgs(partyA.address, AMOUNT_A);
      expect(await lock.aDeposited()).to.equal(true);
    });

    it("allows partyB to deposit", async function () {
      await expect(lock.connect(partyB).depositB())
        .to.emit(lock, "Deposited")
        .withArgs(partyB.address, AMOUNT_B);
      expect(await lock.bDeposited()).to.equal(true);
    });

    it("activates lock when both deposit", async function () {
      await lock.connect(partyA).depositA();
      await lock.connect(partyB).depositB();
      expect(await lock.isActive()).to.equal(true);
    });

    it("rejects deposit from non-party", async function () {
      await expect(lock.connect(other).depositA()).to.be.revertedWithCustomError(
        lock, "NotParty"
      );
    });

    it("rejects double deposit", async function () {
      await lock.connect(partyA).depositA();
      await expect(lock.connect(partyA).depositA()).to.be.revertedWithCustomError(
        lock, "AlreadyDeposited"
      );
    });
  });

  describe("24h timeout refund", function () {
    it("refunds if only one party deposits within 24h", async function () {
      await lock.connect(partyA).depositA();
      await time.increase(25 * 3600);
      await expect(lock.refund())
        .to.emit(lock, "Refunded")
        .withArgs(partyA.address, AMOUNT_A);
      expect(await lock.aDeposited()).to.equal(false);
    });

    it("cannot refund while deposit window is open", async function () {
      await lock.connect(partyA).depositA();
      await expect(lock.refund()).to.be.revertedWithCustomError(
        lock, "DepositWindowOpen"
      );
    });
  });

  describe("Withdraw (peace mode)", function () {
    beforeEach(async function () {
      await lock.connect(partyA).depositA();
      await lock.connect(partyB).depositB();
    });

    it("allows withdrawal after deadline", async function () {
      await time.increase(DURATION + 1);
      const balanceBefore = await usdc.balanceOf(partyA.address);
      await expect(lock.withdraw())
        .to.emit(lock, "Withdrawn")
        .withArgs(partyA.address, AMOUNT_A);
      const balanceAfter = await usdc.balanceOf(partyA.address);
      expect(balanceAfter - balanceBefore).to.equal(AMOUNT_A);
    });

    it("rejects withdrawal before deadline", async function () {
      await expect(lock.withdraw()).to.be.revertedWithCustomError(
        lock, "DeadlineNotPassed"
      );
    });
  });

  describe("Breakup", function () {
    it("distributes by split ratio on breakup", async function () {
      const ExChainLock = await ethers.getContractFactory("ExChainLock");
      const lockSplit = await ExChainLock.deploy(
        partyA.address,
        partyB.address,
        AMOUNT_A,
        AMOUNT_B,
        DURATION,
        6000,
        await usdc.getAddress()
      );
      await lockSplit.waitForDeployment();

      await usdc.connect(partyA).approve(await lockSplit.getAddress(), AMOUNT_A);
      await usdc.connect(partyB).approve(await lockSplit.getAddress(), AMOUNT_B);

      await lockSplit.connect(partyA).depositA();
      await lockSplit.connect(partyB).depositB();

      const total = AMOUNT_A + AMOUNT_B;
      const expectedA = (total * 6000n) / 10000n;
      const expectedB = total - expectedA;

      await expect(lockSplit.connect(partyA).breakup())
        .to.emit(lockSplit, "Breakup")
        .withArgs(partyA.address, expectedA, expectedB);
    });

    it("rejects breakup from non-party", async function () {
      await lock.connect(partyA).depositA();
      await lock.connect(partyB).depositB();
      await expect(lock.connect(other).breakup()).to.be.revertedWithCustomError(
        lock, "NotParty"
      );
    });
  });

  describe("Renew", function () {
    beforeEach(async function () {
      await lock.connect(partyA).depositA();
      await lock.connect(partyB).depositB();
    });

    it("allows party to renew", async function () {
      const newDeadline = (await time.latest()) + DURATION * 2;
      await expect(lock.connect(partyA).renew(newDeadline))
        .to.emit(lock, "Renewed")
        .withArgs(newDeadline);
    });
  });

  describe("Early exit", function () {
    beforeEach(async function () {
      await lock.connect(partyA).depositA();
      await lock.connect(partyB).depositB();
    });

    it("allows early exit", async function () {
      await expect(lock.connect(partyA).earlyExit())
        .to.emit(lock, "Withdrawn");
      expect(await lock.isActive()).to.equal(false);
    });
  });
});
