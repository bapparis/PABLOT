export default function ProfilePage() {
  return (
    <main className="min-h-screen px-4 pb-28 pt-5">
      <div className="mx-auto w-full max-w-md">

        <header className="mb-6">
          <p className="text-xs font-medium text-white/45">
            YOUR ACCOUNT
          </p>

          <h1 className="mt-1 text-3xl font-black tracking-tight">
            Profile
          </h1>
        </header>

        {/* Profile identity */}
        <section className="balance-card relative overflow-hidden rounded-[28px] p-6">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-3xl shadow-xl">
              👤
            </div>

            <div className="min-w-0">
              <p className="text-xl font-black">
                Telegram User
              </p>

              <p className="mt-1 text-sm text-white/40">
                @username
              </p>

              <div className="mt-2 inline-flex rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                PABLOT MEMBER
              </div>
            </div>
          </div>

          {/* PABLOT ID */}
          <div className="relative mt-6 rounded-2xl border border-white/6 bg-black/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">
                PABLOT ID
              </span>

              <span className="text-sm font-black tracking-wider">
                PB-123456
              </span>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-5 grid grid-cols-2 gap-3">
          <div className="glass-panel rounded-[22px] p-5">
            <p className="text-xs text-white/40">
              Total earned
            </p>

            <p className="mt-2 text-2xl font-black">
              0
            </p>

            <p className="mt-1 text-xs font-bold text-emerald-300">
              PP
            </p>
          </div>

          <div className="glass-panel rounded-[22px] p-5">
            <p className="text-xs text-white/40">
              Tasks done
            </p>

            <p className="mt-2 text-2xl font-black">
              0
            </p>

            <p className="mt-1 text-xs text-white/30">
              completed
            </p>
          </div>
        </section>

        {/* Account */}
        <section className="glass-panel mt-5 overflow-hidden rounded-[24px]">

          <div className="border-b border-white/6 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wider text-white/30">
              Account
            </p>
          </div>

          <button className="flex w-full items-center gap-4 px-5 py-4 text-left transition active:bg-white/4">
            <span className="text-lg">🌐</span>

            <span className="flex-1">
              <span className="block text-sm font-bold">
                Language
              </span>

              <span className="mt-1 block text-xs text-white/35">
                English
              </span>
            </span>

            <span className="text-white/25">
              ›
            </span>
          </button>

          <button className="flex w-full items-center gap-4 border-t border-white/6 px-5 py-4 text-left transition active:bg-white/4">
            <span className="text-lg">🔔</span>

            <span className="flex-1">
              <span className="block text-sm font-bold">
                Notifications
              </span>

              <span className="mt-1 block text-xs text-white/35">
                Manage notifications
              </span>
            </span>

            <span className="text-white/25">
              ›
            </span>
          </button>

        </section>

        {/* Wallet */}
        <section className="glass-panel mt-5 rounded-[24px] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-xl">
              💎
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-bold">
                Withdrawal wallet
              </p>

              <p className="mt-1 text-xs text-white/40">
                No wallet connected
              </p>
            </div>

            <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold text-white/40">
              SETUP
            </span>
          </div>
        </section>

        {/* Logout */}
        <button className="mt-5 w-full rounded-2xl border border-red-400/10 bg-red-400/5 py-3.5 text-sm font-bold text-red-300 transition active:scale-[0.98]">
          Log out
        </button>

      </div>

      {/* Navigation */}
      <nav className="floating-nav fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-32px)] max-w-md -translate-x-1/2 items-center justify-around rounded-[24px] px-3 py-2">

        <a href="/" className="nav-link">
          <span>⌂</span>
          <span>Home</span>
        </a>

        <a href="/tasks" className="nav-link">
          <span>✓</span>
          <span>Tasks</span>
        </a>

        <a href="/referrals" className="nav-link">
          <span>🎁</span>
          <span>Refer</span>
        </a>

        <a href="/profile" className="nav-link active-nav">
          <span>◉</span>
          <span>Profile</span>
        </a>

      </nav>
    </main>
  );
}
