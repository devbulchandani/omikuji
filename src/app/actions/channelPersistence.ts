'use server';

import prisma from '@/lib/prisma';
import type { Hex, Address } from 'viem';

export interface StoredChannelData {
  channelId: Hex;
  clearnodeAddress: Address;
  brokerAddress: Address | null;
  channelStatus: string;
  createdAt: Date;
  lastUsed: Date;
}

/**
 * Get user's stored Yellow Network channel
 */
export async function getUserChannel(walletAddress: Address): Promise<StoredChannelData | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      select: {
        yellowChannelId: true,
        yellowClearnodeAddr: true,
        yellowBrokerAddr: true,
        channelStatus: true,
        channelCreatedAt: true,
        channelLastUsed: true,
      },
    });

    if (!user?.yellowChannelId || !user?.yellowClearnodeAddr) {
      return null;
    }

    return {
      channelId: user.yellowChannelId as Hex,
      clearnodeAddress: user.yellowClearnodeAddr as Address,
      brokerAddress: (user.yellowBrokerAddr as Address) || null,
      channelStatus: user.channelStatus,
      createdAt: user.channelCreatedAt || new Date(),
      lastUsed: user.channelLastUsed || new Date(),
    };
  } catch (error) {
    console.error('Failed to get user channel:', error);
    return null;
  }
}

/**
 * Store or update user's Yellow Network channel
 */
export async function storeUserChannel(
  walletAddress: Address,
  channelId: Hex,
  clearnodeAddress: Address,
  brokerAddress?: Address
): Promise<void> {
  try {
    await prisma.user.upsert({
      where: { walletAddress: walletAddress.toLowerCase() },
      create: {
        walletAddress: walletAddress.toLowerCase(),
        yellowChannelId: channelId,
        yellowClearnodeAddr: clearnodeAddress,
        yellowBrokerAddr: brokerAddress || null,
        channelStatus: 'open',
        channelCreatedAt: new Date(),
        channelLastUsed: new Date(),
      },
      update: {
        yellowChannelId: channelId,
        yellowClearnodeAddr: clearnodeAddress,
        yellowBrokerAddr: brokerAddress || null,
        channelStatus: 'open',
        channelLastUsed: new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to store user channel:', error);
    throw error;
  }
}

/**
 * Update channel last used timestamp
 */
export async function updateChannelLastUsed(walletAddress: Address): Promise<void> {
  try {
    await prisma.user.update({
      where: { walletAddress: walletAddress.toLowerCase() },
      data: { channelLastUsed: new Date() },
    });
  } catch (error) {
    console.error('Failed to update channel last used:', error);
  }
}

/**
 * Clear user's stored channel (when closing permanently)
 */
export async function clearUserChannel(walletAddress: Address): Promise<void> {
  try {
    await prisma.user.update({
      where: { walletAddress: walletAddress.toLowerCase() },
      data: {
        yellowChannelId: null,
        yellowClearnodeAddr: null,
        yellowBrokerAddr: null,
        channelStatus: 'unknown',
        channelCreatedAt: null,
        channelLastUsed: null,
      },
    });
  } catch (error) {
    console.error('Failed to clear user channel:', error);
    throw error;
  }
}
