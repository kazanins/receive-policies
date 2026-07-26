"use client";

import { useMemo } from "react";
import { useAccount, usePublicClient, useConnectorClient } from "wagmi";
import { tempoTestnetChain } from "@/lib/wagmi";
import { useMounted } from "./useMounted";

const CHAIN_ID = tempoTestnetChain.id;

// Bundles the clients every Tempo action needs. `publicClient` is used for
// reads (get, isAuthorized, watchBlocked, getBlockedBalance) and `connectorClient`
// for writes (create, modifyBlacklist, set, claim).
//
// Wagmi rehydrates connector state from storage on the client, so `useAccount()`
// can return isConnected=true on the first client render while returning false
// on the server. To keep SSR and first client render identical (and avoid
// hydration mismatches in every downstream component), we gate `address` and
// `isConnected` behind a mounted flag. Until mounted, the hook reports no
// connection, so all components render their "connect a wallet" branch on both
// server and first client render.
export function useTempoClients() {
  const mounted = useMounted();
  const account = useAccount();
  const publicClient = usePublicClient({ chainId: CHAIN_ID });
  const { data: connectorClient, status: clientStatus } = useConnectorClient({
    chainId: CHAIN_ID,
  });

  const address = mounted ? account.address : undefined;
  const isConnected = mounted ? account.isConnected : false;

  return useMemo(
    () => ({
      address: address ?? undefined,
      isConnected,
      status: account.status,
      publicClient,
      connectorClient,
      isClientReady: mounted && clientStatus === "success" && !!connectorClient,
    }),
    [mounted, account, address, isConnected, publicClient, connectorClient, clientStatus],
  );
}
