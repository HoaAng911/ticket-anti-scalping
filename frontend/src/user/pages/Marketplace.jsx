import { useEffect, useState } from "react";
import { Store, ShoppingBag, AlertCircle, CheckCircle2, Ticket } from "lucide-react";
import { getListings } from "../../services/api.js";
import { buyResaleTicket } from "../../services/contract.js";
import { useWallet } from "../../hooks/useWallet.js";
import { explainContractError } from "../../utils/contractErrors.js";

export default function Marketplace() {
  const { account, connect, ensureNetwork } = useWallet();
  const [listings, setListings] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(null);

  async function load() {
    const data = await getListings();
    setListings(data || []);
  }

  useEffect(() => {
    load().catch((e) => setMsg(e.response?.data?.error || e.message));
  }, []);

  async function onBuy(item) {
    setMsg(null);
    setBusy(item.tokenId);
    try {
      if (!account) await connect();
      await ensureNetwork();
      const priceEth =
        item.chainListing?.price ?? item.listingPrice ?? null;
      const priceWei =
        item.listingPriceWei ?? item.chainListing?.priceWei ?? null;
      const { hash } = await buyResaleTicket(item.tokenId, priceEth, priceWei);
      setMsg(`Mua resale thành công. Tx: ${hash}`);
      // Poll reload — listener may lag a moment
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 800));
        await load();
        const still = (await getListings())?.find((x) => x.tokenId === item.tokenId);
        if (!still) break;
      }
    } catch (e) {
      setMsg(explainContractError(e));
    } finally {
      setBusy(null);
    }
  }

  const msgOk = msg && msg.includes("Tx");

  return (
    <>
      <div className="user-hero">
        <div>
          <h1>Chợ resale</h1>
          <p>Vé đang rao bán — royalty 5% về treasury, giá ≤ 110% gốc.</p>
        </div>
      </div>

      {msg && (
        <div className={`user-alert ${msgOk ? "ok" : "err"}`}>
          {msgOk ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {msg}
        </div>
      )}

      <section className="user-section">
        <div className="user-section-head">
          <div>
            <h2>
              <Store size={22} /> Listing hiện có
            </h2>
          </div>
        </div>
        <div className="user-listing-grid">
          {listings.map((item) => (
            <article key={item.tokenId} className="user-listing">
              <div className="user-chip">
                <Ticket size={12} /> Token #{item.tokenId}
              </div>
              <strong>{item.event?.title || "Sự kiện"}</strong>
              <div className="price">
                {item.listingPrice ?? item.chainListing?.price} ETH
              </div>
              <p className="user-meta" style={{ margin: 0 }}>
                Gốc {item.originalPrice} ETH · trần {item.maxAllowedPrice ?? "…"} ETH
              </p>
              <p className="user-meta" style={{ margin: 0, wordBreak: "break-all" }}>
                Seller {item.ownerWallet}
              </p>
              <button
                type="button"
                className="user-btn"
                disabled={busy === item.tokenId}
                onClick={() => onBuy(item)}
              >
                <ShoppingBag size={16} />
                {busy === item.tokenId ? "Đang mua…" : "Mua resale"}
              </button>
            </article>
          ))}
        </div>
        {!listings.length && (
          <div className="user-empty">
            <Store size={40} />
            <p>Chưa có listing nào.</p>
          </div>
        )}
      </section>
    </>
  );
}
