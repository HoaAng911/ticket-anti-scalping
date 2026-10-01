/**
 * Seed organizer + sự kiện mẫu khớp eventChainId 1/2 trên contract.
 * Chạy: node src/scripts/seed.js
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Event from "../models/Event.js";

async function upsertUser({ email, password, role, walletAddress, displayName }) {
  let user = await User.findOne({ email });
  if (!user) {
    const doc = {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role,
      displayName: displayName || "",
      isActive: true,
    };
    if (walletAddress) doc.walletAddress = walletAddress;
    user = await User.create(doc);
    console.log(`Created ${role}:`, email, "/", password);
  } else {
    let changed = false;
    if (user.role !== role) {
      user.role = role;
      changed = true;
    }
    if (user.isActive === false) {
      user.isActive = true;
      changed = true;
    }
    if (changed) {
      await user.save();
      console.log(`Updated ${email} → role=${role}, active=true`);
    } else {
      console.log(`${role} exists:`, email);
    }
  }
  return user;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  await upsertUser({
    email: "admin@ticket.local",
    password: "admin123",
    role: "admin",
    displayName: "System Admin",
  });

  const user = await upsertUser({
    email: "organizer@ticket.local",
    password: "organizer123",
    role: "organizer",
    walletAddress: "0xdecc0bf86a34de96b161b1f910ce2684d36bb4b4",
    displayName: "Demo Organizer",
  });

  const existing = await Event.findOne({ title: "Đêm Nhạc Anti-Scalping" });
  if (existing) {
    console.log("Event already seeded:", existing._id.toString());
  } else {
    const event = await Event.create({
      title: "Đêm Nhạc Anti-Scalping",
      description:
        "Sự kiện demo bán vé NFT trên mạng geth private-net (chainId 12345). Tối đa 2 vé/ví/loại. Resale ≤ 110%, khóa chuyển nhượng ngắn trên local.",
      location: "Nhà hát Demo, TP.HCM",
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      organizer: user._id,
      coverImage: "",
      ticketTypes: [
        { name: "Standard", price: 0.01, totalSupply: 100, eventChainId: 1 },
        { name: "VIP", price: 0.05, totalSupply: 20, eventChainId: 2 },
      ],
    });
    console.log("Seeded event:", event._id.toString());
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
