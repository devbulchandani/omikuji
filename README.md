# Omikuji (おみくじ) - Fast Prediction Markets

A Next.js application for instant crypto price prediction betting using Yellow Network state channels with real MetaMask wallet integration via Wagmi.

## Features

- **Real Wallet Connection** using Wagmi hooks and MetaMask SDK
- **Yellow Network Integration** with state channel payments
- **WebSocket Communication** with Yellow Network Sandbox
- **Session Management** for payment channels
- **Instant Payments** without blockchain transactions
- **Real-time Activity Log** showing all events and responses

## Tech Stack

- **Next.js 16** - React framework with App Router
- **Wagmi 3.x** - Ethereum React hooks for wallet connection
- **@erc7824/nitrolite** - Yellow Network SDK
- **Viem 2.x** - Ethereum library
- **@metamask/sdk** - MetaMask integration
- **@tanstack/react-query** - Data fetching and state management
- **TailwindCSS 4** - Styling
- **TypeScript 5** - Type safety

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or
   bun install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

4. **Setup MetaMask:**
   - Install [MetaMask browser extension](https://metamask.io/)
   - Switch to Sepolia testnet
   - Get test ETH from [Sepolia faucet](https://sepoliafaucet.com/)

## How to Use

### 1. Connect Wallet
- Click "Connect with MetaMask" button
- Approve the connection in MetaMask popup
- Your wallet address will be displayed once connected
- Make sure you're on the Sepolia testnet

### 2. Connect to Yellow Network
- Click "Connect to Sandbox" to establish WebSocket connection
- The app connects to Yellow Network's sandbox environment at `wss://clearnet-sandbox.yellow.com/ws`
- Connection status will be shown in real-time
- Activity log will show "Connected to Yellow Network Sandbox"

### 3. Create Payment Session
- Enter the recipient's Ethereum address (must be a valid address starting with 0x)
- Set the initial balance for the session (default: 100)
- Click "Create Session" to initialize a payment channel
- The session message is cryptographically signed using your wallet
- Session ID will be displayed once the session is created

### 4. Send Payment
- Enter the payment amount (default: 10)
- Click "Send Payment" to send instant payment through the state channel
- Payment is signed using your connected wallet
- Confirmation appears in the activity log
- No blockchain transaction needed - instant settlement!

## Architecture

### Components

- **`YellowPayment.tsx`** (src/app/components/YellowPayment.tsx)
  - Main UI component with 4-step workflow
  - Wallet connection interface using Wagmi connectors
  - Yellow Network connection controls
  - Session creation form with validation
  - Payment interface with amount input
  - Real-time activity log display

### Hooks

- **`useYellow.ts`** (src/app/hooks/useYellow.ts)
  - Custom hook managing Yellow Network integration
  - Uses Wagmi hooks:
    - `useAccount()` - Get connected wallet address
    - `useWalletClient()` - Get wallet client for signing
    - `useDisconnect()` - Disconnect wallet
  - WebSocket connection management
  - Session creation using `createAppSessionMessage` from Yellow SDK
  - Payment signing with wallet client
  - Message parsing with `parseAnyRPCResponse`
  - Real-time event handling and error management

### Providers

- **`providers.tsx`** (src/app/providers.tsx)
  - Client component wrapping the app with necessary providers
  - Wagmi configuration:
    - Sepolia testnet chain
    - MetaMask connector with dApp metadata
    - HTTP transport for RPC calls
  - React Query client for async state management

### Types

- **`window.d.ts`** (src/types/window.d.ts)
  - TypeScript definitions for MetaMask ethereum provider
  - Window interface extensions

## Yellow Network Integration

The app uses the official Yellow Network SDK (`@erc7824/nitrolite`) for:

### 1. Creating App Sessions
```typescript
const sessionMessage = await createAppSessionMessage(
  {
    participants: [senderAddress, recipientAddress],
    weights: [1, 1],
    quorum: 2,
    allocations: {
      [senderAddress]: initialBalance,
      [recipientAddress]: '0',
    },
    chainId: '11155111', // Sepolia
  },
  walletClient
);
```

### 2. Parsing RPC Responses
```typescript
const parsed = parseAnyRPCResponse(data);
if (parsed.result?.sessionId) {
  // Session created successfully
}
```

### 3. WebSocket Communication
- Connects to `wss://clearnet-sandbox.yellow.com/ws`
- Sends JSON-RPC 2.0 formatted messages
- Receives and parses responses in real-time
- Handles session creation, payment confirmation, and errors

### 4. Signing Payments
```typescript
const signature = await walletClient.signMessage({
  account: address,
  message: JSON.stringify(paymentData),
});
```

## Network Configuration

- **Chain:** Sepolia Testnet
- **Chain ID:** 11155111
- **Yellow Network:** Sandbox environment
- **WebSocket Endpoint:** `wss://clearnet-sandbox.yellow.com/ws`
- **RPC Protocol:** JSON-RPC 2.0

## Project Structure

```
pixel-mania/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   └── YellowPayment.tsx    # Main payment UI component
│   │   ├── hooks/
│   │   │   └── useYellow.ts         # Yellow Network integration hook
│   │   ├── providers.tsx            # Wagmi & React Query providers
│   │   ├── layout.tsx               # Root layout with providers
│   │   ├── page.tsx                 # Home page
│   │   └── globals.css              # Global styles
│   └── types/
│       └── window.d.ts              # MetaMask type definitions
├── package.json                     # Dependencies
└── README.md                        # This file
```

## Key Features Explained

### Real Wagmi Integration
Instead of manually calling `window.ethereum.request()`, the app uses:
- `useConnect()` hook with MetaMask connector
- `useAccount()` to track connection state
- `useWalletClient()` to get signing capabilities
- `useDisconnect()` for proper cleanup

### Yellow SDK Integration
- Uses `createAppSessionMessage()` from the official SDK
- Properly formats session parameters
- Signs messages with wallet client
- Parses responses with `parseAnyRPCResponse()`

### State Channel Benefits
- **Instant payments** - no waiting for blockchain confirmation
- **Low cost** - minimal gas fees, only on channel open/close
- **High throughput** - hundreds of transactions per second
- **Privacy** - off-chain transactions

## References

- [Yellow Network Documentation](https://docs.yellow.org/)
- [Yellow Network Quick Start Guide](https://docs.yellow.org/docs/build/quick-start/)
- [Wagmi Documentation](https://wagmi.sh/)
- [Viem Documentation](https://viem.sh/)
- [MetaMask SDK](https://docs.metamask.io/wallet/how-to/connect/set-up-sdk/)

## Troubleshooting

### MetaMask not connecting
- Make sure MetaMask extension is installed
- Check that you're on Sepolia testnet
- Try refreshing the page
- Check browser console for errors

### WebSocket connection fails
- Verify internet connection
- Check that Yellow Network sandbox is online
- Look at activity log for error messages

### Session creation fails
- Ensure wallet is connected
- Verify recipient address is valid
- Check that WebSocket is connected
- Review activity log for specific errors

## License

MIT
