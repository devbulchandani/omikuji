'use server';

import  prisma  from '@/lib/prisma';
import type { Address } from 'viem';

export interface GameSessionData {
  id: string;
  userId: string;
  betAmount: string;
  multiplierHit: number;
  payoutAmount: string;
  outcome: 'WIN' | 'LOSS' | 'PENDING';
  nitroliteState: any;
  timestamp: Date;
}

/**
 * Create a new game session when user deposits/starts playing
 * Sets the user's virtual balance to the deposit amount
 */
export async function createGameSession(
  walletAddress: Address,
  betAmount: bigint,
  nitroliteState?: any
): Promise<GameSessionData> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get user
      const user = await tx.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
      });

      if (!user) {
        throw new Error('User not found. Please sync user first.');
      }

      // Set virtual balance to deposit amount
      await tx.user.update({
        where: { walletAddress: walletAddress.toLowerCase() },
        data: { virtualBalance: betAmount },
      });

      // Create session
      const session = await tx.gameSession.create({
        data: {
          userId: user.id,
          betAmount,
          multiplierHit: 0,
          payoutAmount: BigInt(0),
          outcome: 'PENDING',
          nitroliteState: nitroliteState || null,
        },
      });

      return session;
    });

    return {
      id: result.id,
      userId: result.userId,
      betAmount: result.betAmount.toString(),
      multiplierHit: result.multiplierHit,
      payoutAmount: result.payoutAmount.toString(),
      outcome: result.outcome as 'WIN' | 'LOSS' | 'PENDING',
      nitroliteState: result.nitroliteState,
      timestamp: result.timestamp,
    };
  } catch (error) {
    console.error('Error creating game session:', error);
    throw new Error('Failed to create game session');
  }
}

/**
 * Record game result and update user balance in a single transaction
 */
export async function recordGameResult(
  walletAddress: Address,
  sessionId: string,
  outcome: 'WIN' | 'LOSS',
  betAmount: bigint,
  multiplierHit: number,
  payoutAmount: bigint,
  nitroliteState?: any
): Promise<{ session: GameSessionData; newBalance: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get user
      const user = await tx.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Update session
      const session = await tx.gameSession.update({
        where: { id: sessionId },
        data: {
          outcome,
          betAmount,
          multiplierHit,
          payoutAmount,
          nitroliteState: nitroliteState || null,
        },
      });

      // Calculate new balance
      const currentBalance = user.virtualBalance;
      const balanceChange = outcome === 'WIN' ? payoutAmount - betAmount : -betAmount;
      const newBalance = currentBalance + balanceChange;

      // Update user balance
      const updatedUser = await tx.user.update({
        where: { walletAddress: walletAddress.toLowerCase() },
        data: { virtualBalance: newBalance },
      });

      // Track dealer profits on losses
      if (outcome === 'LOSS') {
        // Get or create dealer stats
        const dealerStats = await tx.dealerStats.findFirst();

        if (dealerStats) {
          await tx.dealerStats.update({
            where: { id: dealerStats.id },
            data: { totalProfits: dealerStats.totalProfits + betAmount },
          });
        } else {
          await tx.dealerStats.create({
            data: { totalProfits: betAmount },
          });
        }
      }

      return {
        session,
        newBalance: updatedUser.virtualBalance,
      };
    });

    return {
      session: {
        id: result.session.id,
        userId: result.session.userId,
        betAmount: result.session.betAmount.toString(),
        multiplierHit: result.session.multiplierHit,
        payoutAmount: result.session.payoutAmount.toString(),
        outcome: result.session.outcome as 'WIN' | 'LOSS' | 'PENDING',
        nitroliteState: result.session.nitroliteState,
        timestamp: result.session.timestamp,
      },
      newBalance: result.newBalance.toString(),
    };
  } catch (error) {
    console.error('Error recording game result:', error);
    throw new Error('Failed to record game result');
  }
}

/**
 * Get user's latest active session (for persistence/resume)
 */
export async function getActiveSession(
  walletAddress: Address
): Promise<GameSessionData | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: {
        sessions: {
          where: { outcome: 'PENDING' },
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    if (!user || user.sessions.length === 0) {
      return null;
    }

    const session = user.sessions[0];

    return {
      id: session.id,
      userId: session.userId,
      betAmount: session.betAmount.toString(),
      multiplierHit: session.multiplierHit,
      payoutAmount: session.payoutAmount.toString(),
      outcome: session.outcome as 'WIN' | 'LOSS' | 'PENDING',
      nitroliteState: session.nitroliteState,
      timestamp: session.timestamp,
    };
  } catch (error) {
    console.error('Error getting active session:', error);
    return null;
  }
}

/**
 * Get user's game history
 */
export async function getUserGameHistory(
  walletAddress: Address,
  limit: number = 10
): Promise<GameSessionData[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: {
        sessions: {
          where: { outcome: { in: ['WIN', 'LOSS'] } },
          orderBy: { timestamp: 'desc' },
          take: limit,
        },
      },
    });

    if (!user) return [];

    return user.sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      betAmount: session.betAmount.toString(),
      multiplierHit: session.multiplierHit,
      payoutAmount: session.payoutAmount.toString(),
      outcome: session.outcome as 'WIN' | 'LOSS' | 'PENDING',
      nitroliteState: session.nitroliteState,
      timestamp: session.timestamp,
    }));
  } catch (error) {
    console.error('Error getting game history:', error);
    return [];
  }
}
