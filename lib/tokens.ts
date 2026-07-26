import type { Address } from "viem";

export type TempoToken = {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
};

// Predeployed TIP-20 test stablecoins on Tempo Testnet (Moderato).
// The faucet funds accounts with exactly these four tokens, so they are the
// only tokens that can be sent on testnet. Addresses from the Tempo docs
// predeploys table.
export const TESTNET_TOKENS: TempoToken[] = [
  {
    address: "0x20c0000000000000000000000000000000000000",
    name: "Path USD",
    symbol: "pathUSD",
    decimals: 6,
  },
  {
    address: "0x20c0000000000000000000000000000000000001",
    name: "Alpha USD",
    symbol: "alphaUSD",
    decimals: 6,
  },
  {
    address: "0x20c0000000000000000000000000000000000002",
    name: "Beta USD",
    symbol: "betaUSD",
    decimals: 6,
  },
  {
    address: "0x20c0000000000000000000000000000000000003",
    name: "Theta USD",
    symbol: "thetaUSD",
    decimals: 6,
  },
];

export const TESTNET_TOKEN_MAP: Record<string, TempoToken> = Object.fromEntries(
  TESTNET_TOKENS.map((t) => [t.address.toLowerCase(), t]),
);

export function tokenByAddress(address: string): TempoToken | undefined {
  return TESTNET_TOKEN_MAP[address.toLowerCase()];
}

export function formatTokenAmount(amount: bigint, token?: TempoToken): string {
  const decimals = token?.decimals ?? 6;
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const divisor = 10n ** BigInt(decimals);
  const whole = abs / divisor;
  const frac = abs % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  const value = fracStr ? `${whole.toString()}.${fracStr}` : whole.toString();
  return `${negative ? "-" : ""}${value}`;
}

export function shortAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
