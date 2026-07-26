# Receive Policies Demo

A demo web app for [Tempo](https://tempo.xyz) Receive Policies (TIP-403). Configure a token allowlist, watch blocked receipts arrive in real time, and reclaim or return held funds.

## What it does

- **Token allowlist**: Select one token to accept. All others are blocked and redirected to `ReceivePolicyGuard`.
- **Blocked receipts feed**: Live `TransferBlocked` events from the guard contract, with held balances and claim eligibility.
- **Claim or return**: Reclaim held funds to your own balance, or return them to the sender.
- **Receive policy summary**: View your current token filter and recovery authority onchain.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- [Wagmi v3](https://wagmi.sh) + [viem](https://viem.sh) with Tempo Actions
- [Tempo Accounts SDK](https://docs.tempo.xyz) (`tempoWallet` connector)
- [Tailwind CSS v4](https://tailwindcss.com) with Potemkin design system tokens
- React 19

## Getting started

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install --legacy-peer-deps
```

The `--legacy-peer-deps` flag is required because the Tempo Accounts SDK declares a peer dependency on `@wagmi/core >=3.4.3`.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

## Configuration

The app connects to **Tempo Testnet (Moderato)** by default:

| Setting | Value |
|---------|-------|
| Chain ID | 42431 |
| RPC | `https://rpc.moderato.tempo.xyz` |
| Fee token | alphaUSD (`0x20c0000000000000000000000000000000000001`) |
| TIP-403 Registry | `0x403c000000000000000000000000000000000000` |
| ReceivePolicyGuard | `0xB10C000000000000000000000000000000000000` |

### Predeployed tokens

| Symbol | Address |
|--------|---------|
| pathUSD | `0x20c0000000000000000000000000000000000000` |
| alphaUSD | `0x20c0000000000000000000000000000000000001` |
| betaUSD | `0x20c0000000000000000000000000000000000002` |
| thetaUSD | `0x20c0000000000000000000000000000000000003` |

Fund your account at the [Tempo Testnet Faucet](https://docs.tempo.xyz/quickstart/faucet).

## How it works

### Token allowlist

The allowlist uses a single-select whitelist policy. Selecting a token creates a TIP-403 whitelist policy (if none exists) and wires it into your receive policy. All other tokens are blocked by the guard. Clicking the selected token again resets to allow-all.

### Blocked receipts

When someone sends you a blocked token, the transfer still succeeds but funds are held by `ReceivePolicyGuard`. The app watches `TransferBlocked` events in real time and decodes each receipt to determine:

- The token and amount held
- The originator (sender)
- The recovery authority (who can claim)

Only receipts the connected wallet can claim are shown. Resolved receipts appear in a separate section.

### Claim and return

- **Claim**: Resume delivery to your own balance.
- **Return**: Send held funds back to the originator.

Both use `Actions.receivePolicy.claimSync` from viem's Tempo Actions.

## Project structure

```
app/
  globals.css        Potemkin design tokens + Tailwind v4 theme mapping
  layout.tsx         Root layout (dark theme default)
  page.tsx           Main page (client component, ResizeObserver for height alignment)
  providers.tsx      WagmiProvider + QueryClientProvider + ToastProvider
components/
  BlockedReceiptsFeed.tsx   Live blocked receipts with claim/return
  ConnectButton.tsx         Tempo Wallet connection + copyable address
  ReceivePolicySummary.tsx  Onchain policy state summary
  TokenBlocklistManager.tsx Single-select token allowlist UI
  ThemeToggle.tsx           Light/dark theme switcher
  Toast.tsx                 Toast notification system
  ui.tsx                    Shared UI primitives (Card, Button, Badge, etc.)
hooks/
  useBlockedReceipts.ts     TransferBlocked event subscription + claim logic
  useMounted.ts             SSR hydration gate
  useReceivePolicy.ts       Read receivePolicy.get
  useTempoClients.ts        Bundles publicClient + connectorClient + account
  useTokenAllowlist.ts      Allowlist state + select/clear/convert actions
lib/
  queryKeys.ts              React Query key factory
  tokens.ts                 Token metadata + formatting helpers
  wagmi.ts                  Wagmi config with tempoWallet connector
```

## License

MIT
