"use client";

import { useState } from "react";
import { Button, Card, EmptyState, SectionTitle, Spinner } from "./ui";
import { useTokenAllowlist } from "@/hooks/useTokenAllowlist";
import { TESTNET_TOKENS, type TempoToken } from "@/lib/tokens";
import { useToast } from "./Toast";

export function TokenBlocklistManager() {
  const allowlist = useTokenAllowlist();
  const { notify } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const {
    address,
    isClientReady,
    allowlisted,
    isLoading,
    canEdit,
    isRejectAll,
    isAllowAll,
    isCustomWhitelist,
    isCustomBlacklist,
    hasReceivePolicy,
  } = allowlist;

  if (!address) {
    return (
      <Card>
        <SectionTitle
          title="Token allowlist"
          subtitle="Select one token to accept. All others are blocked."
        />
        <EmptyState title="Connect a wallet to configure your allowlist" />
      </Card>
    );
  }

  async function wrap(
    key: string,
    fn: (onStep: (message: string) => void) => Promise<void>,
    okMsg: string,
  ) {
    setBusy(key);
    try {
      await fn((message) => notify(message, "info"));
      notify(okMsg, "success");
    } catch (e) {
      const err = e as Error & { shortMessage?: string; cause?: { message?: string } };
      console.error("Transaction error:", err);
      const detail = err.cause?.message ?? err.message ?? "unknown";
      const msg = err.shortMessage ?? detail;
      const isInsufficientFunds =
        /insufficient funds|exceeds the balance|total: balance/i.test(
          `${err.shortMessage ?? ""} ${detail}`,
        );
      const isWebAuthn = /WebAuthn|publickey|credential/i.test(
        `${err.shortMessage ?? ""} ${detail}`,
      );
      const isTlsError = /TLS certificate|insecure context/i.test(
        `${err.shortMessage ?? ""} ${detail}`,
      );
      const hint = isTlsError
        ? " WebAuthn requires a trusted HTTPS certificate. Run `npm run dev` (it uses mkcert)."
        : isWebAuthn
          ? " WebAuthn failed. Make sure dev is running over HTTPS (`npm run dev`)."
          : isInsufficientFunds
            ? " Use the faucet at the top of the page to fund your account."
            : "";
      notify(`Transaction failed: ${msg}${hint}`, "error");
    } finally {
      setBusy(null);
    }
  }

  const currentAllowed = Array.from(allowlisted)[0];

  return (
    <Card>
      <SectionTitle
        title="Token allowlist"
        subtitle="Select one token to accept. All others are blocked and redirected to ReceivePolicyGuard."
        action={
          <div className="flex items-center gap-2">
            {isLoading && <Spinner />}
            {hasReceivePolicy && (
              <Button
                size="sm"
                variant="outline"
                loading={busy === "clear"}
                onClick={() =>
                  wrap(
                    "clear",
                    () => allowlist.clearAllowlist(),
                    "Receive policy reset to defaults",
                  )
                }
              >
                Reset
              </Button>
            )}
          </div>
        }
      />

      {isRejectAll && (
        <Banner tone="danger">
          Your token filter is set to <strong>reject-all</strong>. Every token is
          blocked. Convert it to an allowlist to continue.
        </Banner>
      )}
      {isCustomBlacklist && (
        <Banner tone="warning">
          Your token filter is a <strong>blacklist</strong>. This manager works
          with allowlists. Convert it to keep going.
        </Banner>
      )}

      <div className="flex flex-wrap gap-2">
        {TESTNET_TOKENS.map((t) => {
          const inWhitelist = allowlisted.has(t.address.toLowerCase());
          // Display logic accounts for overall policy state, not just set
          // membership. When no policy is set (allow-all), every token is
          // accepted. When reject-all, every token is blocked. Only for a
          // custom whitelist does set membership determine the chip state.
          const isAllowed = isRejectAll
            ? false
            : isAllowAll
              ? true
              : inWhitelist;
          // Click logic: only treat a click as "deselect" when the token is
          // explicitly in the whitelist. Clicking an allow-all chip starts a
          // new allowlist rather than resetting (it's already allow-all).
          const isExplicitlyAllowed = isCustomWhitelist && inWhitelist;
          return (
            <TokenChip
              key={t.address}
              token={t}
              allowed={isAllowed}
              disabled={!canEdit || !isClientReady}
              loading={busy === t.address}
              onToggle={() => {
                if (isExplicitlyAllowed) {
                  // Clicking the currently-allowed token resets to allow-all
                  wrap(
                    t.address,
                    () => allowlist.clearAllowlist(),
                    `Reset to allow-all`,
                  );
                } else {
                  wrap(
                    t.address,
                    (onStep) => allowlist.selectToken(t, onStep),
                    `Now allowing only ${t.symbol}`,
                  );
                }
              }}
            />
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {isAllowAll && (
          <span className="ts-body-sm text-text-tertiary">
            No token selected. All tokens are accepted. Pick one to allow only
            that token.
          </span>
        )}
        {isCustomWhitelist && currentAllowed && (
          <span className="ts-body-sm text-text-tertiary">
            Only{" "}
            <strong className="text-text-secondary">
              {TESTNET_TOKENS.find(
                (t) => t.address.toLowerCase() === currentAllowed,
              )?.symbol ?? "selected token"}
            </strong>{" "}
            is accepted. Click the selected token to reset.
          </span>
        )}
        {isCustomWhitelist && !currentAllowed && (
          <span className="ts-body-sm text-text-tertiary">
            Allowlist policy is set but empty. Pick a token to allow.
          </span>
        )}
        {isCustomBlacklist && (
          <Button
            size="sm"
            variant="secondary"
            loading={busy === "convert"}
            onClick={() =>
              wrap(
                "convert",
                (onStep) => allowlist.convertToWhitelist(onStep),
                "Switched to a new whitelist policy",
              )
            }
          >
            Convert to allowlist
          </Button>
        )}
        {isRejectAll && (
          <Button
            size="sm"
            variant="secondary"
            loading={busy === "convert"}
            onClick={() =>
              wrap(
                "convert",
                (onStep) => allowlist.convertToWhitelist(onStep),
                "Switched to a new whitelist policy",
              )
            }
          >
            Convert to allowlist
          </Button>
        )}
      </div>
    </Card>
  );
}

function TokenChip({
  token,
  allowed,
  disabled,
  loading,
  onToggle,
}: {
  token: TempoToken;
  allowed: boolean;
  disabled: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onToggle}
      className={`group inline-flex items-center gap-2 rounded-[var(--radius-full)] border px-3 py-1.5 text-[13px] font-medium transition-colors duration-[var(--duration-normal)] focus-ring disabled:cursor-not-allowed disabled:opacity-50 ${
        allowed
          ? "border-transparent bg-bg-inverse text-text-inverse"
          : "border-border-default bg-bg-secondary text-text-tertiary hover:border-border-strong hover:text-text-secondary"
      }`}
      title={token.address}
    >
      {loading ? "…" : token.symbol}
    </button>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "danger" | "warning";
  children: React.ReactNode;
}) {
  const cls =
    tone === "danger"
      ? "bg-bg-danger/10 text-text-danger border-border-default"
      : "bg-bg-secondary text-text-secondary border-border-default";
  return (
    <div
      className={`mb-4 rounded-[var(--radius-md)] border px-3 py-2 ts-body-sm ${cls}`}
    >
      {children}
    </div>
  );
}
