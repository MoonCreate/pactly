import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: "0.8.28",
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    zgTestnet: {
      type: "http",
      chainType: "l1",
      url: configVariable("ZG_TESTNET_RPC_URL"),
      chainId: 16602,
      accounts: [configVariable("ZG_PRIVATE_KEY")],
    },
    zgMainnet: {
      type: "http",
      chainType: "l1",
      url: configVariable("ZG_MAINNET_RPC_URL"),
      accounts: [configVariable("ZG_PRIVATE_KEY")],
    },
  },
});
