export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-09-05" style key, using local calendar date (no timezone drift). */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateKeyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function monthKeyOf(dateKey: string): string {
  return dateKey.slice(0, 7); // "2026-09"
}

export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function isSunday(dateKey: string): boolean {
  return dateKeyToDate(dateKey).getDay() === 0;
}

/** All date keys in a month, in order. */
export function allDateKeysInMonth(monthKey: string): string[] {
  const [y, m] = monthKey.split("-").map(Number);
  const count = daysInMonth(monthKey);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(y, m - 1, i + 1);
    return toDateKey(d);
  });
}

/** Working days in a month excluding Sundays, capped at today for the current month. */
export function workingDaysInMonth(monthKey: string, capToToday = false): string[] {
  const keys = allDateKeysInMonth(monthKey).filter((k) => !isSunday(k));
  if (!capToToday) return keys;
  const today = todayKey();
  return keys.filter((k) => k <= today);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function niceDate(dateKey: string): string {
  const d = dateKeyToDate(dateKey);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  return `${weekday}, ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
}

export function shortDate(dateKey: string): string {
  const d = dateKeyToDate(dateKey);
  return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

export function excelDateHeader(dateKey: string): string {
  const d = dateKeyToDate(dateKey);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

export function nextEmployeeCode(lastCode: string | null): string {
  if (!lastCode) return "EMP-1001";
  const match = lastCode.match(/(\d+)$/);
  if (!match) return "EMP-1001";
  const next = parseInt(match[1], 10) + 1;
  return `EMP-${next}`;
}

export const DEPARTMENTS = ["Engineering", "Design", "Marketing", "HR", "Sales", "Finance"] as const;

// Cycled avatar colors so each employee's initials circle is visually
// distinct, matching the reference UI (blue, purple, pink, teal, ...).
export const AVATAR_PALETTE = [
  { bg: "#DBEAFE", fg: "#2563EB" }, // blue
  { bg: "#EDE9FE", fg: "#7C3AED" }, // purple
  { bg: "#FCE7E7", fg: "#DC2626" }, // red/pink
  { bg: "#CCFBF1", fg: "#0D9488" }, // teal
  { bg: "#FEF3C7", fg: "#D97706" }, // amber
  { bg: "#DCFCE7", fg: "#16A34A" }, // green
];

export function avatarColor(employeeId: number) {
  return AVATAR_PALETTE[employeeId % AVATAR_PALETTE.length];
}
