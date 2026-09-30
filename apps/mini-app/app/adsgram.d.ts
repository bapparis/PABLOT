interface AdsgramAdController {
  show(): Promise<{
    done: boolean;
    description: string;
    state: "load" | "render" | "playing" | "destroy";
    error: boolean;
  }>;
}

interface AdsgramInitOptions {
  blockId: string;
  debug?: boolean;
  debugConsole?: boolean;
  debugBannerType?: "FullscreenMedia" | "RewardedVideo";
}

interface Adsgram {
  init(options: AdsgramInitOptions): AdsgramAdController;
}

declare const Adsgram: Adsgram;
