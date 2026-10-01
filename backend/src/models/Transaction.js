import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    tokenId: { type: Number, required: true },
    type: { type: String, enum: ["mint", "resale"], required: true },
    fromWallet: { type: String, default: null, lowercase: true },
    toWallet: { type: String, required: true, lowercase: true },
    price: { type: Number, required: true, min: 0 },
    royalty: { type: Number, default: 0 },
    txHash: { type: String, required: true, unique: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

transactionSchema.index({ tokenId: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ createdAt: -1 });

export default mongoose.model("Transaction", transactionSchema);
