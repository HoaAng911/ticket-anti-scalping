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
