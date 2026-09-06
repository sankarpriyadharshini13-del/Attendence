import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet, CACHE_TTL } from "@/lib/redis";
import { workingDaysInMonth } from "@/lib/utils";
import type { AttendanceStats, AttendanceStatus } from "@/lib/types";

// GET /api/attendance/stats?employee_id=3&month=2026-09
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = Number(searchParams.get("employee_id"));
  const month = searchParams.get("month");

  if (!employeeId || !month) {
    return NextResponse.json({ error: "employee_id and month (YYYY-MM) are required." }, { status: 400 });
  }

  const cacheKey = `attendance:stats:${employeeId}:${month}`;
  const cached = await cacheGet<AttendanceStats>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const workDays = workingDaysInMonth(month, true); // exclude Sundays, cap at today
  const [year, mon] = month.split("-").map(Number);
  const rangeStart = new Date(year, mon - 1, 1);
  const rangeEnd = new Date(year, mon, 1);

  const records = await prisma.attendance.findMany({
    where: { employee_id: employeeId, date: { gte: rangeStart, lt: rangeEnd } },
    select: { date: true, status: true },
  });

  const byDate = new Map<string, AttendanceStatus>();
  for (const r of records) {
    const key = r.date.toISOString().slice(0, 10);
    byDate.set(key, r.status as AttendanceStatus);
  }

  let present = 0;
  let absent = 0;
  const daily = workDays.map((d) => {
    const status = byDate.get(d) ?? null;
    if (status === "PRESENT") present++;
    if (status === "ABSENT") absent++;
    return { date: d, status };
  });

  const totalWorkDays = workDays.length;
  const rate = totalWorkDays > 0 ? Math.round((present / totalWorkDays) * 100) : 0;

  const result: AttendanceStats = {
    employee_id: employeeId,
    month,
    present,
    absent,
    total_work_days: totalWorkDays,
    rate,
    daily,
  };

  await cacheSet(cacheKey, result, CACHE_TTL.ATTENDANCE_DAY);
  return NextResponse.json(result);
}
