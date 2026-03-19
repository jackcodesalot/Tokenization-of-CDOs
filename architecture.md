# Purpose

This document outlines the key architectural decisions made by the team and the reasoning behind them. As this project is developed for educational purposes, we intentionally document our design choices, trade-offs, and assumptions to make the decision-making process transparent and reproducible.

## At a high level, the system is composed of three layers

### On-chain layer (Smart Contracts)

Responsible for representing verification outcomes as tokenized objects, enforcing permissions, and managing lifecycle state (issuance, reassignment across tranches, and invalidation or removal).

### Off-chain logic layer (Backend / Orchestration)

Handles tranche classification logic, dynamic tranche adjustments (Levels A–C), eligibility evaluation, and orchestration of contract interactions. This layer computes what should happen and uses the blockchain to record what did happen.

### Interface layer (Optional GUI / Demo Interface)

A lightweight frontend used for demonstration and testing purposes. This layer is not core to the protocol itself but helps visualize system behavior and validate flows during development.


## Smart Contract Development environment

### Option 1: Foundry

Foundry is a Solidity-native development framework emphasizing speed, low-level control, and advanced testing capabilities.

*Pros*

Very fast compilation and test execution

Native Solidity-based testing (no JavaScript abstraction layer)

Strong fit for advanced smart contract developers

*Cons*

Steeper learning curve for contributors without prior Solidity experience

Less direct integration with frontend tooling

Higher onboarding cost for a mixed-experience team

### Option 2: Hardhat

Hardhat is a JavaScript-based smart contract development environment designed to integrate cleanly with modern web tooling.

*Pros*

Lower barrier to entry for contributors familiar with JavaScript

Strong ecosystem support and documentation

Seamless integration with frontend and backend tooling via ethers.js

Well-suited for rapid prototyping and demos

*Cons*

Slower than Foundry for large test suites

Testing logic split between Solidity and JavaScript

## Decision: Hardhat