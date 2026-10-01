import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Link2,
  Droplets,
  TicketPlus,
  Send,
  CalendarDays,
  Ticket,
  ArrowLeftRight,
  LogOut,
  Wallet,
  Shield,
  Users,
  Activity,
  Store,
  Blocks,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  UserCog,
  Plus,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useWallet } from "../hooks/useWallet.js";
import AdminUsersPanel from "../components/AdminUsersPanel.jsx";
import {
  addTicketTypesToEvent,
  createAndFundWallets,
  createTicketTypeOnChain,
  fundWallets,
  getAdminDashboard,
  getAdminTickets,
  getAdminTransactions,
  getLabWallets,
  getTicketChain,
  mintTicketsToWallets,
} from "../services/api.js";

const defaultTiers = () => [
  { name: "Standard", price: "0.01", totalSupply: "100", eventChainId: "" },
  { name: "VIP", price: "0.05", totalSupply: "20", eventChainId: "" },
];

const emptyForm = {
  title: "",
  description: "",
  location: "",
  startTime: "",
  startEventChainId: "3",
  tiers: defaultTiers(),
};

function nextChainIdFromEvents(events) {
  let max = 0;
  for (const ev of events || []) {
    for (const t of ev.ticketTypes || []) {
      const id = Number(t.eventChainId);
      if (Number.isFinite(id) && id > max) max = id;
    }
  }
  return String(max + 1 || 3);
}

const MENU = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "users", label: "Người dùng & quyền", icon: UserCog },
  { id: "chain", label: "Chuỗi block vé", icon: Blocks },
  { id: "faucet", label: "Cấp ETH / Ví", icon: Droplets },
  { id: "create", label: "Tạo sự kiện", icon: TicketPlus },
  { id: "mint", label: "Mint vé", icon: Send },
  { id: "events", label: "Sự kiện", icon: CalendarDays },
  { id: "tickets", label: "Vé", icon: Ticket },
  { id: "txs", label: "Giao dịch", icon: ArrowLeftRight },
];

const TITLES = Object.fromEntries(MENU.map((m) => [m.id, m.label]));

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAdmin, login, logout, loading, bindWallet } = useAuth();
  const { account, connect } = useWallet();
  const [email, setEmail] = useState("admin@ticket.local");
  const [password, setPassword] = useState("admin123");
  const [authError, setAuthError] = useState(null);
  const [dash, setDash] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [txs, setTxs] = useState([]);
  const [labWallets, setLabWallets] = useState([]);
  const [createdBatch, setCreatedBatch] = useState([]);
  const [chain, setChain] = useState(null);
  const [tab, setTab] = useState("overview");
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const [fundList, setFundList] = useState("");
  const [fundAmount, setFundAmount] = useState("100");
  const [genCount, setGenCount] = useState("5");
  const [genAmount, setGenAmount] = useState("100");
  const [genLabel, setGenLabel] = useState("lab-users");

  const [mintChainId, setMintChainId] = useState("1");
  const [mintList, setMintList] = useState("");
  const [addTierEventId, setAddTierEventId] = useState(null);
  const [extraTiers, setExtraTiers] = useState([
    { name: "", price: "0.02", totalSupply: "50", eventChainId: "" },
  ]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("lte-sidebar-collapsed") === "1";
    } catch {
      return false;
    }
  });

  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("lte-sidebar-collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function loadAdmin() {
    const [d, t, x, labs, ch] = await Promise.all([
      getAdminDashboard(),
      getAdminTickets(),
      getAdminTransactions(),
      getLabWallets(),
      getTicketChain().catch(() => null),
    ]);
    setDash(d);
    setTickets(t);
    setTxs(x);
    setLabWallets(labs);
    setChain(ch);
    setForm((f) => ({
      ...f,
      startEventChainId: nextChainIdFromEvents(d?.events),
    }));
  }

  useEffect(() => {
    if (isAdmin) {
      loadAdmin().catch((e) => setMsg(e.response?.data?.error || e.message));
    }
  }, [isAdmin]);

  async function onLogin(e) {
    e.preventDefault();
    setAuthError(null);
    try {
      await login(email, password);
    } catch (err) {
      setAuthError(err.response?.data?.error || err.message);
    }
  }

  function updateTier(index, field, value) {
    setForm((f) => {
      const tiers = f.tiers.map((t, i) => (i === index ? { ...t, [field]: value } : t));
      return { ...f, tiers };
    });
  }

  function addTierRow() {
    setForm((f) => ({
      ...f,
      tiers: [
        ...f.tiers,
        { name: "", price: "0.01", totalSupply: "50", eventChainId: "" },
      ],
    }));
  }

  function removeTierRow(index) {
    setForm((f) => ({
      ...f,
      tiers: f.tiers.length <= 1 ? f.tiers : f.tiers.filter((_, i) => i !== index),
    }));
  }

  async function onCreateTicketType(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (!form.tiers.length) throw new Error("Cần ít nhất 1 hạng vé");
      const ticketTypes = form.tiers.map((t) => ({
        name: t.name.trim(),
        price: t.price,
        totalSupply: Number(t.totalSupply),
        ...(t.eventChainId !== "" && t.eventChainId != null
          ? { eventChainId: Number(t.eventChainId) }
          : {}),
      }));
      const data = await createTicketTypeOnChain({
        title: form.title,
        description: form.description,
        location: form.location,
        startTime: new Date(form.startTime).toISOString(),
        ticketTypes,
        startEventChainId: Number(form.startEventChainId),
        saveMongo: true,
      });
      const tierSummary = (data.tiers || [])
        .map((t) => `${t.name}@${t.price}ETH(#${t.eventChainId})`)
        .join(", ");
      setMsg(
        `Đã tạo sự kiện với ${data.tiers?.length || 0} hạng vé on-chain + Mongo: ${tierSummary}`
      );
      setForm({
        ...emptyForm,
        tiers: defaultTiers(),
        startEventChainId: String(data.nextEventChainId || Number(form.startEventChainId) + ticketTypes.length),
      });
      await loadAdmin();
      setTab("events");
    } catch (err) {
      setMsg(err.response?.data?.error || err.shortMessage || err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onAddTiersToEvent(eventId) {
    setBusy(true);
    setMsg(null);
    try {
      const ticketTypes = extraTiers
        .filter((t) => t.name.trim())
        .map((t) => ({
          name: t.name.trim(),
          price: t.price,
          totalSupply: Number(t.totalSupply),
          ...(t.eventChainId !== "" && t.eventChainId != null
            ? { eventChainId: Number(t.eventChainId) }
            : {}),
        }));
      if (!ticketTypes.length) throw new Error("Nhập ít nhất 1 hạng vé mới");
      const data = await addTicketTypesToEvent(eventId, {
        ticketTypes,
        startEventChainId: Number(nextChainIdFromEvents(dash?.events)),
      });
      setMsg(
        `Đã thêm ${data.added?.length || 0} hạng vé: ` +
          (data.added || []).map((t) => `${t.name} (#${t.eventChainId})`).join(", ")
      );
      setAddTierEventId(null);
      setExtraTiers([{ name: "", price: "0.02", totalSupply: "50", eventChainId: "" }]);
      await loadAdmin();
    } catch (err) {
      setMsg(err.response?.data?.error || err.shortMessage || err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onFundExisting(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const data = await fundWallets(fundList, fundAmount);
      setMsg(`Đã nạp ${fundAmount} ETH cho ${data.results.length} ví. Funder còn ${data.funder.balanceEth} ETH`);
      await loadAdmin();
    } catch (err) {
      setMsg(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onCreateWallets(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const data = await createAndFundWallets({
        count: Number(genCount),
        amountEth: genAmount,
        label: genLabel,
        fund: true,
      });
      setCreatedBatch(data.wallets || []);
      setMsg(
        `Đã tạo ${data.wallets.length} ví và nạp ${genAmount} ETH mỗi ví. Sao chép private key bên dưới (chỉ lab).`
      );
      await loadAdmin();
      setTab("faucet");
    } catch (err) {
      setMsg(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onMintTickets(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const data = await mintTicketsToWallets(Number(mintChainId), mintList);
      const chain = data.chain;
      const linkMsg = chain?.newBlocks?.length
        ? ` · TicketBlock tip ${chain.tipBefore}→${chain.tipAfter}` +
          ` · verify=${chain.verifyChain ? "OK" : "LỖI"}` +
          ` · nodes: ${chain.newBlocks
            .map(
              (b) =>
                `#${b.index}(token ${b.tokenId}, prev=${String(b.prevBlockHash).slice(0, 10)}…)`
            )
            .join(", ")}`
        : "";
      setMsg(
        `Đã mint ${data.count} vé (eventChainId=${mintChainId}). Tx: ${data.txHash}${linkMsg}`
      );
      await loadAdmin();
      setTab("chain");
    } catch (err) {
      setMsg(err.response?.data?.error || err.shortMessage || err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onLinkWallet() {
    try {
      if (!window.ethereum) throw new Error("Chưa cài MetaMask");
      if (!account) await connect();
      const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
      await bindWallet(accs[0]);
      setMsg("Đã liên kết ví với tài khoản admin.");
    } catch (err) {
      setMsg(err.response?.data?.error || err.message);
    }
  }

  function fillMintFromLab() {
    setMintList(labWallets.map((w) => w.address).join("\n"));
  }

  const msgOk = msg && (String(msg).includes("Đã") || String(msg).includes("Tx"));

  if (loading) {
    return (
      <div className="lte-login-wrap">
        <div className="lte-login-card">
          <header>
            <h1>
              <Shield size={22} />
              TicketChain Admin
            </h1>
            <p>Đang tải phiên đăng nhập…</p>
          </header>
          <div className="lte-login-body">
            <p className="lte-help">Vui lòng chờ trong giây lát.</p>
          </div>
        </div>
      </div>
    );
  }

  if (user && !isAdmin) {
    return (
      <div className="lte-login-wrap">
        <div className="lte-login-card">
          <header>
            <h1>
              <Shield size={22} />
              TicketChain Admin
            </h1>
            <p>Tài khoản hiện tại không có quyền quản trị.</p>
          </header>
          <div className="lte-login-body">
            <div className="lte-alert err">
              <AlertCircle size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
              {user.email} · vai trò <strong>{user.role}</strong>. Cần tài khoản admin/organizer.
            </div>
            <button
              type="button"
              className="lte-btn lte-btn-primary"
              onClick={() => {
                logout();
                setAuthError(null);
              }}
            >
              <LogOut size={16} /> Đăng xuất và đăng nhập lại
            </button>
            <button type="button" className="lte-btn lte-btn-default" onClick={() => navigate("/user")}>
              Về trang người dùng
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="lte-login-wrap">
        <div className="lte-login-card">
          <header>
            <h1>
              <Shield size={22} />
              TicketChain Admin
            </h1>
            <p>Đăng nhập organizer để quản lý vé, mint NFT và faucet lab.</p>
          </header>
          <form className="lte-form" onSubmit={onLogin} style={{ maxWidth: "none" }}>
            <label>
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Mật khẩu
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            {authError && <div className="lte-alert err">{authError}</div>}
            <button type="submit" className="lte-btn lte-btn-primary">
              Đăng nhập
            </button>
            <p className="lte-help">
              Seed: admin@ticket.local / admin123 · organizer@ticket.local / organizer123 ·{" "}
              <Link to="/user">Trang người dùng</Link>
            </p>
          </form>
        </div>
      </div>
    );
  }

  const stats = dash?.stats || {};
  const funder = dash?.funder || {};

  return (
    <div className={`lte-root${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <aside className="lte-sidebar" aria-label="Menu quản trị">
        <div className="lte-brand-row">
          <Link to="/admin" className="lte-brand" title="TicketAdmin">
            <Shield size={22} />
            <span className="lte-brand-text">
              Ticket<span>Admin</span>
            </span>
          </Link>
          <button
            type="button"
            className="lte-sidebar-toggle in-sidebar"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
            aria-label={sidebarCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <div className="lte-user-panel">
          <div className="lte-avatar" title={user.email}>
            {user.email[0].toUpperCase()}
          </div>
          <div className="lte-user-meta">
            <small>Online</small>
            <strong>{user.email.split("@")[0]}</strong>
          </div>
        </div>
        <ul className="lte-menu">
          <li className="lte-menu-header">Menu chính</li>
          {MENU.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                className={tab === id ? "active" : ""}
                onClick={() => setTab(id)}
                title={label}
              >
                <Icon size={17} />
                <span className="lte-menu-label">{label}</span>
              </button>
            </li>
          ))}
          <li className="lte-menu-header">Khác</li>
          <li>
            <button type="button" onClick={() => navigate("/")} title="Xem site người dùng">
              <ExternalLink size={17} />
              <span className="lte-menu-label">Xem site người dùng</span>
            </button>
          </li>
        </ul>
      </aside>

      <div className="lte-main">
        <header className="lte-topbar">
          <div className="lte-topbar-left">
            <button
              type="button"
              className="lte-sidebar-toggle in-topbar"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
              aria-label={sidebarCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
              aria-expanded={!sidebarCollapsed}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <h1>{TITLES[tab] || "Dashboard"}</h1>
          </div>
          <div className="lte-top-actions">
            <button type="button" className="lte-btn lte-btn-default" onClick={onLinkWallet}>
              <Wallet size={15} /> Liên kết ví
            </button>
            <button type="button" className="lte-btn lte-btn-default" onClick={logout}>
              <LogOut size={15} /> Đăng xuất
            </button>
          </div>
        </header>

        <div className="lte-content">
          <div className="lte-breadcrumb">
            Home / Admin / {TITLES[tab]}
            {funder.address && (
              <>
                {" "}
                · quỹ{" "}
                <strong>{Number(funder.balanceEth || 0).toLocaleString("vi-VN")}</strong> ETH
              </>
            )}
          </div>

          {msg && (
            <div className={`lte-alert ${msgOk ? "ok" : "err"}`}>
              {msgOk ? <CheckCircle2 size={16} style={{ verticalAlign: -3 }} /> : <AlertCircle size={16} style={{ verticalAlign: -3 }} />}{" "}
              {msg}
            </div>
          )}
          {funder.error && <div className="lte-alert err">Funder: {funder.error}</div>}

          <div className="lte-info-boxes">
            <div className="lte-info-box">
              <div className="icon bg-aqua">
                <CalendarDays size={36} />
              </div>
              <div className="content">
                <span>Sự kiện</span>
                <strong>{stats.events ?? "—"}</strong>
              </div>
            </div>
            <div className="lte-info-box">
              <div className="icon bg-green">
                <Ticket size={36} />
              </div>
              <div className="content">
                <span>Vé mint</span>
                <strong>{stats.tickets ?? "—"}</strong>
              </div>
            </div>
            <div className="lte-info-box">
              <div className="icon bg-yellow">
                <Store size={36} />
              </div>
              <div className="content">
                <span>Listing</span>
                <strong>{stats.listed ?? "—"}</strong>
              </div>
            </div>
            <div className="lte-info-box">
              <div className="icon bg-red">
                <Activity size={36} />
              </div>
              <div className="content">
                <span>Giao dịch</span>
                <strong>{stats.transactions ?? "—"}</strong>
              </div>
            </div>
            <div className="lte-info-box">
              <div className="icon bg-blue">
                <Users size={36} />
              </div>
              <div className="content">
                <span>Ví lab</span>
                <strong>{stats.labWallets ?? "—"}</strong>
              </div>
            </div>
          </div>

          {tab === "users" && <AdminUsersPanel onMessage={setMsg} />}

          {tab === "overview" && (
            <div className="lte-box">
              <div className="lte-box-header">
                <h3>
                  <Activity size={18} style={{ verticalAlign: -3 }} /> Giao dịch gần đây
                </h3>
              </div>
              <div className="lte-box-body" style={{ padding: 0 }}>
                <table className="lte-table">
                  <thead>
                    <tr>
                      <th>Loại</th>
                      <th>Token</th>
                      <th>Giá</th>
                      <th>Đến</th>
                      <th>Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dash?.recentTx || []).map((t) => (
                      <tr key={t._id}>
                        <td>
                          <span className="lte-badge">{t.type}</span>
                        </td>
                        <td>#{t.tokenId}</td>
                        <td>{t.price} ETH</td>
                        <td className="mono">{t.toWallet?.slice(0, 10)}…</td>
                        <td className="mono">{t.txHash?.slice(0, 10)}…</td>
                      </tr>
                    ))}
                    {!dash?.recentTx?.length && (
                      <tr>
                        <td colSpan={5}>Chưa có giao dịch</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "chain" && (
            <div className="lte-box box-success">
              <div className="lte-box-header">
                <h3>
                  <Link2 size={18} style={{ verticalAlign: -3 }} /> TicketBlock chain
                </h3>
                {chain?.valid != null && (
                  <span className={`lte-badge ${chain.valid ? "ok" : "warn"}`}>
                    {chain.valid ? "HỢP LỆ" : "LỖI"}
                  </span>
                )}
              </div>
              <div className="lte-box-body">
                <p className="lte-help">
                  Tip index <strong>{chain?.tip?.latestBlockIndex ?? 0}</strong>
                  {chain?.tip?.latestBlockHash && (
                    <>
                      {" "}
                      · hash <code>{chain.tip.latestBlockHash.slice(0, 18)}…</code>
                    </>
                  )}
                </p>
                <table className="lte-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Token</th>
                      <th>Prev hash</th>
                      <th>Block hash</th>
                      <th>Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(chain?.blocks || []).map((b) => (
                      <tr key={b.tokenId}>
                        <td>{b.blockIndex}</td>
                        <td>#{b.tokenId}</td>
                        <td className="mono">
                          {!b.prevBlockHash ||
                          b.prevBlockHash ===
                            "0x0000000000000000000000000000000000000000000000000000000000000000"
                            ? "0x0 (genesis)"
                            : `${b.prevBlockHash.slice(0, 12)}…`}
                        </td>
                        <td className="mono">{b.blockHash?.slice(0, 14)}…</td>
                        <td className="mono">{b.ownerWallet?.slice(0, 10)}…</td>
                      </tr>
                    ))}
                    {!chain?.blocks?.length && (
                      <tr>
                        <td colSpan={5}>Chưa có TicketBlock — mint vé để bắt đầu chuỗi.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "faucet" && (
            <>
              <div className="lte-split">
                <div className="lte-box box-warning">
                  <div className="lte-box-header">
                    <h3>Tạo ví + nạp ETH</h3>
                  </div>
                  <div className="lte-box-body">
                    <form className="lte-form" onSubmit={onCreateWallets}>
                      <div className="lte-form-grid">
                        <label>
                          Số ví (1–50)
                          <input value={genCount} onChange={(e) => setGenCount(e.target.value)} />
                        </label>
                        <label>
                          ETH mỗi ví
                          <input value={genAmount} onChange={(e) => setGenAmount(e.target.value)} />
                        </label>
                      </div>
                      <label>
                        Nhãn batch
                        <input value={genLabel} onChange={(e) => setGenLabel(e.target.value)} />
                      </label>
                      <button type="submit" className="lte-btn lte-btn-success" disabled={busy}>
                        <Droplets size={15} /> {busy ? "Đang tạo…" : "Tạo ví & nạp ETH"}
                      </button>
                    </form>
                  </div>
                </div>
                <div className="lte-box">
                  <div className="lte-box-header">
                    <h3>Nạp ETH ví có sẵn</h3>
                  </div>
                  <div className="lte-box-body">
                    <form className="lte-form" onSubmit={onFundExisting}>
                      <label>
                        Địa chỉ (mỗi dòng / dấu phẩy)
                        <textarea
                          rows={5}
                          required
                          placeholder={"0xabc...\n0xdef..."}
                          value={fundList}
                          onChange={(e) => setFundList(e.target.value)}
                        />
                      </label>
                      <label>
                        Số ETH mỗi ví
                        <input value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} />
                      </label>
                      <button type="submit" className="lte-btn lte-btn-primary" disabled={busy}>
                        <Send size={15} /> {busy ? "Đang gửi…" : "Nạp ETH"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {!!createdBatch.length && (
                <div className="lte-box box-danger">
                  <div className="lte-box-header">
                    <h3>Batch vừa tạo (lab — copy private key)</h3>
                  </div>
                  <div className="lte-box-body" style={{ padding: 0 }}>
                    <table className="lte-table">
                      <thead>
                        <tr>
                          <th>Address</th>
                          <th>Private key</th>
                          <th>ETH</th>
                        </tr>
                      </thead>
                      <tbody>
                        {createdBatch.map((w) => (
                          <tr key={w.address}>
                            <td className="mono">{w.address}</td>
                            <td className="mono">{w.privateKey}</td>
                            <td>{w.fundedEth}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="lte-box">
                <div className="lte-box-header">
                  <h3>Ví lab đã lưu ({labWallets.length})</h3>
                </div>
                <div className="lte-box-body" style={{ padding: 0 }}>
                  <table className="lte-table">
                    <thead>
                      <tr>
                        <th>Label</th>
                        <th>Address</th>
                        <th>Private key</th>
                        <th>Đã nạp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labWallets.map((w) => (
                        <tr key={w._id || w.address}>
                          <td>{w.label}</td>
                          <td className="mono">{w.address}</td>
                          <td className="mono">{w.privateKey}</td>
                          <td>{w.fundedEth}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {tab === "create" && (
            <div className="lte-box box-success">
              <div className="lte-box-header">
                <h3>
                  <TicketPlus size={18} style={{ verticalAlign: -3 }} /> Tạo sự kiện + nhiều hạng vé
                </h3>
              </div>
              <div className="lte-box-body">
                <form className="lte-form" onSubmit={onCreateTicketType} style={{ maxWidth: "none" }}>
                  <p className="lte-help">
                    Một sự kiện có thể có nhiều hạng (Standard, VIP, Early Bird…) — mỗi hạng một giá,
                    supply và <code>eventChainId</code> on-chain riêng.
                  </p>
                  <label>
                    Tiêu đề sự kiện
                    <input
                      required
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </label>
                  <label>
                    Mô tả
                    <textarea
                      required
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </label>
                  <div className="lte-form-grid">
                    <label>
                      Địa điểm
                      <input
                        required
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                      />
                    </label>
                    <label>
                      Thời gian bắt đầu
                      <input
                        required
                        type="datetime-local"
                        value={form.startTime}
                        onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      />
                    </label>
                    <label>
                      eventChainId bắt đầu (tự tăng)
                      <input
                        value={form.startEventChainId}
                        onChange={(e) => setForm({ ...form, startEventChainId: e.target.value })}
                      />
                    </label>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>Hạng vé ({form.tiers.length})</strong>
                    <button type="button" className="lte-btn lte-btn-default" onClick={addTierRow}>
                      <Plus size={15} /> Thêm hạng
                    </button>
                  </div>

                  <div className="lte-tier-list">
                    {form.tiers.map((tier, index) => (
                      <div key={index} className="lte-tier-row">
                        <div className="lte-tier-head">
                          <span>Hạng #{index + 1}</span>
                          <button
                            type="button"
                            className="lte-btn lte-btn-default"
                            disabled={form.tiers.length <= 1}
                            onClick={() => removeTierRow(index)}
                          >
                            <Trash2 size={14} /> Xóa
                          </button>
                        </div>
                        <div className="lte-form-grid">
                          <label>
                            Tên hạng
                            <input
                              required
                              placeholder="VIP / Standard…"
                              value={tier.name}
                              onChange={(e) => updateTier(index, "name", e.target.value)}
                            />
                          </label>
                          <label>
                            Giá (ETH)
                            <input
                              required
                              value={tier.price}
                              onChange={(e) => updateTier(index, "price", e.target.value)}
                            />
                          </label>
                          <label>
                            Supply
                            <input
                              required
                              value={tier.totalSupply}
                              onChange={(e) => updateTier(index, "totalSupply", e.target.value)}
                            />
                          </label>
                          <label>
                            ChainId (tuỳ chọn)
                            <input
                              placeholder="tự gán"
                              value={tier.eventChainId}
                              onChange={(e) => updateTier(index, "eventChainId", e.target.value)}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button type="submit" className="lte-btn lte-btn-success" disabled={busy}>
                    <TicketPlus size={15} />{" "}
                    {busy ? "Đang tạo…" : `Tạo sự kiện + ${form.tiers.length} hạng on-chain`}
                  </button>
                </form>
              </div>
            </div>
          )}

          {tab === "mint" && (
            <div className="lte-box">
              <div className="lte-box-header">
                <h3>
                  <Send size={18} style={{ verticalAlign: -3 }} /> Mint / cấp vé NFT
                </h3>
              </div>
              <div className="lte-box-body">
                <form className="lte-form" onSubmit={onMintTickets}>
                  <p className="lte-help">adminMintBatch — miễn phí, bỏ qua giới hạn 2 vé/ví (lab).</p>
                  <label>
                    Chọn hạng vé (sự kiện)
                    <select
                      value={mintChainId}
                      onChange={(e) => setMintChainId(e.target.value)}
                    >
                      <option value="">— chọn —</option>
                      {(dash?.events || []).flatMap((ev) =>
                        (ev.ticketTypes || []).map((t) => (
                          <option key={`${ev._id}-${t.eventChainId}`} value={String(t.eventChainId)}>
                            {ev.title} · {t.name} · {t.price} ETH (id {t.eventChainId})
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                  <label>
                    hoặc nhập eventChainId
                    <input value={mintChainId} onChange={(e) => setMintChainId(e.target.value)} />
                  </label>
                  <label>
                    Danh sách ví nhận vé
                    <textarea
                      rows={6}
                      required
                      placeholder={"0xabc...\n0xdef..."}
                      value={mintList}
                      onChange={(e) => setMintList(e.target.value)}
                    />
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button type="button" className="lte-btn lte-btn-default" onClick={fillMintFromLab}>
                      <Users size={15} /> Dùng ví lab đã lưu
                    </button>
                    <button type="submit" className="lte-btn lte-btn-primary" disabled={busy}>
                      <Send size={15} /> {busy ? "Đang mint…" : "Mint vé"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {tab === "events" && (
            <div className="lte-box">
              <div className="lte-box-header">
                <h3>Danh sách sự kiện</h3>
                <button type="button" className="lte-btn lte-btn-success" onClick={() => setTab("create")}>
                  <Plus size={14} /> Sự kiện mới
                </button>
              </div>
              <div className="lte-box-body">
                {(dash?.events || []).map((ev) => (
                  <div key={ev._id} style={{ borderBottom: "1px solid #f4f4f4", padding: "0.85rem 0" }}>
                    <div className="lte-event-row" style={{ borderBottom: 0, padding: 0 }}>
                      <div>
                        <strong>{ev.title}</strong>
                        <p className="lte-help" style={{ marginTop: 4 }}>
                          {ev.location} · {new Date(ev.startTime).toLocaleString("vi-VN")} ·{" "}
                          {ev.ticketTypes?.length || 0} hạng vé
                        </p>
                        <ul className="lte-tags">
                          {ev.ticketTypes?.map((t) => (
                            <li key={t.eventChainId}>
                              {t.name}: {t.price} ETH · supply {t.totalSupply} · còn{" "}
                              {dash?.remaining?.[t.eventChainId] ?? "?"} · id {t.eventChainId}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="lte-btn lte-btn-default"
                          onClick={() =>
                            setAddTierEventId(addTierEventId === ev._id ? null : ev._id)
                          }
                        >
                          <Plus size={14} /> Thêm hạng
                        </button>
                        <Link className="lte-btn lte-btn-primary" to={`/events/${ev._id}`}>
                          <ExternalLink size={14} /> Trang bán
                        </Link>
                      </div>
                    </div>

                    {addTierEventId === ev._id && (
                      <div className="lte-tier-list" style={{ marginTop: "0.75rem" }}>
                        {extraTiers.map((tier, index) => (
                          <div key={index} className="lte-tier-row">
                            <div className="lte-form-grid">
                              <label>
                                Tên hạng mới
                                <input
                                  value={tier.name}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setExtraTiers((rows) =>
                                      rows.map((r, i) => (i === index ? { ...r, name: v } : r))
                                    );
                                  }}
                                />
                              </label>
                              <label>
                                Giá (ETH)
                                <input
                                  value={tier.price}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setExtraTiers((rows) =>
                                      rows.map((r, i) => (i === index ? { ...r, price: v } : r))
                                    );
                                  }}
                                />
                              </label>
                              <label>
                                Supply
                                <input
                                  value={tier.totalSupply}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setExtraTiers((rows) =>
                                      rows.map((r, i) =>
                                        i === index ? { ...r, totalSupply: v } : r
                                      )
                                    );
                                  }}
                                />
                              </label>
                              <label>
                                ChainId (tuỳ chọn)
                                <input
                                  placeholder="tự gán"
                                  value={tier.eventChainId}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setExtraTiers((rows) =>
                                      rows.map((r, i) =>
                                        i === index ? { ...r, eventChainId: v } : r
                                      )
                                    );
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        ))}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="lte-btn lte-btn-default"
                            onClick={() =>
                              setExtraTiers((rows) => [
                                ...rows,
                                { name: "", price: "0.03", totalSupply: "30", eventChainId: "" },
                              ])
                            }
                          >
                            <Plus size={14} /> Thêm dòng
                          </button>
                          <button
                            type="button"
                            className="lte-btn lte-btn-success"
                            disabled={busy}
                            onClick={() => onAddTiersToEvent(ev._id)}
                          >
                            <TicketPlus size={14} /> {busy ? "Đang lưu…" : "Lưu hạng mới on-chain"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {!dash?.events?.length && <p className="lte-help">Chưa có sự kiện.</p>}
              </div>
            </div>
          )}

          {tab === "tickets" && (
            <div className="lte-box">
              <div className="lte-box-header">
                <h3>Toàn bộ vé (cache)</h3>
              </div>
              <div className="lte-box-body" style={{ padding: 0 }}>
                <table className="lte-table">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Block#</th>
                      <th>Prev→Hash</th>
                      <th>Sự kiện</th>
                      <th>Chủ ví</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr key={t._id}>
                        <td>#{t.tokenId}</td>
                        <td>{t.blockIndex ?? "—"}</td>
                        <td className="mono">
                          {t.blockHash
                            ? `${(t.prevBlockHash || "0x0").slice(0, 8)}…→${t.blockHash.slice(0, 8)}…`
                            : "—"}
                        </td>
                        <td>{t.event?.title || t.eventChainId}</td>
                        <td className="mono">{t.ownerWallet?.slice(0, 12)}…</td>
                        <td>
                          <span className="lte-badge">{t.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "txs" && (
            <div className="lte-box">
              <div className="lte-box-header">
                <h3>Lịch sử giao dịch</h3>
              </div>
              <div className="lte-box-body" style={{ padding: 0 }}>
                <table className="lte-table">
                  <thead>
                    <tr>
                      <th>Loại</th>
                      <th>Token</th>
                      <th>Từ</th>
                      <th>Đến</th>
                      <th>Giá</th>
                      <th>Royalty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map((t) => (
                      <tr key={t._id}>
                        <td>
                          <span className="lte-badge">{t.type}</span>
                        </td>
                        <td>#{t.tokenId}</td>
                        <td className="mono">
                          {t.fromWallet ? `${t.fromWallet.slice(0, 8)}…` : "—"}
                        </td>
                        <td className="mono">{t.toWallet?.slice(0, 8)}…</td>
                        <td>{t.price}</td>
                        <td>{t.royalty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
