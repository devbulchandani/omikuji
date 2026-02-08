// src/server/viemClients.ts
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

export const basePublicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_BASE_MAINNET || 'https://mainnet.base.org'),
});
