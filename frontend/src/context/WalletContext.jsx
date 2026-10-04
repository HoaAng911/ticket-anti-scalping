import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BrowserProvider } from "ethers";

const WalletContext = createContext(null);

const TARGET_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 12345);
const TARGET_HEX = "0x" + TARGET_CHAIN_ID.toString(16);
const RPC_URL = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";
const NETWORK_NAME = import.meta.env.VITE_NETWORK_NAME || "Ticket Private Clique";
const DISCONNECT_KEY = "ticketchain:wallet-disconnected";

function wasUserDisconnected() {
  try {
    return sessionStorage.getItem(DISCONNECT_KEY) === "1";
  } catch {
    return false;
  }
}

function setUserDisconnected(flag) {
  try {
    if (flag) sessionStorage.setItem(DISCONNECT_KEY, "1");
    else sessionStorage.removeItem(DISCONNECT_KEY);
  } catch {
    /* ignore */
  }
}

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const refresh = useCallback(async () => {
    if (!window.ethereum) {
      setAccount(null);
      setChainId(null);
      return;
    }
    const provider = new BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_accounts", []);
    const network = await provider.getNetwork();
    setChainId(Number(network.chainId));

    // Người dùng đã bấm Disconnect trong app — không tự nối lại từ eth_accounts
    if (wasUserDisconnected()) {
      setAccount(null);
      return;
    }
    setAccount(accounts[0] ? accounts[0].toLowerCase() : null);
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
    if (!window.ethereum) return undefined;
    const onAccounts = (accs) => {
      // MetaMask đổi / ngắt tài khoản
      if (!accs || accs.length === 0) {
        setAccount(null);
        return;
      }
      // Nếu user chủ động disconnect trong app, bỏ qua đến khi Connect lại
      if (wasUserDisconnected()) {
        setAccount(null);
        return;
      }
      refresh().catch(() => {});
    };
    const onChain = () => refresh().catch(() => {});
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
      setUserDisconnected(false);
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

  const disconnect = useCallback(async () => {
    setError(null);
    setDisconnecting(true);
    try {
      setUserDisconnected(true);
      setAccount(null);

      // MetaMask mới hỗ trợ revoke — không bắt buộc
      if (window.ethereum?.request) {
        try {
          await window.ethereum.request({
            method: "wallet_revokePermissions",
            params: [{ eth_accounts: {} }],
          });
        } catch {
          /* một số bản MetaMask chưa hỗ trợ — app vẫn coi là đã disconnect */
        }
      }
    } finally {
      setDisconnecting(false);
    }
  }, []);

  /** true khi đã biết chain và sai mạng; null = chưa sẵn sàng */
  const wrongNetwork = chainId != null && chainId !== TARGET_CHAIN_ID;
  const networkReady = chainId === TARGET_CHAIN_ID;

  const value = useMemo(
    () => ({
      account,
      chainId,
      connecting,
      disconnecting,
      error,
      wrongNetwork,
      networkReady,
      targetChainId: TARGET_CHAIN_ID,
      networkName: NETWORK_NAME,
      connect,
      disconnect,
      ensureNetwork,
      refresh,
    }),
    [
      account,
      chainId,
      connecting,
      disconnecting,
      error,
      wrongNetwork,
      networkReady,
      connect,
      disconnect,
      ensureNetwork,
      refresh,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
