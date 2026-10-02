import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema(
  {
    eventId: String,
    eventTitle: String,
    eventLocation: String,
    eventStartTime: Date,
    eventChainId: Number,
    tierName: String,
    qty: Number,
    unitPriceGross: Number,
    unitPriceNet: Number,
    amountNet: Number,
    vatAmount: Number,
    amountGross: Number,
    ratePercent: { type: Number, default: 10 },
    txHashes: [String],
    tokenIds: [Number],
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, required: true, unique: true, index: true },
    formSymbol: { type: String, default: "01GTKT0/001" },
    serial: { type: String, default: "TC-LAB" },
    status: {
      type: String,
      enum: ["draft", "paid", "void"],
      default: "paid",
      index: true,
    },
    issuedAt: { type: Date, default: Date.now, index: true },
    buyer: {
      name: String,
      email: String,
      wallet: { type: String, lowercase: true },
      taxCode: String,
      address: String,
      phone: String,
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    seller: {
      name: String,
      taxCode: String,
      address: String,
      phone: String,
      email: String,
      bankAccount: String,
    },
    items: [invoiceItemSchema],
    amountNet: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    vatRatePercent: { type: Number, default: 10 },
    amountGross: { type: Number, default: 0 },
    currency: { type: String, default: "ETH" },
    networkName: String,
    chainId: Number,
    pdfFileName: String,
    pdfRelativePath: String,
    notes: String,
  },
  { timestamps: true }
);

invoiceSchema.index({ "buyer.wallet": 1, createdAt: -1 });
invoiceSchema.index({ "buyer.email": 1, createdAt: -1 });
invoiceSchema.index({ "items.tokenIds": 1 });
invoiceSchema.index({ "items.txHashes": 1 });
invoiceSchema.index({ "items.eventChainId": 1 });

export default mongoose.model("Invoice", invoiceSchema);
