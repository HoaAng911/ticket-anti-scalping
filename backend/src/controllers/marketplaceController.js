import Ticket from "../models/Ticket.js";
import Transaction from "../models/Transaction.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { getListingOnChain, getMaxAllowedPrice, getUnlockTime } from "../services/blockchainService.js";

export const getActiveListings = asyncHandler(async (req, res) => {
  const listings = await Ticket.find({ status: "listed_for_resale" })
    .sort({ updatedAt: -1 })
    .populate("event", "title location startTime");

  const enriched = await Promise.all(
    listings.map(async (t) => {
      let chainListing = null;
      let maxPrice = null;
      try {
        chainListing = await getListingOnChain(t.tokenId);
        maxPrice = await getMaxAllowedPrice(t.tokenId);
      } catch {
        /* ignore */
      }
      return {
        tokenId: t.tokenId,
        ownerWallet: t.ownerWallet,
        originalPrice: t.originalPrice,
        listingPrice: t.listingPrice,
        event: t.event,
        status: t.status,
        chainListing,
        maxAllowedPrice: maxPrice,
      };
    })
  );

  res.json({ success: true, data: { listings: enriched } });
});

export const getHistory = asyncHandler(async (req, res) => {
  const tokenId = Number(req.params.tokenId);
  const history = await Transaction.find({ tokenId }).sort({ createdAt: -1 });
  let unlockTime = null;
  let maxPrice = null;
  try {
    unlockTime = await getUnlockTime(tokenId);
    maxPrice = await getMaxAllowedPrice(tokenId);
  } catch {
    /* ignore */
  }
  res.json({
    success: true,
    data: { tokenId, history, unlockTime, maxAllowedPrice: maxPrice },
  });
});
