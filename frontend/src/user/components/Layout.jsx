import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Ticket,
  CalendarDays,
  Store,
  Wallet,
  UserRound,
  LogOut,
  RefreshCw,
  ShoppingCart,
  Landmark,
  FileText,
  Menu,
  X,
  ChevronDown,
  Sun,
  Moon,
} from "lucide-react";
import { useWallet } from "../../hooks/useWallet.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCart } from "../../context/CartContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";

function short(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const PRIMARY = [
  { to: "/", end: true, label: "Sự kiện", icon: CalendarDays },
  { to: "/marketplace", label: "Chợ resale", icon: Store },
  { to: "/my-tickets", label: "Vé của tôi", icon: Ticket },
  { to: "/cart", label: "Giỏ hàng", icon: ShoppingCart, cart: true },
];

const MORE = [
  { to: "/my-invoices", label: "Hóa đơn", icon: FileText },
  { to: "/ledger", label: "Dòng tiền", icon: Landmark },
  { to: "/user", label: "Tài khoản", icon: UserRound },
];

export default function Layout({ children }) {
  const { account, connect, connecting, wrongNetwork, ensureNetwork, targetChainId, networkName } =
    useWallet();
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { theme, setTheme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  function NavItem({ to, end, label, icon: Icon, cart }) {
    return (
      <NavLink to={to} end={end} className={({ isActive }) => (isActive ? "active" : undefined)}>
        <Icon size={16} />
        <span>{label}</span>
        {cart && count > 0 ? <span className="user-cart-badge">{count}</span> : null}
      </NavLink>
    );
  }

  return (
    <div className="user-shell" data-theme={theme}>
      <header className="user-nav">
        <div className="user-nav-left">
          <Link to="/" className="user-brand" onClick={() => setMobileOpen(false)}>
            <span className="user-brand-mark">
              <Ticket size={18} strokeWidth={2.5} />
            </span>
            <span className="user-brand-text">
              Ticket<span>Chain</span>
            </span>
          </Link>
          <button
            type="button"
            className="user-nav-burger"
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className={`user-nav-links${mobileOpen ? " is-open" : ""}`} aria-label="Điều hướng">
          {PRIMARY.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}

          <div className="user-nav-more" ref={moreRef}>
            <button
              type="button"
              className={`user-nav-more-btn${moreOpen ? " open" : ""}`}
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
            >
              Thêm <ChevronDown size={14} />
            </button>
            {moreOpen && (
              <div className="user-nav-dropdown" role="menu">
                {MORE.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) => (isActive ? "active" : undefined)}
                  >
                    <Icon size={15} /> {label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          <div className="user-nav-mobile-more">
            {MORE.map((item) => (
              <NavItem key={`m-${item.to}`} {...item} />
            ))}
            <div className="user-theme-switch mobile" role="group" aria-label="Giao diện">
              <button
                type="button"
                className={theme === "light" ? "active" : undefined}
                onClick={() => setTheme("light")}
              >
                <Sun size={14} /> Ban ngày
              </button>
              <button
                type="button"
                className={theme === "dark" ? "active" : undefined}
                onClick={() => setTheme("dark")}
              >
                <Moon size={14} /> Ban đêm
              </button>
            </div>
          </div>
        </nav>

        <div className="user-nav-actions">
          <div className="user-theme-switch desktop" role="group" aria-label="Chế độ giao diện">
            <button
              type="button"
              className={theme === "light" ? "active" : undefined}
              onClick={() => setTheme("light")}
              title="Ban ngày"
              aria-pressed={theme === "light"}
            >
              <Sun size={14} />
              <span className="user-theme-label">Ngày</span>
            </button>
            <button
              type="button"
              className={theme === "dark" ? "active" : undefined}
              onClick={() => setTheme("dark")}
              title="Ban đêm"
              aria-pressed={theme === "dark"}
            >
              <Moon size={14} />
              <span className="user-theme-label">Đêm</span>
            </button>
          </div>
          <button
            type="button"
            className="user-theme-icon-btn"
            onClick={toggleTheme}
            title={theme === "dark" ? "Chuyển ban ngày" : "Chuyển ban đêm"}
            aria-label={theme === "dark" ? "Chuyển ban ngày" : "Chuyển ban đêm"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user && (
            <button type="button" className="user-wallet-btn ghost" onClick={logout} title={user.email}>
              <LogOut size={15} />
              <span className="user-nav-hide-sm">{user.email.split("@")[0]}</span>
            </button>
          )}
          {wrongNetwork && (
            <button type="button" className="user-wallet-btn ghost warn" onClick={ensureNetwork}>
              <RefreshCw size={15} />
              <span className="user-nav-hide-sm">{networkName}</span>
            </button>
          )}
          {account ? (
            <span className="user-chip wallet">
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
        <div className="user-footer-inner">
          <strong>TicketChain</strong>
          <span>Vé NFT · chống scalping · sổ cái Clique</span>
          <span className="user-footer-meta">
            chainId {targetChainId} · RPC :8545/:8546 · API :5001
          </span>
        </div>
      </footer>
    </div>
  );
}
