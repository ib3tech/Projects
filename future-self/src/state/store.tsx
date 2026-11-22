import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { emptyState, migrate } from '../engine/defaults';
import { buildModel, Model } from '../engine/model';
import { AppState, Provenance } from '../engine/profile';

const KEY = 'future-self:state:v1';

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = migrate(JSON.parse(raw));
      if (s) return s;
    }
  } catch {
    /* storage unavailable */
  }
  return emptyState();
}

interface Ctx {
  state: AppState;
  model: Model;
  /** Immutable update via a mutating recipe on a deep clone. */
  update: (fn: (draft: AppState) => void, provenance?: Record<string, Provenance>) => void;
  replace: (s: AppState) => void;
  prov: (key: string, fallback?: Provenance) => Provenance;
  completeQuest: (id: string) => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota or private mode — the prototype still works in memory */
    }
  }, [state]);

  const update = useCallback((fn: (d: AppState) => void, provenance?: Record<string, Provenance>) => {
    setState((s) => {
      const d = structuredClone(s);
      fn(d);
      if (provenance) d.provenance = { ...d.provenance, ...provenance };
      return d;
    });
  }, []);

  const replace = useCallback((s: AppState) => setState(s), []);

  const model = useMemo(() => buildModel(state), [state]);

  const prov = useCallback((key: string, fallback: Provenance = 'assumption') => state.provenance[key] ?? fallback, [state.provenance]);

  const completeQuest = useCallback(
    (id: string) =>
      update((d) => {
        if (!d.game.questsDone.includes(id)) d.game.questsDone.push(id);
      }),
    [update],
  );

  const value = useMemo(() => ({ state, model, update, replace, prov, completeQuest }), [state, model, update, replace, prov, completeQuest]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('StoreProvider missing');
  return c;
}
