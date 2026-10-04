import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function getEvents() {
  const res = await api.get("/events");
  return res.data.data;
}

export async function getEvent(id) {
  const res = await api.get(`/events/${id}`);
  return res.data.data.event;
}

export async function getMyTickets(wallet) {
  const res = await api.get("/tickets/my", { params: { wallet } });
  return res.data.data;
}

export async function getTicketPass(tokenId) {
  const res = await api.get(`/tickets/${tokenId}/pass`);
  return res.data.data.pass;
}

async function ensurePdfBlob(blob) {
  if (!(blob instanceof Blob)) {
    throw new Error("Phản hồi PDF không hợp lệ");
  }
  const type = (blob.type || "").toLowerCase();
  if (type.includes("application/pdf") || type === "application/octet-stream" || !type) {
    // Một số proxy trả octet-stream / type rỗng — kiểm tra magic %PDF
    const head = await blob.slice(0, 5).text();
    if (head.startsWith("%PDF")) return blob;
  }
  if (type.includes("json") || type.includes("text") || type.includes("html")) {
    let msg = "Không tải được PDF vé vào cửa";
    try {
      const data = JSON.parse(await blob.text());
      msg = data.error || data.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const head = await blob.slice(0, 5).text();
  if (head.startsWith("%PDF")) {
    return new Blob([blob], { type: "application/pdf" });
  }
  throw new Error("File trả về không phải PDF hợp lệ");
}

export async function fetchTicketPassPdfBlob(tokenId) {
  const res = await api.get(`/tickets/${tokenId}/pass.pdf`, {
    responseType: "blob",
    headers: { Accept: "application/pdf" },
  });
  return ensurePdfBlob(res.data);
}

export async function verifyTicketEntry(payload) {
  const res = await api.post("/tickets/verify-entry", payload);
  return res.data.data;
}

export async function checkInTicketEntry(payload) {
  const res = await api.post("/tickets/check-in", payload);
  return res.data.data;
}

export async function getTicketChain(from, to) {
  const res = await api.get("/tickets/chain", { params: { from, to } });
  return res.data.data;
}

export async function getTicket(tokenId) {
  const res = await api.get(`/tickets/${tokenId}`);
  return res.data.data;
}

export async function getListings() {
  const res = await api.get("/marketplace/listings");
  return res.data.data.listings;
}

export async function getTicketHistory(tokenId) {
  const res = await api.get(`/marketplace/history/${tokenId}`);
  return res.data.data;
}

export async function getRemaining(eventChainId) {
  const res = await api.get(`/tickets/remaining/${eventChainId}`);
  return res.data.data;
}

export async function getLedgerStatus() {
  const res = await api.get("/tickets/ledger-status");
  return res.data.data;
}

export async function getMoneyFlow(params = {}) {
  const res = await api.get("/marketplace/money-flow", { params });
  return res.data.data;
}

export async function createInvoice(payload) {
  const res = await api.post("/invoices", payload);
  return res.data.data;
}

export async function getMyInvoices() {
  const res = await api.get("/invoices/mine");
  return res.data.data.invoices;
}

export async function getInvoicesByWallet(wallet) {
  const res = await api.get(`/invoices/by-wallet/${wallet}`);
  return res.data.data.invoices;
}

export async function getInvoiceByTokenId(tokenId) {
  const res = await api.get(`/invoices/by-token/${tokenId}`);
  return res.data.data;
}

export async function getAdminInvoices(params = {}) {
  const res = await api.get("/admin/invoices", { params });
  return res.data.data;
}

export async function voidAdminInvoice(id, reason = "") {
  const res = await api.patch(`/admin/invoices/${id}/void`, { reason });
  return res.data.data;
}

export async function getAdminLicenses(params = {}) {
  const res = await api.get("/admin/licenses", { params });
  return res.data.data;
}

export async function updateAdminLicense(eventId, payload) {
  const res = await api.put(`/admin/licenses/${eventId}`, payload);
  return res.data.data;
}

export async function patchAdminLicenseStatus(eventId, payload) {
  const res = await api.patch(`/admin/licenses/${eventId}/status`, payload);
  return res.data.data;
}

export async function uploadAdminLicenseDocument(eventId, file) {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(`/admin/licenses/${eventId}/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
}

export async function deleteAdminLicenseDocument(eventId) {
  const res = await api.delete(`/admin/licenses/${eventId}/document`);
  return res.data.data;
}

export async function getProgramCatalog() {
  const res = await api.get("/admin/programs/catalog");
  return res.data.data;
}

export async function getAdminEventPrograms(params = {}) {
  const res = await api.get("/admin/programs", { params });
  return res.data.data;
}

export async function getAdminEventProgram(eventId) {
  const res = await api.get(`/admin/programs/${eventId}`);
  return res.data.data;
}

export async function replaceAdminEventProgram(eventId, payload) {
  const res = await api.put(`/admin/programs/${eventId}`, payload);
  return res.data.data;
}

export async function createAdminProgramItem(eventId, payload) {
  const res = await api.post(`/admin/programs/${eventId}/items`, payload);
  return res.data.data;
}

export async function updateAdminProgramItem(eventId, itemId, payload) {
  const res = await api.put(`/admin/programs/${eventId}/items/${itemId}`, payload);
  return res.data.data;
}

export async function deleteAdminProgramItem(eventId, itemId) {
  const res = await api.delete(`/admin/programs/${eventId}/items/${itemId}`);
  return res.data.data;
}

export async function getEventSeating(eventId) {
  const res = await api.get(`/events/${eventId}/seats`);
  return res.data.data;
}

export async function holdEventSeats(eventId, payload) {
  const res = await api.post(`/events/${eventId}/seats/hold`, payload);
  return res.data.data;
}

export async function releaseEventSeats(eventId, payload) {
  const res = await api.post(`/events/${eventId}/seats/release`, payload);
  return res.data.data;
}

export async function confirmEventSeats(eventId, payload) {
  const res = await api.post(`/events/${eventId}/seats/confirm`, payload);
  return res.data.data;
}

export async function generateAdminEventSeating(eventId, payload = {}) {
  const res = await api.post(`/admin/events/${eventId}/seating/generate`, payload);
  return res.data.data;
}

export async function getAdminEventSeating(eventId) {
  const res = await api.get(`/admin/events/${eventId}/seating`);
  return res.data.data;
}

export async function manageAdminEventSeats(eventId, payload) {
  const res = await api.patch(`/admin/events/${eventId}/seating/seats`, payload);
  return res.data.data;
}

export async function getAdminEventPayouts() {
  const res = await api.get("/admin/event-payouts");
  return res.data.data;
}

export async function getAdminEventPayout(eventId) {
  const res = await api.get(`/admin/events/${eventId}/payout`);
  return res.data.data;
}

export async function updateAdminEventPayout(eventId, payload) {
  const res = await api.patch(`/admin/events/${eventId}/payout`, payload);
  return res.data.data;
}

export async function deleteAdminEventPayout(eventId, { hard = false } = {}) {
  const res = await api.delete(`/admin/events/${eventId}/payout`, {
    params: hard ? { hard: true } : {},
  });
  return res.data.data;
}

export async function settleAdminEventPayout(eventId, payload = {}) {
  const res = await api.post(`/admin/events/${eventId}/settle-payout`, payload);
  return res.data.data;
}

export async function getAdminPaymentContracts(params = {}) {
  const res = await api.get("/admin/payment-contracts", { params });
  return res.data.data;
}

export async function getAdminPaymentContract(id) {
  const res = await api.get(`/admin/payment-contracts/${id}`);
  return res.data.data;
}

export async function createAdminPaymentContract(payload) {
  const res = await api.post("/admin/payment-contracts", payload);
  return res.data.data;
}

export async function updateAdminPaymentContract(id, payload) {
  const res = await api.patch(`/admin/payment-contracts/${id}`, payload);
  return res.data.data;
}

export async function deleteAdminPaymentContract(id) {
  const res = await api.delete(`/admin/payment-contracts/${id}`);
  return res.data.data;
}

export async function settleAdminPaymentStage(contractId, stageId, payload = {}) {
  const res = await api.post(
    `/admin/payment-contracts/${contractId}/stages/${stageId}/settle`,
    payload
  );
  return res.data.data;
}

export async function patchAdminPaymentStage(contractId, stageId, payload) {
  const res = await api.patch(
    `/admin/payment-contracts/${contractId}/stages/${stageId}`,
    payload
  );
  return res.data.data;
}

export async function getAdminPaymentContractCatalog() {
  const res = await api.get("/admin/payment-contracts/catalog");
  return res.data.data;
}

export async function seedAdminPaymentContracts(payload = {}) {
  const res = await api.post("/admin/payment-contracts/seed", payload);
  return res.data.data;
}

export async function regenerateAdminPaymentContractPdf(id) {
  const res = await api.post(`/admin/payment-contracts/${id}/pdf`);
  return res.data.data;
}

/** Tải / xem PDF hợp đồng thanh toán (blob) */
export async function fetchAdminPaymentContractPdfBlob(id, { download = false, regenerate = false } = {}) {
  const res = await api.get(`/admin/payment-contracts/${id}/pdf`, {
    responseType: "blob",
    params: {
      ...(download ? { download: 1 } : {}),
      ...(regenerate ? { regenerate: 1 } : {}),
    },
  });
  return ensurePdfBlob(res.data);
}

export async function getOrganizerProfileCatalog() {
  const res = await api.get("/admin/organizer-profiles/catalog");
  return res.data.data;
}

export async function getAdminOrganizerProfiles(params = {}) {
  const res = await api.get("/admin/organizer-profiles", { params });
  return res.data.data;
}

export async function getAdminOrganizerProfile(id) {
  const res = await api.get(`/admin/organizer-profiles/${id}`);
  return res.data.data;
}

export async function createAdminOrganizerProfile(payload) {
  const res = await api.post("/admin/organizer-profiles", payload);
  return res.data.data;
}

export async function updateAdminOrganizerProfile(id, payload) {
  const res = await api.put(`/admin/organizer-profiles/${id}`, payload);
  return res.data.data;
}

export async function patchAdminOrganizerProfileStatus(id, payload) {
  const res = await api.patch(`/admin/organizer-profiles/${id}/status`, payload);
  return res.data.data;
}

export async function deleteAdminOrganizerProfile(id) {
  const res = await api.delete(`/admin/organizer-profiles/${id}`);
  return res.data.data;
}

export async function getAdminOrganizerMembers(params = {}) {
  const res = await api.get("/admin/organizer-profiles/members", { params });
  return res.data.data;
}

export async function createAdminOrganizerMember(profileId, payload) {
  const res = await api.post(`/admin/organizer-profiles/${profileId}/members`, payload);
  return res.data.data;
}

export async function updateAdminOrganizerMember(profileId, memberId, payload) {
  const res = await api.put(
    `/admin/organizer-profiles/${profileId}/members/${memberId}`,
    payload
  );
  return res.data.data;
}

export async function deleteAdminOrganizerMember(profileId, memberId) {
  const res = await api.delete(
    `/admin/organizer-profiles/${profileId}/members/${memberId}`
  );
  return res.data.data;
}

export async function fetchAdminLicenseDocumentBlob(eventId) {
  const res = await api.get(`/admin/licenses/${eventId}/document`, {
    responseType: "blob",
  });
  return res.data;
}

/** PDF giấy phép — admin (có auth) */
export async function fetchAdminLicensePdfBlob(eventId) {
  const res = await api.get(`/admin/licenses/${eventId}/pdf`, {
    responseType: "blob",
  });
  return res.data;
}

/** PDF giấy phép — công khai (sự kiện đã cấp phép) */
export async function fetchPublicLicensePdfBlob(eventId) {
  const res = await api.get(`/events/${eventId}/license.pdf`, {
    responseType: "blob",
  });
  return res.data;
}

export async function fetchPublicLicenseDocumentBlob(eventId) {
  const res = await api.get(`/events/${eventId}/license.document`, {
    responseType: "blob",
  });
  return res.data;
}

/** Tải PDF hóa đơn (blob) — dùng để xem / in / tải về */
export async function fetchInvoicePdfBlob(invoiceId) {
  const res = await api.get(`/invoices/${invoiceId}/pdf`, {
    responseType: "blob",
  });
  return res.data;
}

export async function syncEventsToChain() {
  const res = await api.post("/admin/sync-events-to-chain");
  return res.data.data;
}

export async function login(email, password) {
  const res = await api.post("/auth/login", { email, password });
  return res.data.data;
}

export async function register(email, password, role = "user") {
  const res = await api.post("/auth/register", { email, password, role });
  return res.data.data;
}

export async function linkWallet(walletAddress) {
  const res = await api.post("/auth/link-wallet", { walletAddress });
  return res.data.data;
}

export async function getMe() {
  const res = await api.get("/auth/me");
  return res.data.data.user;
}

export async function createEvent(payload) {
  const res = await api.post("/events", payload);
  return res.data.data.event;
}

export async function updateEvent(id, payload) {
  const res = await api.put(`/events/${id}`, payload);
  return res.data.data.event;
}

export async function getAdminDashboard() {
  const res = await api.get("/admin/dashboard");
  return res.data.data;
}

export async function getAdminTickets() {
  const res = await api.get("/admin/tickets");
  return res.data.data.tickets;
}

export async function getAdminTransactions() {
  const res = await api.get("/admin/transactions");
  return res.data.data.transactions;
}

export async function getLabWallets() {
  const res = await api.get("/admin/lab-wallets");
  return res.data.data.wallets;
}

export async function fundWallets(addresses, amountEth) {
  const res = await api.post("/admin/fund", { addresses, amountEth });
  return res.data.data;
}

export async function createAndFundWallets({ count, amountEth, label, fund = true }) {
  const res = await api.post("/admin/create-wallets", { count, amountEth, label, fund });
  return res.data.data;
}

export async function createTicketTypeOnChain(payload) {
  const res = await api.post("/admin/create-ticket-type", payload);
  return res.data.data;
}

/** Thêm hạng vé vào sự kiện đã có */
export async function addTicketTypesToEvent(eventId, payload) {
  const res = await api.post(`/admin/events/${eventId}/ticket-types`, payload);
  return res.data.data;
}

export async function mintTicketsToWallets(eventChainId, addresses) {
  const res = await api.post("/admin/mint-tickets", { eventChainId, addresses });
  return res.data.data;
}

export async function getRolesCatalog() {
  const res = await api.get("/admin/roles");
  return res.data.data;
}

export async function getAdminUsers(params = {}) {
  const res = await api.get("/admin/users", { params });
  return res.data.data;
}

export async function getAdminUser(id) {
  const res = await api.get(`/admin/users/${id}`);
  return res.data.data.user;
}

export async function createAdminUser(payload) {
  const res = await api.post("/admin/users", payload);
  return res.data.data.user;
}

export async function updateAdminUser(id, payload) {
  const res = await api.patch(`/admin/users/${id}`, payload);
  return res.data.data;
}

export async function deleteAdminUser(id, { hard = false } = {}) {
  const res = await api.delete(`/admin/users/${id}`, { params: hard ? { hard: true } : {} });
  return res.data.data;
}

export default api;
