"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "../AdminShell";

type WithdrawalStatus =
  | "pending"
  | "approved"
  | "paid"
  | "rejected";

type Withdrawal = {
  id: string;
  user_id: string;
  amount_pp: number;
  gross_usd: number;
  fee_usd: number;
  net_usd: number;
  network: string;
  wallet_address: string;
  status: WithdrawalStatus;
  tx_hash: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  users:
    | {
        id: string;
        telegram_id: number | string | null;
        username: string | null;
        pablot_id: string | null;
      }
    | null;
};

const filters: Array<{
  value: "all" | WithdrawalStatus;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function shortWallet(value: string) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function statusClass(status: WithdrawalStatus) {
  if (status === "pending") {
    return "border-amber-300/20 bg-amber-300/10 text-amber-200";
  }

  if (status === "approved") {
    return "border-sky-300/20 bg-sky-300/10 text-sky-200";
  }

  if (status === "paid") {
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  }

  return "border-red-300/20 bg-red-300/10 text-red-200";
}

export default function AdminWithdrawalsClient() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [filter, setFilter] = useState<"all" | WithdrawalStatus>("pending");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    has_more: false,
  });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [payingId, setPayingId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState("");

  const loadWithdrawals = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
      });

      if (filter !== "all") {
        params.set("status", filter);
      }

      const response = await fetch(
        `/api/admin/withdrawals?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Failed to load withdrawals."
        );
      }

      setWithdrawals(data.withdrawals ?? []);
      setPagination(
        data.pagination ?? {
          page,
          limit: 25,
          total: data.withdrawals?.length ?? 0,
          has_more: false,
        }
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load withdrawals."
      );
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    void loadWithdrawals();
  }, [loadWithdrawals]);

  async function performAction(
    id: string,
    action: "approve" | "reject" | "paid",
    extra: Record<string, string> = {}
  ) {
    setBusyId(id);
    setMessage("");

    try {
      const response = await fetch("/api/admin/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          withdrawal_id: id,
          ...extra,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Withdrawal action failed."
        );
      }

      setRejectingId(null);
      setRejectReason("");
      setPayingId(null);
      setTxHash("");
      setExpandedId(null);

      await loadWithdrawals();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Withdrawal action failed."
      );
    } finally {
      setBusyId(null);
    }
  }

  function approve(id: string) {
    void performAction(id, "approve");
  }

  function reject(id: string) {
    const reason = rejectReason.trim();

    if (!reason) {
      setMessage("Enter a rejection reason.");
      return;
    }

    void performAction(id, "reject", {
      reason,
    });
  }

  function markPaid(id: string) {
    const hash = txHash.trim();

    if (!hash) {
      setMessage("Enter the transaction hash.");
      return;
    }

    void performAction(id, "paid", {
      tx_hash: hash,
    });
  }

  const pendingCount = withdrawals.filter(
    (item) => item.status === "pending"
  ).length;

  const totalPp = withdrawals.reduce(
    (sum, item) => sum + Number(item.amount_pp),
    0
  );

  const totalNet = withdrawals.reduce(
    (sum, item) => sum + Number(item.net_usd),
    0
  );

  return (
    <AdminShell>
      <main className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6">
        <header className="pt-5 sm:pt-7">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#59D9FF]">
            PABLOT CONTROL
          </p>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Withdrawals
              </h1>
              <p className="mt-1 text-sm text-white/45">
                Review and manage payout requests.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadWithdrawals()}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-bold text-white/65 transition hover:border-[#59D9FF]/20 hover:text-white"
            >
              Refresh
            </button>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#0d141e] p-4">
            <p className="text-xs font-bold text-white/40">
              Showing
            </p>
            <p className="mt-2 text-2xl font-black">
              {withdrawals.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d141e] p-4">
            <p className="text-xs font-bold text-white/40">
              Pending in view
            </p>
            <p className="mt-2 text-2xl font-black text-amber-200">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d141e] p-4">
            <p className="text-xs font-bold text-white/40">
              Net payout in view
            </p>
            <p className="mt-2 text-2xl font-black">
              ${totalNet.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-white/35">
              {totalPp.toLocaleString()} PP
            </p>
          </div>
        </section>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setFilter(item.value);
                setPage(1);
                setExpandedId(null);
                setMessage("");
              }}
              className={`shrink-0 rounded-xl border px-4 py-2.5 text-xs font-black transition ${
                filter === item.value
                  ? "border-[#59D9FF]/30 bg-[#59D9FF]/10 text-[#59D9FF]"
                  : "border-white/10 bg-white/[0.02] text-white/45 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {message && (
          <div className="mt-4 rounded-2xl border border-red-300/15 bg-red-300/5 px-4 py-3 text-sm font-semibold text-red-200">
            {message}
          </div>
        )}

        {loading ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#0d141e] p-8 text-center text-sm text-white/40">
            Loading withdrawals...
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-[#0d141e] p-10 text-center">
            <p className="font-bold text-white/65">
              No withdrawals found
            </p>
            <p className="mt-1 text-sm text-white/35">
              There are no requests in this filter.
            </p>
          </div>
        ) : (
          <section className="mt-5 space-y-2">
            {withdrawals.map((withdrawal) => {
              const user = withdrawal.users;
              const expanded = expandedId === withdrawal.id;

              return (
                <article
                  key={withdrawal.id}
                  className={`overflow-hidden rounded-2xl border bg-[#0d141e] transition ${
                    expanded
                      ? "border-white/15"
                      : "border-white/10"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedId(
                        expanded ? null : withdrawal.id
                      );
                      setRejectingId(null);
                      setPayingId(null);
                      setMessage("");
                    }}
                    className="w-full px-3 py-2.5 text-left transition hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${statusClass(
                              withdrawal.status
                            )}`}
                          >
                            {withdrawal.status}
                          </span>

                          <span className="text-[10px] text-white/25">
                            {formatDate(withdrawal.created_at)}
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <p className="truncate text-sm font-black">
                            {user?.username
                              ? `@${user.username}`
                              : user?.pablot_id ||
                                "Telegram User"}
                          </p>

                          <span className="text-xs text-white/30">
                            {user?.pablot_id ?? "No PABLOT ID"}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black">
                          {Number(
                            withdrawal.amount_pp
                          ).toLocaleString()}{" "}
                          <span className="text-[10px] text-white/35">
                            PP
                          </span>
                        </p>
                        <p className="mt-0 text-[9px] text-white/35">
                          ${Number(withdrawal.net_usd).toFixed(2)} net
                        </p>
                      </div>

                      <span
                        className={`shrink-0 text-sm text-white/30 transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                      >
                        ↓
                      </span>
                    </div>

                    <div className="mt-1 pl-0 text-[9px] font-bold text-[#59D9FF]/70">
                      {expanded ? "Hide details ↑" : "View details →"}
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-white/10 px-4 pb-4 pt-4">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-xl bg-black/15 p-3">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-white/30">
                            Gross
                          </p>
                          <p className="mt-1 text-sm font-black">
                            ${Number(
                              withdrawal.gross_usd
                            ).toFixed(2)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-black/15 p-3">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-white/30">
                            Fee
                          </p>
                          <p className="mt-1 text-sm font-black">
                            ${Number(
                              withdrawal.fee_usd
                            ).toFixed(2)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-black/15 p-3">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-white/30">
                            Network
                          </p>
                          <p className="mt-1 text-sm font-black">
                            {withdrawal.network}
                          </p>
                        </div>

                        <div className="rounded-xl bg-black/15 p-3">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-white/30">
                            Telegram
                          </p>
                          <p className="mt-1 text-sm font-black">
                            {user?.telegram_id ?? "—"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 rounded-xl bg-black/15 p-3">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-white/30">
                          BSC Wallet
                        </p>
                        <p className="mt-1 break-all font-mono text-xs font-bold text-white/75">
                          {withdrawal.wallet_address}
                        </p>
                      </div>

                      <div className="mt-2 rounded-xl bg-black/15 p-3">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-white/30">
                          Requested
                        </p>
                        <p className="mt-1 text-xs font-bold text-white/65">
                          {formatDate(withdrawal.created_at)}
                        </p>
                      </div>

                      {withdrawal.rejection_reason && (
                        <div className="mt-2 rounded-xl border border-red-300/10 bg-red-300/5 p-3">
                          <p className="text-[9px] font-black uppercase tracking-wider text-red-200/60">
                            Rejection reason
                          </p>
                          <p className="mt-1 text-xs text-red-100/75">
                            {withdrawal.rejection_reason}
                          </p>
                        </div>
                      )}

                      {withdrawal.tx_hash && (
                        <div className="mt-2 rounded-xl border border-emerald-300/10 bg-emerald-300/5 p-3">
                          <p className="text-[9px] font-black uppercase tracking-wider text-emerald-200/60">
                            Transaction hash
                          </p>
                          <p className="mt-1 break-all font-mono text-xs text-emerald-100/75">
                            {withdrawal.tx_hash}
                          </p>
                        </div>
                      )}

                      {withdrawal.status === "pending" && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busyId === withdrawal.id}
                            onClick={() =>
                              approve(withdrawal.id)
                            }
                            className="rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-black text-black disabled:opacity-50"
                          >
                            {busyId === withdrawal.id
                              ? "Processing..."
                              : "Approve"}
                          </button>

                          <button
                            type="button"
                            disabled={busyId === withdrawal.id}
                            onClick={() => {
                              setRejectingId(withdrawal.id);
                              setRejectReason("");
                              setMessage("");
                            }}
                            className="rounded-xl border border-red-300/15 bg-red-300/5 px-4 py-2.5 text-xs font-black text-red-200 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {withdrawal.status === "approved" && (
                        <div className="mt-4">
                          {payingId === withdrawal.id ? (
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <input
                                value={txHash}
                                onChange={(event) =>
                                  setTxHash(
                                    event.target.value
                                  )
                                }
                                placeholder="BSC transaction hash"
                                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none placeholder:text-white/20 focus:border-[#59D9FF]/30"
                              />

                              <button
                                type="button"
                                disabled={
                                  busyId === withdrawal.id
                                }
                                onClick={() =>
                                  markPaid(withdrawal.id)
                                }
                                className="rounded-xl bg-emerald-400 px-4 py-3 text-xs font-black text-black disabled:opacity-50"
                              >
                                {busyId === withdrawal.id
                                  ? "Saving..."
                                  : "Confirm Paid"}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setPayingId(
                                  withdrawal.id
                                );
                                setTxHash("");
                                setMessage("");
                              }}
                              className="rounded-xl bg-[#59D9FF] px-4 py-2.5 text-xs font-black text-black"
                            >
                              Mark as Paid
                            </button>
                          )}
                        </div>
                      )}

                      {rejectingId === withdrawal.id && (
                        <div className="mt-4 rounded-xl border border-red-300/10 bg-red-300/5 p-3">
                          <p className="text-xs font-black text-red-100">
                            Rejection reason
                          </p>

                          <textarea
                            value={rejectReason}
                            onChange={(event) =>
                              setRejectReason(
                                event.target.value
                              )
                            }
                            rows={3}
                            placeholder="Why is this withdrawal being rejected?"
                            className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none placeholder:text-white/20 focus:border-red-300/25"
                          />

                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={
                                busyId === withdrawal.id
                              }
                              onClick={() =>
                                reject(withdrawal.id)
                              }
                              className="rounded-xl bg-red-400 px-4 py-2.5 text-xs font-black text-black disabled:opacity-50"
                            >
                              Confirm Rejection
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setRejectingId(null);
                                setRejectReason("");
                              }}
                              className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-white/50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}

        {!loading && pagination.total > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0d141e] px-3 py-1.5">
            <p className="text-[9px] font-semibold text-white/40">
              Showing{" "}
              {Math.min((page - 1) * pagination.limit + 1, pagination.total)}
              {"–"}
              {Math.min(page * pagination.limit, pagination.total)}
              {" of "}
              {pagination.total.toLocaleString()}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1 || loading}
                onClick={() => {
                  setExpandedId(null);
                  setPage((current) => Math.max(1, current - 1));
                }}
                className="rounded-lg border border-white/10 px-2 py-1 text-[9px] font-black text-white/60 transition hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-25"
              >
                ← Previous
              </button>

              <span className="min-w-12 text-center text-[9px] font-black text-white/60">
                Page {page}
              </span>

              <button
                type="button"
                disabled={!pagination.has_more || loading}
                onClick={() => {
                  setExpandedId(null);
                  setPage((current) => current + 1);
                }}
                className="rounded-lg border border-white/10 px-2 py-1 text-[9px] font-black text-white/60 transition hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-25"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </main>
    </AdminShell>
  );
}
