# Omikuji Settlement & Winnings Flow

## Current Implementation

### Virtual Balance System
- **Initial deposit** → Sets `virtualBalance = depositAmount` in Prisma
- **Each bet** → Updates `virtualBalance` in DB:
  - **WIN**: `virtualBalance += (payout - betAmount)`
  - **LOSS**: `virtualBalance -= betAmount`
- **Display**: Navbar shows real-time virtual balance from DB

### Yellow Channel Balance
- **Real USDC** locked in Yellow Network state channel
- Tracks actual on-chain funds
- Updated when closing channel

---

## Money Flow Architecture

### 🎲 When Player Loses

```
Player loses bet
  ↓
virtualBalance -= betAmount (DB update)
  ↓
Loss amount virtually credited to DEALER (0xde8792E...f74)
  ↓
On session end: Player closes channel, gets remaining balance
  ↓
Dealer address does NOT receive funds on-chain yet
```

**Implementation Note**: Losses are **tracked virtually** in the DB. Physical settlement to dealer happens when:
1. **Manual dealer withdrawal** (future feature)
2. **Smart contract profit share** (when channel closes)

### 💰 When Player Wins

```
Player wins bet
  ↓
virtualBalance += (payout - betAmount) (DB update)
  ↓
On session end: Player closes channel
  ↓
Channel funds = initial deposit + net winnings
  ↓
User withdraws from custody contract to their wallet
```

**Key Point**: Winnings stay in the Yellow channel until session ends.

---

## Withdrawal Flow (Session End)

### Current Implementation (`closeChannel`)

```typescript
// 1. Close app session (game moves)
await closeAppSession()

// 2. Close Yellow channel
const closeData = await yellowSession.closeChannel(channelId, userAddress)

// 3. Submit final state on-chain
await nitroliteClient.closeChannel({
  finalState,
  serverSignature
})

// 4. Funds automatically withdrawn to user's wallet
// (Handled by Nitrolite custody contract)
```

### What Happens On-Chain

```
Channel closes with final allocations:
  - User: depositAmount + netWinnings
  - Broker: 0 (no funds)

Custody contract transfers:
  - USDC → User wallet address
```

---

## Dealer Settlement (Not Yet Implemented)

### Option 1: Instant Loss Transfers

**When player loses:**
```typescript
// App session update with 3 participants
await submitGameMove({
  allocations: [
    { participant: player, amount: remainingBalance },
    { participant: broker, amount: 0 },
    { participant: dealer, amount: lossAmount }, // ← Dealer gets loss
  ]
})
```

**Pros**: Real-time settlement
**Cons**: More complex state channel (3 parties), higher gas on close

### Option 2: Batch Dealer Withdrawal (Recommended)

**When player loses:**
- Track in DB: `totalDealerProfits += lossAmount`

**Dealer withdraws periodically:**
```typescript
// Admin function
async function dealerWithdraw() {
  const totalProfits = await getTotalDealerProfits()

  // Create special channel for dealer
  const dealerChannel = await createPaymentChannel(totalProfits, DEALER_ADDRESS)

  // Transfer from custody → dealer
  await closeChannel(dealerChannel, DEALER_ADDRESS)
}
```

**Pros**: Efficient, simple state channels (2 parties)
**Cons**: Dealer profits locked until manual withdrawal

### Option 3: Smart Contract Profit Share

**Modify Nitrolite custody contract:**
```solidity
function closeChannel(bytes32 channelId, FinalState memory finalState) {
  // Calculate house edge
  uint256 profit = initialDeposit - finalState.userAllocation;

  // Split profits
  uint256 dealerShare = (profit * HOUSE_EDGE) / 100; // e.g., 5%
  uint256 userPayout = finalState.userAllocation - dealerShare;

  // Transfer
  USDC.transfer(user, userPayout);
  USDC.transfer(DEALER_ADDRESS, dealerShare);
}
```

**Pros**: Automatic, trustless, on-chain
**Cons**: Requires custom Nitrolite contract deployment

---

## Recommended Implementation

**Phase 1** (Current):
- ✅ Virtual balance tracks wins/losses
- ✅ Users withdraw net balance on session end
- ✅ Losses tracked in DB

**Phase 2** (Next):
- ⏳ Add `dealerProfits` field to DB
- ⏳ Increment on each loss
- ⏳ Admin dashboard for dealer withdrawal

**Phase 3** (Future):
- 🔮 Deploy custom Nitrolite contract with profit split
- 🔮 Automatic dealer settlement on every channel close

---

## Channel Balance vs Virtual Balance

| Metric | Source | Purpose |
|--------|--------|---------|
| **Channel Balance** | Yellow Network | Real USDC locked on-chain |
| **Virtual Balance** | Prisma DB | Game balance (bets + winnings) |

**On session start**: `channelBalance = virtualBalance = deposit`

**During game**:
- Virtual balance updates instantly
- Channel balance stays same (off-chain state)

**On session end**:
- Channel closes with `finalAllocations = virtualBalance`
- Custody contract sends USDC to user wallet

---

## Example Flow

### User deposits $10, wins $5, loses $3

```
1. Session Start
   channelBalance: $10
   virtualBalance: $10

2. Win $5 bet (2x multiplier)
   channelBalance: $10 (unchanged)
   virtualBalance: $15 ($10 + $5 win)

3. Lose $3 bet
   channelBalance: $10 (unchanged)
   virtualBalance: $12 ($15 - $3 loss)
   dealerProfits: $3 (tracked in DB)

4. Session End (channel close)
   finalAllocations: { user: $12, broker: $0 }
   USDC sent to user wallet: $12
   Dealer profits accumulated: $3 (for later withdrawal)
```

**Net result:**
- User gets $12 in wallet (+ $2 profit)
- Dealer gets $3 tracked (- $3 from losses)
- Total conserved: $10 initial + $5 win - $3 loss = $12 ✅
