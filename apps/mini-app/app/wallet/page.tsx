"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";

interface User {
  pp_balance: number;
  total_earned: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  reference_id: string | null;
  description: string;
  created_at: string;
}

interface WithdrawalWallet {
  id: string;
  network: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export default function WalletPage() {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [withdrawalWallet, setWithdrawalWallet] =
    useState<WithdrawalWallet | null>(null);
  const [walletSetupOpen, setWalletSetupOpen] =
    useState(false);
  const [walletAddress, setWalletAddress] =
    useState("");
  const [walletConfirmed, setWalletConfirmed] =
    useState(false);
  const [walletSaving, setWalletSaving] =
    useState(false);
  const [walletMessage, setWalletMessage] =
    useState("");

  useEffect(() => {
    const loadWallet = async () => {
      try {
        const initData = window.Telegram?.WebApp?.initData;

        if (!initData) {
          setLoading(false);
          return;
        }

        const response = await fetch("/api/telegram/user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ initData }),
        });

        if (!response.ok) {
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (data.user) {
          setUser({
            pp_balance: data.user.pp_balance ?? 0,
            total_earned: data.user.total_earned ?? 0,
          });
        }

        const transactionResponse = await fetch(
          "/api/transactions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ initData }),
          }
        );

        if (transactionResponse.ok) {
          const transactionData =
            await transactionResponse.json();

          setTransactions(
            transactionData.transactions ?? []
          );
        }

        const walletResponse = await fetch(
          "/api/wallet",
          {
            headers: {
              "x-telegram-init-data": initData,
            },
          }
        );

        if (walletResponse.ok) {
          const walletData = await walletResponse.json();

          const bscWallet = (
            walletData.wallets ?? []
          ).find(
            (wallet: WithdrawalWallet) =>
              wallet.network === "bsc"
          );

          if (bscWallet) {
            setWithdrawalWallet(bscWallet);
          }
        }
      } catch {
        // Keep the wallet usable even if the request fails.
      } finally {
        setLoading(false);
        setTransactionsLoading(false);
      }
    };

    loadWallet();
  }, []);

  const balance = user?.pp_balance ?? 0;
  const totalEarned = user?.total_earned ?? 0;

  const handleSaveWallet = async () => {
    if (walletSaving || !walletConfirmed) return;

    const address = walletAddress.trim();

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setWalletMessage(
        "Enter a valid BNB Smart Chain (BEP-20) address."
      );
      return;
    }

    try {
      setWalletSaving(true);
      setWalletMessage("");

      const initData = window.Telegram?.WebApp?.initData;

      if (!initData) {
        setWalletMessage(
          "Telegram session not available."
        );
        return;
      }

      const response = await fetch("/api/wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": initData,
        },
        body: JSON.stringify({
          network: "bsc",
          address,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setWalletMessage(
          data.error || "Unable to save wallet."
        );
        return;
      }

      setWithdrawalWallet(data.wallet);
      setWalletSetupOpen(false);
      setWalletAddress("");
      setWalletConfirmed(false);
      setWalletMessage("");
    } catch {
      setWalletMessage(
        "Unable to save wallet. Please try again."
      );
    } finally {
      setWalletSaving(false);
    }
  };

  const maskWalletAddress = (address: string) => {
    if (address.length < 12) return address;

    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  return (
    <main className="min-h-screen px-4 pb-28 pt-5">
      <div className="mx-auto w-full max-w-md">

        <header className="mb-6">
          <p className="text-xs font-medium text-white/45">
            YOUR EARNINGS
          </p>

          <h1 className="mt-1 text-3xl font-black tracking-tight">
            Wallet
          </h1>
        </header>

        {/* Balance */}
        <section className="balance-card relative overflow-hidden rounded-[28px] p-6">
          <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-400/10 blur-2xl" />

          <p className="relative text-sm font-medium text-white/55">
            AVAILABLE BALANCE
          </p>

          <div className="relative mt-2 flex items-end gap-2">
            <span className="text-4xl font-black tracking-tight">
              {loading ? "—" : balance.toLocaleString()}
            </span>

            <span className="pb-1 text-sm font-bold text-emerald-300">
              PP
            </span>
          </div>

          <p className="relative mt-2 text-xs text-white/35">
            Available for withdrawal
          </p>
        </section>

        {/* Earnings */}
        <section className="mt-4 grid grid-cols-2 gap-3">
          <div className="glass-panel rounded-[22px] p-5">
            <p className="text-xs text-white/40">
              Total earned
            </p>

            <p className="mt-2 text-2xl font-black">
              {loading ? "—" : totalEarned.toLocaleString()}
            </p>

            <p className="mt-1 text-xs font-bold text-emerald-300">
              PP
            </p>
          </div>

          <div className="glass-panel rounded-[22px] p-5">
            <p className="text-xs text-white/40">
              Pending
            </p>

            <p className="mt-2 text-2xl font-black">
              0
            </p>

            <p className="mt-1 text-xs text-white/30">
              PP
            </p>
          </div>
        </section>

        {/* Withdraw */}
        <section className="mt-5">
          <a
            href="/withdraw"
            className="flex w-full items-center justify-center rounded-2xl bg-emerald-400 py-4 text-sm font-black text-black transition active:scale-[0.98]"
          >
            WITHDRAW
          </a>
        </section>

        {/* Withdrawal wallet */}
        <section className="glass-panel mt-5 rounded-[24px] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400/10 text-xl">
              🟡
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-bold">
                BNB Smart Chain
              </p>

              <p className="mt-1 text-xs text-white/40">
                {withdrawalWallet
                  ? maskWalletAddress(
                      withdrawalWallet.address
                    )
                  : "No withdrawal wallet connected"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setWalletAddress(
                  withdrawalWallet?.address ?? ""
                );
                setWalletConfirmed(false);
                setWalletMessage("");
                setWalletSetupOpen(true);
              }}
              className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold text-emerald-300"
            >
              {withdrawalWallet ? "EDIT" : "SETUP"}
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-yellow-400/10 bg-yellow-400/5 p-4">
            <p className="text-xs font-bold text-yellow-200">
              ⚠️ Important
            </p>

            <p className="mt-2 text-[11px] leading-5 text-white/45">
              Only use a wallet address that supports
              BNB Smart Chain (BEP-20). Sending funds
              through the wrong network or to an incorrect
              address may result in permanent loss.
            </p>
          </div>
        </section>

        {/* Transactions */}
        <section className="glass-panel mt-5 overflow-hidden rounded-[24px]">
          <div className="border-b border-white/6 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wider text-white/30">
              Recent activity
            </p>
          </div>

          {transactionsLoading ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-white/40">
                Loading activity...
              </p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-2xl">💸</p>

              <p className="mt-3 text-sm font-bold">
                No transactions yet
              </p>

              <p className="mt-1 text-xs text-white/35">
                Your earnings will appear here.
              </p>
            </div>
          ) : (
            <div>
              {transactions.map((transaction, index) => (
                <button
                  key={`${transaction.created_at}-${index}`}
                  type="button"
                  onClick={() =>
                    setSelectedTransaction(transaction)
                  }
                  className="flex w-full items-center gap-3 border-b border-white/6 px-5 py-4 text-left transition active:bg-white/5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-lg">
                    +
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {transaction.description}
                    </p>

                    <p className="mt-1 text-[11px] text-white/35">
                      {new Date(
                        transaction.created_at
                      ).toLocaleString()}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p
                      className={`text-sm font-black ${
                        Number(transaction.amount) < 0
                          ? "text-red-300"
                          : "text-emerald-300"
                      }`}
                    >
                      {Number(transaction.amount) >= 0 ? "+" : ""}
                      {Math.abs(Number(transaction.amount)).toLocaleString()} PP
                    </p>

                    <p className="mt-1 text-[10px] text-white/25">
                      VIEW
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

      </div>

      {walletSetupOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4"
          onClick={() => {
            if (!walletSaving) {
              setWalletSetupOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-sm rounded-[28px] bg-[#0b111b] p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-white/15" />

            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30">
              Withdrawal wallet
            </p>

            <h2 className="mt-2 text-2xl font-black">
              BNB Smart Chain
            </h2>

            <p className="mt-2 text-xs leading-5 text-white/40">
              Add the wallet address where you want to
              receive future BNB withdrawals.
            </p>

            <div className="mt-5 rounded-2xl border border-yellow-400/15 bg-yellow-400/5 p-4">
              <p className="text-xs font-bold text-yellow-200">
                ⚠️ Check carefully
              </p>

              <p className="mt-2 text-[11px] leading-5 text-white/50">
                Make sure this is your BNB Smart Chain
                (BEP-20) address. Blockchain transfers
                cannot normally be reversed after they
                are sent.
              </p>
            </div>

            <label className="mt-5 block text-xs font-bold text-white/45">
              BNB wallet address

              <input
                value={walletAddress}
                onChange={(event) =>
                  setWalletAddress(event.target.value)
                }
                placeholder="0x..."
                inputMode="text"
                autoComplete="off"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-mono outline-none transition focus:border-emerald-400/40"
              />
            </label>

            <label className="mt-4 flex gap-3 rounded-2xl bg-white/[0.03] p-4">
              <input
                type="checkbox"
                checked={walletConfirmed}
                onChange={(event) =>
                  setWalletConfirmed(event.target.checked)
                }
                className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-400"
              />

              <span className="text-[11px] leading-5 text-white/50">
                I confirm that this is my correct
                <span className="font-bold text-white/75">
                  {" "}BEP-20 wallet address
                </span>
                {" "}and I understand that funds sent to
                the wrong address or network may be lost.
              </span>
            </label>

            {walletMessage && (
              <p className="mt-3 rounded-xl bg-red-400/5 px-3 py-2 text-xs text-red-300">
                {walletMessage}
              </p>
            )}

            <button
              type="button"
              disabled={
                walletSaving ||
                !walletConfirmed ||
                !walletAddress.trim()
              }
              onClick={handleSaveWallet}
              className="mt-5 w-full rounded-2xl bg-emerald-400 py-3.5 text-sm font-black text-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
            >
              {walletSaving
                ? "Saving..."
                : "Save wallet"}
            </button>

            <button
              type="button"
              disabled={walletSaving}
              onClick={() => setWalletSetupOpen(false)}
              className="mt-2 w-full rounded-2xl bg-white/5 py-3 text-sm font-bold text-white/70"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {selectedTransaction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4"
          onClick={() => setSelectedTransaction(null)}
        >
          <div
            className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-[28px] bg-[#0b111b] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-5">
              <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/15" />

              <div className="text-center">
                <p className="text-xs font-black tracking-[0.25em] text-white/35">
                  PABLOT
                </p>

                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-white/30">
                  Transaction receipt
                </p>

                <div className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10 text-xl text-emerald-300">
                  ✓
                </div>

                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Completed
                </p>

                <p
                  className={`mt-1 text-3xl font-black tracking-tight ${
                    selectedTransaction.amount < 0
                      ? "text-red-300"
                      : "text-emerald-300"
                  }`}
                >
                  {selectedTransaction.amount >= 0 ? "+" : ""}
                  {selectedTransaction.amount.toLocaleString()} PP
                </p>
              </div>

              <div className="my-4 border-t border-dashed border-white/10" />

              <div className="space-y-0">
                <div className="flex justify-between gap-4 py-2.5">
                  <span className="text-xs text-white/35">
                    Description
                  </span>
                  <span className="max-w-[60%] text-right text-xs font-bold">
                    {selectedTransaction.description}
                  </span>
                </div>

                <div className="flex justify-between gap-4 py-2.5">
                  <span className="text-xs text-white/35">
                    Type
                  </span>
                  <span className="text-right text-xs font-bold uppercase">
                    {selectedTransaction.type.replaceAll("_", " ")}
                  </span>
                </div>

                <div className="flex justify-between gap-4 py-2.5">
                  <span className="text-xs text-white/35">
                    Date
                  </span>
                  <span className="text-right text-xs font-bold">
                    {new Date(
                      selectedTransaction.created_at
                    ).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex justify-between gap-4 py-2.5">
                  <span className="text-xs text-white/35">
                    Time
                  </span>
                  <span className="text-right text-xs font-bold">
                    {new Date(
                      selectedTransaction.created_at
                    ).toLocaleTimeString()}
                  </span>
                </div>

                <div className="flex justify-between gap-4 py-2.5">
                  <span className="text-xs text-white/35">
                    Reference
                  </span>
                  <span className="max-w-[60%] truncate text-right font-mono text-[10px] text-white/60">
                    {selectedTransaction.reference_id ||
                      selectedTransaction.id}
                  </span>
                </div>
              </div>

              <div className="my-4 border-t border-dashed border-white/10" />

              <p className="text-center text-[9px] text-white/25">
                This receipt confirms the transaction recorded in your
                PABLOT account.
              </p>

              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="mt-5 w-full rounded-2xl bg-white/5 py-3.5 text-sm font-bold transition active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
