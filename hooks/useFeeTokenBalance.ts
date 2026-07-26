"use client";

import { Hooks } from "wagmi/tempo";
import { useTempoClients } from "./useTempoClients";

const FEE_TOKEN = "0x20c0000000000000000000000000000000000001";

export function useFeeTokenBalance() {
  const { address } = useTempoClients();
  const q = Hooks.token.useGetBalance({
    account: address,
    token: FEE_TOKEN,
    query: {
      enabled: !!address,
      refetchInterval: 10_000,
    },
  });
  const balance = q.data?.amount;
  const hasFunds = balance === undefined ? undefined : balance > 0n;
  return {
    balance,
    hasFunds,
    isLoading: q.isLoading && !!address,
  };
}
