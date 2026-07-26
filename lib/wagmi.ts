import { http } from "wagmi";
import { createConfig } from "wagmi";
import { tempoWallet } from "wagmi/connectors";
import { Dialog } from "accounts";
import { tempoTestnet as baseTestnet } from "viem/tempo/chains";

// The faucet funds accounts with alphaUSD, so use it as the default fee token.
export const tempoTestnetChain = baseTestnet.extend({
  feeToken: "0x20c0000000000000000000000000000000000001",
});

// Always use iframe. The SDK sets `allow='publickey-credentials-get ${origin}'`
// on the cross-origin iframe, which Safari 17+ supports when the parent page
// is a secure context. `npm run dev` runs over HTTPS via mkcert (see
// `package.json`), and production is behind a TLS-terminating proxy, so
// WebAuthn in the iframe works in both environments.
export const config = createConfig({
  chains: [tempoTestnetChain],
  connectors: [tempoWallet({ dialog: Dialog.iframe() })],
  multiInjectedProviderDiscovery: false,
  ssr: true,
  pollingInterval: 2_000,
  transports: {
    [tempoTestnetChain.id]: http(),
  },
});

declare module "wagmi" {
  export interface Register {
    config: typeof config;
  }
}
