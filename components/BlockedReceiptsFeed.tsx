"use client";

import { Button, Card, EmptyState, SectionTitle } from "./ui";
import {
  useBlockedReceipts,
  type BlockedReceipt,
} from "@/hooks/useBlockedReceipts";
import { formatTokenAmount, shortAddress } from "@/lib/tokens";
import { useToast } from "./Toast";
import { zeroAddress, type Address } from "viem";

export function BlockedReceiptsFeed() {
  const { receipts, claim, address, hasConnector } = useBlockedReceipts();
  const { notify } = useToast();

  const pending = receipts.filter(
    (r) =>
      !r.claimed &&
      r.held > 0n &&
      !!address &&
      getClaimStatus(r, address).canClaim,
  );
  const claimed = receipts.filter((r) => r.claimed || r.held === 0n);

  async function handleClaim(
    r: BlockedReceipt,
    to: Address,
    label: string,
  ) {
    try {
      await claim(r, to);
      notify(
        `${label} ${formatTokenAmount(r.held, r.token)} ${r.token?.symbol ?? ""}`,
        "success",
      );
    } catch (e) {
      notify(`Claim failed: ${(e as Error)?.message ?? "unknown"}`, "error");
    }
  }

  return (
    <Card className="flex flex-col lg:h-[var(--left-h)] lg:overflow-hidden">
      <SectionTitle
        title="Blocked receipts"
        subtitle="Live TransferBlocked events from ReceivePolicyGuard"
        action={
          <span className="inline-flex items-center gap-1.5 ts-body-sm text-text-tertiary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-icon-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-icon-success" />
            </span>
            live
          </span>
        }
      />

      <div className="flex-1 min-h-0 overflow-y-auto">
        {!address ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState title="Connect a wallet to watch blocked receipts" />
          </div>
        ) : pending.length === 0 && claimed.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState title="No blocked receipts yet" icon={<GuardIcon />}>
              When someone sends you a token your policy blocks, the transfer
              still succeeds but funds land here for you to reclaim.
            </EmptyState>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.length > 0 && (
              <div className="ts-body-sm font-semibold text-text-secondary">
                Held ({pending.length})
              </div>
            )}
            {pending.map((r) => (
              <ReceiptRow
                key={r.key}
                r={r}
                disabled={!hasConnector}
                onClaimToSelf={() =>
                  handleClaim(r, address as Address, `Claimed`)
                }
                onReturnToSender={() =>
                  handleClaim(
                    r,
                    r.originator,
                    `Returned to ${shortAddress(r.originator)}`,
                  )
                }
              />
            ))}

            {claimed.length > 0 && (
              <div className="mt-2 ts-body-sm font-semibold text-text-tertiary">
                Resolved ({claimed.length})
              </div>
            )}
            {claimed.map((r) => (
              <ReceiptRow
                key={r.key}
                r={r}
                resolved
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// Determine whether the connected account can claim this receipt.
// - recoveryAuthority == address(0): only the originator can claim, and the
//   claim is always a reroute (the destination's receive policy must accept
//   the token). If originator == receiver, the reroute fails because the
//   receiver's own policy blocks the token.
// - recoveryAuthority != address(0): only that address can claim.
function getClaimStatus(
  r: BlockedReceipt,
  connectedAddress: string,
): {
  canClaim: boolean;
  reason?: string;
} {
  if (r.recoveryAuthority.toLowerCase() === zeroAddress.toLowerCase()) {
    // recoveryAuthority == address(0): originator-authorized
    if (r.originator.toLowerCase() === connectedAddress.toLowerCase()) {
      // The connected account IS the originator, but the claim is a reroute.
      // The destination's receive policy must accept the token. Since the
      // token was blocked by the receiver's policy, claiming to the receiver
      // will fail. Claiming to the originator (self) also fails if the
      // originator == receiver. The user must reset their allowlist first.
      return {
        canClaim: false,
        reason:
          "Recovery authority is the sender. Reset your allowlist to allow-all first, then claim.",
      };
    }
    return {
      canClaim: false,
      reason: `Only the sender (${shortAddress(r.originator)}) can claim this receipt.`,
    };
  }
  // recoveryAuthority != address(0)
  if (r.recoveryAuthority.toLowerCase() === connectedAddress.toLowerCase()) {
    return { canClaim: true };
  }
  return {
    canClaim: false,
    reason: `Only ${shortAddress(r.recoveryAuthority)} can claim this receipt.`,
  };
}

function ReceiptRow({
  r,
  disabled,
  resolved,
  onClaimToSelf,
  onReturnToSender,
}: {
  r: BlockedReceipt;
  disabled?: boolean;
  resolved?: boolean;
  onClaimToSelf?: () => void;
  onReturnToSender?: () => void;
}) {
  const symbol = r.token?.symbol ?? "TIP-20";
  const amount = formatTokenAmount(resolved ? r.amount : r.held, r.token);

  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-[var(--radius-md)] border border-border-subtle bg-bg-secondary px-4 py-3 ${resolved ? "opacity-60" : ""}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="ts-body-strong text-text-primary">
              {amount} {symbol}
            </span>
            <span className="ts-data-sm text-text-tertiary">
              {resolved ? "claimed" : "held"}
            </span>
          </div>
          <div className="ts-data-sm truncate text-text-tertiary">
            from {shortAddress(r.originator)}
          </div>
          {r.transactionHash && r.transactionHash !== "0x" && (
            <a
              href={`https://explore.testnet.tempo.xyz/receipt/${r.transactionHash}`}
              target="_blank"
              rel="noreferrer"
              className="ts-data-sm text-text-link hover:underline"
            >
              tx {shortAddress(r.transactionHash)}
            </a>
          )}
        </div>
      </div>
      {!resolved && (
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            loading={r.claimPending}
            disabled={disabled}
            onClick={onReturnToSender}
            title={`Send held funds back to ${r.originator}`}
          >
            <ReturnIcon />
            Return
          </Button>
          <Button
            size="sm"
            variant="primary"
            loading={r.claimPending}
            disabled={disabled}
            onClick={onClaimToSelf}
            title="Resume the delivery to your own balance"
          >
            Claim
          </Button>
        </div>
      )}
    </div>
  );
}

function ReturnIcon() {
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
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 5 5v6" />
    </svg>
  );
}

function GuardIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 22s8-4 8-10V6l-8-3-8 3v6c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
