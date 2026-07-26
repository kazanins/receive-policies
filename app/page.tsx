"use client";

import { useEffect, useRef, useState } from "react";
import { Providers } from "./providers";
import { ConnectButton } from "@/components/ConnectButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ReceivePolicySummary } from "@/components/ReceivePolicySummary";
import { TokenBlocklistManager } from "@/components/TokenBlocklistManager";
import { BlockedReceiptsFeed } from "@/components/BlockedReceiptsFeed";

export default function Page() {
  const leftRef = useRef<HTMLDivElement>(null);
  const [leftHeight, setLeftHeight] = useState(0);

  useEffect(() => {
    if (!leftRef.current) return;
    const observer = new ResizeObserver((entries) => {
      requestAnimationFrame(() => setLeftHeight(entries[0].contentRect.height));
    });
    observer.observe(leftRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <Providers>
      <div className="min-h-screen">
        <header className="sticky top-0 z-10 border-b border-border-default bg-bg-primary/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
            <div className="flex items-center gap-2.5">
              <Logo className="text-text-primary" />
              <div className="leading-tight">
                <div className="ts-h2 text-text-primary">Receive Policies Demo</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ConnectButton />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-5 py-8">
          <Hero />

          <div
            className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start"
            style={{ "--left-h": `${leftHeight}px` } as React.CSSProperties}
          >
            <div ref={leftRef} className="flex flex-col gap-6">
              <TokenBlocklistManager />
              <ReceivePolicySummary />
            </div>
            <BlockedReceiptsFeed />
          </div>

        </main>
      </div>
    </Providers>
  );
}

function Hero() {
  return (
    <section className="rounded-[var(--radius-xl)] border border-border-subtle bg-bg-primary p-7 shadow-[var(--elevation-100)]">
      <h1 className="ts-display text-text-primary">
        Control what your account can receive.
      </h1>
      <p className="ts-body mt-3 max-w-2xl text-text-secondary">
        Receive policies let a Tempo account reject incoming TIP-20 tokens it
        does not want. Blocked transfers still succeed, but delivery is
        redirected to{" "}
        <code className="ts-data-sm rounded bg-bg-secondary px-1 py-0.5">
          ReceivePolicyGuard
        </code>{" "}
        and recorded as a claimable receipt.
      </p>
    </section>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="32"
      height="32"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Tempo"
    >
      <path
        d="M17.6429 28.1631H13.1933L17.3173 15.4122H12.043L13.1933 11.6748H27.8878L26.7374 15.4122H21.7452L17.6429 28.1631Z"
        fill="currentColor"
      />
    </svg>
  );
}
