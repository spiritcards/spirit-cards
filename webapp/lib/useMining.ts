"use client";

import { useSyncExternalStore } from "react";
import { mining, type MiningState } from "./mining-engine";

/**
 * React bindings for the process-wide mining engine (see mining-engine.ts).
 * Progress ticks re-render only the components that subscribe.
 */

/** Full engine state + actions, for the `/mine` view. */
export function useMining(): { state: MiningState; engine: typeof mining } {
  const state = useSyncExternalStore(mining.subscribe, mining.getState, mining.getServerState);
  return { state, engine: mining };
}

/** Just "is the auto-miner running" — for the global header indicator. */
export function useMiningRunning(): boolean {
  return useSyncExternalStore(
    mining.subscribe,
    () => mining.getState().running,
    () => false,
  );
}
