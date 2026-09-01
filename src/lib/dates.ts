// Date-only strings ("YYYY-MM-DD") in this app mean the user's local
// calendar day, not UTC — a workout at 00:30 SGT belongs to that day,
// not to the previous UTC day.
export function localDateIso(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
