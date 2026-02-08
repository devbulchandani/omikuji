'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useGameContext } from '@/contexts/GameContext';
import Navbar from '@/components/game/Navbar';
import { useDisconnect } from 'wagmi';

export default function GameSessionPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const {
    channelId,
    isProcessing,
    setupChannel,
    closeChannel,
    sessionActive,
    setSessionActive,
    depositAmount,
    setDepositAmount,
  } = useGameContext();

  const [showForceClose, setShowForceClose] = useState(false);

  useEffect(() => {
    if (!isConnected) router.push('/');
  }, [isConnected, router]);

  useEffect(() => {
    if (sessionActive) router.push('/game/play');
  }, [sessionActive, router]);

  useEffect(() => {
    if (channelId && !sessionActive) {
      setSessionActive(true);
    }
  }, [channelId, sessionActive, setSessionActive]);

  const startSession = async () => {
    if (!address) return;

    try {
      if (!depositAmount || parseFloat(depositAmount) <= 0) {
        alert('Please enter a valid deposit amount');
        return;
      }

      console.log('[Game] Starting session...');
      await setupChannel(depositAmount);

      console.log('[Game] ✅ Channel ready!');
      setSessionActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Game] Start session error:', err);
      alert(`Failed: ${msg}`);
    }
  };

  const handleCloseChannel = async () => {
    if (!channelId) return;

    try {
      console.log('[Game] Closing channel...');
      await closeChannel();
      console.log('[Game] ✅ Channel closed');
      setSessionActive(false);
      alert('Channel closed successfully!');
    } catch (err) {
      console.error('[Game] Close error:', err);
      alert(`Failed to close: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (!isConnected || !address) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar
        address={address}
        status="setup"
        dbBalance="0.00"
        onDisconnect={disconnect}
      />

      <div className="game-setup-container">
        <div className="game-setup-content">
          <h1 className="game-setup-title">START SESSION</h1>
          <p className="game-setup-subtitle">
            {channelId ? (
              <>
                Yellow channel active
                <span className="game-setup-channel-id">
                  {channelId.slice(0, 20)}...
                </span>
              </>
            ) : (
              'Create a Yellow Network channel to begin playing'
            )}
          </p>

          {/* Close Channel Link */}
          {channelId && (
            <button
              onClick={handleCloseChannel}
              disabled={isProcessing}
              className="game-setup-link-btn"
            >
              Close Channel
            </button>
          )}

          {/* Deposit Amount Input */}
          {!channelId && (
            <div className="game-setup-input-group">
              <label className="label-xs block mb-2">DEPOSIT AMOUNT (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="1.00"
                className="input-field"
              />
              <div className="game-setup-input-hint">Minimum: $0.01 USD</div>
            </div>
          )}

          <button
            onClick={startSession}
            disabled={isProcessing}
            className="btn-primary"
          >
            {isProcessing ? 'LOADING...' : channelId ? 'RESUME SESSION' : 'CREATE CHANNEL'}
          </button>

          <div className="info-box mt-8 text-left">
            <div className="label-xs text-mint mb-3">HOW IT WORKS</div>
            <div className="text-sm text-muted leading-relaxed space-y-2">
              <p>1. Deposit USDC to the custody contract</p>
              <p>2. A state channel is created with Yellow Network</p>
              <p>3. Place instant, gas-free bets on crypto prices</p>
              <p>4. Close your channel to withdraw funds</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
