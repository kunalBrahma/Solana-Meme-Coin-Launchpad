"use client";

import React, { FC, ReactNode, useMemo, useState, createContext, useContext } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { SolanaNetwork, getRpcUrl } from "@/lib/solana";

require("@solana/wallet-adapter-react-ui/styles.css");

interface NetworkContextType {
  network: SolanaNetwork;
  setNetwork: (network: SolanaNetwork) => void;
  rpcUrl: string;
}

const NetworkContext = createContext<NetworkContextType>({
  network: "devnet",
  setNetwork: () => {},
  rpcUrl: "",
});

export const useSolanaNetwork = () => useContext(NetworkContext);

export const WalletContextProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [network, setNetwork] = useState<SolanaNetwork>("devnet");

  const endpoint = useMemo(() => getRpcUrl(network), [network]);

  // Solana Wallet Standard auto-discovers all modern installed wallets
  // (Phantom, Solflare, Backpack, Brave, etc.) cleanly without bloated legacy adapters
  const wallets = useMemo(() => [], []);

  return (
    <NetworkContext.Provider value={{ network, setNetwork, rpcUrl: endpoint }}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </NetworkContext.Provider>
  );
};
