"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";

interface User {
  pp_balance: number;
}

interface WithdrawalWallet {
  id: string;
  network: string;
  address: string;
}

interface Withdrawal {
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
}

const MIN_WITHDRAWAL_PP = 5000;
const PP_PER_USD = 1000;
const WITHDRAWAL_FEE_USD = 1;

function maskAddress(address: string) {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export default function WithdrawPage() {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<WithdrawalWallet | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState<Withdrawal | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const initData = window.Telegram?.WebApp?.initData;

        if (!initData) {
          setMessage("Telegram session not available.");
          return;
        }

        const userResponse = await fetch("/api/telegram/user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ initData }),
        });

        if (userResponse.ok) {
          const data = await userResponse.json();

          if (data.user) {
            setUser({
              pp_balance: data.user.pp_balance ?? 0,
            });
          }
        }

        const walletResponse = await fetch("/api/wallet", {
          headers: {
            "x-telegram-init-data": initData,
          },
        });

        if (walletResponse.ok) {
          const data = await walletResponse.json();

          const bscWallet = (data.wallets ?? []).find(
            (item: WithdrawalWallet) =>
              item.network.toLowerCase() === "bsc"
          );

          setWallet(bscWallet ?? null);
        }

        const withdrawalResponse = await fetch("/api/withdrawals", {
          headers: {
            "x-telegram-init-data": initData,
          },
        });

        if (withdrawalResponse.ok) {
          const data = await withdrawalResponse.json();
          setWithdrawals(data.withdrawals ?? []);
        }
      } catch {
        setMessage("Unable to load withdrawal information.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const balance = user?.pp_balance ?? 0;
  const amountPP = Number(amount);

  const grossUsd = useMemo(() => {
    if (!Number.isInteger(amountPP) || amountPP <= 0) {
      return 0;
    }

    return amountPP / PP_PER_USD;
  }, [amountPP]);

  const netUsd = Math.max(
    grossUsd - WITHDRAWAL_FEE_USD,
    0
  );

  const amountValid =
    Number.isInteger(amountPP) &&
    amountPP >= MIN_WITHDRAWAL_PP &&
    amountPP % 1000 === 0 &&
    amountPP <= balance;

  const canSubmit =
    amountValid &&
    !!wallet &&
    confirmed &&
    !submitting;

  const handleWithdraw = async () => {
    if (!canSubmit) return;

    const initData = window.Telegram?.WebApp?.initData;

    if (!initData) {
      setMessage("Telegram session not available.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": initData,
        },
        body: JSON.stringify({
          amount_pp: amountPP,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.error || "Unable to create withdrawal."
        );
        return;
      }

      setSuccess(data.withdrawal);
      setAmount("");
      setConfirmed(false);

      setUser((current) =>
        current
          ? {
              ...current,
              pp_balance:
                data.withdrawal.pp_balance ??
                Math.max(
                  current.pp_balance - amountPP,
                  0
                ),
            }
          : current
      );

      setWithdrawals((current) => [
        data.withdrawal,
        ...current,
      ]);
    } catch {
      setMessage(
        "Unable to create withdrawal. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen px-4 pb-28 pt-5">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-6">
          <Link
            href="/wallet"
            className="inline-flex items-center rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-white/60"
          >
            ← Wallet
          </Link>

          <p className="mt-5 text-xs font-medium text-white/45">
            CASH OUT YOUR EARNINGS
          </p>

          <h1 className="mt-1 text-3xl font-black tracking-tight">
            Withdraw
          </h1>
        </header>

        <section className="balance-card rounded-[28px] p-6">
          <p className="text-sm font-medium text-white/55">
            AVAILABLE BALANCE
          </p>

          <div className="mt-2 flex items-end gap-2">
            <span className="text-4xl font-black tracking-tight">
              {loading ? "—" : balance.toLocaleString()}
            </span>

            <span className="pb-1 text-sm font-bold text-emerald-300">
              PP
            </span>
          </div>

          <p className="mt-2 text-xs text-white/35">
            ≈ ${(balance / PP_PER_USD).toFixed(2)} USD
          </p>
        </section>

        {!wallet ? (
          <section className="glass-panel mt-4 rounded-[24px] p-5">
            <p className="text-sm font-black">
              BSC wallet not connected
            </p>

            <p className="mt-2 text-xs leading-5 text-white/40">
              Connect your BNB Smart Chain (BEP-20) wallet
              before requesting a withdrawal.
            </p>

            <Link
              href="/wallet"
              className="mt-4 block w-full rounded-2xl bg-emerald-400 py-3.5 text-center text-sm font-black text-black"
            >
              SET UP WALLET
            </Link>
          </section>
        ) : (
          <>
            <section className="glass-panel mt-4 rounded-[24px] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10 text-lg">
                  🟡
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-black">
                    BNB Smart Chain
                  </p>

                  <p className="mt-1 truncate font-mono text-[11px] text-white/40">
                    {maskAddress(wallet.address)}
                  </p>
                </div>
              </div>
            </section>

            <section className="glass-panel mt-4 rounded-[24px] p-5">
              <label className="block text-xs font-bold text-white/45">
                Withdrawal amount
                <div className="relative mt-2">
                  <input
                    value={amount}
                    onChange={(event) => {
                      setAmount(
                        event.target.value.replace(/\D/g, "")
                      );
                      setMessage("");
                      setSuccess(null);
                    }}
                    placeholder="5000"
                    inputMode="numeric"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 pr-14 text-lg font-black outline-none transition focus:border-emerald-400/40"
                  />

                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-300">
                    PP
                  </span>
                </div>
              </label>

              <p className="mt-2 text-[10px] text-white/30">
                Minimum 5,000 PP · Must be in 1,000 PP increments
              </p>

              {amount && (
                <div className="mt-5 rounded-2xl bg-white/[0.03] p-4">
                  <div className="flex justify-between py-1.5">
                    <span className="text-xs text-white/35">
                      Gross amount
                    </span>

                    <span className="text-xs font-bold">
                      ${grossUsd.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5">
                    <span className="text-xs text-white/35">
                      Withdrawal fee
                    </span>

                    <span className="text-xs font-bold text-yellow-200">
                      −${WITHDRAWAL_FEE_USD.toFixed(2)}
                    </span>
                  </div>

                  <div className="my-2 border-t border-white/8" />

                  <div className="flex justify-between py-1.5">
                    <span className="text-xs font-bold text-white/60">
                      You receive
                    </span>

                    <span className="text-base font-black text-emerald-300">
                      ${netUsd.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-yellow-400/10 bg-yellow-400/5 p-4">
                <p className="text-xs font-bold text-yellow-200">
                  ⚠️ Important
                </p>

                <p className="mt-2 text-[11px] leading-5 text-white/45">
                  Withdrawals are sent to your connected BNB
                  Smart Chain (BEP-20) wallet. Make sure the
                  address is correct before submitting.
                </p>
              </div>

              <label className="mt-4 flex gap-3 rounded-2xl bg-white/[0.03] p-4">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) =>
                    setConfirmed(event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-400"
                />

                <span className="text-[11px] leading-5 text-white/50">
                  I confirm that I want to withdraw to this
                  <span className="font-bold text-white/75">
                    {" "}BEP-20 wallet
                  </span>
                  {" "}and understand the $1.00 withdrawal fee.
                </span>
              </label>

              {message && (
                <p className="mt-3 rounded-xl bg-red-400/5 px-3 py-2 text-xs text-red-300">
                  {message}
                </p>
              )}

              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleWithdraw}
                className="mt-5 w-full rounded-2xl bg-emerald-400 py-4 text-sm font-black text-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {submitting
                  ? "PROCESSING..."
                  : "REQUEST WITHDRAWAL"}
              </button>
            </section>
          </>
        )}

        {success && (
          <section className="mt-4 rounded-[24px] border border-emerald-400/15 bg-emerald-400/5 p-5">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10 text-2xl text-emerald-300">
                ✓
              </div>

              <p className="mt-3 text-sm font-black text-emerald-300">
                Withdrawal requested
              </p>

              <p className="mt-1 text-xs text-white/40">
                Your request is now pending review.
              </p>

              <p className="mt-4 text-2xl font-black">
                ${Number(success.net_usd).toFixed(2)}
              </p>

              <p className="mt-1 text-[10px] text-white/30">
                {success.amount_pp.toLocaleString()} PP
              </p>

              <div className="mt-4 rounded-xl bg-white/[0.03] p-3">
                <p className="text-[9px] uppercase tracking-wider text-white/25">
                  Withdrawal ID
                </p>

                <p className="mt-1 break-all font-mono text-[10px] text-white/50">
                  {success.id}
                </p>
              </div>

              <Link
                href="/wallet"
                className="mt-4 block w-full rounded-2xl bg-white/5 py-3.5 text-sm font-bold"
              >
                BACK TO WALLET
              </Link>
            </div>
          </section>
        )}

        {withdrawals.length > 0 && (
          <section className="glass-panel mt-5 overflow-hidden rounded-[24px]">
            <div className="border-b border-white/6 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-white/30">
                Withdrawal history
              </p>
            </div>

            {withdrawals.slice(0, 5).map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="border-b border-white/6 px-5 py-4 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">
                      {withdrawal.amount_pp.toLocaleString()} PP
                    </p>

                    <p className="mt-1 text-[10px] text-white/30">
                      {new Date(
                        withdrawal.created_at
                      ).toLocaleString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-black">
                      ${Number(withdrawal.net_usd).toFixed(2)}
                    </p>

                    <p className="mt-1 text-[10px] font-bold uppercase text-yellow-200">
                      {withdrawal.status}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
