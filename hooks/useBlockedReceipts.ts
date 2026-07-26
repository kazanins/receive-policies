"use client";

import { useEffect, useState, useCallback } from "react";
import { Actions, Abis, Addresses } from "viem/tempo";
import { ReceivePolicyReceipt } from "ox/tempo";
import { zeroAddress, type Address } from "viem";
import { useTempoClients } from "./useTempoClients";
import { tokenByAddress, type TempoToken } from "@/lib/tokens";

export type BlockedReceipt = {
  key: string;
  tokenAddress: Address;
  token?: TempoToken;
  amount: bigint;
  blockedNonce: bigint;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  claimReceipt: `0x${string}`;
  held: bigint;
  claimPending: boolean;
  claimed: boolean;
  originator: Address;
  recoveryAuthority: Address;
  blockedReason: string;
};

function receiptKey(
  token: Address,
  receiver: Address,
  blockedNonce: bigint,
): string {
  return `${token.toLowerCase()}:${receiver.toLowerCase()}:${blockedNonce.toString()}`;
}

type BlockedArgs =
  | (Awaited<Parameters<Parameters<typeof Actions.receivePolicy.watchBlocked>[1]["onBlocked"]>[0]>)
  | undefined;

function decodeReceipt(claimReceipt: `0x${string}`): {
  originator: Address;
  recoveryAuthority: Address;
  blockedReason: string;
} {
  try {
    const decoded = ReceivePolicyReceipt.decode(claimReceipt);
    return {
      originator: decoded.originator,
      recoveryAuthority: decoded.recoveryAuthority,
      blockedReason: decoded.blockedReason,
    };
  } catch {
    return {
      originator: "0x0",
      recoveryAuthority: "0x0",
      blockedReason: "unknown",
    };
  }
}

function entryFromArgs(
  token: Address,
  receiver: Address,
  blockedNonce: bigint,
  amount: bigint,
  claimReceipt: `0x${string}`,
  blockNumber: bigint,
  transactionHash: `0x${string}`,
): BlockedReceipt | null {
  if (!claimReceipt || claimReceipt === "0x") return null;
  const { originator, recoveryAuthority, blockedReason } =
    decodeReceipt(claimReceipt);
  return {
    key: receiptKey(token, receiver, blockedNonce),
    tokenAddress: token,
    token: tokenByAddress(token),
    amount,
    blockedNonce,
    blockNumber,
    transactionHash,
    claimReceipt,
    held: amount,
    claimPending: false,
    claimed: false,
    originator,
    recoveryAuthority,
    blockedReason,
  };
}

export function useBlockedReceipts() {
  const { publicClient, connectorClient, address } = useTempoClients();
  const [receipts, setReceipts] = useState<BlockedReceipt[]>([]);

  const refreshHeld = useCallback(
    async (list: BlockedReceipt[]) => {
      if (!publicClient) return list;
      const next = await Promise.all(
        list.map(async (r) => {
          if (r.claimed) return r;
          try {
            const held = await Actions.receivePolicy.getBlockedBalance(
              publicClient,
              { receipt: r.claimReceipt },
            );
            return { ...r, held };
          } catch {
            return r;
          }
        }),
      );
      return next;
    },
    [publicClient],
  );

  // Historical + live subscription for the connected account.
  useEffect(() => {
    if (!publicClient || !address) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReceipts([]);
      return;
    }

    let active = true;
    const unwatchFns: Array<() => void> = [];

    async function seed() {
      try {
        const latest = await publicClient.getBlockNumber();
        const fromBlock = latest > 50_000n ? latest - 50_000n : 0n;
        const logs = await publicClient.getContractEvents({
          address: Addresses.receivePolicyGuard,
          abi: Abis.receivePolicyGuard,
          eventName: "TransferBlocked",
          args: { receiver: address as Address },
          fromBlock,
          toBlock: "latest",
        });
        const seeded: BlockedReceipt[] = [];
        for (const log of logs) {
          const args = log.args;
          if (!args) continue;
          const entry = entryFromArgs(
            (args.token ?? "0x0") as Address,
            (args.receiver ?? "0x0") as Address,
            (args.blockedNonce as bigint) ?? 0n,
            (args.amount as bigint) ?? 0n,
            (args.receipt as `0x${string}`) ?? "0x",
            log.blockNumber ?? 0n,
            (log.transactionHash ?? "0x") as `0x${string}`,
          );
          if (entry) seeded.push(entry);
        }
        if (!active) return;
        // newest first
        seeded.sort((a, b) => (a.blockNumber < b.blockNumber ? 1 : -1));
        setReceipts((prev) => mergeReceipts(prev, seeded));
        const refreshed = await refreshHeld(seeded);
        if (active) {
          setReceipts((prev) => mergeReceipts(prev, refreshed));
        }
      } catch {
        // best-effort; ignore range errors from the RPC
      }
    }

    void seed();

    const unwatchBlocked = Actions.receivePolicy.watchBlocked(
      publicClient,
      {
        onBlocked: (args: BlockedArgs, log) => {
          if (!args || !active) return;
          const receiver = args.receiver as Address;
          if (address && receiver.toLowerCase() !== address.toLowerCase())
            return;
          const entry = entryFromArgs(
            args.token as Address,
            receiver,
            (args.blockedNonce as bigint) ?? 0n,
            (args.amount as bigint) ?? 0n,
            args.claimReceipt as `0x${string}`,
            log?.blockNumber ?? 0n,
            (log?.transactionHash ?? "0x") as `0x${string}`,
          );
          if (entry) setReceipts((prev) => mergeReceipts(prev, [entry]));
        },
      },
    );
    unwatchFns.push(unwatchBlocked);

    const unwatchClaimed = Actions.receivePolicy.watchClaimed(
      publicClient,
      {
        onClaimed: (args) => {
          if (!active) return;
          const receiver = args.receiver as Address;
          if (address && receiver.toLowerCase() !== address.toLowerCase())
            return;
          const token = args.token as Address;
          const blockedNonce = (args.blockedNonce as bigint) ?? 0n;
          const key = receiptKey(token, receiver, blockedNonce);
          setReceipts((prev) =>
            prev.map((r) => (r.key === key ? { ...r, claimed: true, held: 0n } : r)),
          );
        },
      },
    );
    unwatchFns.push(unwatchClaimed);

    return () => {
      active = false;
      for (const fn of unwatchFns) {
        try {
          fn();
        } catch {
          /* ignore */
        }
      }
    };
  }, [publicClient, address, refreshHeld]);

  const claim = useCallback(
    async (receipt: BlockedReceipt, to: Address) => {
      if (!connectorClient) throw new Error("Wallet not connected");
      setReceipts((prev) =>
        prev.map((r) =>
          r.key === receipt.key ? { ...r, claimPending: true } : r,
        ),
      );
      try {
        await Actions.receivePolicy.claimSync(connectorClient, {
          to,
          receipt: receipt.claimReceipt,
        });
        setReceipts((prev) =>
          prev.map((r) =>
            r.key === receipt.key
              ? { ...r, claimPending: false, claimed: true, held: 0n }
              : r,
          ),
        );
      } catch (e) {
        setReceipts((prev) =>
          prev.map((r) =>
            r.key === receipt.key ? { ...r, claimPending: false } : r,
          ),
        );
        throw e;
      }
    },
    [connectorClient],
  );

  return {
    address,
    receipts,
    claim,
    hasConnector: !!connectorClient,
    zeroAddress,
  };
}

function mergeReceipts(
  prev: BlockedReceipt[],
  incoming: BlockedReceipt[],
): BlockedReceipt[] {
  const map = new Map<string, BlockedReceipt>();
  for (const r of prev) map.set(r.key, r);
  for (const r of incoming) {
    const existing = map.get(r.key);
    if (existing) {
      map.set(r.key, {
        ...existing,
        ...r,
        claimPending: existing.claimPending,
        claimed: existing.claimed || r.claimed,
      });
    } else {
      map.set(r.key, r);
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.blockNumber < b.blockNumber ? 1 : -1,
  );
}
