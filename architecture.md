# Purpose

This document captures the architecture and implementation details for the Tokenization-of-CDOs project. It is intended to help a new reader understand the project layout, the role of each file, project dependencies, development workflows, demo readiness, and deployment options.

## Architecture Overview

The system is built as a proof-of-concept for tokenizing verified mortgage collateral and loan attributes using smart contracts.

Three logical layers are implemented:

1. On-chain layer: smart contracts for storing tranche assignments, enforcing admin-only write access, and exposing public tranche/score data.
2. Off-chain layer: scoring and orchestration logic that decides loan risk tranches and submits results to the contract.
3. Interface layer: a static frontend used for demoing the workflow and visualizing system state.

## Layer Responsibilities

### 1. On-chain layer

- `contracts/CreditTranche.sol`
- Uses OpenZeppelin `AccessControl` to enforce permissioned actions.
- Stores a borrower profile mapping to:
  - `Tranche` enum value (`C`, `B`, `A`)
  - numeric score `0 - 100`
  - encrypted data reference string
  - timestamp of last update
- Exposes public read methods for tranche and score.
- Exposes admin-only read methods for full profile history and admin management.

### 2. Off-chain logic layer

- `scripts/scorer.js` contains the off-chain risk scoring engine.
- `scripts/submitApplicant.js` demonstrates the end-to-end flow:
  - collect borrower inputs
  - compute the score/tranche
  - simulate secure off-chain storage of encrypted PII
  - submit the result to the smart contract
- `scripts/deploy.js` deploys the contract and prints the deployed address.

### 3. Interface layer

- `frontend/index.html` is the main demo UI.
- `frontend/styles.css` contains the styling for the dashboard, forms, analytics, and modal components.
- `frontend/app.js` is present in the repository but is currently not referenced by the live UI and appears to be a stale/legacy helper script.

## Project Structure

### Root files

- `package.json`
  - Defines scripts, dependencies, and devDependencies.
  - Key scripts:
    - `compile`: compile contracts with Hardhat
    - `test`: run the Hardhat test suite
    - `deploy:local`: deploy locally to Hardhat node
    - `node`: launch a local Hardhat node
- `hardhat.config.js`
  - Configures Solidity `0.8.20` with optimizer enabled.
  - Configures `localhost` and `sepolia` networks.
  - Loads environment variables via `dotenv`.
- `.env.example`
  - Template for sensitive configuration.
  - Contains placeholders for `PRIVATE_KEY`, `SEPOLIA_RPC_URL`, `ETHERSCAN_API_KEY`, and `CONTRACT_ADDRESS`.
- `README.md`
  - User-facing documentation, vision, and quickstart instructions.
- `architecture.md`
  - This file: architecture, file definitions, and dependencies.

### Contracts

- `contracts/CreditTranche.sol`
  - Core smart contract implementation.
  - Uses `AccessControl` to distinguish between default admin and bank admin roles.
  - Stores user profiles and emits assignment/update events.
  - Supports admin-only profile enumeration and role management.

### Scripts

- `scripts/deploy.js`
  - Deploys `CreditTranche.sol` to the configured network.
  - Logs deployer address, balance, and contract address.
  - Suitable for local and testnet deployment.
- `scripts/scorer.js`
  - Implements the scoring algorithm used by the demo.
  - Computes a composite score from credit score, DTI, income, payment history, and employment status.
  - Assigns tranche IDs aligned with the smart contract's enum mapping.
  - Exports `scoreApplicant()` for unit tests and CLI validation.
- `scripts/submitApplicant.js`
  - Example integration script that uses `scorer.js` and the deployed contract.
  - Simulates encryption + off-chain storage with a fake IPFS CID.
  - Demonstrates a real admin-driven workflow from raw input to on-chain record.

### Frontend

- `frontend/index.html`
  - Self-contained demo dashboard and workflow interface.
  - Includes embedded static script logic using `ethers.js` and Chart.js.
  - Supports wallet connection, contract address input, tranche assignment, and chain data loading.
  - Contains demo seed data plus a live contract data sync path.
- `frontend/styles.css`
  - Contains the design system and responsive layout for the dashboard.
  - Defines cards, navigation, buttons, form controls, and analytics layout.
- `frontend/app.js`
  - Present in the codebase, but not referenced by `frontend/index.html`.
  - Appears to be a stale, separate front-end wiring file and is not part of the current demo flow.

### Tests

- `test/CreditTranche.test.js`
  - Uses Hardhat and Chai.
  - Covers:
    - deployer roles and access control
    - admin-only write access
    - tranche matching and validation
    - event emission
    - public read access for tranche and score
    - integration with the off-chain scorer logic

### Auto-generated / support directories

- `artifacts/`
  - Generated after compiling contracts.
  - Contains ABI and bytecode artifacts used by the frontend and scripts.
- `cache/`
  - Hardhat internal cache.
- `node_modules/`
  - Installed packages.

## Dependencies

### Runtime / package dependencies

- `@openzeppelin/contracts` — OpenZeppelin smart contract library.
- `dotenv` — loads environment variables for scripts and Hardhat config.

### Dev dependencies

- `hardhat` — Ethereum development environment.
- `@nomicfoundation/hardhat-toolbox` — Hardhat testing and network tools.

### Tooling

- `ethers` is used indirectly through Hardhat and directly in the frontend via CDN.
- `Chart.js` is loaded in the frontend via CDN for analytics visuals.

## Development workflow

### Local development

1. `npm install`
2. `npm run node`
3. `npx hardhat run scripts/deploy.js --network localhost`
4. Serve `frontend/` as a static site or open `frontend/index.html` directly in a browser.
5. Paste the deployed contract address into the UI and connect MetaMask to the local network.

### Testnet deployment

1. Copy `.env.example` to `.env`.
2. Set `PRIVATE_KEY`, `SEPOLIA_RPC_URL`, and optionally `ETHERSCAN_API_KEY`.
3. `npx hardhat run scripts/deploy.js --network sepolia`
4. Use `CONTRACT_ADDRESS` from the output in the frontend.

## Demo readiness

This project is demo-ready with the following strengths:

- A clean contract interface with public tranche/score reads.
- A reusable off-chain scorer engine.
- A deploy script and an end-to-end submit flow.
- A polished static frontend for visualization.

Open questions / recommended improvements for a production-quality presentation:

- `frontend/app.js` should be removed or integrated cleanly because the demo currently uses embedded script logic inside `frontend/index.html`.
- The frontend should be served from a static host (Vercel, Netlify, GitHub Pages).
- The `.env.example` file should be referenced from the README with explicit deploy instructions.

## Assumptions and design tradeoffs

- PII is never stored on-chain; only encrypted references are stored.
- The contract is designed for a permissioned admin to submit verified assignments.
- The scoring logic is currently off-chain and deterministic for easy demonstration.
- The demo focuses on verification state, tranche assignment, and access control rather than full mortgage origination.
