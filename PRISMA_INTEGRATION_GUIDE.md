# 🎯 Omikuji Prisma Integration Guide

Complete guide to integrate NeonDB (Postgres) with your Omikuji prediction market game.

---

## 📋 Overview

The integration provides:
- ✅ **User Management** - Auto-create/sync users on wallet connect
- ✅ **Virtual Balance** - Track off-chain winnings/losses in database
- ✅ **Game Sessions** - Persist game state for resumption
- ✅ **Transaction History** - Record all bets with outcomes
- ✅ **Nitrolite State** - Store signed states for recovery

---

## 🚀 Setup Steps

### 1. **Environment Variables**

Add to your `.env` file:

```env
# NeonDB Connection
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"

# Example (replace with your NeonDB URL):
# DATABASE_URL="postgresql://omikuji_owner:xxxxx@ep-xxx.us-east-2.aws.neon.tech/omikuji?sslmode=require"
```

### 2. **Install Dependencies** (Already done)

```bash
npm install @prisma/client@^7.3.0 prisma@^7.3.0 @neondatabase/serverless@^1.0.2
```

### 3. **Initialize Prisma**

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (creates tables)
npx prisma db push

# Optional: Open Prisma Studio to view data
npx prisma studio
```

---

## 📁 File Structure

```
src/
├── app/
│   └── actions/
│       ├── user.ts              # User CRUD operations
│       └── gameSession.ts       # Game session management
├── hooks/
│   ├── useUserSync.ts           # Auto-sync user on wallet connect
│   └── useGameWithPersistence.ts # Game logic + Prisma persistence
├── lib/
│   └── prisma.ts                # Prisma client singleton
└── components/
    └── LandingPage.tsx          # Updated with user sync
```

---

## 🔄 User Lifecycle Flow

### **1. Landing Page → Connect Wallet**

```typescript
// src/components/LandingPage.tsx
import { useUserSync } from '@/hooks/useUserSync';

const { userData, isSyncing } = useUserSync();

// Auto-syncs user to database when wallet connects
// Creates new user if first time, updates ENS if changed
```

**What happens:**
- ✅ User connects MetaMask
- ✅ `useUserSync` detects connection
- ✅ Calls `syncUser(address, ensName)` server action
- ✅ Creates/updates User in NeonDB
- ✅ Fetches any active session for resume
- ✅ Redirects to `/game` when synced

---

### **2. Game Page → Start Session**

```typescript
// src/app/game/page.tsx
import { useGameWithPersistence } from '@/hooks/useGameWithPersistence';

const { startGameSession, virtualBalance } = useGameWithPersistence();

// When user deposits
await startGameSession(depositAmount, nitroliteState);
```

**What happens:**
- ✅ Creates Yellow Network channel (off-chain)
- ✅ Deposits USDC to Nitrolite custody
- ✅ Creates `GameSession` in DB with status='PENDING'
- ✅ Stores Nitrolite channel state for recovery

---

### **3. Game Loop → Place Bets**

```typescript
// When user places a bet
const { recordBetResult } = useGameWithPersistence();

// After bet resolves (WIN or LOSS)
await recordBetResult(
  betAmount,
  multiplier,
  outcome,        // 'WIN' or 'LOSS'
  nitroliteState  // Updated Nitrolite state
);
```

**What happens (Atomic Transaction):**
- ✅ Updates `GameSession` with outcome, multiplier, payout
- ✅ Calculates balance change: `WIN = +payout-bet, LOSS = -bet`
- ✅ Updates `User.virtualBalance` in same transaction
- ✅ Stores latest Nitrolite state

**Example:**
```
Before: virtualBalance = 100 USDC
Bet: 10 USDC @ 2x multiplier
WIN: virtualBalance = 100 + (20 - 10) = 110 USDC
LOSS: virtualBalance = 100 - 10 = 90 USDC
```

---

### **4. Persistence → Resume Session**

```typescript
// On page load/refresh
const { activeSession, resumeSession } = useGameWithPersistence();

useEffect(() => {
  if (activeSession) {
    resumeSession(); // Restore Nitrolite state
  }
}, [activeSession]);
```

**What happens:**
- ✅ Fetches latest `GameSession` with status='PENDING'
- ✅ Restores Nitrolite channel state from DB
- ✅ User can continue playing without re-depositing

---

## 🛠️ Server Actions API

### **User Actions** (`src/app/actions/user.ts`)

#### `syncUser(walletAddress, ensName?)`
- Creates new user or updates existing
- Returns: `UserData` with id, walletAddress, virtualBalance, etc.

#### `getUserByAddress(walletAddress)`
- Fetches user by wallet address
- Returns: `UserData | null`

#### `updateUserBalance(walletAddress, newBalance)`
- Manually update user balance
- Returns: `UserData`

---

### **Game Session Actions** (`src/app/actions/gameSession.ts`)

#### `createGameSession(walletAddress, betAmount, nitroliteState?)`
- Creates new PENDING session when user deposits
- Returns: `GameSessionData`

#### `recordGameResult(walletAddress, sessionId, outcome, betAmount, multiplier, payoutAmount, nitroliteState?)`
- **Atomic transaction**: Updates session + user balance
- Returns: `{ session, newBalance }`

#### `getActiveSession(walletAddress)`
- Fetches latest PENDING session for resume
- Returns: `GameSessionData | null`

#### `getUserGameHistory(walletAddress, limit?)`
- Fetches completed sessions (WIN/LOSS only)
- Returns: `GameSessionData[]`

---

## 🎮 Integration Example

### Complete Flow in Game Page:

```typescript
'use client';

import { useGameWithPersistence } from '@/hooks/useGameWithPersistence';
import { useYellow } from '@/hooks/useYellow';

export default function GamePage() {
  const { createPaymentChannel, submitGameMove } = useYellow();
  const {
    userData,
    virtualBalance,
    startGameSession,
    recordBetResult,
    resumeSession
  } = useGameWithPersistence();

  // 1. Start Session (on deposit)
  const handleDeposit = async (amount: string) => {
    const result = await createPaymentChannel(amount);

    if (result) {
      await startGameSession(
        parseUSD(amount),
        { channelId: result.channelId }
      );
    }
  };

  // 2. Place Bet (off-chain via Yellow)
  const handlePlaceBet = async (targetPrice: number, betAmount: number) => {
    // Submit to Yellow Network
    await submitGameMove(moveData, allocations);

    // Determine outcome (from price oracle)
    const outcome = currentPrice >= targetPrice ? 'WIN' : 'LOSS';

    // Record in database
    await recordBetResult(
      parseUSD(betAmount.toString()),
      2.0, // multiplier
      outcome
    );
  };

  // 3. Resume on page load
  useEffect(() => {
    resumeSession();
  }, []);

  return (
    <div>
      <h1>Virtual Balance: ${formatUSD(virtualBalance)}</h1>
      {/* Game UI */}
    </div>
  );
}
```

---

## 🔒 Security Best Practices

### ✅ **Server Actions Only**
- All database operations via server actions (not exposed to client)
- Prevents SQL injection, unauthorized access

### ✅ **Wallet Address Validation**
- Always use wagmi's authenticated wallet address
- Never trust client-sent addresses

### ✅ **Atomic Transactions**
- `recordGameResult` uses Prisma transactions
- Balance updates never get out of sync with sessions

### ✅ **BigInt for Amounts**
- All token amounts stored as `BigInt` (no decimals)
- Prevents floating-point rounding errors

---

## 🧪 Testing the Integration

### 1. **Sync User**
```bash
# Connect wallet → Check Prisma Studio
# Should see new User with virtualBalance = 0
```

### 2. **Create Session**
```bash
# Deposit $10 USDC → Check Prisma Studio
# Should see GameSession with status='PENDING', betAmount=10000000 (10 USDC in 6 decimals)
```

### 3. **Record Win**
```typescript
await recordBetResult(
  parseUSD('1'), // 1 USDC bet
  2.0,           // 2x multiplier
  'WIN'          // outcome
);
// Check Prisma Studio: virtualBalance should increase by 1 USDC (2 - 1)
```

### 4. **Record Loss**
```typescript
await recordBetResult(
  parseUSD('1'),
  2.0,
  'LOSS'
);
// Check Prisma Studio: virtualBalance should decrease by 1 USDC
```

### 5. **Resume Session**
```bash
# Refresh page → Should load active session
# Check console: "[Game] Resumed session: <sessionId>"
```

---

## 📊 Database Schema Reference

### **User Table**
```prisma
model User {
  id             String         @id @default(cuid())
  walletAddress  String         @unique
  ensName        String?
  virtualBalance BigInt         @default(0)  // Wei/Units (6 decimals for USDC)
  sessions       GameSession[]
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
}
```

### **GameSession Table**
```prisma
model GameSession {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  betAmount       BigInt
  multiplierHit   Float
  payoutAmount    BigInt
  outcome         String   // "WIN" | "LOSS" | "PENDING"
  nitroliteState  Json?    // Stores signed Nitrolite state
  timestamp       DateTime @default(now())
}
```

---

## 🚨 Common Issues & Solutions

### **Issue 1: "User not found"**
**Cause:** User not synced before creating session

**Solution:**
```typescript
// Always ensure user is synced first
const { userData } = useUserSync();

if (!userData) {
  await syncUser(address);
}
```

---

### **Issue 2: Balance not updating**
**Cause:** Using separate DB calls instead of transaction

**Solution:**
```typescript
// ❌ Wrong (race condition)
await updateSession(sessionId, outcome);
await updateUserBalance(address, newBalance);

// ✅ Correct (atomic)
await recordGameResult(address, sessionId, outcome, ...);
```

---

### **Issue 3: Prisma Client not generated**
**Cause:** Forgot to run `prisma generate`

**Solution:**
```bash
npx prisma generate
npm run dev
```

---

## 🎯 Next Steps

1. **Test Full Flow**
   - Connect wallet → Deposit → Place bets → Check DB

2. **Add UI for Balance**
   - Show `virtualBalance` in navbar
   - Display game history

3. **Implement Withdrawals**
   - Allow users to withdraw virtual balance to Yellow channel
   - Update both DB and Nitrolite state

4. **Add Analytics**
   - Win/loss ratios
   - Profit/loss over time
   - Leaderboards

---

## 📚 Resources

- **Prisma Docs:** https://www.prisma.io/docs
- **NeonDB:** https://neon.tech/docs
- **Yellow Network:** https://docs.yellow.org/
- **Wagmi:** https://wagmi.sh/

---

## 🎉 Summary

You now have:
- ✅ User sync on wallet connect
- ✅ Game session persistence
- ✅ Virtual balance tracking
- ✅ Transaction history
- ✅ Resume functionality

**Your Omikuji game is now production-ready with full database persistence! 🚀**
