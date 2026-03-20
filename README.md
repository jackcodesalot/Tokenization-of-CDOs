# Tokenized Collateral Verification & Smart Contract Automation for Mortgage Finance

## Overview

This project, worked on by a team of students, explores how **tokenization and smart contracts** can be applied to **post-origination mortgage workflows** to reduce redundant verification, operational delays, and compliance friction across lenders, aggregators, and structured finance products such as **CLOs / CMOs**.

The work is being developed with mentorship from executives at Broadridge Financial Solutions (Fortune 500), helping ground the proposal in real-world capital markets infrastructure and institutional constraints.

This proposal focuses on **tokenizing verified collateral and loan status** after underwriting is complete, and using **smart contracts to enforce rule-based logic** across the loan lifecycle.

The goal is to demonstrate how distributed ledgers can improve **efficiency, transparency, and auditability** in institutional mortgage finance without replacing human judgment or legal processes.

---

## Problem Statement

In traditional mortgage and structured finance workflows:

* Collateral and loan data are **verified repeatedly** by different parties
* The same documents are re-reviewed during:

  * Loan aggregation
  * Warehousing
  * CLO / CMO structuring
  * Audits and compliance checks
* This leads to:

  * High operational costs
  * Approval delays
  * Information silos
  * Increased risk of human error

These inefficiencies compound significantly.

---

## Core Idea

### Tokenize verification.

* Each token represents a **verified loan + collateral package**
* Tokens carry **verified outcomes**, not raw documents
* Smart contracts enforce **predefined financial and compliance rules**
* Dynamic changes (payments, delinquencies, risk triggers) are handled over time via trusted data inputs

---

## Key Concepts

### What a Token Represents

A token is a **digital proof**, not a currency.

It represents that key mortgage attributes have already been verified, such as:

* Borrower credit & income validation
* Loan-to-value (LTV) ratio
* Property appraisal
* Title and insurance status
* Regulatory compliance

The token does **not** represent:

* The physical property
* Guaranteed future value
* Raw personal or financial documents

---

### About Smart Contracts

Smart contracts are **automated rulebooks** that execute predefined logic *after* verification.

They can:

* Check CLO pooling eligibility (LTV, credit score, seasoning)
* Enforce cash flow waterfalls
* Track ownership and tranche allocation
* Restrict transfers to compliant investors
* Automatically reroute payments when risk triggers are breached

They don't:

* Originate mortgages
* Assess borrower intent or creditworthiness
* Renegotiate loan terms
* Handle foreclosures or legal enforcement

Humans make decisions; smart contracts handle **repetitive, deterministic execution**.

---

## End-to-End Tokenization Flow

### Stage 1: Loan Origination → Tokenized Verified Loan Package

* Mortgages are originated and fully underwritten by banks/lenders
* Once verification is complete, a **loan verification token** is issued
* Token encodes verified attributes and compliance metadata
* No raw documents are exposed on-chain

**Benefit:** Eliminates repeated re-verification downstream.

---

### Stage 2: Aggregation / Warehousing → Pool-Ready Eligibility

* Smart contracts evaluate tokens against predefined criteria:

  * LTV thresholds
  * Credit score requirements
  * Title and compliance status
* Eligible loans are flagged as **pool-ready**

**Benefit:** Faster aggregation and automated filtering.

---

### Stage 3: CLO / CMO Structuring → Tokenized Tranches

* Verified loan tokens are bundled into structured products
* Tranches (senior, mezzanine, equity) are issued as **permissioned tokens**
* Compliance rules (e.g., KYC, transfer restrictions) are embedded directly

**Benefit:** Transparent ownership, automated waterfalls, and reduced operational risk.

---

## Dynamic Risk & Valuation

* Verification is **point-in-time**
* Valuation and risk evolve over time due to:

  * Prepayments
  * Defaults
  * Interest rate changes
  * Market conditions

Smart contracts can react to **updated inputs** (e.g., delinquency status, coverage tests) to:

* Adjust cash flows
* Enforce waterfall protections
* Restrict transfers of distressed tranches

---

## Investors & Tranches

Structured finance investors typically include:

* Banks
* Insurance companies
* Asset managers
* Pension funds
* Hedge funds
* Institutional credit investors

Tranches are layered by risk:

* **Senior** → lowest risk, lowest yield
* **Mezzanine** → balanced risk/return
* **Equity** → highest risk, residual upside

Losses are absorbed bottom-up; protections tighten as risk increases.

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   BANK ADMIN FRONTEND                │
│         (Submit user data / Query tranche)           │
└────────────────────┬──────────────────┬─────────────┘
                     │                  │
              Submit Data           Query Result
                     │                  │
┌────────────────────▼──────────────────▼─────────────┐
│                  BACKEND / ORACLE                    │
│  1. Receives raw credit data from bank admin         │
│  2. Runs scoring algorithm (rules-based)             │
│  3. Encrypts PII (name, SSN, etc.) with admin key    │
│  4. Submits score + encrypted blob to contract       │
└────────────────────────────┬────────────────────────┘
                             │
                    Score + tranche +
                    encrypted blob ref
                             │
┌────────────────────────────▼────────────────────────┐
│               SMART CONTRACT (on-chain)              │
│  - Stores: userAddress → tranche (AAA / AA / B)      │
│  - Stores: encrypted data blob reference             │
│  - Access control: only verified admins can read     │
│  - Emits events on tranche assignment                │
└─────────────────────────────────────────────────────┘
```

> **Important:** Smart contracts are fully public. Raw PII is never stored on-chain. The contract stores only a reference (e.g. an IPFS hash) to an encrypted blob that lives off-chain. Encryption and decryption always happen off-chain.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart contract | Solidity 0.8.20 |
| Access control | OpenZeppelin AccessControl |
| Development framework | Hardhat |
| Scoring engine | Node.js (rules-based, off-chain) |
| Frontend (in progress) | To be wired up via ethers.js |

---

## Project Structure

```
.
├── contracts/
│   └── CreditTranche.sol       ← the smart contract
├── scripts/
│   ├── deploy.js               ← deploys the contract
│   ├── scorer.js               ← off-chain risk scoring engine
│   └── submitApplicant.js      ← full admin submission flow
├── test/
│   └── CreditTranche.test.js   ← 27 tests (all passing)
├── hardhat.config.js
├── package.json
└── .env.example
```

---

## Frontend Enhancements (implemented)

* Added a full interactive dashboard in `frontend/index.html` plus `frontend/styles.css` and `frontend/app.js`.
* Bank admin workflow includes:
  * enter applicant data, run off-chain scoring, derive tranche (AAA/AA/B), and submit to smart contract
  * preview score breakdown, progress bar, and tranche badge
  * fetch on-chain profiles and tranche data via public read methods
  * a paginated/filtered application list with responsive grid cards (no vertical stack-only layout)
* Analytics page with Chart.js charts:
  * Application trends line chart
  * Tranche distribution doughnut chart (with legend spacing and clean labeling)
  * Approval rate / volume bar charts
* “Digital Badge” panel in application cards with minted/pending states, color-coded tranche variants, and token IDs.
* Added toast notifications, modals, and responsive styling.

---

## Risk Scoring Algorithm

The off-chain scorer (`scripts/scorer.js`) takes six inputs from the bank admin and produces a **composite score (0–100)** and a **tranche assignment**.

### Inputs

| Factor | Weight |
|---|---|
| Credit score (300–850) | 30 pts |
| Debt-to-income ratio | 25 pts |
| Annual income | 20 pts |
| Payment history | 15 pts |
| Employment status | 10 pts |

### Tranche Thresholds

| Tranche | Score | Risk Level |
|---|---|---|
| AAA | >= 75 | Low |
| AA | >= 50 | Moderate |
| B | < 50 | High |

---

## Smart Contract Interface

The deployed `CreditTranche.sol` exposes the following functions:

| Function | Access | Description |
|---|---|---|
| `assignTranche(address, trancheId, score, encryptedRef)` | Admin only | Submits a scored applicant |
| `getProfile(address)` | Admin only | Returns full profile + encrypted ref |
| `getTranche(address)` | Public | Returns `"AAA"`, `"AA"`, or `"B"` |
| `getScore(address)` | Public | Returns the numeric score |
| `profileExists(address)` | Public | Returns true/false |
| `getAllUsers()` | Admin only | Returns all profiled wallet addresses |
| `addAdmin(address)` | Owner only | Promotes a wallet to admin |
| `removeAdmin(address)` | Owner only | Revokes admin access |

### Role System

* `DEFAULT_ADMIN_ROLE` — the deployer. Can grant and revoke admin roles. Should be a multisig in production.
* `ADMIN_ROLE` — bank staff. Can submit applicants and read full profiles.
* Public — anyone can read tranche labels and scores. No PII is exposed.

---

## Local Setup

### Prerequisites

* Node.js >= 18
* npm
* MetaMask (for frontend development)

### Installation

```bash
git clone https://github.com/jackcodesalot/Tokenization-of-CDOs
cd Tokenization-of-CDOs
npm install
cp .env.example .env
```

### Running Locally

**Terminal 1 — start the local blockchain:**
```bash
npx hardhat node
```

This prints 20 funded test accounts with their private keys. `Account #0` is the deployer and automatically receives admin rights.

**Terminal 2 — deploy the contract:**
```bash
npx hardhat run scripts/deploy.js --network localhost
```

Copy the printed contract address and add it to `.env`:
```
CONTRACT_ADDRESS=0x...
```

**Terminal 3 — run tests:**
```bash
npx hardhat test
```

All 27 tests should pass. The suite covers deployment, access control, tranche assignment, input validation, profile queries, and end-to-end scorer integration.

### Testing the Scorer Standalone

```bash
node scripts/scorer.js
```

Runs three example applicants (AAA, AA, B) and prints scores and breakdowns to the console.

---

**Terminal 4 — run the frontend locally:**
```bash
cd frontend
npx serve .
```

Then open the local URL shown in the terminal (typically `http://localhost:3000`).

## Frontend Integration Guide

The compiled contract ABI is generated automatically on compile and can be found at:
```
artifacts/contracts/CreditTranche.sol/CreditTranche.json
```

This file is what the frontend needs to communicate with the contract. Import it and connect using `ethers.js`:

```js
import { ethers } from "ethers";
import CreditTranche from "./artifacts/contracts/CreditTranche.sol/CreditTranche.json";

// Connect to MetaMask
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Connect to the deployed contract
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  CreditTranche.abi,
  signer
);

// Read a tranche (public)
const tranche = await contract.getTranche("0x123...abc");

// Submit an applicant (admin wallet required)
await contract.assignTranche("0x123...abc", 3, 85, "QmIpfsHash...");
```

### MetaMask Setup for Local Development

1. Open MetaMask → Add a custom network
2. Set RPC URL to `http://127.0.0.1:8545` and Chain ID to `31337`
3. Import `Account #0` from the Hardhat node output using its private key
4. This account is the deployer and has admin rights

> **Note:** Every time `npx hardhat node` is restarted, the contract is wiped and must be redeployed. Update `CONTRACT_ADDRESS` in `.env` each time.

---

## About This Project

### This project **is**:

* A realistic exploration of post-origination tokenization
* Focused on B2B mortgage infrastructure
* Aligned with current institutional constraints

### This project **is not**:

* A consumer-facing mortgage platform
* A crypto-native lending protocol
* A replacement for banks, lawyers, or regulators

---

## Status

This repository currently contains:

* A **fully deployed and tested smart contract** (`CreditTranche.sol`) with role-based access control
* A **rules-based off-chain scoring engine** that maps credit data to tranche assignments
* A **Hardhat development environment** with 27 passing tests
* A **frontend integration guide** for connecting a bank admin UI

Frontend development is in progress.

---

## Disclaimer

This project is for **educational and exploratory purposes only** and does not constitute financial, legal, or investment advice.