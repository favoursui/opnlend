import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

export const opnTestnet = defineChain({
  id: 984,
  name: "OPN Chain Testnet",
  nativeCurrency: { name: "IOPN", symbol: "IOPN", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.iopn.tech"] },
    public:  { http: ["https://testnet-rpc.iopn.tech"] },
  },
  blockExplorers: {
    default: { name: "OPNScan", url: "https://testnet.opnscan.io" },
  },
  testnet: true,
});

export const opnMainnet = defineChain({
  id: 985,
  name: "OPN Chain",
  nativeCurrency: { name: "IOPN", symbol: "IOPN", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.iopn.tech"] },
    public:  { http: ["https://rpc.iopn.tech"] },
  },
  blockExplorers: {
    default: { name: "OPNScan", url: "https://opnscan.io" },
  },
});

export const wagmiConfig = getDefaultConfig({
  appName: "OPNLend",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
  chains: [opnTestnet, opnMainnet],
  ssr: true,
});
