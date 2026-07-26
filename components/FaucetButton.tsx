"use client";

import { useAccount } from "wagmi";
import { Hooks } from "wagmi/tempo";
import { Button } from "./ui";
import { useToast } from "./Toast";
import { useMounted } from "@/hooks/useMounted";

export function FaucetButton() {
  const { address, isConnected } = useAccount();
  const fund = Hooks.faucet.useFundSync();
  const { notify } = useToast();
  const mounted = useMounted();

  if (!mounted || !isConnected || !address) return null;

  return (
    <Button
      size="base"
      variant="secondary"
      loading={fund.isPending}
      onClick={async () => {
        try {
          await fund.mutateAsync({ account: address });
          notify("Faucet funds sent. Check your balances shortly.", "success");
        } catch (e) {
          notify(
            `Faucet failed: ${(e as Error)?.message ?? "unknown error"}`,
            "error",
          );
        }
      }}
    >
      <DropletIcon />
      Get testnet funds
    </Button>
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
