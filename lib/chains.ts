/**
 * Copyright 2025 Circle Internet Group, Inc.  All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Hex } from "viem";

export enum SupportedChainId {
  ETH_SEPOLIA = 11155111,
  AVAX_FUJI = 43113,
  BASE_SEPOLIA = 84532,
  ARC_TESTNET = 5042002
}

export const CHAIN_TO_CHAIN_NAME: Record<number, string> = {
  [SupportedChainId.ETH_SEPOLIA]: "Ethereum Sepolia",
  [SupportedChainId.AVAX_FUJI]: "Avalanche Fuji",
  [SupportedChainId.BASE_SEPOLIA]: "Base Sepolia",
  [SupportedChainId.ARC_TESTNET]: "Arc Testnet"
};

export const SUPPORTED_CHAINS = [
  SupportedChainId.ETH_SEPOLIA,
  SupportedChainId.AVAX_FUJI,
  SupportedChainId.BASE_SEPOLIA,
  SupportedChainId.ARC_TESTNET
];

// USDC contract addresses per chain — used for on-chain balance reads.
export const CHAIN_IDS_TO_USDC_ADDRESSES: Record<number, Hex> = {
  [SupportedChainId.ETH_SEPOLIA]: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
  [SupportedChainId.AVAX_FUJI]: "0x5425890298aed601595a70AB815c96711a31Bc65",
  [SupportedChainId.BASE_SEPOLIA]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  [SupportedChainId.ARC_TESTNET]: "0x3600000000000000000000000000000000000000"
};

// Maps Circle/DB chain strings (e.g. "ARC-TESTNET") to App Kit BridgeChain identifiers.
export const CHAIN_DB_TO_BRIDGE_CHAIN: Record<string, string> = {
  "ARC-TESTNET": "Arc_Testnet",
  "ETH-SEPOLIA": "Ethereum_Sepolia",
  "BASE-SEPOLIA": "Base_Sepolia",
  "AVAX-FUJI": "Avalanche_Fuji",
};

// Public RPC endpoints used for on-chain balance reads via viem.
export const CHAIN_DB_TO_RPC: Record<string, string> = {
  "ARC-TESTNET": "https://rpc.testnet.arc.network/",
  "ETH-SEPOLIA": "https://rpc.sepolia.org",
  "BASE-SEPOLIA": "https://sepolia.base.org",
  "AVAX-FUJI": "https://api.avax-test.network/ext/bc/C/rpc",
};
