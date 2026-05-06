'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useAuth } from '@/contexts/AuthContext';
import type { TravelDisplayMode } from '@/types/travel';

const DEFAULT_MODE: TravelDisplayMode = 'romaji';
const VALID_MODES: TravelDisplayMode[] = ['hiragana', 'romaji', 'kanji'];

interface TravelDisplayContextValue {
  mode: TravelDisplayMode;
  setMode: (m: TravelDisplayMode) => void;
}

const TravelDisplayContext = createContext<TravelDisplayContextValue>({
  mode: DEFAULT_MODE,
  setMode: () => {},
});

export function TravelDisplayProvider({ children }: { children: ReactNode }) {
  const { travelMainViewMode, updateTravelMainViewMode, user } = useAuth();
  const [mode, setModeState] = useState<TravelDisplayMode>(DEFAULT_MODE);
  const synced = useRef(false);

  // Reset when user changes (sign-out / sign-in as different user)
  useEffect(() => {
    synced.current = false;
    setModeState(DEFAULT_MODE);
  }, [user?.id]);

  // Sync from DB profile on load
  useEffect(() => {
    if (synced.current) return;
    if (travelMainViewMode && VALID_MODES.includes(travelMainViewMode as TravelDisplayMode)) {
      setModeState(travelMainViewMode as TravelDisplayMode);
      synced.current = true;
    }
  }, [travelMainViewMode]);

  const setMode = useCallback(
    (m: TravelDisplayMode) => {
      setModeState(m);
      if (user) {
        void updateTravelMainViewMode(m);
      }
    },
    [user, updateTravelMainViewMode],
  );

  return (
    <TravelDisplayContext.Provider value={{ mode, setMode }}>
      {children}
    </TravelDisplayContext.Provider>
  );
}

export function useTravelDisplay() {
  return useContext(TravelDisplayContext);
}
