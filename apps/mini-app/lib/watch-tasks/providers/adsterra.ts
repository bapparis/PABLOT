import type {
  WatchProviderAdapter,
  WatchProviderVerification,
} from "./types";

export const adsterraProvider: WatchProviderAdapter = {
  provider: "adsterra",

  async verifyAttempt(): Promise<WatchProviderVerification> {
    /*
     * Adsterra verification will be connected here using the
     * provider's supported server-side tracking mechanism.
     */
    return {
      verified: false,
    };
  },
};
