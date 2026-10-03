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

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString();
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-10">
      <div className="mb-7">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#59D9FF]">
          PABLOT CONTROL
        </p>
        <h1 className="mt-2 text-3xl font-black">Users</h1>
        <p className="mt-2 text-sm text-white/45">
          Search and inspect PABLOT user accounts and activity.
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
          placeholder="Search username, PABLOT ID or name"
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

      <div className="mb-4 text-sm text-white/45">
        {loading ? "Loading users..." : `${users.length} users shown`}
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a111a]">
        {users.length === 0 && !loading ? (
          <div className="p-10 text-center text-sm text-white/40">
            No users found.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-4 p-5 transition hover:bg-white/[0.02] md:flex-row md:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  {user.photo_url ? (
                    <img
                      src={user.photo_url}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#59D9FF]/10 font-black text-[#59D9FF]">
                      {user.first_name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate font-bold">
                      {user.first_name} {user.last_name ?? ""}
                    </p>
                    <p className="truncate text-xs text-white/40">
                      {user.username ? `@${user.username}` : "No username"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm md:flex md:items-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/30">
                      PABLOT ID
                    </p>
                    <p className="mt-1 font-bold">
                      {user.pablot_id ?? "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/30">
                      Balance
                    </p>
                    <p className="mt-1 font-bold text-[#59D9FF]">
                      {user.pp_balance.toLocaleString()} PP
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/30">
                      Earned
                    </p>
                    <p className="mt-1 font-bold">
                      {user.total_earned.toLocaleString()} PP
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/30">
                      Joined
                    </p>
                    <p className="mt-1 font-bold">
                      {formatDate(user.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
