"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useSolanaNetwork } from "@/context/WalletContextProvider";
import {
  Rocket,
  PlusCircle,
  Droplets,
  Layers,
  Bot,
  Activity,
} from "lucide-react";

// Dynamically import WalletMultiButton to prevent hydration mismatch on SSR
const WalletMultiButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { network, setNetwork } = useSolanaNetwork();
  const [mounted, setMounted] = useState(false);
  const [solPrice, setSolPrice] = useState<number>(95.44);

  const navItems = [
    { href: "/", label: "Dashboard", icon: Activity },
    { href: "/create", label: "Create Token", icon: PlusCircle },
    { href: "/liquidity", label: "Liquidity", icon: Droplets },
    { href: "/bot", label: "Volume Bot", icon: Bot },
    { href: "/portfolio", label: "Portfolio", icon: Layers },
  ];

  // Sliding pill active indicator state
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
    opacity: number;
  }>({ left: 0, width: 0, opacity: 0 });

  // Update sliding indicator position on pathname change or window resize
  const updateIndicator = () => {
    const activeIndex = navItems.findIndex((item) => {
      if (item.href === "/") return pathname === "/";
      return pathname.startsWith(item.href);
    });

    if (activeIndex !== -1 && itemRefs.current[activeIndex] && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const activeRect = itemRefs.current[activeIndex]!.getBoundingClientRect();
      setIndicatorStyle({
        left: activeRect.left - navRect.left,
        width: activeRect.width,
        opacity: 1,
      });
    } else {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  };

  useEffect(() => {
    setMounted(true);
    fetch("/api/sol-price")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.price) setSolPrice(d.price);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Delay slightly to ensure fonts/DOM measurements are ready
    const timer = setTimeout(updateIndicator, 30);
    window.addEventListener("resize", updateIndicator);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [pathname, mounted]);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0a0d14]/90 border-b border-white/[0.07] px-4 sm:px-6 lg:px-8 py-2.5 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo & Live SOL Ticker */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#00f2fe]/10 border border-[#00f2fe]/30 flex items-center justify-center text-[#00f2fe] group-hover:bg-[#00f2fe]/20 transition-colors">
              <Rocket className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-sm tracking-tight text-white">
                RAYLAUNCH
              </span>
              <span className="text-[10px] font-mono text-[#00f2fe] font-medium">
                PRO
              </span>
            </div>
          </Link>

          {/* Live SOL Market Price */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-zinc-400">SOL:</span>
            <span className="font-bold text-white tabular-nums">${solPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* Desktop Navigation with Smooth Sliding Pill Animation */}
        <nav
          ref={navRef}
          className="relative hidden md:flex items-center bg-[#0f141f] p-1 rounded-lg border border-white/[0.06] overflow-hidden"
        >
          {/* Smooth Sliding Active Background Pill */}
          <div
            className="absolute top-1 bottom-1 rounded-md bg-[#161d2b] border border-white/10 shadow-sm pointer-events-none"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              opacity: indicatorStyle.opacity,
              transition:
                "left 260ms cubic-bezier(0.22, 1, 0.36, 1), width 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms ease",
            }}
          />

          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ${
                  isActive
                    ? "text-white font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 transition-colors duration-150 ${
                    isActive ? "text-[#00f2fe]" : "text-zinc-400"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Network Toggle & Wallet */}
        <div className="flex items-center gap-2.5">
          {/* Network Switcher */}
          <button
            onClick={() =>
              setNetwork(network === "devnet" ? "mainnet-beta" : "devnet")
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono font-medium transition-all border ${
              network === "devnet"
                ? "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
            }`}
            title="Click to toggle between Devnet and Mainnet"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                network === "devnet" ? "bg-amber-400" : "bg-emerald-400"
              }`}
            />
            <span>{network === "devnet" ? "DEVNET" : "MAINNET"}</span>
          </button>

          {/* Wallet Multi Button */}
          {mounted && <WalletMultiButton />}
        </div>
      </div>
    </header>
  );
};
