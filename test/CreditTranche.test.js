/**
 * CreditTranche.test.js
 * Run with:  npx hardhat test
 */

const { expect }        = require("chai");
const { ethers }        = require("hardhat");
const { scoreApplicant } = require("../scripts/scorer");

describe("CreditTranche", function () {
  let contract;
  let owner;   // DEFAULT_ADMIN
  let admin;   // ADMIN_ROLE
  let user1;
  let user2;
  let stranger;

  const ADMIN_ROLE         = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

  const FAKE_REF = "QmFakeIpfsHashABC123";

  beforeEach(async () => {
    [owner, admin, user1, user2, stranger] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("CreditTranche");
    contract = await Factory.deploy(owner.address);

    // Grant ADMIN_ROLE to the admin signer
    await contract.connect(owner).addAdmin(admin.address);
  });

  // ── Deployment ─────────────────────────────────────────────────────────────
  describe("Deployment", () => {
    it("grants DEFAULT_ADMIN_ROLE to deployer", async () => {
      expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("grants ADMIN_ROLE to deployer", async () => {
      expect(await contract.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("grants ADMIN_ROLE to added admin", async () => {
      expect(await contract.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });
  });

  // ── Access control ─────────────────────────────────────────────────────────
  describe("Access Control", () => {
    it("non-admin cannot assignTranche", async () => {
      await expect(
        contract.connect(stranger).assignTranche(user1.address, 3, 80, FAKE_REF)
      ).to.be.reverted;
    });

    it("non-admin cannot getProfile", async () => {
      await contract.connect(admin).assignTranche(user1.address, 3, 80, FAKE_REF);
      await expect(
        contract.connect(stranger).getProfile(user1.address)
      ).to.be.reverted;
    });

    it("non-admin cannot getAllUsers", async () => {
      await expect(
        contract.connect(stranger).getAllUsers()
      ).to.be.reverted;
    });

    it("only DEFAULT_ADMIN can add a new admin", async () => {
      await expect(
        contract.connect(admin).addAdmin(stranger.address)
      ).to.be.reverted;
    });

    it("DEFAULT_ADMIN can remove an admin", async () => {
      await contract.connect(owner).removeAdmin(admin.address);
      expect(await contract.hasRole(ADMIN_ROLE, admin.address)).to.be.false;
    });
  });

  // ── Tranche assignment ─────────────────────────────────────────────────────
  describe("assignTranche", () => {
    it("assigns AAA (trancheId=3) correctly", async () => {
      await contract.connect(admin).assignTranche(user1.address, 3, 80, FAKE_REF);
      expect(await contract.getTranche(user1.address)).to.equal("AAA");
      expect(await contract.getScore(user1.address)).to.equal(80);
    });

    it("assigns AA (trancheId=2) correctly", async () => {
      await contract.connect(admin).assignTranche(user1.address, 2, 60, FAKE_REF);
      expect(await contract.getTranche(user1.address)).to.equal("AA");
    });

    it("assigns B (trancheId=1) correctly", async () => {
      await contract.connect(admin).assignTranche(user1.address, 1, 35, FAKE_REF);
      expect(await contract.getTranche(user1.address)).to.equal("B");
    });

    it("emits TrancheAssigned on first assignment", async () => {
      await expect(
        contract.connect(admin).assignTranche(user1.address, 3, 80, FAKE_REF)
      )
        .to.emit(contract, "TrancheAssigned")
        .withArgs(user1.address, 3, 80, await latestTimestamp());
    });

    it("emits TrancheUpdated on re-assignment", async () => {
      await contract.connect(admin).assignTranche(user1.address, 3, 80, FAKE_REF);
      await expect(
        contract.connect(admin).assignTranche(user1.address, 2, 60, FAKE_REF)
      ).to.emit(contract, "TrancheUpdated");
    });

    it("reverts on invalid tranche value", async () => {
      await expect(
        contract.connect(admin).assignTranche(user1.address, 0, 50, FAKE_REF)
      ).to.be.revertedWith("Tranche must be 1, 2, or 3");

      await expect(
        contract.connect(admin).assignTranche(user1.address, 4, 50, FAKE_REF)
      ).to.be.revertedWith("Tranche must be 1, 2, or 3");
    });

    it("reverts on score > 100", async () => {
      await expect(
        contract.connect(admin).assignTranche(user1.address, 3, 101, FAKE_REF)
      ).to.be.revertedWith("Score must be 0–100");
    });

    it("reverts on empty data ref", async () => {
      await expect(
        contract.connect(admin).assignTranche(user1.address, 3, 80, "")
      ).to.be.revertedWith("Data ref required");
    });

    it("reverts on zero address", async () => {
      await expect(
        contract.connect(admin).assignTranche(ethers.ZeroAddress, 3, 80, FAKE_REF)
      ).to.be.revertedWith("Zero address");
    });
  });

  // ── Profile queries ────────────────────────────────────────────────────────
  describe("Profile queries", () => {
    beforeEach(async () => {
      await contract.connect(admin).assignTranche(user1.address, 3, 85, FAKE_REF);
    });

    it("getProfile returns correct data for admin", async () => {
      const [tranche, score, ref] = await contract.connect(admin).getProfile(user1.address);
      expect(tranche).to.equal(3n);    // Tranche.AAA
      expect(score).to.equal(85n);
      expect(ref).to.equal(FAKE_REF);
    });

    it("getTranche is public (no role needed)", async () => {
      expect(await contract.connect(stranger).getTranche(user1.address)).to.equal("AAA");
    });

    it("getScore is public", async () => {
      expect(await contract.connect(stranger).getScore(user1.address)).to.equal(85n);
    });

    it("profileExists returns true after assignment", async () => {
      expect(await contract.profileExists(user1.address)).to.be.true;
    });

    it("profileExists returns false for unknown address", async () => {
      expect(await contract.profileExists(user2.address)).to.be.false;
    });

    it("reverts getTranche for unknown address", async () => {
      await expect(contract.getTranche(user2.address)).to.be.revertedWith("Profile not found");
    });

    it("getAllUsers returns all profiled addresses", async () => {
      await contract.connect(admin).assignTranche(user2.address, 2, 60, FAKE_REF);
      const users = await contract.connect(admin).getAllUsers();
      expect(users).to.include(user1.address);
      expect(users).to.include(user2.address);
    });
  });

  // ── Off-chain scorer integration ───────────────────────────────────────────
  describe("Scorer → Contract integration", () => {
    const cases = [
      {
        label: "AAA applicant",
        data: { creditScore: 780, annualIncome: 120_000, dtiRatio: 0.18, employmentStatus: "full-time",     paymentHistory: 0.99, loanAmount: 25_000 },
        expectedTranche: "AAA",
      },
      {
        label: "AA applicant",
        data: { creditScore: 680, annualIncome: 60_000,  dtiRatio: 0.38, employmentStatus: "self-employed", paymentHistory: 0.91, loanAmount: 15_000 },
        expectedTranche: "AA",
      },
      {
        label: "B applicant",
        data: { creditScore: 580, annualIncome: 30_000,  dtiRatio: 0.55, employmentStatus: "part-time",     paymentHistory: 0.65, loanAmount: 10_000 },
        expectedTranche: "B",
      },
    ];

    for (const tc of cases) {
      it(`scores and stores ${tc.label} correctly`, async () => {
        const result = scoreApplicant(tc.data);
        expect(result.tranche).to.equal(tc.expectedTranche);

        await contract.connect(admin).assignTranche(
          user1.address,
          result.trancheId,
          result.score,
          FAKE_REF
        );

        expect(await contract.getTranche(user1.address)).to.equal(tc.expectedTranche);
        expect(await contract.getScore(user1.address)).to.equal(BigInt(result.score));
      });
    }
  });
});

// ── Helper ────────────────────────────────────────────────────────────────────
async function latestTimestamp() {
  const block = await ethers.provider.getBlock("latest");
  return BigInt(block.timestamp + 1); // +1 because the tx mines the next block
}
