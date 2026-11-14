// The server may run in any time zone, so "today" and "now" are always worked out in the kitchen's zone.

export function nowInZone(timeZone: string, at: Date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}:${get("second")}`,
  };
}

// Both arguments are "HH:MM:SS", so comparing them as text is correct.
export function isPastCutoff(nowTime: string, cutoffTime: string | null): boolean {
  return cutoffTime != null && nowTime >= cutoffTime;
}

// "11:00:00" -> "11:00 AM"
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
