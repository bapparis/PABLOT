import BottomNav from "@/components/BottomNav";
export default function ReferralsPage() {
  return (
    <main className="min-h-screen px-4 pb-28 pt-5">
      <div className="mx-auto w-full max-w-md">

        <header className="mb-6">
          <p className="text-xs font-medium text-white/45">
            GROW WITH PABLOT
          </p>

          <h1 className="mt-1 text-3xl font-black tracking-tight">
            Referrals
          </h1>

          <p className="mt-2 text-sm text-white/45">
            Invite friends and unlock referral rewards.
          </p>
        </header>

        <section className="balance-card relative overflow-hidden rounded-[28px] p-6">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-400/10 text-3xl">
              🎁
            </div>

            <p className="mt-5 text-sm text-white/45">
              YOUR REFERRAL REWARD
            </p>

            <p className="mt-1 text-4xl font-black">
              0 <span className="text-base text-emerald-300">PP</span>
            </p>

            <button className="mt-6 w-full rounded-2xl bg-emerald-400 py-3.5 text-sm font-black text-black transition active:scale-[0.98]">
              Invite friends
            </button>
          </div>
        </section>

        <section className="glass-panel mt-5 rounded-[24px] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/45">
              Total referrals
            </span>

            <span className="font-black">
              0
            </span>
          </div>

          <div className="my-4 h-px bg-white/6" />

          <div className="flex items-center justify-between">
            <span className="text-sm text-white/45">
              Active referrals
            </span>

            <span className="font-black">
              0
            </span>
          </div>

          <div className="my-4 h-px bg-white/6" />

          <div className="flex items-center justify-between">
            <span className="text-sm text-white/45">
              Referral earnings
            </span>

            <span className="font-black text-emerald-300">
              0 PP
            </span>
          </div>
        </section>

        <section className="glass-panel mt-5 rounded-[24px] p-5">
          <p className="font-bold">
            Milestone rewards
          </p>

          <p className="mt-2 text-xs leading-5 text-white/40">
            Your referral becomes eligible when they actively complete PABLOT tasks.
          </p>

          <div className="mt-4 rounded-2xl bg-white/4 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">
                First active referral
              </span>

              <span className="text-xs font-bold text-emerald-300">
                +100 PP
              </span>
            </div>

            <div className="mt-3 h-2 rounded-full bg-white/8">
              <div className="h-full w-0 rounded-full bg-emerald-400" />
            </div>

            <p className="mt-2 text-[11px] text-white/30">
              0 / 1 active referral
            </p>
          </div>
        </section>

      </div>

      <BottomNav />
    </main>
  );
}
