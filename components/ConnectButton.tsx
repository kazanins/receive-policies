"use client";

import { useState, useCallback } from "react";
import { useAccount, useConnect, useConnectors, useDisconnect } from "wagmi";
import { Button } from "./ui";
import { shortAddress } from "@/lib/tokens";
import { useToast } from "./Toast";
import { useMounted } from "@/hooks/useMounted";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const connectors = useConnectors();
  const { disconnect } = useDisconnect();
  const { notify } = useToast();
  const mounted = useMounted();

  if (!mounted) {
    return <Button variant="primary" disabled>Loading…</Button>;
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <CopyableAddress address={address} onCopy={() => notify("Address copied", "success")} />
        <Button
          size="base"
          variant="outline"
          onClick={() => {
            disconnect();
            notify("Disconnected", "info");
          }}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  const connector = connectors[0];
  return (
    <Button
      loading={isPending}
      onClick={() =>
        connector
          ? connect({ connector })
          : notify("No wallet connector available", "error")
      }
    >
      <WalletIcon />
      Login with Tempo Wallet
    </Button>
  );
}

function CopyableAddress({
  address,
  onCopy,
}: {
  address: string;
  onCopy?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      onCopy?.();
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard may be unavailable */
    }
  }, [address, onCopy]);

  return (
    <button
      type="button"
      onClick={copy}
      title={address}
      className="focus-ring group inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border border-border-default bg-bg-secondary py-1 pl-3 pr-2 ts-data-sm text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
    >
      <span className="hidden sm:inline">{shortAddress(address)}</span>
      <span className="sm:hidden">
        <WalletIcon />
      </span>
      <span
        className={`inline-flex h-4 w-4 items-center justify-center transition-all duration-[var(--duration-normal)] ${
          copied ? "scale-110 text-icon-success" : "text-icon-tertiary group-hover:text-icon-secondary"
        }`}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </span>
    </button>
  );
}

function CopyIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
      <path d="M21 7H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z" />
      <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
