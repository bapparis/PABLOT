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
  updated_at: string;
};

type TaskCompletion = {
  id: string;
  task_id: string;
  status: string;
  proof_url: string | null;
  reward_pp: number;
  completed_at: string | null;
  created_at: string;
};

type PPTransaction = {
  id: string;
  amount: number;
  type: string;
  reference_id: string | null;
  description: string;
  created_at: string;
};

type Withdrawal = {
  id: string;
  amount_pp: number;
  gross_usd: number;
  fee_usd: number;
  net_usd: number;
  network: string;
  wallet_address: string;
  status: string;
  tx_hash: string | null;
  rejection_reason: string | null;
  created_at: string;
};

type Wallet = {
  id: string;
  network: string;
  address: string;
  created_at: string;
};

type UserDetails = {
  user: User;
  taskCompletions: TaskCompletion[];
  ppTransactions: PPTransaction[];
  withdrawals: Withdrawal[];
  wallets: Wallet[];
};

export default function AdminUserDetailsClient({
  userId,
}: {
  userId: string;
}) {
  const [data, setData] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to load user.");
        }

        setData(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load user."
        );
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [userId]);

  function formatDate(value: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleString();
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 pb-10">
        <p className="text-sm text-white/40">Loading user...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 pb-10">
        <a
          href="/admin/users"
          className="text-sm font-bold text-[#59D9FF]"
        >
          ← Back to Users
        </a>

        <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/5 p-5 text-sm text-red-200">
          {error || "User not found."}
        </div>
      </main>
    );
  }

  const { user } = data;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-10">
      <a
        href="/admin/users"
        className="text-sm font-bold text-[#59D9FF]"
      >
        ← Back to Users
      </a>

      <div className="mt-6 rounded-3xl border border-white/10 bg-[#0a111a] p-6">
        <div className="flex items-center gap-4">
          {user.photo_url ? (
            <img
              src={user.photo_url}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#59D9FF]/10 text-xl font-black text-[#59D9FF]">
              {user.first_name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black">
              {user.first_name} {user.last_name ?? ""}
            </h1>

            <p className="text-sm text-white/40">
              {user.username
                ? `@${user.username}`
                : "No username"}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/[0.03] p-4">
            <p className="text-[10px] uppercase tracking-wider text-white/30">
              PABLOT ID
            </p>
            <p className="mt-1 break-all text-sm font-bold">
              {user.pablot_id ?? "—"}
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.03] p-4">
            <p className="text-[10px] uppercase tracking-wider text-white/30">
              Telegram ID
            </p>
            <p className="mt-1 break-all text-sm font-bold">
              {user.telegram_id}
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.03] p-4">
            <p className="text-[10px] uppercase tracking-wider text-white/30">
              PP Balance
            </p>
            <p className="mt-1 text-lg font-black text-[#59D9FF]">
              {user.pp_balance.toLocaleString()} PP
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.03] p-4">
            <p className="text-[10px] uppercase tracking-wider text-white/30">
              Total Earned
            </p>
            <p className="mt-1 text-lg font-black">
              {user.total_earned.toLocaleString()} PP
            </p>
          </div>
        </div>
      </div>

      <section className="mt-5 rounded-3xl border border-white/10 bg-[#0a111a] p-5">
        <h2 className="font-black">Account</h2>

        <div className="mt-4 space-y-3 text-sm">
          <p>
            <span className="text-white/35">Language:</span>{" "}
            {user.language}
          </p>

          <p>
            <span className="text-white/35">Notifications:</span>{" "}
            {user.notifications_enabled ? "Enabled" : "Disabled"}
          </p>

          <p>
            <span className="text-white/35">Joined:</span>{" "}
            {formatDate(user.created_at)}
          </p>

          <p>
            <span className="text-white/35">Updated:</span>{" "}
            {formatDate(user.updated_at)}
          </p>
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-white/10 bg-[#0a111a] p-5">
        <h2 className="font-black">
          Task Completions ({data.taskCompletions.length})
        </h2>

        <div className="mt-4 space-y-3">
          {data.taskCompletions.length === 0 ? (
            <p className="text-sm text-white/35">
              No task activity.
            </p>
          ) : (
            data.taskCompletions.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-white/[0.03] p-4"
              >
                <div className="flex justify-between gap-4">
                  <span className="text-sm font-bold">
                    {item.status}
                  </span>

                  <span className="text-sm font-black text-[#59D9FF]">
                    +{item.reward_pp} PP
                  </span>
                </div>

                <p className="mt-2 text-xs text-white/35">
                  Task: {item.task_id}
                </p>

                <p className="mt-1 text-xs text-white/35">
                  {formatDate(item.completed_at ?? item.created_at)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-white/10 bg-[#0a111a] p-5">
        <h2 className="font-black">
          PP Transactions ({data.ppTransactions.length})
        </h2>

        <div className="mt-4 space-y-3">
          {data.ppTransactions.length === 0 ? (
            <p className="text-sm text-white/35">
              No PP transactions.
            </p>
          ) : (
            data.ppTransactions.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-white/[0.03] p-4"
              >
                <div className="flex justify-between gap-4">
                  <span className="text-sm font-bold">
                    {item.type}
                  </span>

                  <span className="text-sm font-black">
                    {item.amount > 0 ? "+" : ""}
                    {item.amount.toLocaleString()} PP
                  </span>
                </div>

                <p className="mt-2 text-xs text-white/40">
                  {item.description}
                </p>

                <p className="mt-1 text-xs text-white/30">
                  {formatDate(item.created_at)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-white/10 bg-[#0a111a] p-5">
        <h2 className="font-black">
          Withdrawals ({data.withdrawals.length})
        </h2>

        <div className="mt-4 space-y-3">
          {data.withdrawals.length === 0 ? (
            <p className="text-sm text-white/35">
              No withdrawals.
            </p>
          ) : (
            data.withdrawals.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-white/[0.03] p-4"
              >
                <div className="flex justify-between gap-4">
                  <span className="text-sm font-bold">
                    {item.status}
                  </span>

                  <span className="text-sm font-black">
                    {item.net_usd} USD
                  </span>
                </div>

                <p className="mt-2 text-xs text-white/40">
                  {item.amount_pp.toLocaleString()} PP ·{" "}
                  {item.network}
                </p>

                <p className="mt-1 break-all text-xs text-white/30">
                  {item.wallet_address}
                </p>

                {item.tx_hash && (
                  <p className="mt-1 break-all text-xs text-white/30">
                    TX: {item.tx_hash}
                  </p>
                )}

                {item.rejection_reason && (
                  <p className="mt-2 text-xs text-red-300">
                    {item.rejection_reason}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-white/10 bg-[#0a111a] p-5">
        <h2 className="font-black">
          Wallets ({data.wallets.length})
        </h2>

        <div className="mt-4 space-y-3">
          {data.wallets.length === 0 ? (
            <p className="text-sm text-white/35">
              No saved wallets.
            </p>
          ) : (
            data.wallets.map((wallet) => (
              <div
                key={wallet.id}
                className="rounded-2xl bg-white/[0.03] p-4"
              >
                <p className="text-sm font-bold">
                  {wallet.network}
                </p>

                <p className="mt-2 break-all text-xs text-white/40">
                  {wallet.address}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
