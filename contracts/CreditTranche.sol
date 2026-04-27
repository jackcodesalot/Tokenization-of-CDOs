// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CreditTranche
 * @notice Stores credit risk tranche assignments for users.
 *         Only verified bank admins can submit or read full profiles.
 *         The raw PII is never stored here - only an encrypted reference
 *         (e.g. an IPFS hash of the encrypted blob) and the resulting score.
 *
 * Tranche levels:
 *   AAA (3) - low risk,  score >= 75
 *   AA  (2) - mid risk,  score >= 50
 *   B   (1) - high risk, score <  50
 */
contract CreditTranche is AccessControl {

    // ─── Roles ──────────────────────────────────────────────────────────────
    // DEFAULT_ADMIN_ROLE (from OZ): can grant/revoke ADMIN_ROLE
    // ADMIN_ROLE: bank admins - can assign tranches and read full profiles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // ─── Types ───────────────────────────────────────────────────────────────
    enum Tranche { UNASSIGNED, B, AA, AAA }   // stored as uint8: 0,1,2,3

    struct UserProfile {
        Tranche tranche;
        uint8   score;             // 0–100 composite risk score
        string  encryptedDataRef;  // IPFS CID or URL of the encrypted PII blob
        uint256 updatedAt;
        bool    exists;
    }

    // ─── State ───────────────────────────────────────────────────────────────
    // user wallet address → profile
    mapping(address => UserProfile) private _profiles;

    // kept so admins can enumerate all profiles
    address[] private _profileIndex;

    // ─── Events ──────────────────────────────────────────────────────────────
    event TrancheAssigned(
        address indexed user,
        Tranche         tranche,
        uint8           score,
        uint256         timestamp
    );
    event TrancheUpdated(
        address indexed user,
        Tranche         oldTranche,
        Tranche         newTranche,
        uint8           newScore,
        uint256         timestamp
    );
    event AdminAdded(address indexed account, address indexed by);
    event AdminRemoved(address indexed account, address indexed by);

    // ─── Constructor ─────────────────────────────────────────────────────────
    /**
     * @param defaultAdmin  The deployer address that gets full admin rights.
     *                      In production this should be a multisig wallet.
     */
    constructor(address defaultAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(ADMIN_ROLE, defaultAdmin);
    }

    // ─── Write functions (admin only) ────────────────────────────────────────

    /**
     * @notice Assign or update a user's tranche.
     * @param user             The borrower's wallet address.
     * @param tranche          1 = B, 2 = AA, 3 = AAA.
     * @param score            Composite score 0–100 produced by the off-chain scorer.
     * @param encryptedDataRef IPFS CID (or equivalent) of the encrypted PII blob.
     */
    function assignTranche(
        address user,
        uint8   tranche,
        uint8   score,
        string  calldata encryptedDataRef
    ) external onlyRole(ADMIN_ROLE) {
        require(user != address(0),       "Zero address");
        require(tranche >= 1 && tranche <= 3, "Tranche must be 1, 2, or 3");
        require(score <= 100,             "Score must be 0-100");
        require(bytes(encryptedDataRef).length > 0, "Data ref required");

        if (!_profiles[user].exists) {
            // New profile
            _profiles[user] = UserProfile({
                tranche:          Tranche(tranche),
                score:            score,
                encryptedDataRef: encryptedDataRef,
                updatedAt:        block.timestamp,
                exists:           true
            });
            _profileIndex.push(user);
            emit TrancheAssigned(user, Tranche(tranche), score, block.timestamp);
        } else {
            // Update existing profile
            Tranche old = _profiles[user].tranche;
            _profiles[user].tranche          = Tranche(tranche);
            _profiles[user].score            = score;
            _profiles[user].encryptedDataRef = encryptedDataRef;
            _profiles[user].updatedAt        = block.timestamp;
            emit TrancheUpdated(user, old, Tranche(tranche), score, block.timestamp);
        }
    }

    // ─── Read functions ──────────────────────────────────────────────────────

    /**
     * @notice Returns full profile. Only callable by admins.
     */
    function getProfile(address user)
        external
        view
        onlyRole(ADMIN_ROLE)
        returns (
            Tranche tranche,
            uint8   score,
            string  memory encryptedDataRef,
            uint256 updatedAt
        )
    {
        require(_profiles[user].exists, "Profile not found");
        UserProfile storage p = _profiles[user];
        return (p.tranche, p.score, p.encryptedDataRef, p.updatedAt);
    }

    /**
     * @notice Returns only the tranche label. Public - useful for lending logic.
     *         Does NOT expose any PII reference.
     */
    function getTranche(address user) external view returns (string memory) {
        require(_profiles[user].exists, "Profile not found");
        return _trancheLabel(_profiles[user].tranche);
    }

    /**
     * @notice Returns only the numeric score. Public.
     */
    function getScore(address user) external view returns (uint8) {
        require(_profiles[user].exists, "Profile not found");
        return _profiles[user].score;
    }

    /**
     * @notice Returns true if a profile exists for this address.
     */
    function profileExists(address user) external view returns (bool) {
        return _profiles[user].exists;
    }

    /**
     * @notice Returns all profiled addresses. Admin only.
     */
    function getAllUsers()
        external
        view
        onlyRole(ADMIN_ROLE)
        returns (address[] memory)
    {
        return _profileIndex;
    }

    // ─── Admin management ────────────────────────────────────────────────────

    function addAdmin(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ADMIN_ROLE, account);
        emit AdminAdded(account, msg.sender);
    }

    function removeAdmin(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(ADMIN_ROLE, account);
        emit AdminRemoved(account, msg.sender);
    }

    // ─── Internal helpers ────────────────────────────────────────────────────

    function _trancheLabel(Tranche t) internal pure returns (string memory) {
        if (t == Tranche.AAA)       return "A";
        if (t == Tranche.AA)        return "B";
        if (t == Tranche.B)         return "C";
        return "UNASSIGNED";
    }
}
