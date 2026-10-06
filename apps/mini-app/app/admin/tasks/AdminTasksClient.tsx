"use client";

import { FormEvent, useEffect, useState } from "react";
import AdminShell from "../AdminShell";

type TaskType =
  | "join_channel"
  | "follow"
  | "visit"
  | "watch"
  | "watch_ads"
  | "social"
  | "custom";

type WatchProvider = "monetag" | "adsgram" | "adsterra";

type WatchConfig = {
  provider: WatchProvider;
  ads_required: number;
  watch_duration_seconds: number;
  cooldown_seconds: number;
  pinned: boolean;
  pin_order: number | null;
};

type Task = {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  reward_pp: number;
  target_url: string | null;
  proof_required: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  completion_count: number;
  watch_config?: WatchConfig | null;
};

const taskTypes: { value: TaskType; label: string }[] = [
  { value: "join_channel", label: "Join Channel" },
  { value: "follow", label: "Follow" },
  { value: "visit", label: "Visit" },
  { value: "watch", label: "Watch" },
  { value: "watch_ads", label: "Watch Ads" },
  { value: "social", label: "Social" },
  { value: "custom", label: "Custom" },
];

const emptyForm = {
  title: "",
  description: "",
  type: "custom" as TaskType,
  reward_pp: "10",
  target_url: "",
  proof_required: false,
  watch_provider: "monetag" as WatchProvider,
  watch_ads_required: "1",
  watch_duration_seconds: "30",
  watch_cooldown_seconds: "86400",
  watch_pinned: false,
  watch_pin_order: "",
};

export default function AdminTasksClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function loadTasks() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/tasks", {
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.href = "/admin";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load tasks.");
      }

      setTasks(data.tasks ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load tasks."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  function openCreateForm() {
    setEditingTask(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
    setShowForm(true);
  }

  function openEditForm(task: Task) {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description,
      type: task.type,
      reward_pp: String(task.reward_pp),
      target_url: task.target_url ?? "",
      proof_required: task.proof_required,
      watch_provider: task.watch_config?.provider ?? "monetag",
      watch_ads_required: String(task.watch_config?.ads_required ?? 1),
      watch_duration_seconds: String(
        task.watch_config?.watch_duration_seconds ?? 30
      ),
      watch_cooldown_seconds: String(
        task.watch_config?.cooldown_seconds ?? 86400
      ),
      watch_pinned: task.watch_config?.pinned ?? false,
      watch_pin_order:
        task.watch_config?.pin_order != null
          ? String(task.watch_config.pin_order)
          : "",
    });
    setMessage("");
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingTask(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    const reward = Number(form.reward_pp);

    if (!Number.isInteger(reward) || reward <= 0) {
      setError("Reward must be a positive whole number.");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        title: form.title,
        description: form.description,
        type: form.type,
        reward_pp: reward,
        target_url: form.target_url || null,
        proof_required: form.proof_required,
        ...(form.type === "watch_ads"
          ? {
              watch_config: {
                provider: form.watch_provider,
                ads_required: Number(form.watch_ads_required),
                watch_duration_seconds: Number(
                  form.watch_duration_seconds
                ),
                cooldown_seconds: Number(
                  form.watch_cooldown_seconds
                ),
                pinned: form.watch_pinned,
                pin_order: form.watch_pin_order
                  ? Number(form.watch_pin_order)
                  : null,
              },
            }
          : {}),
      };

      const response = await fetch(
        editingTask
          ? `/api/admin/tasks/${editingTask.id}`
          : "/api/admin/tasks",
        {
          method: editingTask ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.status === 401) {
        window.location.href = "/admin";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save task.");
      }

      setMessage(
        editingTask ? "Task updated successfully." : "Task created successfully."
      );

      setShowForm(false);
      setEditingTask(null);
      setForm(emptyForm);

      await loadTasks();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save task."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task: Task) {
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active: !task.active,
        }),
      });

      if (response.status === 401) {
        window.location.href = "/admin";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update task.");
      }

      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? { ...item, active: data.task.active }
            : item
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update task."
      );
    }
  }

  async function deleteTask(task: Task) {
    if (task.completion_count > 0) {
      setError(
        "This task has completion history. Deactivate it instead."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete "${task.title}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        window.location.href = "/admin";
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete task.");
      }

      setTasks((current) =>
        current.filter((item) => item.id !== task.id)
      );

      setMessage("Task deleted successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete task."
      );
    }
  }

  return (
    <AdminShell>
    <main className="relative min-h-screen overflow-hidden bg-[#070B12] px-4 py-6 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(89,217,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(89,217,255,.7) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          maskImage: "linear-gradient(to bottom, black 0%, transparent 85%)",
        }}
      />

      <div className="pointer-events-none absolute -right-24 top-24 h-64 w-64 rounded-full bg-[#59D9FF]/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-[42%] h-72 w-72 rounded-full bg-[#3388FF]/5 blur-3xl" />
      <div className="pointer-events-none absolute right-[25%] bottom-0 h-52 w-52 rounded-full bg-[#3388FF]/[0.03] blur-3xl" />

      <div className="relative mx-auto w-full max-w-3xl">
        <header className="relative mb-6 overflow-hidden rounded-[26px] border border-[#59D9FF]/10 bg-[linear-gradient(145deg,rgba(89,217,255,.055),rgba(255,255,255,.02))] p-5 shadow-[0_20px_60px_rgba(0,0,0,.25)]">
          <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-[#59D9FF]/5 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-20 h-36 w-36 rounded-full bg-[#3388FF]/5 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#59D9FF] shadow-[0_0_14px_rgba(89,217,255,.8)]" />
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#59D9FF]">
                  PABLOT CONTROL
                </p>
              </div>

              <h1 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                Task Engine
              </h1>

              <p className="mt-1 max-w-sm text-sm leading-5 text-white/40">
                Configure, monitor and control the earning task system.
              </p>
            </div>


          </div>

          <div className="relative mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/25">
            <span>Administration</span>
            <span>•</span>
            <span className="text-[#59D9FF]/70">Task Management</span>
          </div>
        </header>

        <section className="mb-5 rounded-[24px] border border-[#59D9FF]/10 bg-white/[0.025] p-4 shadow-[0_20px_60px_rgba(0,0,0,.25)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#59D9FF]">
                PLATFORM PULSE
              </p>
              <p className="mt-1 text-xs text-white/35">
                Task engine status
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-[#59D9FF]/15 bg-[#59D9FF]/5 px-3 py-1.5 text-[10px] font-black text-[#59D9FF]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#59D9FF] shadow-[0_0_12px_rgba(89,217,255,.8)]" />
              LIVE
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/10 px-3 py-3">
              <div className="pointer-events-none absolute -right-5 -top-5 h-12 w-12 rounded-full bg-white/[0.03] blur-xl" />
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/30">
                Tasks
              </p>
              <p className="mt-1 text-xl font-black tracking-tight">
                {tasks.length}
              </p>
              <p className="mt-1 text-[9px] font-bold text-white/20">
                Configured
              </p>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-[#59D9FF]/10 bg-[#59D9FF]/[0.025] px-3 py-3">
              <div className="pointer-events-none absolute -right-5 -top-5 h-12 w-12 rounded-full bg-[#59D9FF]/10 blur-xl" />
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#59D9FF]/60">
                Active
              </p>
              <p className="mt-1 text-xl font-black tracking-tight text-[#59D9FF]">
                {tasks.filter((task) => task.active).length}
              </p>
              <p className="mt-1 text-[9px] font-bold text-white/20">
                Running
              </p>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/10 px-3 py-3">
              <div className="pointer-events-none absolute -right-5 -top-5 h-12 w-12 rounded-full bg-[#3388FF]/10 blur-xl" />
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/30">
                Completed
              </p>
              <p className="mt-1 text-xl font-black tracking-tight">
                {tasks.reduce(
                  (sum, task) => sum + task.completion_count,
                  0
                )}
              </p>
              <p className="mt-1 text-[9px] font-bold text-white/20">
                All time
              </p>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-[#3388FF]/10 bg-[#3388FF]/[0.025] px-3 py-3">
              <div className="pointer-events-none absolute -right-5 -top-5 h-12 w-12 rounded-full bg-[#3388FF]/10 blur-xl" />
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#59D9FF]/60">
                PP / Cycle
              </p>
              <p className="mt-1 text-xl font-black tracking-tight text-[#59D9FF]">
                {tasks.reduce(
                  (sum, task) => sum + task.reward_pp,
                  0
                )}
              </p>
              <p className="mt-1 text-[9px] font-bold text-white/20">
                Reward pool
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="group relative mt-3 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border border-[#59D9FF]/30 bg-[#59D9FF] px-4 py-3 text-sm font-black text-black shadow-[0_10px_35px_rgba(89,217,255,.12)] transition hover:bg-[#6DE0FF] active:scale-[0.98]"
          >
            <span className="text-base leading-none transition-transform group-hover:rotate-90">
              +
            </span>
            Add Task
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/60" />
          </button>
        </section>

        {message && (
          <div
            role="status"
            className="mb-4 flex items-center gap-3 rounded-2xl border border-[#59D9FF]/15 bg-[#59D9FF]/[0.06] px-4 py-3 text-sm font-semibold text-[#59D9FF] shadow-[0_10px_35px_rgba(89,217,255,.05)]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#59D9FF]/20 bg-[#59D9FF]/10 text-xs">
              ✓
            </span>
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-3 rounded-2xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-sm font-semibold text-red-300"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-red-400/20 bg-red-400/10 text-xs">
              !
            </span>
            <span>{error}</span>
          </div>
        )}

        {showForm && (
          <section className="relative mb-6 overflow-hidden rounded-[26px] border border-[#59D9FF]/10 bg-[linear-gradient(145deg,rgba(89,217,255,.045),rgba(255,255,255,.02))] p-4 shadow-[0_24px_70px_rgba(0,0,0,.28)]">
            <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-[#3388FF]/5 blur-3xl" />

            <div className="relative mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#59D9FF]/15 bg-[#59D9FF]/5 text-xs text-[#59D9FF] shadow-[0_0_18px_rgba(89,217,255,.08)]">
                    ⚙
                  </span>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#59D9FF]">
                      TASK CONFIGURATION
                    </p>
                    <span className="h-1 w-1 rounded-full bg-[#59D9FF]/50" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/20">
                      {editingTask ? "EDIT MODE" : "NEW TASK"}
                    </span>
                  </div>
                </div>

                <h2 className="mt-2 text-xl font-black tracking-tight">
                  {editingTask ? "Edit Task" : "Create Task"}
                </h2>

                <p className="mt-1 text-xs text-white/40">
                  Configure the task users will see.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="relative rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs font-bold text-white/45 transition active:scale-[0.97] hover:border-white/15 hover:bg-white/5 hover:text-white disabled:opacity-40"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-white/50">
                  TITLE
                </span>
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  required
                  maxLength={120}
                  placeholder="Join our Telegram"
                  className="w-full rounded-xl border border-white/10 bg-[#05090F]/70 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/20 focus:border-[#59D9FF]/45 focus:bg-[#070D15] focus:shadow-[0_0_0_3px_rgba(89,217,255,.05)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-white/50">
                  DESCRIPTION
                </span>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description: event.target.value,
                    })
                  }
                  rows={3}
                  maxLength={300}
                  placeholder="Join the official PABLOT channel."
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#05090F]/70 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/20 focus:border-[#59D9FF]/45 focus:bg-[#070D15] focus:shadow-[0_0_0_3px_rgba(89,217,255,.05)]"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-white/50">
                    TYPE
                  </span>
                  <select
                    value={form.type}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        type: event.target.value as TaskType,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#05090F]/70 px-4 py-3 text-base text-white outline-none transition focus:border-[#59D9FF]/45 focus:bg-[#070D15] focus:shadow-[0_0_0_3px_rgba(89,217,255,.05)]"
                  >
                    {taskTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-white/50">
                    REWARD (PP)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={1000000}
                    step={1}
                    value={form.reward_pp}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        reward_pp: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#05090F]/70 px-4 py-3 text-base text-white outline-none transition focus:border-[#59D9FF]/45 focus:bg-[#070D15] focus:shadow-[0_0_0_3px_rgba(89,217,255,.05)]"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-white/50">
                  TARGET URL
                </span>
                <input
                  type="url"
                  value={form.target_url}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      target_url: event.target.value,
                    })
                  }
                  placeholder="https://example.com"
                  className="w-full rounded-xl border border-white/10 bg-[#05090F]/70 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/20 focus:border-[#59D9FF]/45 focus:bg-[#070D15] focus:shadow-[0_0_0_3px_rgba(89,217,255,.05)]"
                />
              </label>

              {form.type === "watch_ads" && (
                <div className="relative overflow-hidden rounded-2xl border border-[#59D9FF]/15 bg-[#59D9FF]/[0.025] p-3">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[#59D9FF]/5 blur-2xl" />

                  <div className="relative mb-3 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#59D9FF]/15 bg-[#59D9FF]/5 text-xs text-[#59D9FF]">
                      📺
                    </span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#59D9FF]">
                        WATCH ADS CONFIG
                      </p>
                      <p className="mt-0.5 text-[10px] text-white/25">
                        Internal provider and cycle controls
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-white/40">
                        PROVIDER
                      </span>
                      <select
                        value={form.watch_provider}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            watch_provider:
                              event.target.value as WatchProvider,
                          })
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#05090F]/70 px-3 py-3 text-sm text-white outline-none transition focus:border-[#59D9FF]/45 focus:bg-[#070D15]"
                      >
                        <option value="monetag">Monetag</option>
                        <option value="adsgram">Adsgram</option>
                        <option value="adsterra">Adsterra</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-white/40">
                        ADS REQUIRED
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        step={1}
                        value={form.watch_ads_required}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            watch_ads_required: event.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#05090F]/70 px-3 py-3 text-sm text-white outline-none transition focus:border-[#59D9FF]/45 focus:bg-[#070D15]"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-white/40">
                        WATCH DURATION
                      </span>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={3600}
                          step={1}
                          value={form.watch_duration_seconds}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              watch_duration_seconds:
                                event.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-white/10 bg-[#05090F]/70 px-3 py-3 pr-16 text-sm text-white outline-none transition focus:border-[#59D9FF]/45 focus:bg-[#070D15]"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/25">
                          seconds
                        </span>
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-white/40">
                        COOLDOWN
                      </span>
                      <select
                        value={form.watch_cooldown_seconds}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            watch_cooldown_seconds:
                              event.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#05090F]/70 px-3 py-3 text-sm text-white outline-none transition focus:border-[#59D9FF]/45 focus:bg-[#070D15]"
                      >
                        <option value="0">No cooldown</option>
                        <option value="3600">1 hour</option>
                        <option value="21600">6 hours</option>
                        <option value="43200">12 hours</option>
                        <option value="86400">24 hours</option>
                        <option value="172800">2 days</option>
                        <option value="604800">7 days</option>
                        <option value="2592000">30 days</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#05090F]/60 px-3 py-3 transition has-[:checked]:border-[#59D9FF]/20 has-[:checked]:bg-[#59D9FF]/[0.035]">
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-white/70">
                          Pin task
                        </span>
                        <span className="mt-0.5 block text-[10px] text-white/25">
                          Keep this task near the top.
                        </span>
                      </span>

                      <span className="relative shrink-0">
                        <input
                          type="checkbox"
                          checked={form.watch_pinned}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              watch_pinned: event.target.checked,
                            })
                          }
                          className="peer sr-only"
                        />
                        <span
                          className={`block h-7 w-12 rounded-full border p-1 transition ${
                            form.watch_pinned
                              ? "border-[#59D9FF]/30 bg-[#59D9FF]/15"
                              : "border-white/10 bg-white/5"
                          }`}
                        >
                          <span
                            className={`block h-5 w-5 rounded-full transition-transform ${
                              form.watch_pinned
                                ? "translate-x-5 bg-[#59D9FF] shadow-[0_0_12px_rgba(89,217,255,.7)]"
                                : "translate-x-0 bg-white/25"
                            }`}
                          />
                        </span>
                      </span>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-white/40">
                        PIN ORDER
                      </span>
                      <select
                        value={form.watch_pin_order}
                        disabled={!form.watch_pinned}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            watch_pin_order: event.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#05090F]/70 px-3 py-3 text-sm text-white outline-none transition disabled:cursor-not-allowed disabled:opacity-30 focus:border-[#59D9FF]/45 focus:bg-[#070D15]"
                      >
                        <option value="">Automatic</option>
                        <option value="1">Position 1</option>
                        <option value="2">Position 2</option>
                        <option value="3">Position 3</option>
                        <option value="4">Position 4</option>
                        <option value="5">Position 5</option>
                      </select>
                    </label>
                  </div>
                </div>
              )}

              <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#05090F]/60 px-4 py-3 transition has-[:checked]:border-[#59D9FF]/20 has-[:checked]:bg-[#59D9FF]/[0.035]">
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white/75">
                    Require proof
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-white/30">
                    Users must submit proof before approval.
                  </span>
                </span>

                <span className="relative shrink-0">
                  <input
                    type="checkbox"
                    checked={form.proof_required}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        proof_required: event.target.checked,
                      })
                    }
                    className="peer sr-only"
                  />
                  <span
                    className={`block h-7 w-12 rounded-full border p-1 transition ${
                      form.proof_required
                        ? "border-[#59D9FF]/30 bg-[#59D9FF]/15"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <span
                      className={`block h-5 w-5 rounded-full transition-transform ${
                        form.proof_required
                          ? "translate-x-5 bg-[#59D9FF] shadow-[0_0_12px_rgba(89,217,255,.7)]"
                          : "translate-x-0 bg-white/25"
                      }`}
                    />
                  </span>
                </span>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-[#59D9FF]/30 bg-[#59D9FF] px-4 py-3 text-sm font-black text-black shadow-[0_10px_35px_rgba(89,217,255,.12)] transition hover:bg-[#6DE0FF] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-base leading-none">
                  {saving ? "•" : editingTask ? "✓" : "+"}
                </span>
                <span>
                  {saving
                    ? "Saving..."
                    : editingTask
                      ? "Save Changes"
                      : "Create Task"}
                </span>
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/60" />
              </button>
            </form>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#59D9FF] shadow-[0_0_10px_rgba(89,217,255,.7)]" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#59D9FF]">
                  TASK ENGINE
                </p>
                <p className="mt-0.5 text-xs text-white/30">
                  Active task configuration
                </p>
              </div>
            </div>

            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-black text-white/40">
              {tasks.length} total
            </span>
          </div>

          {loading ? (
            <div className="rounded-[20px] border border-[#59D9FF]/10 bg-white/[0.025] px-4 py-8 text-center">
              <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-[#59D9FF]/15 bg-[#59D9FF]/5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#59D9FF] shadow-[0_0_12px_rgba(89,217,255,.8)]" />
              </div>
              <p className="text-sm font-bold text-white/60">
                Loading task engine
              </p>
              <p className="mt-1 text-xs text-white/25">
                Synchronizing task configuration...
              </p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-[20px] border border-[#59D9FF]/10 bg-white/[0.025] px-4 py-10 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[#59D9FF]/15 bg-[#59D9FF]/5 text-lg font-black text-[#59D9FF]">
                +
              </div>
              <p className="font-bold text-white/70">
                No tasks configured
              </p>
              <p className="mt-1 text-xs text-white/25">
                Create your first earning task to activate the task engine.
              </p>
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/[0.06] bg-black/[0.08] p-2.5 shadow-[0_20px_60px_rgba(0,0,0,.18)]">
              <div className="space-y-2.5">
                {tasks.map((task) => (
                <article
                  key={task.id}
                  className={`group relative overflow-hidden rounded-[20px] border p-3 transition ${
                    task.active
                      ? "border-[#59D9FF]/10 bg-[linear-gradient(145deg,rgba(89,217,255,.055),rgba(255,255,255,.025))] shadow-[0_18px_50px_rgba(0,0,0,.22)]"
                      : "border-white/10 bg-white/[0.025]"
                  }`}
                >
                  <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-[#3388FF]/5 blur-3xl transition group-hover:bg-[#3388FF]/10" />
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#59D9FF]/15 bg-[#59D9FF]/5 text-[10px] font-black text-[#59D9FF]">
                          {task.type === "join_channel"
                            ? "TG"
                            : task.type === "watch_ads"
                              ? "📺"
                              : task.type === "watch"
                                ? "▶"
                                : task.type === "visit"
                                ? "↗"
                                : "•"}
                        </span>

                        <h3 className="font-black tracking-tight">
                          {task.title}
                        </h3>

                        <span
                          className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wide ${
                            task.active
                              ? "border-[#59D9FF]/15 bg-[#59D9FF]/10 text-[#59D9FF]"
                              : "border-red-400/15 bg-red-400/[0.05] text-red-300/60"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              task.active
                                ? "bg-[#59D9FF] shadow-[0_0_8px_rgba(89,217,255,.8)]"
                                : "bg-red-400/60"
                            }`}
                          />
                          {task.active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-white/45">
                        {task.description || "No description"}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
                        <span className="rounded-md bg-white/5 px-2 py-1 text-white/50">
                          {task.type === "watch_ads" ? "watch_ads" : task.type}
                        </span>

                        <span className="rounded-lg bg-[#59D9FF]/10 px-2 py-1 text-[#59D9FF]">
                          +{task.reward_pp} PP
                        </span>

                        {task.type === "watch_ads" && task.watch_config && (
                          <>
                            <span className="rounded-md bg-[#59D9FF]/5 px-2 py-1 text-[#59D9FF]/70">
                              {task.watch_config.ads_required} ads
                            </span>
                            <span className="rounded-md bg-white/5 px-2 py-1 text-white/40">
                              {task.watch_config.cooldown_seconds === 0
                                ? "No cooldown"
                                : `${Math.round(
                                    task.watch_config.cooldown_seconds / 3600
                                  )}h cooldown`}
                            </span>
                            {task.watch_config.pinned && (
                              <span className="rounded-md bg-[#59D9FF]/5 px-2 py-1 text-[#59D9FF]/70">
                                PIN {task.watch_config.pin_order ?? "AUTO"}
                              </span>
                            )}
                          </>
                        )}

                        <span className="rounded-md bg-white/5 px-2 py-1 text-white/50">
                          {task.completion_count} completed
                        </span>

                        {task.proof_required && (
                          <span className="rounded-md bg-white/5 px-2 py-1 text-white/50">
                            Proof required
                          </span>
                        )}
                      </div>

                      {task.target_url && (
                        <p className="mt-2 truncate text-xs text-white/25">
                          {task.target_url}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-1.5 border-t border-white/5 pt-3 sm:ml-4 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => openEditForm(task)}
                        aria-label={`Edit ${task.title}`}
                        title="Edit task"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#59D9FF]/15 bg-[#59D9FF]/5 text-[#59D9FF] transition active:scale-[0.92] hover:bg-[#59D9FF]/10"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleTask(task)}
                        aria-label={task.active ? `Disable ${task.title}` : `Enable ${task.title}`}
                        title={task.active ? "Disable task" : "Enable task"}
                        className={`relative h-8 w-14 rounded-full border p-1 transition active:scale-[0.94] ${
                          task.active
                            ? "border-[#59D9FF]/30 bg-[#59D9FF]/15"
                            : "border-red-400/25 bg-red-400/10"
                        }`}
                      >
                        <span
                          className={`block h-5 w-5 rounded-full shadow-[0_0_12px_rgba(0,0,0,.35)] transition-transform ${
                            task.active
                              ? "translate-x-5 bg-[#59D9FF]"
                              : "translate-x-0 bg-red-400"
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteTask(task)}
                        disabled={task.completion_count > 0}
                        aria-label={`Delete ${task.title}`}
                        title={
                          task.completion_count > 0
                            ? "Tasks with completion history cannot be deleted."
                            : "Delete task"
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-400/15 bg-red-400/[0.04] text-red-300/70 transition active:scale-[0.92] hover:bg-red-400/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-20"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="m19 6-1 14H6L5 6" />
                          <path d="M10 11v5" />
                          <path d="M14 11v5" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
    </AdminShell>
  );
}
