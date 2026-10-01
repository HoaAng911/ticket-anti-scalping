/**
 * Kết nối MetaMask với mạng geth private-net (chainId 12345).
 * - eth_requestAccounts
 * - wallet_switchEthereumChain / wallet_addEthereumChain
 * - đọc số dư qua eth_getBalance
 */
import { PRIVATE_NETWORK, LAB_ACCOUNTS, getAddChainParams } from "./network-config.js";

const $ = (id) => document.getElementById(id);

function setStatus(message, type = "info") {
  const el = $("status");
  el.textContent = message;
  el.dataset.type = type;
}

function shortAddress(addr) {
  if (!addr || addr.length < 12) return addr || "-";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function getProvider() {
  if (typeof window.ethereum === "undefined") {
    return null;
  }
  if (window.ethereum.providers?.length) {
    const mm = window.ethereum.providers.find((p) => p.isMetaMask);
    if (mm) return mm;
  }
  return window.ethereum;
}

async function ensurePrivateNetwork(provider) {
  const target = PRIVATE_NETWORK.chainIdHex;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: target }],
    });
    return;
  } catch (err) {
    // 4902: chuỗi chưa được thêm vào MetaMask
    if (err?.code === 4902 || err?.code === -32603) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [getAddChainParams()],
      });
      return;
    }
    throw err;
  }
}

async function fetchBalance(provider, address) {
  const hex = await provider.request({
    method: "eth_getBalance",
    params: [address, "latest"],
  });
  const wei = BigInt(hex);
  const eth = Number(wei) / 1e18;
  return eth.toLocaleString("vi-VN", { maximumFractionDigits: 4 });
}

async function refreshUi(provider) {
  const accounts = await provider.request({ method: "eth_accounts" });
  const chainId = await provider.request({ method: "eth_chainId" });
  const account = accounts[0] || null;

  $("account").textContent = account ? account : "(chưa kết nối)";
  $("accountShort").textContent = account ? shortAddress(account) : "-";
  $("chainId").textContent = chainId
    ? `${parseInt(chainId, 16)} (${chainId})`
    : "-";

  const okChain = chainId?.toLowerCase() === PRIVATE_NETWORK.chainIdHex.toLowerCase();
  $("chainOk").textContent = okChain
    ? "Đúng mạng Ticket Private Clique"
    : "Sai mạng — bấm 'Thêm / chuyển mạng'";

  if (account && okChain) {
    try {
      $("balance").textContent = `${await fetchBalance(provider, account)} ETH`;
    } catch {
      $("balance").textContent = "(không đọc được — kiểm tra geth đang chạy?)";
    }
  } else {
    $("balance").textContent = "-";
  }
}

async function connectWallet() {
  const provider = getProvider();
  if (!provider) {
    setStatus(
      "Chưa cài MetaMask. Cài extension tại https://metamask.io rồi tải lại trang.",
      "error"
    );
    return;
  }

  try {
    setStatus("Đang yêu cầu kết nối MetaMask...", "info");
    await provider.request({ method: "eth_requestAccounts" });
    await ensurePrivateNetwork(provider);
    await refreshUi(provider);
    setStatus("Đã kết nối MetaMask và chuyển sang mạng private-net.", "ok");
  } catch (err) {
    console.error(err);
    setStatus(err?.message || String(err), "error");
  }
}

async function addOrSwitchNetwork() {
  const provider = getProvider();
  if (!provider) {
    setStatus("Chưa cài MetaMask.", "error");
    return;
  }
  try {
    await ensurePrivateNetwork(provider);
    await refreshUi(provider);
    setStatus("Đã thêm / chuyển sang Ticket Private Clique (12345).", "ok");
  } catch (err) {
    console.error(err);
    setStatus(err?.message || String(err), "error");
  }
}

async function checkRpc() {
  const url = PRIVATE_NETWORK.rpcUrls[0];
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: [],
        id: 1,
      }),
    });
    const data = await res.json();
    const id = parseInt(data.result, 16);
    $("rpcStatus").textContent = `RPC OK — chainId ${id} (${url})`;
    setStatus("Node geth đang phản hồi.", "ok");
  } catch (err) {
    $("rpcStatus").textContent = `RPC lỗi — bật mạng: ./scripts/start-all.sh`;
    setStatus(`Không gọi được ${url}. Hãy start geth trước.`, "error");
  }
}

function renderLabAccounts() {
  const ul = $("labAccounts");
  ul.innerHTML = "";
  for (const acc of LAB_ACCOUNTS) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${acc.label}</strong><br><code>${acc.address}</code>`;
    ul.appendChild(li);
  }
}

function bindEvents() {
  $("btnConnect").addEventListener("click", connectWallet);
  $("btnSwitch").addEventListener("click", addOrSwitchNetwork);
  $("btnRpc").addEventListener("click", checkRpc);

  const provider = getProvider();
  if (provider) {
    provider.on?.("accountsChanged", () => refreshUi(provider));
    provider.on?.("chainChanged", () => refreshUi(provider));
    refreshUi(provider).catch(() => {});
  } else {
    setStatus("Chưa phát hiện MetaMask trên trình duyệt này.", "error");
  }
}

renderLabAccounts();
bindEvents();
checkRpc();
