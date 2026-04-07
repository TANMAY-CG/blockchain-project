import { ethers } from 'ethers';
import { env } from '../config/env';

// Minimal ABI for planned WarrantyRegistry contract.
const WARRANTY_REGISTRY_ABI = [
  'function appendWarrantyVersion(string rootId,uint256 versionNo,string eventType,string startDate,string endDate,bytes32 payloadHash,bytes32 previousVersionHash) public returns (bytes32)',
  'function getVersionMeta(string warrantyRootId,uint256 versionNo) view returns (string rootId,uint256 ver,string evt,string start,string end,bytes32 hash,bytes32 prevHash,uint256 anchoredAt,bool exists)',
];

function toBytes32Hex(hexWithoutPrefixOrWith: string): string {
  const clean = hexWithoutPrefixOrWith.startsWith('0x')
    ? hexWithoutPrefixOrWith.slice(2)
    : hexWithoutPrefixOrWith;
  if (clean.length !== 64) {
    throw new Error(`Invalid bytes32 hash length: expected 64, got ${clean.length}`);
  }
  return `0x${clean}`;
}

export async function anchorOnChain(input: {
  warrantyRootId: string;
  versionNo: number;
  eventType: 'REGISTER' | 'RENEW';
  startDate: string;
  endDate: string;
  payloadHash: string;
  previousVersionHash?: string;
}) {
  if (env.SEALED_CHAIN_MODE === 'mock') {
    return {
      status: 'ANCHORED' as const,
      txHash: `mock-${Date.now().toString(16)}`,
    };
  }

  if (!env.HARDHAT_PRIVATE_KEY || !env.HARDHAT_CONTRACT_ADDRESS) {
    throw new Error('Hardhat mode requires HARDHAT_PRIVATE_KEY and HARDHAT_CONTRACT_ADDRESS');
  }

  const provider = new ethers.JsonRpcProvider(env.HARDHAT_RPC_URL);
  const wallet = new ethers.Wallet(env.HARDHAT_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(env.HARDHAT_CONTRACT_ADDRESS, WARRANTY_REGISTRY_ABI, wallet);

  const prev = input.previousVersionHash ? toBytes32Hex(input.previousVersionHash) : ethers.ZeroHash;
  const tx = await contract.appendWarrantyVersion(
    input.warrantyRootId,
    input.versionNo,
    input.eventType,
    input.startDate,
    input.endDate,
    toBytes32Hex(input.payloadHash),
    prev
  );
  const receipt = await tx.wait();
  return { status: 'ANCHORED' as const, txHash: receipt.hash as string };
}

export async function fetchOnChainVersionMeta(input: { warrantyRootId: string; versionNo: number }) {
  if (env.SEALED_CHAIN_MODE === 'mock') {
    return null;
  }
  if (!env.HARDHAT_CONTRACT_ADDRESS) {
    throw new Error('Hardhat mode requires HARDHAT_CONTRACT_ADDRESS');
  }

  const provider = new ethers.JsonRpcProvider(env.HARDHAT_RPC_URL);
  const contract = new ethers.Contract(env.HARDHAT_CONTRACT_ADDRESS, WARRANTY_REGISTRY_ABI, provider);

  const result = await contract.getVersionMeta(input.warrantyRootId, input.versionNo);
  return {
    warrantyRootId: String(result[0]),
    versionNo: Number(result[1]),
    eventType: String(result[2]),
    startDate: String(result[3]),
    endDate: String(result[4]),
    payloadHash: String(result[5]),
    previousVersionHash: String(result[6]),
    anchoredAt: Number(result[7]),
    exists: Boolean(result[8]),
  };
}

