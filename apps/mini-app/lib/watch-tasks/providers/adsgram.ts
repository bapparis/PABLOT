import type {
  WatchProviderAdapter,
  WatchProviderVerification,
} from "./types";

export const adsgramProvider: WatchProviderAdapter = {
  provider: "adsgram",

  async verifyAttempt(): Promise<WatchProviderVerification> {
    /*
     * AdsGram rewarded ads provide a client-side completion callback.
     * Server-side confirmation should be connected through the
     * AdsGram Reward URL before this adapter is allowed to confirm
     * an attempt.
     */
    return {
      verified: false,
    };
  },
};
