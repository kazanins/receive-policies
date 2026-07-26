"use client";

import { useQuery } from "@tanstack/react-query";
import { Actions } from "viem/tempo";
import type { Address } from "viem";
import { useTempoClients } from "./useTempoClients";
import { qk } from "@/lib/queryKeys";

export type ReceivePolicyData = Awaited<
  ReturnType<typeof Actions.receivePolicy.get>
>;

export function useReceivePolicy() {
  const { publicClient, address } = useTempoClients();

  return useQuery<ReceivePolicyData>({
    queryKey: qk.receivePolicy(address),
    enabled: !!publicClient && !!address,
    refetchInterval: 6_000,
    queryFn: async () => {
      if (!publicClient || !address) throw new Error("No client");
      return Actions.receivePolicy.get(publicClient, {
        account: address as Address,
      });
    },
  });
}
