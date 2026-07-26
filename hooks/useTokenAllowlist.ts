"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Actions } from "viem/tempo";
import type { Address } from "viem";
import { useTempoClients, getWriteClient } from "./useTempoClients";
import { useReceivePolicy } from "./useReceivePolicy";
import { TESTNET_TOKENS, type TempoToken } from "@/lib/tokens";
import { qk } from "@/lib/queryKeys";

// When an account has no receive policy configured (`hasReceivePolicy: false`),
// the onchain storage returns raw id 0 for both senderPolicyId and
// tokenPolicyId, which the SDK maps to 'reject-all'. But when no policy is set,
// the receive-policy layer is skipped entirely and all transfers are allowed.
// Treat the unset case as 'allow-all' so we never persist a meaningless
// 'reject-all' sender policy when writing the next receive policy.
// Also, a 'reject-all' sender policy is degenerate (blocks everyone), so treat
// it as 'allow-all' to recover broken accounts.
function resolveSenderPolicyId(
  data: Awaited<ReturnType<typeof useReceivePolicy>["data"]>,
): "allow-all" | "reject-all" | bigint {
  if (!data?.hasReceivePolicy) return "allow-all";
  if (data.senderPolicyId === "reject-all") return "allow-all";
  return data.senderPolicyId;
}

// A receive policy's token filter can be one of:
//  - 'reject-all' (id 0): every token is blocked. Not a manageable allowlist.
//  - 'allow-all'  (id 1): every token is accepted. No allowlist yet.
//  - bigint (>=2): a custom TIP-403 policy. We assume/require a WHITELIST.
//
// TIP-403 policies are not enumerable onchain, but with only four testnet
// tokens we can read membership authoritatively by calling `isAuthorized` for
// each. For a whitelist, `isAuthorized == true` means "in the list" (allowed),
// so a token is allowed when `isAuthorized` returns true.
export function useTokenAllowlist() {
  const { publicClient, connectorClient, address, isClientReady } =
    useTempoClients();
  const receivePolicy = useReceivePolicy();
  const queryClient = useQueryClient();

  const tokenPolicyId = receivePolicy.data?.tokenPolicyId;
  const tokenPolicyType = receivePolicy.data?.tokenPolicyType;

  // Resolve to a bigint policy id when the user has a custom token filter.
  const customPolicyId =
    typeof tokenPolicyId === "bigint" ? tokenPolicyId : undefined;

  const allowlistQuery = useQuery({
    queryKey: qk.allowlist(address),
    enabled: !!publicClient && !!address && !!customPolicyId,
    refetchInterval: 8_000,
    queryFn: async () => {
      if (!publicClient || !customPolicyId) return new Set<string>();
      const results = await Promise.all(
        TESTNET_TOKENS.map(async (t) => {
          const authorized = await Actions.policy.isAuthorized(publicClient, {
            policyId: customPolicyId,
            user: t.address,
          });
          // whitelist semantics: allowed = authorized
          return [t.address.toLowerCase(), authorized] as const;
        }),
      );
      const set = new Set<string>();
      for (const [addr, allowed] of results) if (allowed) set.add(addr);
      return set;
    },
  });

  const allowlisted: Set<string> = allowlistQuery.data ?? new Set<string>();

  const state = useMemo(() => {
    // When no receive policy is configured, the onchain view returns raw id 0
    // for both senderPolicyId and tokenFilterId, which the SDK maps to
    // 'reject-all'. But hasReceivePolicy=false means the receive-policy layer
    // is skipped entirely and ALL transfers are allowed. Treat that case as
    // allow-all so a fresh account isn't misreported as blocking everything.
    const hasPolicy = receivePolicy.data?.hasReceivePolicy === true;
    const isRejectAll = hasPolicy && tokenPolicyId === "reject-all";
    const isAllowAll = !hasPolicy || tokenPolicyId === "allow-all" || !tokenPolicyId;
    const isCustomWhitelist =
      hasPolicy && !!customPolicyId && tokenPolicyType === "whitelist";
    const isCustomBlacklist =
      hasPolicy && !!customPolicyId && tokenPolicyType === "blacklist";
    return {
      hasReceivePolicy: hasPolicy,
      isRejectAll,
      isAllowAll,
      isCustomWhitelist,
      isCustomBlacklist,
      hasCustomPolicy: hasPolicy && !!customPolicyId,
      canEdit: isAllowAll || isCustomWhitelist,
    };
  }, [
    receivePolicy.data?.hasReceivePolicy,
    tokenPolicyId,
    tokenPolicyType,
    customPolicyId,
  ]);

  async function invalidateAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.receivePolicy() }),
      queryClient.invalidateQueries({ queryKey: qk.allowlist() }),
    ]);
  }

  // Select a token to allow. If no custom whitelist policy exists yet, create
  // one (initialized with this token) and wire it into the receive policy.
  // If a whitelist exists and a different token is currently allowed, remove
  // the old one and add the new one. `onStep` surfaces progress to the caller.
  async function selectToken(
    token: TempoToken,
    onStep?: (message: string) => void,
  ) {
    if (!address) throw new Error("Wallet not connected");
    const client = connectorClient ?? (await getWriteClient());

    const senderPolicyId = resolveSenderPolicyId(receivePolicy.data);
    const claimer = "self" as const;

    if (!customPolicyId) {
      onStep?.(`Step 1 of 2: Creating allowlist policy for ${token.symbol}…`);
      const created = await Actions.policy.createSync(client, {
        admin: address as Address,
        type: "whitelist",
        addresses: [token.address],
      });
      onStep?.("Step 2 of 2: Activating receive policy…");
      await Actions.receivePolicy.setSync(client, {
        senderPolicyId,
        tokenPolicyId: created.policyId,
        claimer,
      });
    } else {
      // Find the currently-allowed token (if any) and remove it first.
      const current = Array.from(allowlisted)[0];
      if (current && current !== token.address.toLowerCase()) {
        const oldToken = TESTNET_TOKENS.find(
          (t) => t.address.toLowerCase() === current,
        );
        onStep?.(
          `Step 1 of 2: Removing ${oldToken?.symbol ?? "old token"} from allowlist…`,
        );
        await Actions.policy.modifyWhitelistSync(client, {
          policyId: customPolicyId,
          address: oldToken!.address,
          allowed: false,
        });
        onStep?.(`Step 2 of 2: Allowing ${token.symbol}…`);
        await Actions.policy.modifyWhitelistSync(client, {
          policyId: customPolicyId,
          address: token.address,
          allowed: true,
        });
      } else {
        onStep?.(`Allowing ${token.symbol}…`);
        await Actions.policy.modifyWhitelistSync(client, {
          policyId: customPolicyId,
          address: token.address,
          allowed: true,
        });
      }
    }
    await invalidateAll();
  }

  // Reset the token filter back to allow-all (accept every token). Keeps the
  // existing sender policy and claimer.
  async function clearAllowlist() {
    const client = connectorClient ?? (await getWriteClient());
    const claimer = "self" as const;
    await Actions.receivePolicy.setSync(client, {
      senderPolicyId: "allow-all",
      tokenPolicyId: "allow-all",
      claimer,
    });
    await invalidateAll();
  }

  // If the existing token filter is a blacklist or reject-all, replace it with
  // a fresh empty whitelist policy so the user can use this manager.
  async function convertToWhitelist(
    onStep?: (message: string) => void,
  ) {
    if (!address) throw new Error("Wallet not connected");
    const client = connectorClient ?? (await getWriteClient());
    const senderPolicyId = resolveSenderPolicyId(receivePolicy.data);
    const claimer = "self" as const;
    onStep?.("Step 1 of 2: Creating a new whitelist policy…");
    const created = await Actions.policy.createSync(client, {
      admin: address as Address,
      type: "whitelist",
    });
    onStep?.("Step 2 of 2: Activating receive policy…");
    await Actions.receivePolicy.setSync(client, {
      senderPolicyId,
      tokenPolicyId: created.policyId,
      claimer,
    });
    await invalidateAll();
  }

  return {
    address,
    isClientReady,
    allowlisted,
    isLoading: allowlistQuery.isLoading || receivePolicy.isLoading,
    isFetching: allowlistQuery.isFetching,
    ...state,
    selectToken,
    clearAllowlist,
    convertToWhitelist,
  };
}
