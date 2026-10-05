"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import type { Eip1193Provider } from "./ethereum";
import { RH_RPC_URL, rhChain } from "./rh-chain";
import { RH_CHAIN_ID } from "./contract";
import {
  disconnectWalletConnect,
  getWalletConnectProvider,
  walletConnectEnabled,
} from "./walletconnect";
import { useWalletRestore } from "./useWalletRestore";

/**
 * useEthWallet — shared connect/restore/switch hook for the POC pages.
 *
 * Wraps `useWalletRestore` (silent injected + WalletConnect reconnect) and the
 * injected/WalletConnect connect flows plus `wallet_switchEthereumChain`, so
 * every action page does not re-implement the same ~120 lines.
 */
export function useEthWallet() {
  const [address, setAddress] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<Eip1193Provider | null>(null);
  const [hasInjected, setHasInjected] = useState(false);

  useWalletRestore(
    (p, restoredAddress, restoredChain) => {
      if (p) setProvider(p);
      setAddress(restoredAddress);
      setChainId(restoredChain);
    },
    {
      onAccountsChanged: (next) => {
        setAddress(next);
        if (!next) setProvider(null);
      },
      onChainChanged: (next) => setChainId(next),
      onDisconnect: () => {
        setProvider(null);
        setAddress(null);
        setChainId(null);
      },
    },
  );

  useEffect(() => {
    setHasInjected(!!window.ethereum);
  }, []);

  const activeProvider = useCallback(
    (): Eip1193Provider | null => provider ?? (typeof window !== "undefined" ? (window.ethereum ?? null) : null),
    [provider],
  );

  const ensureChain = useCallback(async (p: Eip1193Provider, currentId: number | null) => {
    if (currentId === RH_CHAIN_ID) return;
    const hexId = `0x${RH_CHAIN_ID.toString(16)}`;
    try {
      await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
    } catch {
      try {
        await p.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hexId,
              chainName: rhChain.name,
              nativeCurrency: rhChain.nativeCurrency,
              rpcUrls: [RH_RPC_URL],
              blockExplorerUrls: [rhChain.blockExplorers.default.url],
            },
          ],
        });
        await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
      } catch {
        /* user rejected the add */
      }
    }
  }, []);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) throw new Error("No injected wallet found.");
    const accounts = (await eth.request({ method: "eth_requestAccounts" })) as Address[];
    const idHex = (await eth.request({ method: "eth_chainId" })) as string;
    setAddress(accounts[0] ?? null);
    const id = Number.parseInt(idHex, 16);
    setChainId(id);
    await ensureChain(eth, id);
    try {
      const h = (await eth.request({ method: "eth_chainId" })) as string;
      setChainId(Number.parseInt(h, 16));
    } catch {
      /* ignore */
    }
  }, [ensureChain]);

  const connectWalletConnect = useCallback(async () => {
    if (!walletConnectEnabled()) {
      throw new Error("WalletConnect is not configured in this build.");
    }
    const p = await getWalletConnectProvider();
    p.on?.("accountsChanged", (a) => {
      setAddress(((a as string[])?.[0] as Address | undefined) ?? null);
    });
    p.on?.("chainChanged", (c) => setChainId(Number.parseInt(String(c), 16)));
    p.on?.("disconnect", () => {
      setProvider(null);
      setAddress(null);
      setChainId(null);
    });
    const accounts = (await p.request({ method: "eth_requestAccounts" })) as Address[];
    const idHex = (await p.request({ method: "eth_chainId" })) as string;
    setProvider(p);
    setAddress(accounts[0] ?? null);
    setChainId(Number.parseInt(idHex, 16));
    await ensureChain(p, Number.parseInt(idHex, 16));
    try {
      const h = (await p.request({ method: "eth_chainId" })) as string;
      setChainId(Number.parseInt(h, 16));
    } catch {
      /* ignore */
    }
  }, [ensureChain]);

  const disconnect = useCallback(async () => {
    if (provider) await disconnectWalletConnect();
    setProvider(null);
    setAddress(null);
    setChainId(null);
  }, [provider]);

  const switchToChain = useCallback(async () => {
    const p = activeProvider();
    if (!p) return;
    const hexId = `0x${RH_CHAIN_ID.toString(16)}`;
    try {
      await p.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexId }],
      });
    } catch {
      try {
        await p.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hexId,
              chainName: rhChain.name,
              nativeCurrency: rhChain.nativeCurrency,
              rpcUrls: [RH_RPC_URL],
              blockExplorerUrls: [rhChain.blockExplorers.default.url],
            },
          ],
        });
      } catch {
        /* user rejected the add */
      }
    }
    try {
      const idHex = (await p.request({ method: "eth_chainId" })) as string;
      setChainId(Number.parseInt(idHex, 16));
    } catch {
      /* provider has no eth_chainId — leave as is */
    }
  }, [activeProvider]);

  const wrongChain = chainId !== null && chainId !== RH_CHAIN_ID;

  return {
    address,
    chainId,
    provider,
    hasInjected,
    wcEnabled: walletConnectEnabled(),
    activeProvider,
    connect,
    connectWalletConnect,
    disconnect,
    switchToChain,
    wrongChain,
  };
}
