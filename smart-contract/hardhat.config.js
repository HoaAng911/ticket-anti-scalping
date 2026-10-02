require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/**
 * Cấu hình Hardhat — chỉ mạng local (lab).
 *
 * - hardhat: in-memory (test)
 * - localhost: geth private-net :8545 (chainId 12345) — dùng chính
 * - chainA / chainB: hardhat node local (bridge demo)
 *
 * LƯU Ý: chuỗi đích (chain B) phải dùng file riêng `hardhat.config.chainB.js`
 * vì chainId phải khác nhau.
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
    hardhat: {
      chainId: 31337,
    },

    // Chuỗi A — npx hardhat node --port 8547
    chainA: {
      url: "http://127.0.0.1:8547",
      chainId: 31337,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },

    // Chuỗi B — npx hardhat node --port 8548 --config hardhat.config.chainB.js
    chainB: {
      url: "http://127.0.0.1:8548",
      chainId: 31338,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },

    // geth private-net (lab chính)
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 12345,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
};
