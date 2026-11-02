import type { Metadata } from "next";
import "./globals.css";
import { WalletContextProvider } from "@/context/WalletContextProvider";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "SolLaunch | Private Solana Token & Raydium Launchpad",
  description:
    "Self-hosted private launcher for Solana SPL tokens, authority revocation, and instant Raydium CPMM liquidity pool creation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface-main text-foreground flex flex-col relative selection:bg-brand-primary/30 selection:text-white">
        {/* Ambient background glow effects */}
        <div className="fixed top-[-10rem] left-1/2 -translate-x-1/2 w-[45rem] h-[30rem] bg-brand-primary/10 blur-[130px] rounded-full pointer-events-none -z-10" />
        <div className="fixed top-[30rem] right-[-10rem] w-[35rem] h-[35rem] bg-brand-secondary/5 blur-[140px] rounded-full pointer-events-none -z-10" />

        <WalletContextProvider>
          <Header />
          <main className="flex-1 flex flex-col">{children}</main>
        </WalletContextProvider>
      </body>
    </html>
  );
}

