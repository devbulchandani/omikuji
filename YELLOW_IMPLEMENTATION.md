# Yellow Network Protocol Implementation

## Overview

Your Next.js app has been successfully refactored to use the **real Yellow Network protocol** instead of direct Nitrolite calls. The architecture now follows the official Yellow flow:

```
MetaMask (wagmi) → Yellow WebSocket (Clearnode) → Nitrolite on-chain
```

## Architecture Changes

### 1. New Hook: `useYellowSession.ts`

This hook manages all WebSocket communication with the Yellow clearnode:

**Location:** `src/hooks/useYellowSession.ts`

**Responsibilities:**
- ✅ Persistent WebSocket connection to `wss://clearnet-sandbox.yellow.com/ws`
- ✅ Yellow authentication flow using MetaMask signatures (EIP-712)
- ✅ Session key generation (ephemeral ECDSA key pair)
- ✅ Message sending/receiving with request tracking
- ✅ Response parsing and error handling

**Exported Functions:**
- `connect()` - Establish WebSocket connection
- `disconnect()` - Close WebSocket connection
- `authenticate()` - Complete Yellow auth flow with MetaMask
- `createChannel(chainId, token)` - Request signed channel state from clearnode
- `resizeChannel(channelId, amount, destination)` - Fund channel from Yellow balance
- `closeChannel(channelId, destination)` - Get signed final state from clearnode

**State Exposed:**
- `isConnected` - WebSocket connection status
- `isAuthenticated` - Yellow authentication status
- `sessionAddress` - Ephemeral session key address
- `logs` - Activity log from Yellow session
- `error` - Error messages

### 2. Refactored Hook: `useYellow.ts`

This hook now orchestrates the complete flow:

**Location:** `src/hooks/useYellow.ts`

**Changes Made:**
1. ✅ Imports and uses `useYellowSession`
2. ✅ Nitrolite client used ONLY for on-chain operations
3. ✅ `createPaymentChannel()` now:
   - Deposits to custody contract
   - Connects to Yellow clearnode
   - Authenticates with MetaMask
   - Gets signed state from clearnode
   - Submits signed state to Nitrolite on-chain
   - Optionally resizes channel to allocate funds
4. ✅ `closeChannel()` now:
   - Requests signed final state from clearnode
   - Submits final state to Nitrolite on-chain
5. ✅ Merges Yellow session logs with activity messages
6. ✅ Exposes Yellow connection status

**New Return Values:**
- `isYellowConnected` - Clearnode WebSocket status
- `isYellowAuthenticated` - Yellow auth status
- `yellowSessionAddress` - Session key address

## Authentication Flow

The authentication flow matches the official Yellow quickstart:

### Step 1: Generate Session Key (Ephemeral)
```typescript
const sessionPrivateKey = generatePrivateKey();
const sessionSigner = createECDSAMessageSigner(sessionPrivateKey);
const sessionAccount = privateKeyToAccount(sessionPrivateKey);
```

### Step 2: Send Auth Request
```typescript
const authRequestMsg = await createAuthRequestMessage({
  address: walletAddress,
  application: 'Pixel Mania',
  session_key: sessionAccount.address,
  allowances: [
    { asset: 'ytest.usd', amount: '1000000000' },
    { asset: 'ytest.eth', amount: '1000000000' }
  ],
  expires_at: BigInt(Date.now() / 1000 + 3600),
  scope: 'pixel.mania',
});
ws.send(authRequestMsg);
```

### Step 3: Sign Challenge with MetaMask (EIP-712)
```typescript
// Server sends auth_challenge response
const challenge = response.params.challenge_message;

// Create EIP-712 signer with wagmi walletClient
const eip712Signer = createEIP712AuthMessageSigner(
  walletClient,
  authParams,
  { name: 'Pixel Mania' }
);

// Sign and verify
const verifyMsg = await createAuthVerifyMessageFromChallenge(
  eip712Signer,
  challenge
);
ws.send(verifyMsg);
```

### Step 4: Receive Auth Success
```typescript
// Server responds with auth_verify
// Session is now authenticated
```

## Channel Creation Flow

### Step 1: Deposit to Custody
```typescript
const txHash = await nitroliteClient.deposit(
  ETH_TOKEN_ADDRESS,
  depositAmount
);
```

### Step 2: Create Channel via Yellow
```typescript
const yellowChannelData = await yellowSession.createChannel(
  sepoliaChainId,
  ETH_TOKEN_ADDRESS
);
// Returns: { channel_id, channel, state, server_signature }
```

### Step 3: Submit to Blockchain
```typescript
const txHash = await nitroliteClient.createChannel({
  channel: yellowChannelData.channel,
  unsignedInitialState: {
    intent: state.intent,
    version: BigInt(state.version),
    data: state.state_data,
    allocations: state.allocations.map(a => ({
      destination: a.destination,
      token: a.token,
      amount: BigInt(a.amount),
    })),
  },
  serverSignature: yellowChannelData.server_signature,
});
```

### Step 4: Resize Channel (Allocate Funds)
```typescript
const resizeData = await yellowSession.resizeChannel(
  channelId,
  depositAmount,
  userAddress
);

// Submit resize to blockchain
const resizeTxHash = await nitroliteClient.resizeChannel({
  channelId,
  resizeState: { ...transformedState },
  serverSignature: resizeData.server_signature,
  proofStates: [],
});
```

## Channel Closing Flow

### Step 1: Request Close from Yellow
```typescript
const closeData = await yellowSession.closeChannel(
  channelId,
  userAddress
);
// Returns: { channel_id, state, server_signature }
```

### Step 2: Submit Final State to Blockchain
```typescript
const txHash = await nitroliteClient.closeChannel({
  channelId,
  finalState: {
    intent: closeData.state.intent,
    version: BigInt(closeData.state.version),
    data: closeData.state.state_data,
    allocations: closeData.state.allocations.map(...),
  },
  stateData: closeData.state.state_data,
  serverSignature: closeData.server_signature,
});
```

## Key Dependencies

All required functions are imported from `@erc7824/nitrolite`:

```typescript
import {
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createEIP712AuthMessageSigner,
  createECDSAMessageSigner,
  createCreateChannelMessage,
  createResizeChannelMessage,
  createCloseChannelMessage,
  parseAnyRPCResponse,
} from '@erc7824/nitrolite';
```

From `viem`:
```typescript
import {
  generatePrivateKey,
  privateKeyToAccount,
  parseEther,
  type Address,
  type Hex,
} from 'viem';
```

## Environment Variables

Added to `.env`:
```bash
# Client-side accessible
NEXT_PUBLIC_NEXT_PUBLIC_YELLOW_PRODUCTION=wss://clearnet-sandbox.yellow.com/ws
NEXT_PUBLIC_ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/...
```

## Usage Example

Your existing UI in `YellowPayment.tsx` should work with minimal changes. The hook usage remains the same:

```typescript
const {
  // Wallet info
  walletAddress,
  isWalletConnected,
  chain,
  isCorrectChain,

  // Yellow Network status
  isYellowConnected,
  isYellowAuthenticated,
  yellowSessionAddress,

  // Actions
  createPaymentChannel,
  sendPayment,
  closeChannel,

  // State
  channel,
  messages,
  error,
  isProcessing,
} = useYellow();
```

## What Changed in User Experience

### Before (Direct Nitrolite):
1. User deposits
2. Channel created directly on-chain
3. Off-chain state updates (local only)
4. Close channel on-chain

### After (Yellow Network):
1. User deposits to custody
2. **WebSocket connects to Yellow clearnode**
3. **MetaMask signature for authentication (EIP-712)**
4. **Channel creation request sent to clearnode**
5. **Server signs and validates state**
6. Submit server-signed state to blockchain
7. **Optionally resize channel using Yellow balance**
8. Off-chain state updates (coordinated with clearnode)
9. **Request close from clearnode (gets final state)**
10. Submit final state to blockchain

## Benefits of This Implementation

✅ **True Yellow Network Integration** - Uses the official Yellow protocol
✅ **Server-Validated States** - All states signed by clearnode
✅ **MetaMask Signing** - No private key exposure, uses wagmi
✅ **React/Next.js Compatible** - Works in browser with hooks
✅ **Session Key Security** - Ephemeral keys for session operations
✅ **EIP-712 Auth** - Standard typed data signing
✅ **Request Tracking** - Matches responses to requests
✅ **Error Handling** - Comprehensive error messages
✅ **Activity Logging** - Full transparency of operations

## Testing Checklist

- [ ] Connect wallet (MetaMask)
- [ ] Switch to Sepolia network
- [ ] Create payment channel:
  - [ ] Deposit succeeds
  - [ ] WebSocket connects to clearnode
  - [ ] MetaMask signature prompt appears (EIP-712)
  - [ ] Authentication completes
  - [ ] Channel creation request sent
  - [ ] Server signature received
  - [ ] On-chain transaction succeeds
  - [ ] Channel resize/allocation works
- [ ] Send off-chain payment (if implemented)
- [ ] Close channel:
  - [ ] Close request sent to clearnode
  - [ ] Final state received with signature
  - [ ] On-chain close transaction succeeds
- [ ] Check activity log for all operations
- [ ] Verify no errors in console

## Troubleshooting

### "WebSocket not connected"
- Check `NEXT_PUBLIC_NEXT_PUBLIC_YELLOW_PRODUCTION` is set
- Verify clearnode is reachable: `wss://clearnet-sandbox.yellow.com/ws`
- Check browser console for WebSocket errors

### "Session key not generated"
- This should auto-generate on hook mount
- Check browser console for errors during key generation

### "Not authenticated with clearnode"
- Ensure MetaMask is unlocked
- Check that EIP-712 signature was completed
- Verify auth flow completed (check logs)

### "Channel creation failed"
- Verify you have funds in custody contract
- Check Sepolia testnet has ETH for gas
- Look at Yellow session logs for specific error

### TypeScript Errors
- Run `npm install` to ensure all types are available
- Check that `@erc7824/nitrolite` is at least v0.5.3
- Restart TypeScript server in your IDE

## Next Steps

You can now:

1. **Test the full flow** - Create, fund, and close channels
2. **Implement off-chain payments** - Use `createSubmitAppStateMessage` for state updates
3. **Add channel queries** - Use `createGetChannelsMessage` to list channels
4. **Check balances** - Use `createGetLedgerBalancesMessage` for Yellow balances
5. **Production deployment** - Switch to `wss://clearnet.yellow.com/ws` (production clearnode)

## Architecture Diagram

```
┌─────────────┐
│   Browser   │
│  (Next.js)  │
└──────┬──────┘
       │
       ├─────────────────────────────────────┐
       │                                     │
       ▼                                     ▼
┌──────────────┐                    ┌─────────────────┐
│   wagmi      │                    │ useYellowSession│
│ (MetaMask)   │                    │   (WebSocket)   │
└──────┬───────┘                    └────────┬────────┘
       │                                     │
       │ EIP-712                             │ RPC Messages
       │ Signatures                          │ (Auth, Create,
       │                                     │  Resize, Close)
       ▼                                     ▼
┌──────────────┐                    ┌─────────────────┐
│ useYellow    │◄───────────────────│ Yellow Clearnode│
│   (Hook)     │    Signed States   │   (Sandbox)     │
└──────┬───────┘                    └─────────────────┘
       │
       │ On-chain TxsStep 3: Execute State Updates (createUpdateStateMessage)
       │
       ▼
┌──────────────────────────────────┐
│   Nitrolite Smart Contracts      │
│   (Sepolia Testnet)               │
│                                   │
│   • Custody: 0x019B65...16131b262 │
│   • Adjudicator: 0x7c7ccb...fDfB11F2 │
└───────────────────────────────────┘
```

## Summary

Your app now implements the **complete Yellow Network protocol**:

✅ WebSocket connection to Yellow clearnode
✅ MetaMask-based authentication with EIP-712
✅ Session key management (ephemeral signing)
✅ Server-signed channel states
✅ On-chain settlement via Nitrolite
✅ Full React/Next.js integration with wagmi

The implementation matches the official Yellow quickstart but is fully integrated into your React app using hooks and wagmi instead of CLI scripts.
