'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useGameContext } from '@/contexts/GameContext';
import { formatUSD, parseUSD } from '@/utils/tokenUtils';
import Navbar from '@/components/game/Navbar';
import ActivityLog from '@/components/game/ActivityLog';

export default function GameSessionPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const {
    channel, isProcessing, setupChannel, forceCloseChannelById,
    createAppSession, appSession, messages, error,
    sessionActive, setSessionActive, depositAmount, setDepositAmount,
    virtualBalance, dbActiveSession, resumeSession, startGameSession,
    disconnectWallet,
  } = useGameContext();

  const [channelIdToClose, setChannelIdToClose] = useState('');
  const [showForceClose, setShowForceClose] = useState(false);

  useEffect(() => { if (!isConnected) router.push('/'); }, [isConnected, router]);
  useEffect(() => { if (sessionActive) router.push('/game/play'); }, [sessionActive, router]);

  useEffect(() => {
    if (dbActiveSession && !sessionActive && resumeSession()) {
      setSessionActive(true);
    }
  }, [dbActiveSession, sessionActive, resumeSession, setSessionActive]);

  useEffect(() => {
    if (channel?.status === 'active' && !sessionActive) setSessionActive(true);
  }, [channel, sessionActive, setSessionActive]);

  const startSession = async () => {
    if (!address) return;
    try {
      if (!depositAmount || parseFloat(depositAmount) <= 0) {
        alert('Please enter a valid deposit amount');
        return;
      }

      // setupChannel handles everything: connect, auth, reuse existing or create new
      const result = await setupChannel(depositAmount);

      if (!result) {
        throw new Error('Failed to setup channel');
      }

      // Record game session for new channels
      if (!result.isExisting && result.channelId) {
        await startGameSession(parseUSD(depositAmount), { channelId: result.channelId, timestamp: Date.now() });
      }

      // Create app session if needed
      if (result.clearnodeAddress && !appSession) {
        const session = await createAppSession(depositAmount, result.clearnodeAddress);
        if (!session) {
          throw new Error('Failed to create app session');
        }
      }

      setSessionActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Game] Start session error:', err);
      alert(`Failed: ${msg}`);
    }
  };

  const handleForceClose = async () => {
    if (!channelIdToClose?.startsWith('0x')) { alert('Enter a valid channel ID'); return; }
    try {
      await forceCloseChannelById(channelIdToClose as `0x${string}`);
      setChannelIdToClose(''); setShowForceClose(false);
      alert('Channel closed!');
    } catch (err) {
      alert(`Failed: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  };

  if (!isConnected || !address) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar
        address={address}
        status="setup"
        dbBalance={formatUSD(virtualBalance)}
        onDisconnect={disconnectWallet}
      />

      <div className="flex items-center justify-center min-h-[calc(100vh-65px)] px-8">
        <div className="text-center max-w-md w-full">
          <h1 className="text-5xl font-bold mb-3 tracking-tight">START SESSION</h1>
          <p className="text-muted mb-8">
            {channel ? (
              <>
                Existing Yellow channel detected
                <span className="block text-xs text-mint mt-2 font-mono">
                  {channel.channelId.slice(0, 20)}...
                </span>
              </>
            ) : (
              'Create a Yellow Network channel to begin playing'
            )}
          </p>

          {/* Force Close */}
          {!showForceClose ? (
            <button
              onClick={() => setShowForceClose(true)}
              className="bg-transparent border-none text-muted/50 text-xs underline cursor-pointer mb-6"
            >
              Having issues? Force close an existing channel
            </button>
          ) : (
            <div className="p-6 rounded-2xl mb-6" style={{ background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.3)' }}>
              <div className="label-xs text-danger mb-4">FORCE CLOSE CHANNEL</div>
              <input
                type="text"
                value={channelIdToClose}
                onChange={(e) => setChannelIdToClose(e.target.value)}
                placeholder="Channel ID (0x...)"
                className="input-field-sm mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleForceClose}
                  disabled={isProcessing || !channelIdToClose}
                  className="flex-1 p-3 rounded-xl text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'rgba(255,100,100,0.5)', border: '1px solid rgba(255,100,100,0.5)' }}
                >
                  {isProcessing ? 'Closing...' : 'Force Close'}
                </button>
                <button
                  onClick={() => { setShowForceClose(false); setChannelIdToClose(''); }}
                  className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Deposit */}
          {!channel && (
            <div className="mb-6">
              <label className="label-xs block mb-2">DEPOSIT AMOUNT (USD)</label>
              <input
                type="number" step="0.01" min="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="1.00"
                className="input-field"
              />
              <div className="text-xs text-muted/50 mt-2">Minimum: $0.01 USD</div>
            </div>
          )}

          <button onClick={startSession} disabled={isProcessing} className="btn-primary">
            {isProcessing ? 'LOADING...' : channel ? 'RESUME SESSION' : 'CREATE CHANNEL'}
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

      <ActivityLog messages={messages} />
      {error && <div className="toast-error">{error}</div>}
    </div>
  );
}
