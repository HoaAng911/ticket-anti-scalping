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

export async function createAdminUser(payload) {
  const res = await api.post("/admin/users", payload);
  return res.data.data.user;
}

export async function updateAdminUser(id, payload) {
  const res = await api.patch(`/admin/users/${id}`, payload);
  return res.data.data;
}

export async function deleteAdminUser(id) {
  const res = await api.delete(`/admin/users/${id}`);
  return res.data.data.user;
}

export default api;
