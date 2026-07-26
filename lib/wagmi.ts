import { http } from "wagmi";
import { createConfig } from "wagmi";
import { tempoWallet } from "wagmi/connectors";
import { tempoTestnet as baseTestnet } from "viem/tempo/chains";

// The faucet funds accounts with alphaUSD, so use it as the default fee token.
export const tempoTestnetChain = baseTestnet.extend({
  feeToken: "0x20c0000000000000000000000000000000000001",
});

export const config = createConfig({
  chains: [tempoTestnetChain],
  connectors: [tempoWallet()],
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
