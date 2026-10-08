"use client";

import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { initTelegramWebApp } from "@/lib/telegram";

interface WatchCycle {
  status: string;
  ads_completed: number;
  available_at: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  reward_pp: number;
  target_url: string | null;
  proof_required: boolean;
  watch_config?: {
    ads_required: number;
    watch_duration_seconds: number;
    cooldown_seconds: number;
    pinned: boolean;
    pin_order: number | null;
  } | null;
}

const taskIcons: Record<string, string> = {
  join_channel: "✈️",
  follow: "📣",
  visit: "🔗",
  watch: "▶️",
  social: "📣",
  custom: "⚡",
  watch_ads: "📺",
};

const taskLabels: Record<string, string> = {
  join_channel: "Telegram",
  follow: "Social",
  visit: "Website",
  watch: "Video",
  social: "Social",
  custom: "Task",
  watch_ads: "Watch Ads",
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
  const [watchProgress, setWatchProgress] = useState<
    Record<string, { adsCompleted: number; adsRequired: number }>
  >({});
  const [watchCycles, setWatchCycles] = useState<
    Record<string, WatchCycle>
  >({});
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const availableTasks = useMemo(
    () =>
      tasks.filter(
        (task) => !completedTaskIds.includes(task.id)
      ),
    [tasks, completedTaskIds]
  );

  const completedTasks = useMemo(
    () =>
      tasks.filter((task) =>
        completedTaskIds.includes(task.id)
      ),
    [tasks, completedTaskIds]
  );

  async function startWatchTask(task: Task) {
    if (processingTaskId !== null || completedTaskIds.includes(task.id)) {
      return;
    }

    const webApp = initTelegramWebApp();
    const initData = webApp?.initData;

    if (!initData) {
      setError("Open PABLOT inside Telegram to watch ads.");
      return;
    }

    try {
      setError("");
      setProcessingTaskId(task.id);

      const startResponse = await fetch("/api/tasks/watch/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initData,
          taskId: task.id,
        }),
      });

      const startData = await startResponse.json();

      if (!startResponse.ok) {
        throw new Error(
          startData?.error || "Unable to start Watch Ads."
        );
      }

      const adsRequired = Math.max(
        1,
        Number(
          startData?.ads_required ??
            task.watch_config?.ads_required ??
            1
        )
      );

      let adsCompleted = Math.max(
        0,
        Number(startData?.ads_completed ?? 0)
      );

      setWatchProgress((current) => ({
        ...current,
        [task.id]: {
          adsCompleted,
          adsRequired,
        },
      }));

      markTaskStarted(task.id);

      for (; adsCompleted < adsRequired; adsCompleted += 1) {
        const attemptResponse = await fetch(
          "/api/tasks/watch/attempt",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              initData,
              taskId: task.id,
            }),
          }
        );

        const attemptData = await attemptResponse.json();

        if (!attemptResponse.ok) {
          throw new Error(
            attemptData?.error ||
              "Unable to prepare the Watch Ads attempt."
          );
        }

        const attemptId = attemptData?.attempt_id;

        if (!attemptId) {
          throw new Error(
            "Watch Ads attempt could not be prepared."
          );
        }

        if (typeof Adsgram === "undefined") {
          throw new Error(
            "Ads are not ready yet. Please try again."
          );
        }

        const adController = Adsgram.init({
          blockId: "51135",
        });

        const result = await adController.show();

        if (!result?.done || result?.error) {
          throw new Error(
            "Please complete the rewarded ad to earn PP."
          );
        }

        let confirmed = false;

        for (let poll = 0; poll < 20; poll += 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1500)
          );

          const rewardResponse = await fetch(
            `/api/tasks/watch/adsgram/reward?userid=${encodeURIComponent(
              String(
                webApp?.initDataUnsafe?.user?.id ?? ""
              )
            )}`,
            {
              cache: "no-store",
            }
          );

          const rewardData = await rewardResponse.json();

          if (rewardResponse.ok && rewardData?.confirmed) {
            confirmed = true;
            break;
          }
        }

        if (!confirmed) {
          throw new Error(
            "Ad completed, but confirmation is still pending. Please try again shortly."
          );
        }

        const completeResponse = await fetch(
          "/api/tasks/watch/complete",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              initData,
              attemptId,
            }),
          }
        );

        const completeData = await completeResponse.json();

        if (!completeResponse.ok) {
          throw new Error(
            completeData?.error ||
              "Unable to confirm the Watch Ads reward."
          );
        }

        const nextAdsCompleted = Math.max(
          0,
          Number(
            completeData?.ads_completed ??
              adsCompleted + 1
          )
        );

        setWatchProgress((current) => ({
          ...current,
          [task.id]: {
            adsCompleted: nextAdsCompleted,
            adsRequired: Math.max(
              1,
              Number(
                completeData?.ads_required ??
                  adsRequired
              )
            ),
          },
        }));

        if (completeData?.status === "completed") {
          setCompletedTaskIds((current) =>
            current.includes(task.id)
              ? current
              : [...current, task.id]
          );

          setStartedTaskIds((current) =>
            current.filter((id) => id !== task.id)
          );

          setError(`+${Number(completeData?.reward_pp ?? 0)} PP earned!`);

          break;
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete Watch Ads. Please try again."
      );
    } finally {
      setProcessingTaskId(null);
    }
  }

  async function loadTasks() {
    try {
      setError("");

      const webApp = initTelegramWebApp();

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

      if (webApp?.initData) {
        const watchStatusResponse = await fetch(
          "/api/tasks/watch/status",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              initData: webApp.initData,
            }),
            cache: "no-store",
          }
        );

        const watchStatusData =
          await watchStatusResponse.json();

        if (watchStatusResponse.ok) {
          setWatchCycles(
            watchStatusData.cycles ?? {}
          );
        }
      }

      if (webApp?.initData) {
        const completedResponse = await fetch(
          "/api/tasks/completed",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              initData: webApp.initData,
            }),
            cache: "no-store",
          }
        );

        const completedData =
          await completedResponse.json();

        if (completedResponse.ok) {
          setCompletedTaskIds(
            completedData.completedTaskIds ?? []
          );
        }
      }
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

    const saved = sessionStorage.getItem(
      "pablot_started_tasks"
    );

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

        if (response.status === 409) {
          markTaskCompleted(task.id);

          throw new Error(
            "This task was already completed."
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

    if (task.type === "watch_ads") {
      startWatchTask(task);
      return;
    }

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

  function formatCooldown(
    availableAt: string | null
  ) {
    if (!availableAt) {
      return null;
    }

    const remaining = Math.max(
      0,
      new Date(availableAt).getTime() - now
    );

    if (remaining <= 0) {
      return null;
    }

    const totalSeconds = Math.ceil(
      remaining / 1000
    );

    const hours = Math.floor(
      totalSeconds / 3600
    );

    const minutes = Math.floor(
      (totalSeconds % 3600) / 60
    );

    const seconds = totalSeconds % 60;

    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(seconds).padStart(2, "0"),
    ].join(":");
  }

  function getButtonLabel(task: Task) {
    if (completedTaskIds.includes(task.id)) {
      return "✓";
    }

    if (processingTaskId === task.id) {
      return "...";
    }

    if (task.type === "join_channel") {
      return startedTaskIds.includes(task.id)
        ? "Verify"
        : "Join";
    }

    if (task.type === "watch_ads") {
      const cooldown = formatCooldown(
        watchCycles[task.id]?.available_at ?? null
      );

      if (cooldown) {
        return cooldown;
      }

      const progress = watchProgress[task.id];

      if (progress) {
        return `${progress.adsCompleted}/${progress.adsRequired}`;
      }

      return "WATCH";
    }

    if (task.type === "watch") {
      return "Watch";
    }

    if (task.type === "visit") {
      return "Visit";
    }

    if (
      task.type === "follow" ||
      task.type === "social"
    ) {
      return "Follow";
    }

    return "Go";
  }

  return (
    <main className="min-h-screen bg-[#080d14] pb-28 text-white">
      <div className="mx-auto max-w-md px-4 pt-7">
        <header className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b8f34a]">
            EARN MORE
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-tight">
            Tasks
          </h1>

          <p className="mt-1 text-xs text-white/45">
            Complete tasks and earn Pablot Points.
          </p>
        </header>

        <section className="mb-5 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-white/35">
                Daily progress
              </p>

              <p className="mt-0.5 text-lg font-black">
                {completedTaskIds.length}
                <span className="text-white/25">
                  /10
                </span>
              </p>
            </div>

            <div className="text-right">
              <p className="text-[9px] text-white/35">
                Completed
              </p>

              <p className="mt-0.5 text-base font-black text-[#b8f34a]">
                {Math.min(
                  completedTaskIds.length * 10,
                  100
                )}
                %
              </p>
            </div>
          </div>

          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
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
          <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs leading-4 text-red-200">
            {error}
          </div>
        )}

        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
          <h2 className="text-sm font-bold">
            Available Tasks
          </h2>

          <span className="text-xs font-bold text-white/40">
            {availableTasks.length}
          </span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-2xl border border-white/5 bg-white/[0.035]"
              />
            ))}
          </div>
        ) : availableTasks.length === 0 ? (
          <div className="rounded-2xl border border-[#b8f34a]/15 bg-[#b8f34a]/[0.035] p-5 text-center">
            <div className="text-2xl">🎉</div>

            <p className="mt-2 text-sm font-semibold">
              All tasks completed!
            </p>

            <p className="mt-1 text-xs text-white/40">
              Check back later for new tasks.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {availableTasks.map((task) => (
              <article
                key={task.id}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2.5 shadow-md"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-base">
                  {taskIcons[task.type] ?? "⚡"}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-xs font-bold">
                      {task.title}
                    </h3>

                    <span className="shrink-0 text-[9px] font-black text-[#b8f34a]">
                      +{task.reward_pp}
                    </span>
                  </div>

                  <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-white/50">
                    {task.description}
                  </p>

                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="text-[9px] text-white/25">
                      {taskLabels[task.type] ?? "Task"}
                    </p>

                    {task.type === "watch_ads" && (
                      <span className="rounded-full bg-[#b8f34a]/10 px-1.5 py-0.5 text-[8px] font-bold text-[#b8f34a]">
                        {task.watch_config?.ads_required ?? 1}{" "}
                        {(task.watch_config?.ads_required ?? 1) === 1
                          ? "AD"
                          : "ADS"}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleTask(task)}
                  disabled={
                    processingTaskId !== null ||
                    Boolean(
                      task.type === "watch_ads" &&
                        formatCooldown(
                          watchCycles[task.id]?.available_at ?? null
                        )
                    )
                  }
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    task.type === "watch_ads" &&
                    formatCooldown(
                      watchCycles[task.id]?.available_at ?? null
                    )
                      ? "bg-white/10 text-white/55"
                      : "bg-[#b8f34a] text-[#071008] active:scale-95"
                  }`}
                >
                  {getButtonLabel(task)}
                </button>
              </article>
            ))}
          </div>
        )}

        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
            <h2 className="text-sm font-bold">
              Completed Tasks
            </h2>

            <span className="text-xs font-bold text-[#b8f34a]">
              {completedTasks.length}
            </span>
          </div>

          {completedTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-4 text-center">
              <p className="text-xs text-white/35">
                Your completed tasks will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <article
                  key={task.id}
                  className="flex items-center gap-3 rounded-2xl border border-[#b8f34a]/10 bg-[#b8f34a]/[0.035] px-3 py-2.5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#b8f34a]/10 text-base">
                    {taskIcons[task.type] ?? "⚡"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-xs font-bold text-white/70">
                      {task.title}
                    </h3>

                    <p className="mt-0.5 text-[9px] text-white/30">
                      Completed • +{task.reward_pp} PP
                    </p>
                  </div>

                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#b8f34a]/10 text-xs font-black text-[#b8f34a]">
                    ✓
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
