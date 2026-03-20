const connectWalletButton = document.getElementById("connectWallet");
const walletAddress = document.getElementById("walletAddress");
const contractAddressInput = document.getElementById("contractAddress");
const loadContractButton = document.getElementById("loadContract");
const contractStatus = document.getElementById("contractStatus");
const scoreResult = document.getElementById("scoreResult");
const queryResult = document.getElementById("queryResult");
const adminResult = document.getElementById("adminResult");
const logOutput = document.getElementById("log");

let provider;
let signer;
let contract;
let contractAbi;

const defaultArtifactPath = "../artifacts/contracts/CreditTranche.sol/CreditTranche.json";

function log(message) {
    const time = new Date().toLocaleTimeString();
    logOutput.textContent += `[${time}] ${message}\n`;
    logOutput.scrollTop = logOutput.scrollHeight;
}

async function loadAbi() {
    if (!contractAbi) {
        const r = await fetch(defaultArtifactPath);
        if (!r.ok) throw new Error("Failed to fetch contract ABI artifact.");
        const json = await r.json();
        contractAbi = json.abi;
        log("Loaded ABI from artifacts.");
    }
    return contractAbi;
}

connectWalletButton.onclick = async () => {
    try {
        if (!window.ethereum) throw new Error("MetaMask not detected.");
        provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = await provider.getSigner();
        const addr = await signer.getAddress();
        walletAddress.textContent = `Wallet: ${addr}`;
        log(`Connected wallet ${addr}`);
    } catch (err) {
        walletAddress.textContent = "Wallet: not connected";
        log(`connectWallet error: ${err.message}`);
    }
};

loadContractButton.onclick = async () => {
    try {
        const address = contractAddressInput.value.trim();
        if (!address) throw new Error("enter contract address");
        await loadAbi();
        if (!provider) {
            provider = new ethers.BrowserProvider(window.ethereum);
            signer = await provider.getSigner();
        }
        contract = new ethers.Contract(address, contractAbi, signer || provider);
        const chainId = await provider.getNetwork();
        contractStatus.textContent = `Contract loaded on chain ${chainId.chainId}`;
        log(`Contract loaded at ${address}`);
    } catch (err) {
        contractStatus.textContent = `Contract: load failed`;
        log(`loadContract error: ${err.message}`);
    }
};

function scoreCreditScore(value) {
    if (value >= 750) return 30;
    if (value >= 700) return 24;
    if (value >= 650) return 18;
    if (value >= 600) return 12;
    return 0;
}
function scoreDTI(ratio) {
    if (ratio < 0.20) return 25;
    if (ratio < 0.35) return 20;
    if (ratio < 0.43) return 12;
    if (ratio < 0.50) return 6;
    return 0;
}
function scoreIncome(usd) {
    if (usd >= 100000) return 20;
    if (usd >= 75000) return 16;
    if (usd >= 50000) return 12;
    if (usd >= 35000) return 6;
    return 0;
}
function scorePaymentHistory(ratio) {
    if (ratio >= 0.98) return 15;
    if (ratio >= 0.90) return 12;
    if (ratio >= 0.80) return 7;
    if (ratio >= 0.70) return 3;
    return 0;
}
function scoreEmployment(status) {
    const table = { "full-time": 10, "self-employed": 7, "part-time": 4, "unemployed": 0 };
    return table[status?.toLowerCase()] ?? 0;
}

function assignTranche(score) {
    if (score >= 75) return { label: "AAA", id: 3 };
    if (score >= 50) return { label: "AA", id: 2 };
    return { label: "B", id: 1 };
}

function scanInput() {
    const creditScore = Number(document.getElementById("creditScore").value);
    const annualIncome = Number(document.getElementById("annualIncome").value);
    const dtiRatio = Number(document.getElementById("dtiRatio").value);
    const paymentHistory = Number(document.getElementById("paymentHistory").value);
    const loanAmount = Number(document.getElementById("loanAmount").value);
    const employmentStatus = document.getElementById("employmentStatus").value;
    const encryptedDataRef = document.getElementById("encryptedDataRef").value.trim();

    const errors = [];
    if (creditScore < 300 || creditScore > 850) errors.push("creditScore must be 300–850");
    if (annualIncome < 0) errors.push("annualIncome must be >= 0");
    if (dtiRatio < 0 || dtiRatio > 1) errors.push("dtiRatio must be 0–1");
    if (paymentHistory < 0 || paymentHistory > 1) errors.push("paymentHistory must be 0–1");
    if (loanAmount <= 0) errors.push("loanAmount must be > 0");
    if (!encryptedDataRef) errors.push("Data ref is required");
    if (errors.length) throw new Error(errors.join("; "));

    return { creditScore, annualIncome, dtiRatio, paymentHistory, loanAmount, employmentStatus, encryptedDataRef };
}

async function handleAssign() {
    try {
        if (!contract) throw new Error("Contract is not loaded");
        const data = scanInput();
        const breakdown = {
            creditScore: scoreCreditScore(data.creditScore),
            dti: scoreDTI(data.dtiRatio),
            income: scoreIncome(data.annualIncome),
            paymentHistory: scorePaymentHistory(data.paymentHistory),
            employment: scoreEmployment(data.employmentStatus),
        };
        const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
        const { label: trancheLabel, id: trancheId } = assignTranche(score);
        scoreResult.textContent = `score=${score}, tranche=${trancheLabel} (${trancheId})\nbreakdown=${JSON.stringify(breakdown, null, 2)}`;

        const profileAddress = await signer.getAddress();
        log(`Assigning profile for ${profileAddress}: ${trancheLabel}, score ${score}`);
        const tx = await contract.connect(signer).assignTranche(profileAddress, trancheId, score, data.encryptedDataRef);
        const receipt = await tx.wait();
        log(`Assigned tranche tx mined (${receipt.transactionHash})`);
        scoreResult.textContent += `\nTX hash: ${receipt.transactionHash}`;
    } catch (err) {
        scoreResult.textContent = "Error: " + err.message;
        log(`assign error: ${err.message}`);
    }
}

async function query(method) {
    try {
        if (!contract) throw new Error("Contract is not loaded");
        const target = document.getElementById("queryAddress").value.trim();

        let result;
        if (method === "getAllUsers") {
            result = await contract.getAllUsers();
            queryResult.textContent = JSON.stringify(result, null, 2);
            log(`Queried getAllUsers: ${JSON.stringify(result)}`);
            return;
        }

        if (!target) throw new Error("Enter query address");

        if (method === "getTranche") {
            result = await contract.getTranche(target);
        } else if (method === "getScore") {
            result = await contract.getScore(target);
        } else if (method === "getProfile") {
            result = await contract.getProfile(target);
            result = {
                tranche: result[0],
                score: result[1].toNumber(),
                encryptedDataRef: result[2],
                updatedAt: new Date(result[3].toNumber() * 1000).toISOString(),
            };
        } else if (method === "profileExists") {
            result = await contract.profileExists(target);
        }
        queryResult.textContent = JSON.stringify(result, null, 2);
        log(`Queried ${method} ${target}: ${JSON.stringify(result)}`);
    } catch (err) {
        queryResult.textContent = "Error: " + err.message;
        log(`query error: ${err.message}`);
    }
}

async function manageAdmin(action) {
    try {
        if (!contract) throw new Error("Contract is not loaded");
        const address = document.getElementById("adminAddress").value.trim();
        if (!address) throw new Error("Enter admin address");

        let tx;
        if (action === "add") {
            tx = await contract.connect(signer).addAdmin(address);
        } else {
            tx = await contract.connect(signer).removeAdmin(address);
        }
        const receipt = await tx.wait();
        adminResult.textContent = `${action}Admin txHash: ${receipt.transactionHash}`;
        log(`${action}Admin ${address} tx: ${receipt.transactionHash}`);
    } catch (err) {
        adminResult.textContent = "Error: " + err.message;
        log(`admin error: ${err.message}`);
    }
}

window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("scoreAndAssign").onclick = handleAssign;
    document.getElementById("btnTranche").onclick = () => query("getTranche");
    document.getElementById("btnScore").onclick = () => query("getScore");
    document.getElementById("btnProfile").onclick = () => query("getProfile");
    document.getElementById("btnExists").onclick = () => query("profileExists");
    document.getElementById("btnAllUsers").onclick = () => query("getAllUsers");
    document.getElementById("addAdmin").onclick = () => manageAdmin("add");
    document.getElementById("removeAdmin").onclick = () => manageAdmin("remove");
});
