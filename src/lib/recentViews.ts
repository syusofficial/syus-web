const KEY = "syus-recent-views";
const MAX = 10;

export function recordView(showId: string) {
  if (typeof window === "undefined") return;
  try {
    const list = getRecentIds();
    const filtered = list.filter((id) => id !== showId);
    filtered.unshift(showId);
    localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, MAX)));
  } catch {}
}

export function getRecentIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
