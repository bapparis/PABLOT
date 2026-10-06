import { adsgramProvider } from "./adsgram";
import { adsterraProvider } from "./adsterra";
import { monetagProvider } from "./monetag";
import type { WatchProvider, WatchProviderAdapter } from "./types";

const providers: Record<WatchProvider, WatchProviderAdapter> = {
  monetag: monetagProvider,
  adsgram: adsgramProvider,
  adsterra: adsterraProvider,
};

export function getWatchProvider(
  provider: WatchProvider
): WatchProviderAdapter {
  return providers[provider];
}
