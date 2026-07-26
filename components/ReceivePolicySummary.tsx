"use client";

import { Badge, Card, SectionTitle, Spinner } from "./ui";
import { useReceivePolicy } from "@/hooks/useReceivePolicy";
import { shortAddress } from "@/lib/tokens";

export function ReceivePolicySummary() {
  const { data, isLoading, isError } = useReceivePolicy();

  return (
    <Card>
      <SectionTitle
        title="Receive policy"
        subtitle="Your account-level receive policy on the TIP-403 registry"
        action={isLoading ? <Spinner /> : undefined}
      />

      {isLoading ? (
        <p className="ts-body-sm text-text-secondary">Loading…</p>
      ) : isError ? (
        <p className="ts-body-sm text-text-danger">Failed to load policy.</p>
      ) : !data?.hasReceivePolicy ? (
        <div className="flex items-center gap-2">
          <Badge tone="neutral">No policy set</Badge>
          <span className="ts-body-sm text-text-secondary">
            All tokens and senders are accepted.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Token filter"
            value={formatPolicyRef(data.tokenPolicyId)}
          />
          <Field label="Recovery authority" value={formatClaimer(data)} mono />
        </div>
      )}
    </Card>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-secondary p-3">
      <div className="ts-body-sm text-text-tertiary">{label}</div>
      <div className="mt-1">
        <span
          className={`ts-body-strong text-text-primary ${mono ? "ts-data-sm" : ""}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function formatPolicyRef(
  id: "reject-all" | "allow-all" | bigint | undefined,
): string {
  if (id === undefined) return "—";
  if (id === "allow-all") return "allow-all";
  if (id === "reject-all") return "reject-all";
  return `policy #${id.toString()}`;
}

function formatClaimer(data: Awaited<ReturnType<typeof useReceivePolicy>["data"]>): string {
  if (!data) return "—";
  if (data.claimer === "self") return "self";
  if (data.claimer === "sender") return "sender (originator)";
  return shortAddress(data.recoveryAuthority);
}
