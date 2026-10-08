"use client";

import { useEffect, useState } from "react";
import type { HomeBanner } from "@/lib/home-banners";

const inputClass =
  "mt-1 min-h-10 w-full rounded-xl border border-[#163044] bg-[#050b11] px-3 py-2 text-sm text-white outline-none focus:border-[#59D9FF]";

const emptyBanner = (): HomeBanner => ({
  id:
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `banner-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  title: "",
  description: "",
  imageUrl: "",
  buttonText: "",
  destinationUrl: "",
  active: true,
  order: 0,
});

export default function HomeBannerManager() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    fetch("/api/admin/banners", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to load banners.");
        }
        return data;
      })
      .then((data) => {
        if (mounted && Array.isArray(data.banners)) {
          setBanners(data.banners);
        }
      })
      .catch((error: unknown) => {
        if (mounted) {
          setMessage(
            error instanceof Error ? error.message : "Unable to load banners."
          );
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  function updateBanner(
    id: string,
    changes: Partial<HomeBanner>
  ) {
    setBanners((current) =>
      current.map((banner) =>
        banner.id === id ? { ...banner, ...changes } : banner
      )
    );
    setMessage("");
  }

  function moveBanner(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= banners.length) return;

    setBanners((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((banner, order) => ({ ...banner, order }));
    });
    setMessage("");
  }

  function addBanner() {
    if (banners.length >= 10) return;
    setBanners((current) => [
      ...current,
      { ...emptyBanner(), order: current.length },
    ]);
    setMessage("");
  }

  async function saveBanners() {
    if (banners.some((banner) => !banner.title.trim())) {
      setMessage("Every banner needs a title.");
      return;
    }

    if (
      banners.some(
        (banner) =>
          Boolean(banner.buttonText.trim()) !==
          Boolean(banner.destinationUrl.trim())
      )
    ) {
      setMessage("Enter both a button label and its destination URL, or leave both empty.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/banners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          banners: banners.map((banner, order) => ({ ...banner, order })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save banners.");
      }

      setBanners(data.banners);
      setMessage("Banners saved successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save banners."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-4 rounded-3xl border border-[#163044] bg-[#08131d] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#59D9FF]">
            Home screen
          </p>
          <h2 className="mt-1 text-lg font-black">Banner manager</h2>
          <p className="mt-1 max-w-xl text-xs leading-5 text-[#91a8b8]">
            Manage the compact promotional carousel below Daily Check-In.
            Only active banners appear on the home screen.
          </p>
        </div>

        <span className="rounded-full border border-[#163044] px-3 py-1 text-xs font-bold text-[#91a8b8]">
          {banners.length}/10 banners
        </span>
      </div>

      {message && (
        <p
          role="status"
          className={`mt-3 rounded-xl border px-3 py-2 text-xs font-semibold ${
            message.includes("successfully")
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
              : "border-amber-400/20 bg-amber-400/10 text-amber-200"
          }`}
        >
          {message}
        </p>
      )}

      {loading ? (
        <p className="py-6 text-sm text-[#91a8b8]">Loading banners…</p>
      ) : (
        <div className="mt-4 space-y-3">
          {banners.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#163044] px-4 py-6 text-center">
              <p className="text-sm font-bold">No banners yet</p>
              <p className="mt-1 text-xs text-[#91a8b8]">
                Add a banner to display promotions on the home screen.
              </p>
            </div>
          )}

          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className="rounded-2xl border border-[#163044] bg-[#050b11] p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-wider text-[#91a8b8]">
                  Banner {index + 1}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => moveBanner(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move banner ${index + 1} up`}
                    className="min-h-9 rounded-lg border border-[#163044] px-3 text-sm disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBanner(index, 1)}
                    disabled={index === banners.length - 1}
                    aria-label={`Move banner ${index + 1} down`}
                    className="min-h-9 rounded-lg border border-[#163044] px-3 text-sm disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => updateBanner(banner.id, { active: !banner.active })}
                    aria-pressed={banner.active}
                    className={`min-h-9 rounded-lg px-3 text-xs font-bold ${
                      banner.active
                        ? "bg-emerald-400/10 text-emerald-300"
                        : "bg-white/5 text-white/50"
                    }`}
                  >
                    {banner.active ? "Active" : "Inactive"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBanners((current) =>
                        current
                          .filter((item) => item.id !== banner.id)
                          .map((item, order) => ({ ...item, order }))
                      );
                      setMessage("");
                    }}
                    className="min-h-9 rounded-lg border border-red-400/20 px-3 text-xs font-bold text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-[#91a8b8]">
                  Title *
                  <input
                    className={inputClass}
                    maxLength={60}
                    value={banner.title}
                    placeholder="e.g. Welcome to PABLOT"
                    onChange={(event) =>
                      updateBanner(banner.id, { title: event.target.value })
                    }
                  />
                </label>

                <label className="text-xs font-semibold text-[#91a8b8]">
                  Image URL (optional)
                  <input
                    className={inputClass}
                    type="url"
                    value={banner.imageUrl}
                    placeholder="https://example.com/banner.jpg"
                    onChange={(event) =>
                      updateBanner(banner.id, { imageUrl: event.target.value })
                    }
                  />
                </label>

                <label className="text-xs font-semibold text-[#91a8b8] sm:col-span-2">
                  Description
                  <textarea
                    className={inputClass}
                    rows={2}
                    maxLength={160}
                    value={banner.description}
                    placeholder="A short message for users"
                    onChange={(event) =>
                      updateBanner(banner.id, { description: event.target.value })
                    }
                  />
                </label>

                <label className="text-xs font-semibold text-[#91a8b8]">
                  Button label (optional)
                  <input
                    className={inputClass}
                    maxLength={24}
                    value={banner.buttonText}
                    placeholder="e.g. Learn more"
                    onChange={(event) =>
                      updateBanner(banner.id, { buttonText: event.target.value })
                    }
                  />
                </label>

                <label className="text-xs font-semibold text-[#91a8b8]">
                  Destination URL (optional)
                  <input
                    className={inputClass}
                    type="url"
                    value={banner.destinationUrl}
                    placeholder="https://example.com"
                    onChange={(event) =>
                      updateBanner(banner.id, { destinationUrl: event.target.value })
                    }
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addBanner}
          disabled={loading || banners.length >= 10}
          className="min-h-11 rounded-xl border border-[#163044] px-4 text-sm font-bold text-white disabled:opacity-40"
        >
          + Add banner
        </button>
        <button
          type="button"
          onClick={saveBanners}
          disabled={loading || saving}
          className="min-h-11 rounded-xl bg-[#59D9FF] px-5 text-sm font-black text-[#031018] disabled:opacity-50"
        >
          {saving ? "Saving banners…" : "Save banners"}
        </button>
      </div>
    </section>
  );
}
