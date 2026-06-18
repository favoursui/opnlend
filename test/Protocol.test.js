const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OPNLend Protocol", function () {
  let oracle, creditScore, lendingPool, loanManager, liquidator;
  let owner, alice, bob, carol;

  beforeEach(async () => {
    [owner, alice, bob, carol] = await ethers.getSigners();

    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    oracle = await PriceOracle.deploy(100000000); // $1.00

    const CreditScore = await ethers.getContractFactory("CreditScore");
    creditScore = await CreditScore.deploy();

    const LendingPool = await ethers.getContractFactory("LendingPool");
    lendingPool = await LendingPool.deploy(await oracle.getAddress(), await creditScore.getAddress());

    const LoanManager = await ethers.getContractFactory("LoanManager");
    loanManager = await LoanManager.deploy(await lendingPool.getAddress(), await creditScore.getAddress());

    const Liquidator = await ethers.getContractFactory("Liquidator");
    liquidator = await Liquidator.deploy(await lendingPool.getAddress(), await creditScore.getAddress());

    await creditScore.setLoanManager(await loanManager.getAddress());
    await creditScore.setLiquidator(await liquidator.getAddress());
    await lendingPool.setLoanManager(await loanManager.getAddress());
    await lendingPool.setLiquidator(await liquidator.getAddress());
  });

  describe("CreditScore", () => {
    it("returns baseline 400 for fresh wallet", async () => {
      expect(await creditScore.getScore(alice.address)).to.equal(400n);
    });

    it("fresh wallet (score 400) is Subprime -> 0.75x multiplier", async () => {
      // Baseline 400 falls in the Subprime band (300-499); Neutral is 500-799.
      expect(await creditScore.getTier(alice.address)).to.equal(1n);
      expect(await creditScore.getBorrowMultiplierBps(alice.address)).to.equal(7500n);
    });

    it("Neutral tier (score >= 500) maps to 1.0x multiplier", async () => {
      // baseline 400 + active 100 (tx >= 10) = 500 -> Neutral
      await creditScore.seedTxCount(alice.address, 10, 0);
      expect(await creditScore.getTier(alice.address)).to.equal(2n);
      expect(await creditScore.getBorrowMultiplierBps(alice.address)).to.equal(10000n);
    });

    it("score rises after repayments", async () => {
      await lendingPool.connect(bob).supply({ value: ethers.parseEther("10") });
      await lendingPool.connect(alice).depositCollateral({ value: ethers.parseEther("5") });

      const before = await creditScore.getScore(alice.address);
      await loanManager.connect(alice).borrow(ethers.parseEther("1"));
      await loanManager.connect(alice).repay({ value: ethers.parseEther("1") });
      const after = await creditScore.getScore(alice.address);

      expect(after).to.be.gt(before);
    });

    it("liquidation penalises score", async () => {
      await lendingPool.connect(bob).supply({ value: ethers.parseEther("10") });
      await lendingPool.connect(alice).depositCollateral({ value: ethers.parseEther("2") });
      await loanManager.connect(alice).borrow(ethers.parseEther("1"));

      // Force unhealthy by dropping price (simulate via direct pool call isn't possible,
      // so we just verify the penalty math directly)
      await creditScore.setLiquidator(owner.address);
      await creditScore.connect(owner).recordLiquidation(alice.address);

      const score = await creditScore.getScore(alice.address);
      expect(score).to.be.lt(400n);
    });
  });

  describe("LendingPool — Supply", () => {
    it("accepts supply and mints shares", async () => {
      await lendingPool.connect(bob).supply({ value: ethers.parseEther("1") });
      const info = await lendingPool.getSupplyInfo(bob.address);
      expect(info[0]).to.equal(ethers.parseEther("1"));
    });

    it("reverts on zero supply", async () => {
      await expect(lendingPool.connect(bob).supply({ value: 0 })).to.be.revertedWith("LendingPool: zero");
    });
  });

  describe("LendingPool — Collateral & Borrow", () => {
    beforeEach(async () => {
      await lendingPool.connect(bob).supply({ value: ethers.parseEther("10") });
    });

    it("allows collateral deposit", async () => {
      await lendingPool.connect(alice).depositCollateral({ value: ethers.parseEther("2") });
      const pos = await lendingPool.getPosition(alice.address);
      expect(pos[0]).to.equal(ethers.parseEther("2"));
    });

    it("computes borrow limit using CF and reputation multiplier", async () => {
      await lendingPool.connect(alice).depositCollateral({ value: ethers.parseEther("2") });
      const limit = await lendingPool.borrowLimit(alice.address);
      // Fresh wallet is Subprime (0.75x): 2 ETH * 75% CF * 0.75x = 1.125 ETH
      expect(limit).to.equal(ethers.parseEther("1.125"));
    });

    it("allows borrowing within limit", async () => {
      await lendingPool.connect(alice).depositCollateral({ value: ethers.parseEther("2") });
      await expect(loanManager.connect(alice).borrow(ethers.parseEther("1"))).to.not.be.reverted;
    });

    it("rejects borrow above limit", async () => {
      await lendingPool.connect(alice).depositCollateral({ value: ethers.parseEther("1") });
      await expect(
        loanManager.connect(alice).borrow(ethers.parseEther("5"))
      ).to.be.revertedWith("LendingPool: exceeds borrow limit");
    });

    it("full borrow -> repay cycle reduces debt to zero", async () => {
      await lendingPool.connect(alice).depositCollateral({ value: ethers.parseEther("2") });
      await loanManager.connect(alice).borrow(ethers.parseEther("1"));
      // Debt now accrues interest, so repay with a small buffer; excess is refunded.
      await loanManager.connect(alice).repay({ value: ethers.parseEther("1.01") });
      const pos = await lendingPool.getPosition(alice.address);
      expect(pos[1]).to.equal(0n);
    });

    it("health factor is max uint when no debt", async () => {
      await lendingPool.connect(alice).depositCollateral({ value: ethers.parseEther("2") });
      const hf = await lendingPool.healthFactor(alice.address);
      expect(hf).to.equal(ethers.MaxUint256);
    });
  });

  describe("Liquidator", () => {
    it("reports not liquidatable for healthy position", async () => {
      await lendingPool.connect(bob).supply({ value: ethers.parseEther("10") });
      await lendingPool.connect(alice).depositCollateral({ value: ethers.parseEther("2") });
      await loanManager.connect(alice).borrow(ethers.parseEther("1"));

      expect(await liquidator.isLiquidatable(alice.address)).to.equal(false);
    });
  });

  // ─── Fix #1: borrow limit must stay below the liquidation threshold ──────────
  describe("Fix #1 — Prime borrow limit leaves a liquidation buffer", () => {
    async function makePrime(addr) {
      // baseline 400 + active 100 (tx>=10) + 6 repayments * 50 = 800 -> Prime
      await creditScore.seedTxCount(addr, 10, 0);
      for (let i = 0; i < 6; i++) await creditScore.recordRepayment(addr);
    }

    it("Prime wallet reaches tier 3 with the 1.5x multiplier", async () => {
      await makePrime(alice.address);
      expect(await creditScore.getTier(alice.address)).to.equal(3n);
      expect(await creditScore.getBorrowMultiplierBps(alice.address)).to.equal(15000n);
    });

    it("caps effective LTV so a max borrow is NOT instantly liquidatable", async () => {
      await makePrime(alice.address);
      await lendingPool.connect(bob).supply({ value: ethers.parseEther("10") });
      await lendingPool.connect(alice).depositCollateral({ value: ethers.parseEther("4") });

      const limit = await lendingPool.borrowLimit(alice.address);
      // 4 * min(0.75*1.5, 0.80) = 4 * 0.80 = 3.2 (capped), not 4.5
      expect(limit).to.equal(ethers.parseEther("3.2"));

      await loanManager.connect(alice).borrow(limit);
      expect(await lendingPool.healthFactor(alice.address)).to.be.gte(ethers.parseEther("1"));
      expect(await liquidator.isLiquidatable(alice.address)).to.equal(false);
    });
  });

  // ─── Fix #2: supplier yield is backed by real borrower interest ──────────────
  describe("Fix #2 — Interest accrues to suppliers and is claimable", () => {
    it("supplier earns yield over time and can claim it", async () => {
      await lendingPool.connect(bob).supply({ value: ethers.parseEther("10") });
      await lendingPool.connect(alice).depositCollateral({ value: ethers.parseEther("5") });
      // Fresh wallet is Subprime: limit = 5 * 0.5625 = 2.8125; borrow within it.
      await loanManager.connect(alice).borrow(ethers.parseEther("2"));

      // advance ~30 days
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      const info = await lendingPool.getSupplyInfo(bob.address);
      expect(info[2]).to.be.gt(0n); // yieldEarned

      const balBefore = await ethers.provider.getBalance(bob.address);
      const tx = await lendingPool.connect(bob).claimYield();
      const rcpt = await tx.wait();
      const gas = rcpt.gasUsed * rcpt.gasPrice;
      const balAfter = await ethers.provider.getBalance(bob.address);
      expect(balAfter + gas).to.be.gt(balBefore); // received yield
    });
  });

  // ─── Fix #3: collateral is segregated from lendable liquidity ────────────────
  describe("Fix #3 — Collateral is not lent out to borrowers/suppliers", () => {
    it("borrows can only draw on supplied liquidity, never collateral", async () => {
      await lendingPool.connect(bob).supply({ value: ethers.parseEther("1") });
      // Alice deposits lots of collateral, but only 1 IOPN of real supply exists.
      await lendingPool.connect(alice).depositCollateral({ value: ethers.parseEther("10") });
      expect(await lendingPool.availableLiquidity()).to.equal(ethers.parseEther("1"));

      // Limit is 7.5 (10*0.75) but liquidity caps the borrow at 1.
      await expect(
        loanManager.connect(alice).borrow(ethers.parseEther("2"))
      ).to.be.revertedWith("LendingPool: insufficient liquidity");
    });
  });
});
