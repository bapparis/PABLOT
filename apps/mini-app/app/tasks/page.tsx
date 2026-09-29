import BottomNav from "@/components/BottomNav";
const tasks = [
  {
    icon: "✈️",
    title: "Join our Telegram",
    description: "Join the official PABLOT channel",
    reward: "+50 PP",
    type: "Telegram",
  },
  {
    icon: "▶️",
    title: "Watch a video",
    description: "Watch and complete the task",
    reward: "+10 PP",
    type: "Video",
  },
  {
    icon: "🔗",
    title: "Visit a website",
    description: "Visit the sponsored page",
    reward: "+20 PP",
    type: "Website",
  },
  {
    icon: "📣",
    title: "Follow a channel",
    description: "Follow the required channel",
    reward: "+25 PP",
    type: "Social",
  },
];

export default function TasksPage() {
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

        {/* Progress */}
        <section className="balance-card rounded-[26px] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white/45">
                TODAY
              </p>

              <p className="mt-1 text-xl font-black">
                0 <span className="text-sm text-white/40">/ 10 tasks</span>
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
              {tasks.length}
            </span>
          </div>

          <div className="space-y-3">
            {tasks.map((task) => (
              <button
                key={task.title}
                className="task-card group flex w-full items-center gap-4 rounded-[22px] p-4 text-left"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/6 text-xl transition-transform duration-200 group-active:scale-90">
                  {task.icon}
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
                    {task.type}
                  </p>
                </div>

                <div className="shrink-0 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
                  {task.reward}
                </div>
              </button>
            ))}
          </div>
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

      {/* Floating navigation */}
      <BottomNav />
    </main>
  );
}
