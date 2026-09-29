"use client";

import { useEffect, useState } from "react";
import { initTelegramWebApp } from "@/lib/telegram";

interface User {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export default function TelegramProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    const webApp = initTelegramWebApp();

    if (!webApp) {
      return;
    }

    setIsTelegram(true);

    if (webApp.initDataUnsafe.user) {
      setUser(webApp.initDataUnsafe.user);
    }
  }, []);

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ")
    : "Telegram User";

  const username = user?.username
    ? `@${user.username}`
    : "No username";

  const avatar = user?.photo_url;

  return (
    <section className="balance-card relative overflow-hidden rounded-[28px] p-6">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative flex items-center gap-4">
        {avatar ? (
          <img
            src={avatar}
            alt={displayName}
            className="h-20 w-20 shrink-0 rounded-full border border-white/10 object-cover shadow-xl"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-3xl shadow-xl">
            👤
          </div>
        )}

        <div className="min-w-0">
          <p className="text-xl font-black">
            {displayName}
          </p>

          <p className="mt-1 text-sm text-white/40">
            {username}
          </p>

          <div className="mt-2 inline-flex rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
            {isTelegram ? "TELEGRAM MEMBER" : "PREVIEW MODE"}
          </div>
        </div>
      </div>

      <div className="relative mt-6 rounded-2xl border border-white/6 bg-black/10 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40">
            PABLOT ID
          </span>

          <span className="text-sm font-black tracking-wider">
            PB-{user ? String(user.id).slice(-6).padStart(6, "0") : "123456"}
          </span>
        </div>
      </div>
    </section>
  );
}
