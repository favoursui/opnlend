import type { AppProps } from "next/app";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/config/wagmi";
import Navbar from "@/components/layout/Navbar";
import "@rainbow-me/rainbowkit/styles.css";
import "@/styles/globals.css";
import Head from "next/head";

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#00e5a0",
            accentColorForeground: "#050f0f",
            borderRadius: "medium",
          })}
        >
          <Head>
            <link rel="icon" href="/favicon.ico" />
          </Head>
          <Navbar />
          <main style={{ maxWidth: 1180, margin: "0 auto", padding: "2rem 1.5rem", width: "100%" }}>
            <Component {...pageProps} />
          </main>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
