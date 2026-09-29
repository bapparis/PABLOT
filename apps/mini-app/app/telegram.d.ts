interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramWebAppUser;
    query_id?: string;
    auth_date?: number;
    hash?: string;
  };

  ready(): void;
  expand(): void;

  colorScheme: "light" | "dark";
  themeParams: Record<string, string>;

  close(): void;
}

interface TelegramGlobal {
  WebApp: TelegramWebApp;
}

interface Window {
  Telegram?: TelegramGlobal;
}
