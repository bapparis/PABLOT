interface AdsgramAdController {
  show(): Promise<unknown>;
}

interface Adsgram {
  init(options: { blockId: string }): AdsgramAdController;
}

declare const Adsgram: Adsgram;
