require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/**
 * Cấu hình chính — dùng cho chuỗi nguồn (chain A).
 *
 * LƯU Ý: chuỗi đích (chain B) phải dùng file riêng `hardhat.config.chainB.js`
 * vì chainId phải khác nhau, nếu không MetaMask không phân biệt được 2 mạng
 * và giao dịch ký cho chuỗi A có thể phát lại trên chuỗi B.
 *
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "paris", // bắt buộc với Clique PoA của mạng geth
    },
  },
  networks: {
    // Mạng in-memory mặc định của hardhat (dùng khi chạy `npx hardhat test`)
    hardhat: {
      chainId: 31337,
    },

    // ── Chuỗi A (nguồn) — chạy: npx hardhat node --port 8547 ──────────────
    // Cổng 8547/8548 để không đụng mạng geth private-net (đang giữ 8545/8546)
    chainA: {
      url: "http://127.0.0.1:8547",
      chainId: 31337,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },

    // ── Chuỗi B (đích) — chạy: npx hardhat node --port 8548 --config hardhat.config.chainB.js
    // Ở đây khai báo cho script deploy chạy đúng chainId khi deploy lên chain B
    chainB: {
      url: "http://127.0.0.1:8548",
      chainId: 31338,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },

    // ── Mạng geth riêng của nhóm (buổi 2–3) ─────────────────────────────
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 12345,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },

    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      chainId: 11155111,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
};
