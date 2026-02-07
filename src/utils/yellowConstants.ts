/**
 * Yellow Network and Nitrolite Protocol Constants
 */

// Nitrolite contract addresses on Base Mainnet
export const CUSTODY_ADDRESS = '0x490fb189DdE3a01B00be9BA5F41e3447FbC838b6' as const;
export const ADJUDICATOR_ADDRESS = '0x7de4A0736Cf5740fD3Ca2F2e9cc85c9AC223eF0C' as const;

// Token addresses
export const ETH_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000' as const; // ETH = zero address
export const BASE_MAINNET_USD_TOKEN = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const; // USDC on Base Mainnet

// Chain
export const BASE_CHAIN_ID = 8453;

// Dealer/House address - receives losing bets
export const DEALER_ADDRESS = '0xde8792E863d73C751e07c4A88a600d2c5AB0Ff74' as const;
// Yellow clearnode WebSocket URL
export const NEXT_PUBLIC_YELLOW_PRODUCTION = process.env.NEXT_PUBLIC_YELLOW_PRODUCTION || 'wss://clearnet.yellow.com/ws';

// Protocol settings
export const CHALLENGE_DURATION = 3600n; // Must be at least 3600 seconds (1 hour)

// Timeouts
export const WEBSOCKET_CONNECT_TIMEOUT = 40000; // 40 seconds
export const AUTH_CHALLENGE_TIMEOUT = 40000; // 40 seconds
export const CHANNEL_UPDATE_TIMEOUT = 60000; // 60 seconds for channel registration
export const BALANCE_UPDATE_TIMEOUT = 30000; // 30 seconds for balance update notification
export const CHANNEL_REGISTRATION_TIMEOUT = 60000; // 60 seconds for channel to appear in clearnode

// Session settings
export const AUTH_SESSION_DURATION = 3600; // 1 hour in seconds
export const AUTH_APPLICATION_NAME = 'Omikuji';
export const AUTH_SCOPE = 'trading';

// App session settings (game moves)
export const GAME_APP_NAME = 'omikuji';
export const GAME_APP_PROTOCOL = 'NitroRPC/0.4' as const;
export const GAME_APP_CHALLENGE_DURATION = 3600;
export const GAME_APP_QUORUM = 2;
export const APP_SESSION_UPDATE_TIMEOUT = 15000; // 15 seconds
export const USD_TOKEN_DECIMALS = 6;

// Minimal ERC20 ABI for token approval before deposit
import { erc20Abi } from 'viem';

// Re-export for convenience
export const ERC20_ABI = erc20Abi;

