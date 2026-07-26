"use client";

import { useAccount } from "wagmi";
import { Hooks } from "wagmi/tempo";
import { Button, Card } from "./ui";
import { useToast } from "./Toast";
import { useMounted } from "@/hooks/useMounted";
import { useFeeTokenBalance } from "@/hooks/useFeeTokenBalance";

export function FaucetBanner() {
  const mounted = useMounted();
  const { isConnected, address } = useAccount();
  const { hasFunds, isLoading } = useFeeTokenBalance();
  const fund = Hooks.faucet.useFundSync();
  const { notify } = useToast();

  if (!mounted || !isConnected || !address) return null;
  if (isLoading) return null;
  if (hasFunds !== false) return null;

  return (
    <Card className="flex items-center justify-between gap-4 py-4">
      <div className="flex items-start gap-3">
        <DropletIcon />
        <div>
          <p className="ts-body-strong text-text-primary">
            Your account has no funds for gas.
          </p>
          <p className="ts-body-sm text-text-secondary">
            Get testnet tokens to start configuring policies and claiming
            receipts.
          </p>
        </div>
      </div>
      <Button
        variant="secondary"
        loading={fund.isPending}
        onClick={async () => {
          try {
            await fund.mutateAsync({ account: address });
            notify("Funds sent. Balance updates shortly.", "success");
          } catch (e) {
            const err = e as Error & { shortMessage?: string };
            console.error("Faucet error:", err);
            const msg = err.shortMessage ?? err.message ?? "unknown error";
            notify(`Faucet failed: ${msg}`, "error");
          }
        }}
      >
        <DropletIcon />
        Get testnet funds
      </Button>
    </Card>
  );
}

function DropletIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2.5s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11z" opacity="0.9" />
    </svg>
  );
}
