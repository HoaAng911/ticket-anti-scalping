/**
 * Cấu hình RIÊNG cho chuỗi B (đích).
 *
 * Bắt buộc phải có file này: hai node hardhat mặc định đều báo chainId 31337.
 * Cùng chainId thì MetaMask sẽ từ chối khi thêm mạng thứ hai, và giao dịch
 * ký cho chuỗi A phát lại nguyên vẹn được trên chuỗi B.
 *
 * Chạy:  npx hardhat node --port 8548 --config hardhat.config.chainB.js
 */
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "paris",
    },
  },
  networks: {
    hardhat: {
      chainId: 31338,
    },
    chainB: {
      type: "http",
      url: "http://127.0.0.1:8548",
      chainId: 31338,
    },
  },
};
