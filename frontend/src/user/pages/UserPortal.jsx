import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  UserRound,
  Wallet,
  Link2,
  LogOut,
  CalendarDays,
  Ticket,
  Store,
  Mail,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  FileText,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useWallet } from "../../hooks/useWallet.js";
import { getEvents, getListings, getMyTickets } from "../../services/api.js";

export default function UserPortal() {
  const { user, login: authLogin, register: authRegister, logout, bindWallet } = useAuth();
  const { account, connect, connecting, wrongNetwork, ensureNetwork, networkName } = useWallet();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [listings, setListings] = useState([]);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    getEvents()
      .then((d) => setEvents(d.items || []))
      .catch(() => {});
    getListings()
      .then(setListings)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!account) {
      setTickets([]);
      return;
    }
    getMyTickets(account)
      .then((d) => setTickets(d.tickets || []))
      .catch(() => setTickets([]));
  }, [account]);

  async function onAuth(e) {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "login") await authLogin(email, password);
      else await authRegister(email, password);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  async function onLink() {
    setMsg(null);
    try {
      if (!account) await connect();
      const accs = await window.ethereum.request({ method: "eth_accounts" });
      const wallet = (accs[0] || "").toLowerCase();
      if (!wallet) throw new Error("Chưa có ví MetaMask");
      if (wrongNetwork) await ensureNetwork();
      await bindWallet(wallet);
      setMsg("Đã liên kết ví với tài khoản.");
    } catch (err) {
      setMsg(err.response?.data?.error || err.message);
    }
  }

  return (
    <>
      <div className="user-hero">
        <div>
          <h1>Vé của bạn, trên chuỗi riêng</h1>
          <p>Đăng nhập, liên kết MetaMask và mua vé NFT chống bán lại giá cắt cổ.</p>
        </div>
      </div>

      <div className="user-portal-grid">
        <aside className="user-portal-aside">
          {!user ? (
            <div className="user-event-card">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                <UserRound size={20} /> Tài khoản
              </h3>
              <div className="user-tabs">
                <button
                  type="button"
                  className={mode === "login" ? "active" : ""}
                  onClick={() => setMode("login")}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  className={mode === "register" ? "active" : ""}
                  onClick={() => setMode("register")}
                >
                  Đăng ký
                </button>
              </div>
              <form
                onSubmit={onAuth}
                style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
              >
                <label className="user-field">
                  <span>
                    <Mail size={14} /> Email
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="user-field">
                  <span>
                    <KeyRound size={14} /> Mật khẩu
                  </span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                {error && (
                  <div className="user-alert err">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}
                <button type="submit" className="user-btn">
                  {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
                </button>
              </form>
            </div>
          ) : (
            <div className="user-event-card">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                <Sparkles size={20} color="var(--u-accent)" /> Xin chào
              </h3>
              <p style={{ margin: 0 }}>{user.email}</p>
              <p className="user-meta" style={{ margin: 0 }}>
                Vai trò: {user.role}
              </p>
              <p className="user-meta mono" style={{ margin: 0, wordBreak: "break-all" }}>
                Ví: {user.walletAddress || "(chưa liên kết)"}
              </p>
              <button type="button" className="user-btn" onClick={onLink}>
                <Link2 size={16} /> Liên kết MetaMask
              </button>
              <button type="button" className="user-btn secondary" onClick={logout}>
                <LogOut size={16} /> Đăng xuất
              </button>
              {msg && (
                <div className={`user-alert ${msg.includes("Đã") ? "ok" : "err"}`}>
                  {msg.includes("Đã") ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {msg}
                </div>
              )}
            </div>
          )}

          <div className="user-event-card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
              <Wallet size={20} /> Ví MetaMask
            </h3>
            {account ? (
              <>
                <p className="user-meta" style={{ margin: 0, wordBreak: "break-all" }}>
                  {account}
                </p>
                {wrongNetwork && (
                  <button type="button" className="user-btn secondary" onClick={ensureNetwork}>
                    Chuyển sang {networkName}
                  </button>
                )}
              </>
            ) : (
              <button type="button" className="user-btn teal" onClick={connect} disabled={connecting}>
                <Wallet size={16} />
                {connecting ? "Đang nối…" : "Kết nối ví"}
              </button>
            )}
            <p className="user-meta" style={{ margin: 0 }}>
              Cần ví để mint / resale on-chain.
            </p>
          </div>
        </aside>

        <div>
          <div className="user-event-grid" style={{ marginBottom: "1.5rem" }}>
            <Link to="/" className="user-event-card" style={{ textDecoration: "none", color: "inherit" }}>
              <CalendarDays size={28} color="var(--u-accent)" />
              <strong>Khám phá sự kiện</strong>
              <span className="user-meta">{events.length} sự kiện đang mở</span>
            </Link>
            <Link
              to="/my-tickets"
              className="user-event-card"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Ticket size={28} color="var(--u-accent-2)" />
              <strong>Vé của tôi</strong>
              <span className="user-meta">{tickets.length} vé (theo ví đang nối)</span>
            </Link>
            <Link
              to="/my-invoices"
              className="user-event-card"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <FileText size={28} color="var(--u-accent)" />
              <strong>Hóa đơn của tôi</strong>
              <span className="user-meta">Xem / in PDF GTGT</span>
            </Link>
            <Link
              to="/marketplace"
              className="user-event-card"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Store size={28} color="var(--u-accent)" />
              <strong>Chợ resale</strong>
              <span className="user-meta">{listings.length} listing</span>
            </Link>
          </div>

          <section className="user-section">
            <div className="user-section-head">
              <div>
                <h2>
                  <CalendarDays size={22} /> Sự kiện nổi bật
                </h2>
              </div>
            </div>
            <div className="user-event-grid">
              {events.slice(0, 3).map((ev) => (
                <article key={ev._id} className="user-event-card">
                  <h3>{ev.title}</h3>
                  <div className="user-meta">
                    <span className="user-meta-row">
                      <CalendarDays size={14} />
                      {new Date(ev.startTime).toLocaleString("vi-VN")}
                    </span>
                    <span className="user-meta-row">{ev.location}</span>
                  </div>
                  <Link className="user-btn" to={`/events/${ev._id}`}>
                    Mua vé
                  </Link>
                </article>
              ))}
              {!events.length && (
                <div className="user-empty">
                  <CalendarDays size={36} />
                  <p>Chưa có sự kiện.</p>
                </div>
              )}
            </div>
          </section>

          <section className="user-section">
            <div className="user-section-head">
              <div>
                <h2>
                  <Ticket size={22} /> Vé gần đây
                </h2>
              </div>
            </div>
            <div className="user-ticket-list">
              {tickets.slice(0, 5).map((t) => (
                <article key={t.tokenId} className="user-ticket">
                  <div className="user-ticket-icon">
                    <Ticket size={22} />
                  </div>
                  <div>
                    <h3>Token #{t.tokenId}</h3>
                    <p>
                      {t.event?.title || `event ${t.eventChainId}`} · {t.status}
                    </p>
                  </div>
                  <Link className="user-btn secondary" to="/my-tickets">
                    Quản lý
                  </Link>
                </article>
              ))}
              {!tickets.length && (
                <div className="user-empty">
                  <Ticket size={36} />
                  <p>Chưa có vé — kết nối ví và mint tại trang sự kiện.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .user-portal-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
