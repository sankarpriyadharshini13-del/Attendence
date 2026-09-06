import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { workingDaysInMonth } from "@/lib/utils";

// GET /api/attendance/month-summary?month=2026-09
// Team-wide rollup used for the "Total Days / Present" progress bar
// under the Home page list, and for Dashboard overview stats.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  if (!month) return NextResponse.json({ error: "month (YYYY-MM) is required." }, { status: 400 });

  const activeCount = await prisma.employee.count({ where: { is_active: true } });
  const workDays = workingDaysInMonth(month, true); // excl. Sundays, capped at today

  const [y, m] = month.split("-").map(Number);
  const rangeStart = new Date(y, m - 1, 1);
  const rangeEnd = new Date(y, m, 1);

  const records = await prisma.attendance.findMany({
    where: { date: { gte: rangeStart, lt: rangeEnd } },
    select: { status: true },
  });

  const present = records.filter((r: (typeof records)[number]) => r.status === "PRESENT").length;
  const absent = records.filter((r: (typeof records)[number]) => r.status === "ABSENT").length;
  const totalWorkingDays = workDays.length;
  const totalPossible = totalWorkingDays * activeCount;
  const rate = totalPossible > 0 ? Math.round((present / totalPossible) * 100) : 0;

  return NextResponse.json({
    month,
    totalWorkingDays,
    activeCount,
    present,
    absent,
    totalPossible,
    rate,
  });
}
