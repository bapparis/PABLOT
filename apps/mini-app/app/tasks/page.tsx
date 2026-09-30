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
  const [processingTaskId, setProcessingTaskId] =
    useState<string | null>(null);
  const [completedTaskIds, setCompletedTaskIds] =
    useState<string[]>([]);
  const [startedTaskIds, setStartedTaskIds] =
    useState<string[]>([]);
  const [error, setError] = useState("");

  async function loadTasks() {
    try {
      setError("");

      const response = await fetch("/api/tasks", {
        cache: "no-store",
      });

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

  useEffect(() => {
    loadTasks();

    const saved =
      sessionStorage.getItem("pablot_started_tasks");

    if (saved) {
      try {
        setStartedTaskIds(JSON.parse(saved));
      } catch {
        sessionStorage.removeItem(
          "pablot_started_tasks"
        );
      }
    }
  }, []);

  function markTaskStarted(taskId: string) {
    setStartedTaskIds((current) => {
      if (current.includes(taskId)) {
        return current;
      }

      const updated = [...current, taskId];

      sessionStorage.setItem(
        "pablot_started_tasks",
        JSON.stringify(updated)
      );

      return updated;
    });
  }

  function markTaskCompleted(taskId: string) {
    setCompletedTaskIds((current) => {
      if (current.includes(taskId)) {
        return current;
      }

      return [...current, taskId];
    });

    setStartedTaskIds((current) => {
      const updated = current.filter(
        (id) => id !== taskId
      );

      sessionStorage.setItem(
        "pablot_started_tasks",
        JSON.stringify(updated)
      );

      return updated;
    });
  }

  async function verifyAndClaim(task: Task) {
    if (
      processingTaskId ||
      completedTaskIds.includes(task.id)
    ) {
      return;
    }

    setError("");
    setProcessingTaskId(task.id);

    try {
      const webApp = initTelegramWebApp();

      if (!webApp?.initData) {
        throw new Error(
          "Open PABLOT from Telegram first."
        );
      }

      const response = await fetch(
        "/api/tasks/complete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            initData: webApp.initData,
            taskId: task.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data?.code === "NOT_A_MEMBER") {
          throw new Error(
            "You haven't joined the Telegram channel yet. Join it first, then try again."
          );
        }

        throw new Error(
          data?.error ||
            "Unable to complete this task."
        );
      }

      markTaskCompleted(task.id);

      alert(
        `+${data.reward_pp} PP earned!\n\nBalance: ${data.pp_balance} PP`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete this task."
      );
    } finally {
      setProcessingTaskId(null);
    }
  }

  function handleTask(task: Task) {
    if (
      processingTaskId ||
      completedTaskIds.includes(task.id)
    ) {
      return;
    }

    setError("");

    if (task.type === "join_channel") {
      const hasStarted = startedTaskIds.includes(
        task.id
      );

      if (!hasStarted) {
        if (!task.target_url) {
          setError(
            "This Telegram task has no channel link."
          );
          return;
        }

        markTaskStarted(task.id);

        window.open(
          task.target_url,
          "_blank"
        );

        return;
      }

      verifyAndClaim(task);
      return;
    }

    if (task.target_url) {
      window.open(
        task.target_url,
        "_blank"
      );
    }

    verifyAndClaim(task);
  }

  function getButtonLabel(task: Task) {
    if (completedTaskIds.includes(task.id)) {
      return "✓ Completed";
    }

    if (
      processingTaskId === task.id
    ) {
      return "Verifying...";
    }

    if (
      task.type === "join_channel"
    ) {
      return startedTaskIds.includes(task.id)
        ? "Verify & Earn"
        : "Join & Earn";
    }

    if (task.type === "watch") {
      return "Watch & Claim";
    }

    if (
      task.type === "visit"
    ) {
      return "Visit & Claim";
    }

    if (
      task.type === "follow" ||
      task.type === "social"
    ) {
      return "Follow & Verify";
    }

    return "Complete";
  }

  return (
    <main className="min-h-screen bg-[#080d14] pb-28 text-white">
      <div className="mx-auto max-w-md px-4 pt-8">
        <header className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b8f34a]">
            EARN MORE
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Tasks
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/55">
            Complete simple tasks and earn Pablot Points.
          </p>
        </header>

        <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                Daily progress
              </p>

              <p className="mt-1 text-2xl font-black">
                {completedTaskIds.length}
                <span className="text-white/30">
                  /10
                </span>
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-white/40">
                Completed
              </p>

              <p className="mt-1 text-xl font-black text-[#b8f34a]">
                {completedTaskIds.length * 10}%
              </p>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#b8f34a] transition-all duration-500"
              style={{
                width: `${Math.min(
                  completedTaskIds.length * 10,
                  100
                )}%`,
              }}
            />
          </div>
        </section>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm leading-5 text-red-200">
            {error}
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            Available Tasks
          </h2>

          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/55">
            {tasks.length} tasks
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-36 animate-pulse rounded-3xl border border-white/5 bg-white/[0.035]"
              />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 text-center">
            <div className="text-3xl">✨</div>
            <p className="mt-3 font-semibold">
              No tasks available
            </p>
            <p className="mt-1 text-sm text-white/45">
              Check back soon for new earning opportunities.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <article
                key={task.id}
                className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 shadow-lg transition-transform duration-200 active:scale-[0.985]"
              >
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl">
                    {taskIcons[task.type] ?? "⚡"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold">
                          {task.title}
                        </h3>

                        <p className="mt-1 text-xs text-white/40">
                          {taskLabels[task.type] ??
                            "Task"}
                        </p>
                      </div>

                      <div className="shrink-0 rounded-full bg-[#b8f34a]/10 px-3 py-1 text-xs font-black text-[#b8f34a]">
                        +{task.reward_pp} PP
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-5 text-white/55">
                      {task.description}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        handleTask(task)
                      }
                      disabled={
                        processingTaskId !== null ||
                        completedTaskIds.includes(
                          task.id
                        )
                      }
                      className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-bold transition ${
                        completedTaskIds.includes(
                          task.id
                        )
                          ? "bg-white/10 text-white/40"
                          : "bg-[#b8f34a] text-[#071008] shadow-lg shadow-[#b8f34a]/10 active:scale-[0.98]"
                      } disabled:cursor-not-allowed`}
                    >
                      {getButtonLabel(task)}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-bold">
            Completed Tasks
          </h2>

          {completedTaskIds.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.025] p-6 text-center">
              <p className="text-sm text-white/40">
                Your completed tasks will appear here.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl border border-[#b8f34a]/10 bg-[#b8f34a]/[0.035] p-5">
              <p className="text-sm text-white/60">
                You've completed{" "}
                <span className="font-bold text-[#b8f34a]">
                  {completedTaskIds.length}
                </span>{" "}
                task
                {completedTaskIds.length === 1
                  ? ""
                  : "s"}.
              </p>
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
