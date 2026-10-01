import mongoose from "mongoose";

/** Ví lab do admin tạo — chỉ dùng mạng private-net, có thể lưu private key. */
const labWalletSchema = new mongoose.Schema(
  {
    address: { type: String, required: true, unique: true, lowercase: true },
    privateKey: { type: String, required: true },
    label: { type: String, default: "" },
    fundedEth: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export default mongoose.model("LabWallet", labWalletSchema);
