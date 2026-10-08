"use client";

import { useEffect, useState } from "react";
import { initTelegramWebApp } from "@/lib/telegram";

interface User {
  id: string;
  telegram_id: number;
  pablot_id: string;
  username: string | null;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  pp_balance: number;
  total_earned: number;
  language: "en" | "fr";
  notifications_enabled: boolean;
}

interface TelegramProfileProps {
  onUserLoaded?: (user: User) => void;
}

export default function TelegramProfile({
  onUserLoaded,
}: TelegramProfileProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        const webApp = initTelegramWebApp();

        if (!webApp?.initData) {
          setError("Open PABLOT from Telegram.");
          return;
        }

        const response = await fetch("/api/telegram/user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            initData: webApp.initData,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "Unable to load your PABLOT account."
          );
        }

        setUser(data.user);
        onUserLoaded?.(data.user);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your PABLOT account."
        );
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  if (loading) {
    return (
      <section className="balance-card rounded-[28px] p-6">
        <div className="animate-pulse">
          <div className="h-20 w-20 rounded-full bg-white/10" />

          <div className="mt-4 h-5 w-40 rounded bg-white/10" />

          <div className="mt-2 h-4 w-28 rounded bg-white/10" />
        </div>
      </section>
    );
  }

  if (error || !user) {
    return (
      <section className="balance-card rounded-[28px] p-6">
        <p className="text-sm font-semibold text-red-300">
          {error || "Unable to load your PABLOT account."}
        </p>
      </section>
    );
  }

  const displayName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ");

  const username = user.username
    ? `@${user.username}`
    : "No username";

  return (
    <section className="balance-card relative overflow-hidden rounded-[28px] p-6">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative flex items-center gap-4">
        {user.photo_url ? (
          <img
            src={user.photo_url}
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
            TELEGRAM MEMBER
          </div>
        </div>
      </div>

      <div className="relative mt-6 rounded-2xl border border-white/6 bg-black/10 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40">
            PABLOT ID
          </span>

          <span className="text-sm font-black tracking-wider">
            {user.pablot_id}
          </span>
        </div>
      </div>
    </section>
  );
}
