/**
 * scorer.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Off-chain credit scoring engine.
 *
 * Run by a bank admin backend before submitting to the smart contract.
 * Returns a 0–100 composite score and the matching tranche (A / B / C).
 *
 * SCORING BREAKDOWN (total: 100 pts)
 * ─────────────────────────────────
 *  Credit Score       → up to 30 pts
 *  Debt-to-Income     → up to 25 pts
 *  Annual Income      → up to 20 pts
 *  Payment History    → up to 15 pts
 *  Employment Status  → up to 10 pts
 *
 * TRANCHE THRESHOLDS
 * ──────────────────
 *  A  →  score >= 75   (low risk)
 *  B  →  score >= 50   (moderate risk)
 *  C  →  score <  50   (high risk)
 */

// ─── Scoring tables ──────────────────────────────────────────────────────────

function scoreCreditScore(value) {
  if (value >= 750) return 30;
  if (value >= 700) return 24;
  if (value >= 650) return 18;
  if (value >= 600) return 12;
  return 0;
}

function scoreDTI(ratio) {
  // ratio is a decimal: 0.35 = 35%
  if (ratio < 0.20) return 25;
  if (ratio < 0.35) return 20;
  if (ratio < 0.43) return 12;
  if (ratio < 0.50) return 6;
  return 0;
}

function scoreIncome(usd) {
  if (usd >= 100_000) return 20;
  if (usd >= 75_000)  return 16;
  if (usd >= 50_000)  return 12;
  if (usd >= 35_000)  return 6;
  return 0;
}

function scorePaymentHistory(ratio) {
  // ratio is a decimal: 0.95 = 95% on-time
  if (ratio >= 0.98) return 15;
  if (ratio >= 0.90) return 12;
  if (ratio >= 0.80) return 7;
  if (ratio >= 0.70) return 3;
  return 0;
}

function scoreEmployment(status) {
  const table = {
    "full-time":     10,
    "self-employed": 7,
    "part-time":     4,
    "unemployed":    0,
  };
  return table[status?.toLowerCase()] ?? 0;
}

// ─── Tranche assignment ───────────────────────────────────────────────────────

function assignTranche(score) {
  if (score >= 75) return { label: "A", id: 3 };
  if (score >= 50) return { label: "B",  id: 2 };
  return              { label: "C",   id: 1 };
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * @param {object} data
 * @param {number} data.creditScore      FICO score, 300–850
 * @param {number} data.annualIncome     Annual income in USD
 * @param {number} data.dtiRatio         Debt-to-income ratio as decimal (e.g. 0.35)
 * @param {string} data.employmentStatus 'full-time' | 'self-employed' | 'part-time' | 'unemployed'
 * @param {number} data.paymentHistory   Fraction of on-time payments, 0–1
 * @param {number} data.loanAmount       Requested loan in USD (stored, not scored directly)
 *
 * @returns {{ score: number, tranche: string, trancheId: number, breakdown: object }}
 */
function scoreApplicant(data) {
  const {
    creditScore,
    annualIncome,
    dtiRatio,
    employmentStatus,
    paymentHistory,
    loanAmount,
  } = data;

  // ── Validate inputs ────────────────────────────────────────────────────────
  const errors = [];
  if (creditScore < 300 || creditScore > 850)   errors.push("creditScore must be 300–850");
  if (annualIncome < 0)                         errors.push("annualIncome must be >= 0");
  if (dtiRatio < 0 || dtiRatio > 1)            errors.push("dtiRatio must be 0–1");
  if (paymentHistory < 0 || paymentHistory > 1) errors.push("paymentHistory must be 0–1");
  if (loanAmount <= 0)                          errors.push("loanAmount must be > 0");
  if (errors.length) throw new Error(`Invalid input: ${errors.join("; ")}`);

  // ── Calculate component scores ─────────────────────────────────────────────
  const breakdown = {
    creditScore:     scoreCreditScore(creditScore),    // /30
    dti:             scoreDTI(dtiRatio),               // /25
    income:          scoreIncome(annualIncome),         // /20
    paymentHistory:  scorePaymentHistory(paymentHistory), // /15
    employment:      scoreEmployment(employmentStatus), // /10
  };

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const { label: tranche, id: trancheId } = assignTranche(score);

  return {
    score,        // 0–100
    tranche,      // "A" | "B" | "C"
    trancheId,    // 3 | 2 | 1  (used when calling the contract)
    loanAmount,   // passed through for storage
    breakdown,    // per-factor scores for transparency
  };
}

module.exports = { scoreApplicant };

// ─── Quick CLI test ───────────────────────────────────────────────────────────
// Run:  node scripts/scorer.js
if (require.main === module) {
  const examples = [
    {
      label: "Strong applicant (expect A)",
      data: {
        creditScore:      780,
        annualIncome:     120_000,
        dtiRatio:         0.18,
        employmentStatus: "full-time",
        paymentHistory:   0.99,
        loanAmount:       25_000,
      },
    },
    {
      label: "Mid-range applicant (expect B)",
      data: {
        creditScore:      680,
        annualIncome:     60_000,
        dtiRatio:         0.38,
        employmentStatus: "self-employed",
        paymentHistory:   0.91,
        loanAmount:       15_000,
      },
    },
    {
      label: "Risky applicant (expect C)",
      data: {
        creditScore:      580,
        annualIncome:     30_000,
        dtiRatio:         0.55,
        employmentStatus: "part-time",
        paymentHistory:   0.65,
        loanAmount:       10_000,
      },
    },
  ];

  for (const ex of examples) {
    const result = scoreApplicant(ex.data);
    console.log(`\n── ${ex.label} ──`);
    console.log(`  Score:    ${result.score}/100`);
    console.log(`  Tranche:  ${result.tranche}`);
    console.log(`  Breakdown:`, result.breakdown);
  }
}
