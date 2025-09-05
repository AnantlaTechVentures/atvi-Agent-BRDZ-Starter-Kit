'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type InteractionMode = 'chat' | 'manual';

interface ModeContextType {
  mode: InteractionMode;
  setMode: (mode: InteractionMode) => void;
  toggleMode: () => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<InteractionMode>('chat');

  const toggleMode = () => {
    setMode(prev => prev === 'chat' ? 'manual' : 'chat');
  };

  return (
    <ModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}