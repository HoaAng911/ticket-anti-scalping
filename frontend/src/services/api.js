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
  return res.data.data.remaining;
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
