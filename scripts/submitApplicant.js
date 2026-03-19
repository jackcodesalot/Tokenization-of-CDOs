/**
 * submitApplicant.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Example of the full off-chain → on-chain flow a bank admin would run:
 *
 *   1. Collect raw credit data
 *   2. Run the scorer to get score + tranche
 *   3. Encrypt the raw PII and upload to IPFS (simulated here)
 *   4. Call assignTranche() on the contract
 *
 * Usage:
 *   npx hardhat run scripts/submitApplicant.js --network localhost
 */

require("dotenv").config();
const hre = require("hardhat");
const { scoreApplicant } = require("./scorer");

// ── Simulate encryption + IPFS upload ───────────────────────────────────────
// In production:
//   - Encrypt the raw PII blob with the admin's public key (e.g. using lit-protocol or KMS)
//   - Upload the encrypted blob to IPFS
//   - Store the returned CID here
function encryptAndUpload(rawData) {
  // PLACEHOLDER — replace with real encryption + IPFS upload
  const fakeIpfsCID = "QmSimulatedHash_" + Buffer.from(JSON.stringify(rawData)).toString("base64").slice(0, 20);
  console.log("  [sim] Encrypted blob uploaded. CID:", fakeIpfsCID);
  return fakeIpfsCID;
}

async function main() {
  // ── 1. Raw credit data from the bank ──────────────────────────────────────
  const applicantAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // example
  const rawCreditData = {
    creditScore:      720,
    annualIncome:     85_000,
    dtiRatio:         0.28,
    employmentStatus: "full-time",
    paymentHistory:   0.96,
    loanAmount:       20_000,
  };

  console.log("\n── Scoring applicant ──────────────────────────────────────────");
  const result = scoreApplicant(rawCreditData);
  console.log("  Score:   ", result.score, "/ 100");
  console.log("  Tranche: ", result.tranche);
  console.log("  Breakdown:", result.breakdown);

  // ── 2. Encrypt PII and get a reference ────────────────────────────────────
  console.log("\n── Encrypting & uploading PII ─────────────────────────────────");
  const encryptedRef = encryptAndUpload(rawCreditData);

  // ── 3. Submit to contract ─────────────────────────────────────────────────
  console.log("\n── Submitting to contract ─────────────────────────────────────");
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) throw new Error("Set CONTRACT_ADDRESS in your .env");

  const contract = await hre.ethers.getContractAt("CreditTranche", contractAddress);
  const [admin] = await hre.ethers.getSigners();

  const tx = await contract.connect(admin).assignTranche(
    applicantAddress,
    result.trancheId,     // 1=B, 2=AA, 3=AAA
    result.score,
    encryptedRef
  );
  await tx.wait();

  console.log("  ✅ Transaction confirmed:", tx.hash);
  console.log("  User:", applicantAddress);
  console.log("  Assigned tranche:", result.tranche);

  // ── 4. Verify on-chain ────────────────────────────────────────────────────
  const onChainTranche = await contract.getTranche(applicantAddress);
  const onChainScore   = await contract.getScore(applicantAddress);
  console.log("\n── On-chain verification ──────────────────────────────────────");
  console.log("  Tranche (on-chain):", onChainTranche);
  console.log("  Score   (on-chain):", onChainScore.toString());
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
