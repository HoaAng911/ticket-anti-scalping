import { Link, NavLink } from "react-router-dom";
import {
  Ticket,
  CalendarDays,
  Store,
  Wallet,
  UserRound,
  Shield,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { useWallet } from "../hooks/useWallet.js";
import { useAuth } from "../context/AuthContext.jsx";

function short(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function Layout({ children }) {
  const { account, connect, connecting, wrongNetwork, ensureNetwork, targetChainId, networkName } =
    useWallet();
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="user-shell">
      <header className="user-nav">
        <Link to="/" className="user-brand">
          <span className="user-brand-mark">
            <Ticket size={20} strokeWidth={2.4} />
          </span>
          TicketChain
        </Link>
        <nav className="user-nav-links">
          <NavLink to="/" end>
            <CalendarDays size={16} /> Sự kiện
          </NavLink>
          <NavLink to="/user">
            <UserRound size={16} /> Tài khoản
          </NavLink>
          <NavLink to="/marketplace">
            <Store size={16} /> Chợ resale
          </NavLink>
          <NavLink to="/my-tickets">
            <Ticket size={16} /> Vé của tôi
          </NavLink>
          <NavLink to="/admin">
            <Shield size={16} /> Admin
          </NavLink>
        </nav>
        <div style={{ display: "flex", gap: "0.45rem", alignItems: "center", flexWrap: "wrap" }}>
          {user && (
            <button type="button" className="user-wallet-btn ghost" onClick={logout}>
              <LogOut size={15} /> {user.email.split("@")[0]}
              {isAdmin ? " · admin" : ""}
            </button>
          )}
          {wrongNetwork && (
            <button type="button" className="user-wallet-btn ghost" onClick={ensureNetwork}>
              <RefreshCw size={15} /> {networkName}
            </button>
          )}
          {account ? (
            <span className="user-chip">
              <Wallet size={14} /> {short(account)}
            </span>
          ) : (
            <button
              type="button"
              className="user-wallet-btn"
              onClick={connect}
              disabled={connecting}
            >
              <Wallet size={15} />
              {connecting ? "Đang nối…" : "MetaMask"}
            </button>
          )}
        </div>
      </header>
      <main className="user-main">{children}</main>
      <footer className="user-footer">
        Mạng lab geth Clique — chainId {targetChainId} — RPC 127.0.0.1:8545 · API :5001
      </footer>
    </div>
  );
}
