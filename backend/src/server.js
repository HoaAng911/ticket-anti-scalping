import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";

import { apiLimiter } from "./middlewares/rateLimiter.js";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import marketplaceRoutes from "./routes/marketplaceRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import { startBlockchainListener } from "./services/blockchainListener.js";
import { syncMongoEventsToChain } from "./services/adminChainService.js";
import { getLedgerStatus } from "./services/blockchainService.js";

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.use("/api", apiLimiter);

app.get("/api/health", async (req, res) => {
  let ledger = null;
  try {
    ledger = await getLedgerStatus();
  } catch (err) {
    ledger = { error: err.message };
  }
  res.json({
    success: true,
    data: {
      status: "ok",
      architecture: {
        ledger: "geth Clique multi-node — nguồn chân lý ownership / listing / TicketBlock",
        mongo: "auth, metadata sự kiện, cache write-behind",
      },
      chainId: process.env.CHAIN_ID,
      network: process.env.NETWORK_NAME,
      ticket: process.env.TICKET_CONTRACT_ADDRESS,
      marketplace: process.env.MARKETPLACE_CONTRACT_ADDRESS,
      ledger,
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

async function boot() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ticket-anti-scalping";
  await mongoose.connect(uri);
  console.log("[mongo] connected:", uri);

  app.listen(PORT, () => {
    console.log(`[api] http://localhost:${PORT}`);
  });

  await startBlockchainListener();

  // Heal: Mongo events còn từ trước redeploy rồi configure lại on-chain
  try {
    const sync = await syncMongoEventsToChain();
    console.log(
      `[sync] Mongo sang chain: synced=${sync.synced} alreadyOk=${sync.total - sync.synced - sync.errors} errors=${sync.errors}`
    );
  } catch (err) {
    console.warn("[sync] Không đồng bộ event lên chain:", err.message);
  }
}

boot().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
