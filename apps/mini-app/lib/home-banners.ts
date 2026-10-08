export type HomeBanner = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  buttonText: string;
  destinationUrl: string;
  active: boolean;
  order: number;
};

function safeUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!value.trim()) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function normalizeBanners(
  input: unknown
): HomeBanner[] | null {
  if (!Array.isArray(input) || input.length > 10) return null;

  const banners: HomeBanner[] = [];
  const ids = new Set<string>();

  for (let index = 0; index < input.length; index++) {
    const item = input[index];

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return null;
    }

    const value = item as Record<string, unknown>;

    if (
      typeof value.id !== "string" ||
      !value.id.trim() ||
      value.id.length > 100 ||
      ids.has(value.id) ||
      typeof value.title !== "string" ||
      !value.title.trim() ||
      value.title.length > 60 ||
      typeof value.description !== "string" ||
      value.description.length > 160 ||
      typeof value.imageUrl !== "string" ||
      typeof value.buttonText !== "string" ||
      value.buttonText.length > 24 ||
      typeof value.destinationUrl !== "string" ||
      typeof value.active !== "boolean" ||
      !Number.isFinite(Number(value.order)) ||
      !safeUrl(value.imageUrl) ||
      !safeUrl(value.destinationUrl)
    ) {
      return null;
    }

    ids.add(value.id);

    banners.push({
      id: value.id,
      title: value.title.trim(),
      description: value.description.trim(),
      imageUrl: value.imageUrl.trim(),
      buttonText: value.buttonText.trim(),
      destinationUrl: value.destinationUrl.trim(),
      active: value.active,
      order: Math.max(0, Math.min(1000, Number(value.order) || index)),
    });
  }

  return banners.sort((a, b) => a.order - b.order);
}
