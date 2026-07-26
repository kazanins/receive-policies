export const qk = {
  all: ["tempo"] as const,
  receivePolicy: (address?: string) =>
    [...qk.all, "receivePolicy", address?.toLowerCase()] as const,
  allowlist: (address?: string) =>
    [...qk.all, "allowlist", address?.toLowerCase()] as const,
  blockedReceipts: (address?: string) =>
    [...qk.all, "blockedReceipts", address?.toLowerCase()] as const,
};
