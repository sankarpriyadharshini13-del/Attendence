import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { workingDaysInMonth } from "@/lib/utils";

// GET /api/attendance/employee-summary?month=2026-09
// One-shot rollup of present/absent/rate per active employee for the
// Dashboard table, avoiding an N+1 call per employee.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  if (!month) return NextResponse.json({ error: "month (YYYY-MM) is required." }, { status: 400 });

  const totalWorkDays = workingDaysInMonth(month, true).length;
  const [y, m] = month.split("-").map(Number);
  const rangeStart = new Date(y, m - 1, 1);
  const rangeEnd = new Date(y, m, 1);

  const employees = await prisma.employee.findMany({
    where: { is_active: true },
    orderBy: { employee_id: "asc" },
  });

  const records = await prisma.attendance.findMany({
    where: { date: { gte: rangeStart, lt: rangeEnd } },
    select: { employee_id: true, status: true },
  });

  const presentCount = new Map<number, number>();
  for (const r of records) {
    if (r.status === "PRESENT") {
      presentCount.set(r.employee_id, (presentCount.get(r.employee_id) ?? 0) + 1);
    }
  }

  const rows = employees.map((e: (typeof employees)[number]) => {
    const present = presentCount.get(e.employee_id) ?? 0;
    return {
      employee_id: e.employee_id,
      name: e.name,
      employee_code: e.employee_code,
      department: e.department,
      designation: e.designation,
      phone: e.phone,
      joining_date: e.joining_date.toISOString(),
      is_active: e.is_active,
      present,
      total_work_days: totalWorkDays,
      rate: totalWorkDays > 0 ? Math.round((present / totalWorkDays) * 100) : 0,
    };
  });

  return NextResponse.json({ month, rows });
}
