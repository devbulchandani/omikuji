'use client';

import { createContext, useContext, useState } from 'react';
import { useYellow } from '@/hooks/useYellow';
import { useNitroliteClient } from '@/hooks/useNitroliteClient';
import { useChannelLifecycle } from '@/hooks/useChannelLifecycle';

type GameContextType = ReturnType<typeof useYellow> &
  ReturnType<typeof useChannelLifecycle> & {
  // Session state
  sessionActive: boolean;
  setSessionActive: (active: boolean) => void;
  depositAmount: string;
  setDepositAmount: (amount: string) => void;
  // Game stats
  totalWinnings: number;
  setTotalWinnings: React.Dispatch<React.SetStateAction<number>>;
  totalBets: number;
  setTotalBets: React.Dispatch<React.SetStateAction<number>>;
  // Messages (placeholder)
  messages: string[];
  error: string | null;
};

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const yellow = useYellow();
  const { nitroliteClient, address, ensureCorrectChain } = useNitroliteClient();
  const channelLifecycle = useChannelLifecycle({
    yellow,
    nitroliteClient,
    address,
    ensureCorrectChain,
  });

  const [sessionActive, setSessionActive] = useState(false);
  const [depositAmount, setDepositAmount] = useState('1.00');
  const [totalWinnings, setTotalWinnings] = useState(0);
  const [totalBets, setTotalBets] = useState(0);

  return (
    <GameContext.Provider
      value={{
        ...yellow,
        ...channelLifecycle,
        sessionActive,
        setSessionActive,
        depositAmount,
        setDepositAmount,
        totalWinnings,
        setTotalWinnings,
        totalBets,
        setTotalBets,
        messages: [],
        error: null,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}
