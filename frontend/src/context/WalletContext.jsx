import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BrowserProvider } from "ethers";

const WalletContext = createContext(null);

const TARGET_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 12345);
const TARGET_HEX = "0x" + TARGET_CHAIN_ID.toString(16);
const RPC_URL = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";
const NETWORK_NAME = import.meta.env.VITE_NETWORK_NAME || "Ticket Private Clique";

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const refresh = useCallback(async () => {
    if (!window.ethereum) return;
    const provider = new BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_accounts", []);
    const network = await provider.getNetwork();
    setAccount(accounts[0] ? accounts[0].toLowerCase() : null);
    setChainId(Number(network.chainId));
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
    if (!window.ethereum) return undefined;
    const onAccounts = () => refresh();
    const onChain = () => refresh();
    window.ethereum.on?.("accountsChanged", onAccounts);
    window.ethereum.on?.("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", onAccounts);
      window.ethereum.removeListener?.("chainChanged", onChain);
    };
  }, [refresh]);

  const ensureNetwork = useCallback(async () => {
    if (!window.ethereum) throw new Error("Chưa cài MetaMask");
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: TARGET_HEX }],
      });
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: TARGET_HEX,
              chainName: NETWORK_NAME,
              rpcUrls: [RPC_URL],
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            },
          ],
        });
      } else {
        throw err;
      }
    }
    const provider = new BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    const id = Number(network.chainId);
    setChainId(id);
    if (id !== TARGET_CHAIN_ID) {
      throw new Error(`Không chuyển được sang mạng ${NETWORK_NAME} (chainId ${TARGET_CHAIN_ID}).`);
    }
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      if (!window.ethereum) throw new Error("Chưa cài MetaMask");
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      await ensureNetwork();
      await refresh();
    } catch (err) {
      const message = err.message || String(err);
      setError(message);
      throw err;
    } finally {
      setConnecting(false);
    }
  }, [refresh, ensureNetwork]);

  /** true khi đã biết chain và sai mạng; null = chưa sẵn sàng */
  const wrongNetwork = chainId != null && chainId !== TARGET_CHAIN_ID;
  const networkReady = chainId === TARGET_CHAIN_ID;

  const value = useMemo(
    () => ({
      account,
      chainId,
      connecting,
      error,
      wrongNetwork,
      networkReady,
      targetChainId: TARGET_CHAIN_ID,
      networkName: NETWORK_NAME,
      connect,
      ensureNetwork,
      refresh,
    }),
    [account, chainId, connecting, error, wrongNetwork, networkReady, connect, ensureNetwork, refresh]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
