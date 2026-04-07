// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract WarrantyRegistry {
    struct VersionMeta {
        string warrantyRootId;
        uint256 versionNo;
        string eventType;
        string startDate;
        string endDate;
        bytes32 payloadHash;
        bytes32 previousVersionHash;
        uint256 anchoredAt;
        bool exists;
    }

    mapping(bytes32 => VersionMeta) private versions;

    event WarrantyVersionAppended(
        string warrantyRootId,
        uint256 versionNo,
        string eventType,
        string startDate,
        string endDate,
        bytes32 payloadHash,
        bytes32 previousVersionHash,
        uint256 anchoredAt
    );

    function _key(string memory warrantyRootId, uint256 versionNo) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(warrantyRootId, ':', versionNo));
    }

    function appendWarrantyVersion(
        string memory warrantyRootId,
        uint256 versionNo,
        string memory eventType,
        string memory startDate,
        string memory endDate,
        bytes32 payloadHash,
        bytes32 previousVersionHash
    ) external returns (bytes32 key) {
        require(bytes(warrantyRootId).length > 0, 'rootId required');
        require(versionNo > 0, 'versionNo must be > 0');
        require(payloadHash != bytes32(0), 'payloadHash required');

        key = _key(warrantyRootId, versionNo);
        require(!versions[key].exists, 'version already anchored');

        versions[key] = VersionMeta({
            warrantyRootId: warrantyRootId,
            versionNo: versionNo,
            eventType: eventType,
            startDate: startDate,
            endDate: endDate,
            payloadHash: payloadHash,
            previousVersionHash: previousVersionHash,
            anchoredAt: block.timestamp,
            exists: true
        });

        emit WarrantyVersionAppended(
            warrantyRootId,
            versionNo,
            eventType,
            startDate,
            endDate,
            payloadHash,
            previousVersionHash,
            block.timestamp
        );
    }

    function getVersionMeta(string memory warrantyRootId, uint256 versionNo)
        external
        view
        returns (
            string memory rootId,
            uint256 ver,
            string memory evt,
            string memory start,
            string memory end,
            bytes32 hash,
            bytes32 prevHash,
            uint256 anchoredAt,
            bool exists
        )
    {
        bytes32 key = _key(warrantyRootId, versionNo);
        VersionMeta memory v = versions[key];
        return (
            v.warrantyRootId,
            v.versionNo,
            v.eventType,
            v.startDate,
            v.endDate,
            v.payloadHash,
            v.previousVersionHash,
            v.anchoredAt,
            v.exists
        );
    }
}

