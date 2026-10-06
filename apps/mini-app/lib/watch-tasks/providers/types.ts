export type WatchProvider =
  | "monetag"
  | "adsgram"
  | "adsterra";

export interface WatchProviderVerification {
  verified: boolean;
  providerAttemptId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface WatchProviderAdapter {
  readonly provider: WatchProvider;

  verifyAttempt(input: {
    telegramId: number;
    attemptId: string;
    providerAttemptId?: string | null;
    ymid?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<WatchProviderVerification>;
}
