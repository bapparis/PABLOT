"use client";

import { useEffect, useState } from "react";

type AnalyticsData = {
  summary: {
    totalUsers: number;
    totalPpBalance: number;
    totalEarned: number;
    totalPpIssued: number;
    totalPpSpent: number;
    totalTaskCompletions: number;
    pendingWithdrawals: number;
    approvedWithdrawals: number;
    rejectedWithdrawals: number;
    paidWithdrawals: number;
    revenue: number;
    externalRevenue: number;
    withdrawalFees: number;
    moneyOut: number;
    grossWithdrawals: number;
    netRevenue: number;
  };
  allTime: {
    users: { date: string; users: number }[];
    tasks: {
      date: string;
      completions: number;
      rewardPP: number;
    }[];
    pp: {
      date: string;
      issued: number;
      spent: number;
    }[];
    revenue: {
      date: string;
      externalRevenue: number;
      withdrawalFees: number;
      revenue: number;
      moneyOut: number;
      grossWithdrawals: number;
      netMovement: number;
    }[];
  };
  usersLast7Days: { date: string; users: number }[];
  tasksLast7Days: {
    date: string;
    completions: number;
    rewardPP?: number;
  }[];
  revenueLast30Days: {
    date: string;
    revenue: number;
    moneyOut: number;
    net: number;
  }[];
};

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function shortDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function percentage(value: number, max: number) {
  if (max <= 0) return 5;
  return Math.max(5, (value / max) * 100);
}

export default function AdminAnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load analytics.");
        return response.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <main className="min-h-screen bg-[#050b12] px-4 py-8 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-red-400">{error}</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#050b12] px-4 py-8 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-slate-400">Loading analytics...</p>
        </div>
      </main>
    );
  }

  const { summary, allTime } = data;

  const revenueDays = allTime.revenue;
  const userDays = allTime.users;
  const taskDays = allTime.tasks;
  const ppDays = allTime.pp;

  const maxRevenue = Math.max(
    1,
    ...revenueDays.flatMap((day) => [
      Number(day.revenue),
      Number(day.moneyOut),
      Math.abs(Number(day.netMovement)),
    ])
  );

  const maxUsers = Math.max(
    1,
    ...userDays.map((day) => Number(day.users))
  );

  const maxTasks = Math.max(
    1,
    ...taskDays.map((day) => Number(day.completions))
  );

  const maxPP = Math.max(
    1,
    ...ppDays.flatMap((day) => [
      Number(day.issued),
      Number(day.spent),
    ])
  );

  const firstDate = revenueDays[0]?.date ?? userDays[0]?.date;
  const lastDate =
    revenueDays[revenueDays.length - 1]?.date ??
    userDays[userDays.length - 1]?.date;

  return (
    <main className="min-h-screen bg-[#050b12] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#59D9FF]">
            PABLOT CONTROL
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black">Analytics</h1>
            <span className="rounded-full border border-[#59D9FF]/30 bg-[#59D9FF]/10 px-3 py-1 text-xs font-bold text-[#59D9FF]">
              AT · ALL TIME
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Complete lifetime platform activity, points, withdrawals and financial movement.
          </p>
          {firstDate && lastDate && (
            <p className="mt-2 text-xs text-slate-600">
              Historical range: {shortDate(firstDate)} → {shortDate(lastDate)} · Africa/Lagos
            </p>
          )}
        </div>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#163044] bg-[#08131d] p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Total revenue
            </p>
            <p className="mt-2 text-2xl font-black text-[#59D9FF]">
              {money(summary.revenue)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              All-time confirmed revenue
            </p>
          </div>

          <div className="rounded-2xl border border-[#163044] bg-[#08131d] p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Money out
            </p>
            <p className="mt-2 text-2xl font-black">
              {money(summary.moneyOut)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              All-time paid to users
            </p>
          </div>

          <div className="rounded-2xl border border-[#163044] bg-[#08131d] p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              PP issued
            </p>
            <p className="mt-2 text-2xl font-black">
              {summary.totalPpIssued.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Lifetime points distributed
            </p>
          </div>

          <div className="rounded-2xl border border-[#163044] bg-[#08131d] p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              PP spent
            </p>
            <p className="mt-2 text-2xl font-black">
              {summary.totalPpSpent.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Lifetime points used
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-[#163044] bg-[#08131d] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Net movement · AT
              </p>
              <p
                className={`mt-1 text-3xl font-black ${
                  summary.netRevenue >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {money(summary.netRevenue)}
              </p>
            </div>

            <p className="max-w-xs text-right text-xs text-slate-500">
              Lifetime confirmed revenue minus money actually paid to users.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-[#163044] bg-[#08131d] p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">All-Time Revenue Movement</h2>
              <p className="text-xs text-slate-500">
                Daily lifetime financial activity · USD
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-xs">
              <span className="text-[#59D9FF]">● Revenue</span>
              <span className="text-slate-300">● Money out</span>
              <span className="text-emerald-400">● Net</span>
            </div>
          </div>

          <div className="mt-6 flex h-64 items-end gap-1 overflow-x-auto border-b border-[#163044] pb-1">
            {revenueDays.map((day) => {
              const revenueHeight = percentage(
                Number(day.revenue),
                maxRevenue
              );

              const moneyOutHeight = percentage(
                Number(day.moneyOut),
                maxRevenue
              );

              const netHeight = percentage(
                Math.abs(Number(day.netMovement)),
                maxRevenue
              );

              return (
                <div
                  key={day.date}
                  className="group flex h-full min-w-[18px] flex-1 items-end gap-[2px]"
                  title={`${shortDate(day.date)} · Revenue ${money(
                    Number(day.revenue)
                  )} · Out ${money(Number(day.moneyOut))} · Net ${money(
                    Number(day.netMovement)
                  )}`}
                >
                  <div
                    className="w-1/3 rounded-t bg-[#59D9FF]"
                    style={{ height: `${revenueHeight}%` }}
                  />
                  <div
                    className="w-1/3 rounded-t bg-slate-600"
                    style={{ height: `${moneyOutHeight}%` }}
                  />
                  <div
                    className={`w-1/3 rounded-t ${
                      Number(day.netMovement) >= 0
                        ? "bg-emerald-400"
                        : "bg-red-400"
                    }`}
                    style={{ height: `${netHeight}%` }}
                  />
                </div>
              );
            })}
          </div>

          {revenueDays.length > 0 && (
            <div className="mt-3 flex justify-between text-[10px] text-slate-600">
              <span>{shortDate(revenueDays[0].date)}</span>
              <span>
                {shortDate(revenueDays[revenueDays.length - 1].date)}
              </span>
            </div>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#163044] bg-[#08131d] p-5">
            <h2 className="text-lg font-black">All-Time User Growth</h2>
            <p className="mt-1 text-xs text-slate-500">
              New users per Lagos calendar day
            </p>

            <div className="mt-5 flex h-36 items-end gap-1 overflow-x-auto">
              {userDays.map((day) => (
                <div
                  key={day.date}
                  className="group flex h-full min-w-[18px] flex-1 flex-col items-center justify-end"
                  title={`${shortDate(day.date)} · ${day.users} new users`}
                >
                  <div
                    className="w-full max-w-8 rounded-t bg-[#59D9FF]"
                    style={{
                      height: `${percentage(
                        Number(day.users),
                        maxUsers
                      )}%`,
                    }}
                  />
                </div>
              ))}
            </div>

            {userDays.length > 0 && (
              <div className="mt-3 flex justify-between text-[10px] text-slate-600">
                <span>{shortDate(userDays[0].date)}</span>
                <span>{shortDate(userDays[userDays.length - 1].date)}</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#163044] bg-[#08131d] p-5">
            <h2 className="text-lg font-black">All-Time Task Activity</h2>
            <p className="mt-1 text-xs text-slate-500">
              Completed tasks per Lagos calendar day
            </p>

            <div className="mt-5 flex h-36 items-end gap-1 overflow-x-auto">
              {taskDays.map((day) => (
                <div
                  key={day.date}
                  className="group flex h-full min-w-[18px] flex-1 flex-col items-center justify-end"
                  title={`${shortDate(day.date)} · ${day.completions} completions · ${day.rewardPP} PP`}
                >
                  <div
                    className="w-full max-w-8 rounded-t bg-emerald-400"
                    style={{
                      height: `${percentage(
                        Number(day.completions),
                        maxTasks
                      )}%`,
                    }}
                  />
                </div>
              ))}
            </div>

            {taskDays.length > 0 && (
              <div className="mt-3 flex justify-between text-[10px] text-slate-600">
                <span>{shortDate(taskDays[0].date)}</span>
                <span>{shortDate(taskDays[taskDays.length - 1].date)}</span>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#163044] bg-[#08131d] p-5">
          <div>
            <h2 className="text-lg font-black">All-Time PP Flow</h2>
            <p className="mt-1 text-xs text-slate-500">
              Points issued vs spent · lifetime daily history
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <span className="text-[#59D9FF]">● Issued</span>
            <span className="text-amber-400">● Spent</span>
          </div>

          <div className="mt-6 flex h-52 items-end gap-1 overflow-x-auto border-b border-[#163044] pb-1">
            {ppDays.map((day) => (
              <div
                key={day.date}
                className="flex h-full min-w-[18px] flex-1 items-end gap-[2px]"
                title={`${shortDate(day.date)} · Issued ${Number(
                  day.issued
                ).toLocaleString()} PP · Spent ${Number(
                  day.spent
                ).toLocaleString()} PP`}
              >
                <div
                  className="w-1/2 rounded-t bg-[#59D9FF]"
                  style={{
                    height: `${percentage(
                      Number(day.issued),
                      maxPP
                    )}%`,
                  }}
                />
                <div
                  className="w-1/2 rounded-t bg-amber-400"
                  style={{
                    height: `${percentage(
                      Number(day.spent),
                      maxPP
                    )}%`,
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#163044] bg-[#08131d] p-4">
            <p className="text-xs text-slate-500">All-time users</p>
            <p className="mt-1 text-xl font-black">
              {summary.totalUsers.toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl border border-[#163044] bg-[#08131d] p-4">
            <p className="text-xs text-slate-500">Tasks completed</p>
            <p className="mt-1 text-xl font-black">
              {summary.totalTaskCompletions.toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl border border-[#163044] bg-[#08131d] p-4">
            <p className="text-xs text-slate-500">Pending withdrawals</p>
            <p className="mt-1 text-xl font-black text-amber-400">
              {summary.pendingWithdrawals.toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl border border-[#163044] bg-[#08131d] p-4">
            <p className="text-xs text-slate-500">Paid withdrawals</p>
            <p className="mt-1 text-xl font-black text-emerald-400">
              {summary.paidWithdrawals.toLocaleString()}
            </p>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#163044] bg-[#08131d] p-4">
            <p className="text-xs text-slate-500">Rejected withdrawals</p>
            <p className="mt-1 text-xl font-black text-red-400">
              {summary.rejectedWithdrawals.toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl border border-[#163044] bg-[#08131d] p-4">
            <p className="text-xs text-slate-500">Current PP balance</p>
            <p className="mt-1 text-xl font-black">
              {summary.totalPpBalance.toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl border border-[#163044] bg-[#08131d] p-4">
            <p className="text-xs text-slate-500">Total earned PP</p>
            <p className="mt-1 text-xl font-black">
              {summary.totalEarned.toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl border border-[#163044] bg-[#08131d] p-4">
            <p className="text-xs text-slate-500">Gross withdrawals</p>
            <p className="mt-1 text-xl font-black">
              {money(summary.grossWithdrawals)}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

