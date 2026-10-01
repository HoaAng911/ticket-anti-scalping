/**
 * Cấu hình mạng geth private-net (Clique PoA).
 * Dùng chung cho trang kết nối MetaMask.
 */
export const PRIVATE_NETWORK = {
  chainIdDecimal: 12345,
  chainIdHex: "0x3039", // 12345
  chainName: "Ticket Private Clique",
  rpcUrls: ["http://127.0.0.1:8545"],
  // RPC dự phòng (node2) — MetaMask dùng URL đầu tiên khi add chain
  rpcUrlNode2: "http://127.0.0.1:8546",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  blockExplorerUrls: [],
};

/** Tài khoản lab (chỉ địa chỉ công khai — xem accounts.json) */
export const LAB_ACCOUNTS = [
  {
    label: "Signer 1 (node1)",
    address: "0xa98B089Fad3e09f069b41a50F3cb41387ba5e8A2",
  },
  {
    label: "Deployer (test)",
    address: "0xdecc0bf86a34de96B161b1F910ce2684d36bb4B4",
  },
  {
    label: "Signer 2 (node2)",
    address: "0xd07f0A707A3A6eA439a2B8cb18A7dA016A6056B4",
  },
];

export function getAddChainParams() {
  return {
    chainId: PRIVATE_NETWORK.chainIdHex,
    chainName: PRIVATE_NETWORK.chainName,
    rpcUrls: PRIVATE_NETWORK.rpcUrls,
    nativeCurrency: PRIVATE_NETWORK.nativeCurrency,
  };
}
