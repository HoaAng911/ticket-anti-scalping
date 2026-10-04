import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "ticketchain.cart.v2";

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("ticketchain.cart.v1");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cartKey(item) {
  if (item.seatId) return `${item.eventId}::${item.eventChainId}::${item.seatId}`;
  return `${item.eventId}::${item.eventChainId}`;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => loadCart());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((payload) => {
    const {
      eventId,
      eventTitle,
      eventLocation,
      eventStartTime,
      eventChainId,
      tierName,
      priceEth,
      maxQty = 2,
      seatId,
      seatLabel,
      zoneCode,
      zoneLabel,
      heldUntil,
    } = payload;

    const id = Number(eventChainId);
    if (!eventId || !Number.isFinite(id)) {
      throw new Error("Thiếu thông tin sự kiện / hạng vé");
    }

    setItems((prev) => {
      // Ghế: mỗi ghế = 1 dòng, qty luôn 1
      if (seatId) {
        const key = `${eventId}::${id}::${seatId}`;
        if (prev.some((x) => cartKey(x) === key)) return prev;
        const seatCountSameTier = prev.filter(
          (x) => String(x.eventId) === String(eventId) && Number(x.eventChainId) === id
        ).length;
        if (seatCountSameTier >= (Number(maxQty) || 2)) {
          throw new Error(`Mỗi ví tối đa ${maxQty || 2} ghế / hạng vé`);
        }
        return [
          ...prev,
          {
            eventId: String(eventId),
            eventTitle: eventTitle || "Sự kiện",
            eventLocation: eventLocation || "",
            eventStartTime: eventStartTime || null,
            eventChainId: id,
            tierName: tierName || `Hạng #${id}`,
            priceEth: Number(priceEth) || 0,
            qty: 1,
            maxQty: 1,
            seatId: String(seatId),
            seatLabel: seatLabel || seatId,
            zoneCode: zoneCode || "",
            zoneLabel: zoneLabel || "",
            heldUntil: heldUntil || null,
            addedAt: new Date().toISOString(),
          },
        ];
      }

      const key = `${eventId}::${id}`;
      const existing = prev.find((x) => cartKey(x) === key && !x.seatId);
      if (existing) {
        const nextQty = Math.min(Number(maxQty) || 2, existing.qty + 1);
        return prev.map((x) => (cartKey(x) === key && !x.seatId ? { ...x, qty: nextQty } : x));
      }
      return [
        ...prev,
        {
          eventId: String(eventId),
          eventTitle: eventTitle || "Sự kiện",
          eventLocation: eventLocation || "",
          eventStartTime: eventStartTime || null,
          eventChainId: id,
          tierName: tierName || `Hạng #${id}`,
          priceEth: Number(priceEth) || 0,
          qty: 1,
          maxQty: Number(maxQty) || 2,
          addedAt: new Date().toISOString(),
        },
      ];
    });
  }, []);

  const setQty = useCallback((eventId, eventChainId, qty, seatId) => {
    const key = seatId
      ? `${eventId}::${Number(eventChainId)}::${seatId}`
      : `${eventId}::${Number(eventChainId)}`;
    setItems((prev) =>
      prev
        .map((x) => {
          if (cartKey(x) !== key) return x;
          if (x.seatId) return x; // ghế không đổi qty
          const max = Number(x.maxQty) || 2;
          const next = Math.max(0, Math.min(max, Number(qty) || 0));
          return { ...x, qty: next };
        })
        .filter((x) => x.qty > 0)
    );
  }, []);

  const removeItem = useCallback((eventId, eventChainId, seatId) => {
    const key = seatId
      ? `${eventId}::${Number(eventChainId)}::${seatId}`
      : `${eventId}::${Number(eventChainId)}`;
    setItems((prev) => prev.filter((x) => cartKey(x) !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const count = useMemo(() => items.reduce((s, x) => s + x.qty, 0), [items]);
  const totalEth = useMemo(
    () => items.reduce((s, x) => s + Number(x.priceEth) * x.qty, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      count,
      totalEth,
      addItem,
      setQty,
      removeItem,
      clearCart,
      cartKey,
    }),
    [items, count, totalEth, addItem, setQty, removeItem, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
