/**
 * Type definitions for Yellow Network and Nitrolite Protocol
 */

import type { Hex, Address } from 'viem';

// Channel state returned from clearnode
export interface YellowChannelState {
  channel_id: Hex;
  channel?: any;
  state: {
    intent: string;
    version: number;
    state_data: string;
    allocations: Array<{
      destination: Address;
      token: Address;
      amount: string;
    }>;
  };
  server_signature: Hex;
}

// Channel update notification from clearnode
export interface ChannelUpdateNotification {
  channel_id: Hex;
  participant: Address;
  status: 'open' | 'closed' | 'challenged';
  token: Address;
  wallet: string;
  amount: string;
  chain_id: number;
  adjudicator: Address;
  challenge: number;
  nonce: number;
  version: number;
  created_at: string;
  updated_at: string;
}

// Pending request tracking
export interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  method: string;
}

// Channel info for UI
export interface YellowChannel {
  channelId: Hex;
  participants: Address[];
  allocations: bigint[];
  status: 'pending' | 'active' | 'closed';
  channelData?: any; // Full channel object from Yellow/Nitrolite
}

// App session tracking
export interface GameAppSession {
  appSessionId: Hex;
  channelId: Hex;
  version: number;
  participants: Address[];
  allocations: AppSessionAllocation[];
  status: 'open' | 'closed';
}

export interface AppSessionAllocation {
  asset: string;
  amount: string;
  participant: Address;
}

// Parsed 'asu' (app session update) notification from clearnode
export interface AppSessionUpdateNotification {
  appSessionId: Hex;
  version: number;
  sessionData: string;
  participantAllocations: AppSessionAllocation[];
}

// Data payload for a single game move
export interface GameMoveData {
  cellId: string;
  targetPrice: number;
  betAmount: number;
  multiplier: number;
  pythPriceId: string;
  timestamp: number;
}

// Broker configuration from get_config
export interface BrokerConfig {
  brokerAddress: Address;
  supportedChains?: number[];
  supportedTokens?: Address[];
}

// Channel info from get_channels response
export interface ChannelInfo {
  channelId: Hex;
  participant: Address;
  status: 'open' | 'closed' | 'challenged';
  token: Address;
  amount: string;
  chainId: number;
  adjudicator: Address;
  challenge: number;
  nonce: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// Resize parameters for single resize operation
export interface ResizeParams {
  channelId: Hex;
  resizeAmount?: bigint;
  allocateAmount?: bigint;
  fundsDestination: Address;
}

// Listener for WebSocket notification messages
export type MessageListener = (method: string, params: any) => void;
