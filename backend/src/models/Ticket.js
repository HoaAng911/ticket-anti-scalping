import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    tokenId: { type: Number, required: true, unique: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },
    eventChainId: { type: Number, required: true },
    ownerWallet: { type: String, required: true, lowercase: true },
    originalPrice: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["owned", "listed_for_resale", "resold"],
      default: "owned",
    },
    mintedAt: { type: Date, required: true },
    listingPrice: { type: Number, default: null },
    /** Exact wei string for resale payment (avoid float ETH round-trip) */
    listingPriceWei: { type: String, default: null },
    /** Ghế đã chọn (off-chain, gắn sau mint) */
    seatId: { type: String, default: "", trim: true, index: true },
    seatLabel: { type: String, default: "", trim: true },
    zoneCode: { type: String, default: "", trim: true },
    zoneLabel: { type: String, default: "", trim: true },
    /** Kiểm soát vào cửa */
    checkedInAt: { type: Date, default: null },
    checkedInBy: { type: String, default: "", trim: true },
    checkInNote: { type: String, default: "", trim: true },
    // Chuỗi TicketBlock on-chain (liên kết hash với block trước)
    blockIndex: { type: Number, default: null },
    prevBlockHash: { type: String, default: null },
    blockHash: { type: String, default: null },
  },
  { timestamps: true }
);

ticketSchema.index({ ownerWallet: 1 });
ticketSchema.index({ event: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ blockIndex: 1 });
ticketSchema.index({ blockHash: 1 });

export default mongoose.model("Ticket", ticketSchema);
