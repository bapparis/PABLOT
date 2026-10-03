"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  telegram_id: number;
  pablot_id: string | null;
  username: string | null;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  pp_balance: number;
  total_earned: number;
  language: string;
  notifications_enabled: boolean;
  created_at: string;
};

export default function AdminUsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadUsers(value = "") {
    setLoading(true);
    setError("");

    try {
      const query = value.trim()
        ? `?search=${encodeURIComponent(value.trim())}`
        : "";

      const response = await fetch(`/api/admin/users${query}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load users.");
      }

      setUsers(data.users ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-10">
      <div className="mb-7">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#59D9FF]">
          PABLOT CONTROL
        </p>

        <h1 className="mt-2 text-3xl font-black">Users</h1>

        <p className="mt-2 text-sm text-white/45">
          Select a user to inspect their account and activity.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          loadUsers(search);
        }}
        className="mb-6 flex gap-3"
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search users..."
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#0d141e] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#59D9FF]/50"
        />

        <button
          type="submit"
          className="rounded-2xl bg-[#59D9FF] px-5 py-3 text-sm font-black text-[#061018]"
        >
          Search
        </button>
      </form>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mb-3 text-xs font-bold uppercase tracking-wider text-white/30">
        {loading ? "Loading users..." : `${users.length} users`}
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a111a]">
        {users.length === 0 && !loading ? (
          <div className="p-10 text-center text-sm text-white/40">
            No users found.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {users.map((user, index) => {
              const fullName = `${user.first_name} ${
                user.last_name ?? ""
              }`.trim();

              return (
                <a
                  key={user.id}
                  href={`/admin/users/${user.id}`}
                  className="flex min-h-[72px] items-center gap-4 px-5 py-3 transition hover:bg-white/[0.03] active:bg-white/[0.05]"
                >
                  <span className="w-7 shrink-0 text-sm font-black text-white/25">
                    {index + 1}
                  </span>

                  {user.photo_url ? (
                    <img
                      src={user.photo_url}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#59D9FF]/10 font-black text-[#59D9FF]">
                      {user.first_name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">
                      {fullName}
                    </p>

                    <p className="mt-1 truncate text-xs text-white/35">
                      {user.username
                        ? `@${user.username}`
                        : user.pablot_id ?? "No username"}
                    </p>
                  </div>

                  <span className="text-white/20">›</span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
