import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { monthKeyOf, toDateKey, todayKey, workingDaysInMonth } from "@/lib/utils";

// A past working day (Mon–Sat, before today) is "missing" only if
// someone who had ALREADY JOINED by that date was never marked
// present or absent. Employees who joined later simply weren't
// expected to have a record yet, so they don't count against older
// days — this is what keeps a brand-new client's account (or any
// account where people were added mid-month) from being flagged with
// bogus "missing" days for dates before anyone existed.
//
// GET /api/attendance/missing            -> current month
// GET /api/attendance/missing?month=2026-08 -> a specific past month
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const today = todayKey();
  const month = searchParams.get("month") || monthKeyOf(today);

  const employees = await prisma.employee.findMany({
    where: { is_active: true },
    select: { employee_id: true, joining_date: true },
  });

  const pastWorkDays = workingDaysInMonth(month, true).filter((d) => d < today);

  if (pastWorkDays.length === 0 || employees.length === 0) {
    return NextResponse.json({ count: 0, dates: [] });
  }

  const joinedBy = employees.map((e: (typeof employees)[number]) => ({
    employee_id: e.employee_id,
    joinKey: toDateKey(e.joining_date),
  }));

  const records = await prisma.attendance.findMany({
    where: { date: { gte: new Date(pastWorkDays[0]), lt: new Date(today) } },
    select: { employee_id: true, date: true },
  });
  const recordSet = new Set(
    records.map((r: (typeof records)[number]) => `${r.employee_id}:${toDateKey(r.date)}`)
  );

  const missingDates = pastWorkDays.filter((day) => {
    const expected = joinedBy.filter((e: (typeof joinedBy)[number]) => e.joinKey <= day);
    if (expected.length === 0) return false; // nobody had joined yet — nothing to expect
    const marked = expected.filter((e: (typeof expected)[number]) => recordSet.has(`${e.employee_id}:${day}`)).length;
    return marked < expected.length;
  });

  return NextResponse.json({ count: missingDates.length, dates: missingDates });
}