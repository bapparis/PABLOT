import type {
  WatchProviderAdapter,
  WatchProviderVerification,
} from "./types";

export const monetagProvider: WatchProviderAdapter = {
  provider: "monetag",

  async verifyAttempt(): Promise<WatchProviderVerification> {
    /*
     * Monetag verification will be connected here using the
     * provider's server-side/postback mechanism.
     */
    return {
      verified: false,
    };
  },
};
