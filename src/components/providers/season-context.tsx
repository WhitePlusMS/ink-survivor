/**
 * 赛季状态 Context
 * 用于在组件树中共享赛季状态，避免重复 API 请求
 */
'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';

interface SeasonStatusData {
  isActive: boolean;
  seasonNumber?: number;
  themeKeyword?: string;
  participantCount?: number;
  currentRound?: number;
  currentPhase?: string;
  phaseDisplayName?: string;
}

interface SeasonContextType {
  seasonStatus: SeasonStatusData | null;
  isLoading: boolean;
  refreshSeasonStatus: () => Promise<void>;
}

const SeasonContext = createContext<SeasonContextType | undefined>(undefined);

interface SeasonProviderProps {
  children: ReactNode;
  initialStatus?: SeasonStatusData | null;
}

export function SeasonProvider({ children, initialStatus }: SeasonProviderProps) {
  const [seasonStatus, setSeasonStatus] = useState<SeasonStatusData | null>(initialStatus || null);
  const [isLoading, setIsLoading] = useState(!initialStatus);

  const refreshSeasonStatus = async () => {
    try {
      const response = await fetch('/api/seasons/status');
      const result = await response.json();
      if (result.code === 0 && result.data) {
        setSeasonStatus(result.data);
      }
    } catch (error) {
      console.error('[SeasonContext] Failed to fetch season status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 如果有初始数据，不需要立即请求
  useEffect(() => {
    if (!initialStatus && typeof window !== 'undefined') {
      refreshSeasonStatus();
    }
  }, [initialStatus]);

  return (
    <SeasonContext.Provider value={{ seasonStatus, isLoading, refreshSeasonStatus }}>
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeasonContext() {
  const context = useContext(SeasonContext);
  if (!context) {
    throw new Error('useSeasonContext must be used within a SeasonProvider');
  }
  return context;
}
