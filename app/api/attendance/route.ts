import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet, CACHE_TTL } from "@/lib/redis";

// GET /api/attendance?date=2026-09-05
// Returns { "3": "PRESENT", "7": "ABSENT", ... } keyed by employee_id
// for the given date, cached briefly in Redis.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date query param is required (YYYY-MM-DD)." }, { status: 400 });
  }

  const cacheKey = `attendance:${date}`;
  const cached = await cacheGet<Record<string, string>>(cacheKey);
  if (cached) return NextResponse.json({ statuses: cached, cached: true });

  const records = await prisma.attendance.findMany({
    where: { date: new Date(date) },
    select: { employee_id: true, status: true },
  });

  const statuses: Record<string, string> = {};
  for (const r of records) statuses[String(r.employee_id)] = r.status;

  await cacheSet(cacheKey, statuses, CACHE_TTL.ATTENDANCE_DAY);
  return NextResponse.json({ statuses, cached: false });
}
