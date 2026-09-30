"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { initTelegramWebApp } from "@/lib/telegram";

interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  reward_pp: number;
  target_url: string | null;
  proof_required: boolean;
}

const taskIcons: Record<string, string> = {
  join_channel: "✈️",
  follow: "📣",
  visit: "🔗",
  watch: "▶️",
  social: "📣",
  custom: "⚡",
};

const taskLabels: Record<string, string> = {
  join_channel: "Telegram",
  follow: "Social",
  visit: "Website",
  watch: "Video",
  social: "Social",
  custom: "Task",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTasks() {
      try {
        const response = await fetch("/api/tasks");

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "Unable to load tasks."
          );
        }

        setTasks(data.tasks ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load tasks."
        );
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, []);

  async function testMembership() {
    const webApp = initTelegramWebApp();

    if (!webApp?.initData) {
      alert("Open PABLOT from Telegram first.");
      return;
    }

    try {
      const response = await fetch("/api/telegram/membership-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initData: webApp.initData,
        }),
      });

      const data = await response.json();

      alert(JSON.stringify(data, null, 2));
    } catch {
      alert("Membership check failed.");
    }
  }

  return (
    <main className="min-h-screen px-4 pb-28 pt-5">
      <div className="mx-auto w-full max-w-md">

        <header className="mb-6">
          <p className="text-xs font-medium text-white/45">
            EARN MORE
          </p>

          <h1 className="mt-1 text-3xl font-black tracking-tight">
            Tasks
          </h1>

          <p className="mt-2 text-sm text-white/45">
            Complete tasks and collect Pablot Points.
          </p>
        </header>

        <button
          type="button"
          onClick={testMembership}
          className="mb-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/70"
        >
          Test Telegram Membership
        </button>

        {/* Progress */}
        <section className="balance-card rounded-[26px] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white/45">
                TODAY
              </p>

              <p className="mt-1 text-xl font-black">
                0{" "}
                <span className="text-sm text-white/40">
                  / 10 tasks
                </span>
              </p>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-sm font-black text-emerald-300">
              0%
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
            <div className="h-full w-0 rounded-full bg-emerald-400" />
          </div>
        </section>

        {/* Task list */}
        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black">
              Available tasks
            </h2>

            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/45">
              {loading ? "..." : tasks.length}
            </span>
          </div>

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="task-card flex w-full items-center gap-4 rounded-[22px] p-4"
                >
                  <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-white/6" />

                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-36 animate-pulse rounded bg-white/6" />
                    <div className="mt-2 h-3 w-48 animate-pulse rounded bg-white/5" />
                    <div className="mt-2 h-2 w-16 animate-pulse rounded bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="glass-panel rounded-[22px] p-5">
              <p className="text-sm font-semibold text-red-300">
                {error}
              </p>
            </div>
          )}

          {!loading && !error && tasks.length === 0 && (
            <div className="glass-panel rounded-[22px] p-5">
              <p className="text-sm font-semibold text-white/60">
                No tasks are available right now.
              </p>
            </div>
          )}

          {!loading && !error && tasks.length > 0 && (
            <div className="space-y-3">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className="task-card group flex w-full items-center gap-4 rounded-[22px] p-4 text-left"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/6 text-xl transition-transform duration-200 group-active:scale-90">
                    {taskIcons[task.type] ?? "⚡"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold">
                        {task.title}
                      </p>
                    </div>

                    <p className="mt-1 truncate text-xs text-white/40">
                      {task.description}
                    </p>

                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-white/25">
                      {taskLabels[task.type] ?? "Task"}
                    </p>
                  </div>

                  <div className="shrink-0 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
                    +{task.reward_pp} PP
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Completed */}
        <section className="glass-panel mt-6 rounded-[24px] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-lg">
              ✓
            </div>

            <div>
              <p className="font-bold">
                Completed tasks
              </p>

              <p className="mt-1 text-xs text-white/40">
                Your completed tasks will appear here.
              </p>
            </div>
          </div>
        </section>

      </div>

      <BottomNav />
    </main>
  );
}
