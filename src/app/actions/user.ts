'use server';

import  prisma  from '@/lib/prisma';
import type { Address } from 'viem';

export interface UserData {
  id: string;
  walletAddress: string;
  ensName: string | null;
  virtualBalance: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sync user to database on wallet connect
 * Creates new user if doesn't exist, updates ENS if changed
 */
export async function syncUser(
  walletAddress: Address,
  ensName?: string | null
): Promise<UserData> {
  try {
    const user = await prisma.user.upsert({
      where: { walletAddress: walletAddress.toLowerCase() },
      update: {
        ensName: ensName || null,
        updatedAt: new Date(),
      },
      create: {
        walletAddress: walletAddress.toLowerCase(),
        ensName: ensName || null,
        virtualBalance: BigInt(0),
      },
    });

    return {
      id: user.id,
      walletAddress: user.walletAddress,
      ensName: user.ensName,
      virtualBalance: user.virtualBalance.toString(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (error) {
    console.error('Error syncing user:', error);
    throw new Error('Failed to sync user');
  }
}

/**
 * Get user by wallet address
 */
export async function getUserByAddress(walletAddress: Address): Promise<UserData | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) return null;

    return {
      id: user.id,
      walletAddress: user.walletAddress,
      ensName: user.ensName,
      virtualBalance: user.virtualBalance.toString(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

/**
 * Update user's virtual balance
 */
export async function updateUserBalance(
  walletAddress: Address,
  newBalance: bigint
): Promise<UserData> {
  try {
    const user = await prisma.user.update({
      where: { walletAddress: walletAddress.toLowerCase() },
      data: { virtualBalance: newBalance },
    });

    return {
      id: user.id,
      walletAddress: user.walletAddress,
      ensName: user.ensName,
      virtualBalance: user.virtualBalance.toString(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (error) {
    console.error('Error updating balance:', error);
    throw new Error('Failed to update balance');
  }
}
