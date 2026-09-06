import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { allDateKeysInMonth, isSunday, toDateKey, todayKey } from "@/lib/utils";

export type DayStatus = "taken" | "partial" | "missing" | "sunday" | "future" | "none";
// "none" = no active employee had joined yet as of this day, so there
// was nothing to record — distinct from "missing" (someone SHOULD
// have been marked but wasn't).

// GET /api/attendance/calendar?month=2026-09
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  if (!month) return NextResponse.json({ error: "month (YYYY-MM) is required." }, { status: 400 });

  const employees = await prisma.employee.findMany({
    where: { is_active: true },
    select: { employee_id: true, joining_date: true },
  });
  const joinedBy = employees.map((e: (typeof employees)[number]) => ({
    employee_id: e.employee_id,
    joinKey: toDateKey(e.joining_date),
  }));

  const today = todayKey();
  const [y, m] = month.split("-").map(Number);
  const rangeStart = new Date(y, m - 1, 1);
  const rangeEnd = new Date(y, m, 1);

  const records = await prisma.attendance.findMany({
    where: { date: { gte: rangeStart, lt: rangeEnd } },
    select: { employee_id: true, date: true },
  });
  const recordSet = new Set(
    records.map((r: (typeof records)[number]) => `${r.employee_id}:${toDateKey(r.date)}`)
  );

  const days: Record<string, DayStatus> = {};
  for (const key of allDateKeysInMonth(month)) {
    if (key > today) {
      days[key] = "future";
    } else if (isSunday(key)) {
      days[key] = "sunday";
    } else {
      const expected = joinedBy.filter((e: (typeof joinedBy)[number]) => e.joinKey <= key);
      if (expected.length === 0) {
        days[key] = "none";
      } else {
        const marked = expected.filter((e: (typeof expected)[number]) => recordSet.has(`${e.employee_id}:${key}`)).length;
        if (marked === 0) days[key] = "missing";
        else if (marked < expected.length) days[key] = "partial";
        else days[key] = "taken";
      }
    }
  }

  return NextResponse.json({ month, days });
}