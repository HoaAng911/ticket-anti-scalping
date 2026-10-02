import { useEffect, useMemo, useState } from "react";
import { Landmark, RefreshCw, ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { getMoneyFlow } from "../../services/api.js";

function fmtEth(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const x = Number(n);
  if (x === 0) return "0";
  if (x < 0.0001) return x.toExponential(2);
  return x.toFixed(4).replace(/\.?0+$/, "");
}

function fmtWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN");
  } catch {
    return "—";
  }
}

export default function Ledger() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await getMoneyFlow({ limit: 120 });
      setData(res);
      setSelectedId((prev) => {
        if (prev && (res.events || []).some((e) => e.eventId === prev || `chain:${e.eventChainIds?.[0]}` === prev)) {
          return prev;
        }
        const first = (res.events || [])[0];
        return first?.eventId || (first?.eventChainIds?.[0] != null ? `orphan:${first.eventChainIds[0]}` : "");
      });
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "Không tải được dòng tiền");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const events = data?.events || [];

  const selected = useMemo(() => {
    if (!events.length) return null;
    return (
      events.find((e) => e.eventId === selectedId) ||
      events.find((e) => `orphan:${e.eventChainIds?.[0]}` === selectedId) ||
      events[0]
    );
  }, [events, selectedId]);

  const totals = selected?.publicTotals;

  return (
    <div className="user-page">
      <header className="user-page-head">
        <div>
          <p className="user-eyebrow">
            <Landmark size={14} /> Sổ cái công khai · theo sự kiện
          </p>
          <h1>Dòng tiền minh bạch</h1>
          <p className="user-lead">
            Chỉ công bố số liệu công khai của từng sự kiện: doanh thu sơ cấp về ban tổ chức, royalty
            resale 5%, số giao dịch và mã giao dịch trên ledger. Không hiển thị địa chỉ ví người
            mua/bán.
          </p>
        </div>
        <button type="button" className="user-btn ghost" onClick={load} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : undefined} /> Làm mới
        </button>
      </header>

      {error ? <p className="user-alert danger">{error}</p> : null}

      {events.length > 0 ? (
        <div className="ledger-event-picker" role="tablist" aria-label="Chọn sự kiện">
          {events.map((ev) => {
            const key = ev.eventId || `orphan:${ev.eventChainIds?.[0]}`;
            const active = selected && (selected.eventId === ev.eventId || selected === ev);
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                className={active ? "active" : undefined}
                onClick={() => setSelectedId(key)}
              >
                <strong>{ev.title}</strong>
                <span>
                  {fmtEth(ev.publicTotals?.organizerReceivedEth)} ETH · BTO nhận
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {loading && !data ? <p className="user-muted">Đang đọc event logs từ geth…</p> : null}

      {selected ? (
        <>
          <section className="ledger-event-card" aria-label="Thông tin sự kiện">
            <h2>{selected.title}</h2>
            <div className="ledger-event-meta">
              {selected.location ? (
                <span>
                  <MapPin size={14} /> {selected.location}
                </span>
              ) : null}
              {selected.startTime ? (
                <span>
                  <CalendarDays size={14} /> {fmtWhen(selected.startTime)}
                </span>
              ) : null}
              {selected.eventChainIds?.length ? (
                <span>
                  chainId: {selected.eventChainIds.join(", ")}
                </span>
              ) : null}
            </div>
          </section>

          {totals ? (
            <section className="ledger-totals" aria-label="Số liệu công khai sự kiện">
              <div>
                <span>Doanh thu sơ cấp → BTO</span>
                <strong>{fmtEth(totals.primaryRevenueEth)} ETH</strong>
                <small>{totals.primarySaleCount || 0} giao dịch mint</small>
              </div>
              <div>
                <span>Royalty resale (5%)</span>
                <strong>{fmtEth(totals.royaltyToOrganizerEth)} ETH</strong>
                <small>{totals.resaleCount || 0} lượt bán lại</small>
              </div>
              <div>
                <span>Tổng BTO nhận (sự kiện)</span>
                <strong>{fmtEth(totals.organizerReceivedEth)} ETH</strong>
                <small>Sơ cấp + royalty</small>
              </div>
              <div>
                <span>Volume resale</span>
                <strong>{fmtEth(totals.resaleVolumeEth)} ETH</strong>
                <small>Giá giao dịch lại (công khai)</small>
              </div>
            </section>
          ) : null}

          <h3 className="ledger-section-title">Giao dịch công khai</h3>
          <div className="ledger-flow-list">
            {(selected.flows || []).length === 0 && !loading ? (
              <p className="user-muted">
                Chưa có giao dịch thanh toán công khai cho sự kiện này trong khoảng block đã quét.
              </p>
            ) : null}
            {(selected.flows || []).map((f) => (
              <article
                key={`${f.txHash}-${f.kind}-${f.tokenId}`}
                className="ledger-flow-row"
              >
                <div className="ledger-flow-kind">
                  <span className={f.kind === "primary_sale" ? "ok" : "accent"}>
                    {f.kind === "primary_sale" ? "Sơ cấp" : "Resale"}
                  </span>
                  <small>vé #{f.tokenId}</small>
                  {f.tierName ? <small>{f.tierName}</small> : null}
                </div>
                <div className="ledger-flow-path">
                  <span className="ledger-party">{f.parties?.from || "Người mua"}</span>
                  <ArrowRight size={14} />
                  <span className="ledger-party">{f.parties?.to || "Ban tổ chức"}</span>
                </div>
                <div className="ledger-flow-amt">
                  <strong>
                    {fmtEth(
                      f.kind === "primary_sale" ? f.amountEth : f.organizerReceivedEth
                    )}{" "}
                    ETH
                  </strong>
                  {f.kind === "resale_split" ? (
                    <small>
                      royalty BTO {fmtEth(f.royaltyEth)} · volume {fmtEth(f.amountEth)}
                    </small>
                  ) : (
                    <small>100% về ban tổ chức</small>
                  )}
                </div>
                <div className="ledger-flow-meta">
                  <small>block {f.blockNumber}</small>
                  <code title={f.txHash}>{f.txShort || "—"}</code>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}

      {!loading && !events.length ? (
        <p className="user-muted">Chưa có sự kiện để hiển thị dòng tiền công khai.</p>
      ) : null}

      {data?.range ? (
        <p className="user-muted ledger-range">
          Quét block {data.range.fromBlock} → {data.range.toBlock} (latest {data.range.latest})
          {data.treasuryShort ? ` · ví BTO ${data.treasuryShort}` : ""} · nguồn: ledger công khai
        </p>
      ) : null}
      {data?.note ? <p className="user-muted ledger-note">{data.note}</p> : null}
    </div>
  );
}
