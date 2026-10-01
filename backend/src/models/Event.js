import mongoose from "mongoose";

const ticketTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    totalSupply: { type: Number, required: true, min: 0 },
    eventChainId: { type: Number, required: true },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    startTime: { type: Date, required: true },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ticketTypes: { type: [ticketTypeSchema], required: true },
    coverImage: { type: String, default: "" },
  },
  { timestamps: true }
);

eventSchema.index({ organizer: 1 });
eventSchema.index({ startTime: 1 });

export default mongoose.model("Event", eventSchema);
