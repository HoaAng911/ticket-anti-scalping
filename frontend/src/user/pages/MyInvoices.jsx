import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Eye,
  Download,
  RefreshCw,
  Ticket,
} from "lucide-react";
import { getInvoicesByWallet, getMyInvoices } from "../../services/api.js";
import { useWallet } from "../../hooks/useWallet.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { downloadInvoicePdfById, openInvoicePdfById } from "../../utils/invoicePdf.js";

function moneyEth(n) {
  const v = Number(n) || 0;
  if (v === 0) return "0 ETH";
  return `${v.toFixed(6).replace(/\.?0+$/, "")} ETH`;
}

function short(addr) {
  if (!addr) return "—";
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

export default function MyInvoices() {
  const { account, connect } = useWallet();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      let list = [];
      if (account) {
        list = await getInvoicesByWallet(account);
      } else if (user) {
        list = await getMyInvoices();
      }
      setInvoices(list || []);
    } catch (err) {
      setMsg(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (account || user) load();
    else setInvoices([]);
  }, [account, user?.email]);

  async function onView(id) {
    setBusyId(id);
    try {
      const { popupBlocked } = await openInvoicePdfById(id);
      if (popupBlocked) setMsg("Popup bị chặn — hãy cho phép popup hoặc dùng Tải PDF.");
    } catch (err) {
      setMsg(err.response?.data?.error || err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function onDownload(inv) {
    setBusyId(inv.id);
    try {
      await downloadInvoicePdfById(inv.id, `${inv.invoiceNo}.pdf`);
    } catch (err) {
      setMsg(err.response?.data?.error || err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!account && !user) {
    return (
      <>
        <div className="user-hero">
          <div>
            <h1>Hóa đơn của tôi</h1>
            <p>Đăng nhập hoặc nối ví để xem hóa đơn GTGT đã mua.</p>
          </div>
        </div>
        <div className="user-empty">
          <FileText size={40} />
          <p>Chưa đăng nhập / chưa nối ví</p>
          <div className="user-btn-row" style={{ marginTop: 12, justifyContent: "center" }}>
            <Link className="user-btn secondary" to="/user">
              Tài khoản
            </Link>
            <button type="button" className="user-btn" onClick={connect}>
              <Wallet size={16} /> MetaMask
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="user-hero">
        <div>
          <h1>Hóa đơn của tôi</h1>
          <p>
            Hóa đơn GTGT sau khi mua vé. Có thể xem / in PDF ngay. Gắn với ví{" "}
            {account ? <code>{short(account)}</code> : "tài khoản đăng nhập"}.
          </p>
        </div>
        <button type="button" className="user-btn ghost" onClick={load} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : undefined} /> Làm mới
        </button>
      </div>

      {msg && (
        <div className={`user-alert ${msg.includes("chặn") ? "err" : "err"}`}>
          <AlertCircle size={16} /> {msg}
        </div>
      )}

      <section className="user-section">
        <div className="user-ticket-list">
          {invoices.map((inv) => {
            const tokenIds = (inv.items || []).flatMap((it) => it.tokenIds || []);
            return (
              <article key={inv.id} className="user-ticket">
                <div className="user-ticket-icon">
                  <FileText size={22} />
                </div>
                <div>
                  <h3>{inv.invoiceNo}</h3>
                  <p>
                    {new Date(inv.issuedAt).toLocaleString("vi-VN")} ·{" "}
                    {inv.status === "paid" ? "Đã thanh toán" : inv.status}
                  </p>
                  <p>
                    Chưa thuế {moneyEth(inv.amountNet)} · GTGT {moneyEth(inv.vatAmount)} · Tổng{" "}
                    <strong>{moneyEth(inv.amountGross)}</strong>
                  </p>
                  <p className="user-meta" style={{ margin: 0 }}>
                    {(inv.items || []).map((it) => it.tierName || it.eventTitle).join(", ")}
                    {tokenIds.length ? ` · Token #${tokenIds.join(", #")}` : ""}
                  </p>
                </div>
                <div className="user-ticket-actions">
                  <button
                    type="button"
                    className="user-btn"
                    disabled={busyId === inv.id || !inv.hasPdf}
                    onClick={() => onView(inv.id)}
                  >
                    <Eye size={15} /> Xem / in PDF
                  </button>
                  <button
                    type="button"
                    className="user-btn secondary"
                    disabled={busyId === inv.id || !inv.hasPdf}
                    onClick={() => onDownload(inv)}
                  >
                    <Download size={15} /> Tải PDF
                  </button>
                  {tokenIds[0] != null && (
                    <Link className="user-btn secondary" to="/my-tickets">
                      <Ticket size={15} /> Vé của tôi
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
          {!loading && !invoices.length && (
            <div className="user-empty">
              <FileText size={40} />
              <p>Chưa có hóa đơn. Mua vé sơ cấp để hệ thống xuất PDF GTGT.</p>
              <Link className="user-btn" to="/" style={{ marginTop: 12 }}>
                Xem sự kiện
              </Link>
            </div>
          )}
          {loading && (
            <p className="user-muted">
              <CheckCircle2 size={14} /> Đang tải hóa đơn…
            </p>
          )}
        </div>
      </section>
    </>
  );
}
