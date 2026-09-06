import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cacheDelByPrefix, claimIdempotencyKey } from "@/lib/redis";

export async function POST(req: NextRequest) {
  const idempotencyKey = req.headers.get("Idempotency-Key") || "";
  const body = await req.json();
  const { employee_id, date } = body || {};

  if (!employee_id || !date) {
    return NextResponse.json({ error: "employee_id and date are required." }, { status: 400 });
  }

  const dateObj = new Date(date);

  const fresh = await claimIdempotencyKey(`attendance:toggle:${idempotencyKey}`);

  const existing = await prisma.attendance.findUnique({
    where: { employee_id_date: { employee_id: Number(employee_id), date: dateObj } },
  });

  if (!fresh) {
    // Retried request (double-tap / network retry) — return current
    // state without toggling it a second time.
    return NextResponse.json({ status: existing?.status ?? null, duplicate: true });
  }

  // PRESENT -> ABSENT -> PRESENT. Unmarked -> PRESENT.
  const nextStatus = existing?.status === "PRESENT" ? "ABSENT" : "PRESENT";

  const record = await prisma.attendance.upsert({
    where: { employee_id_date: { employee_id: Number(employee_id), date: dateObj } },
    update: { status: nextStatus },
    create: { employee_id: Number(employee_id), date: dateObj, status: nextStatus },
  });

  await cacheDelByPrefix(`attendance:${date}`);
  await cacheDelByPrefix(`attendance:stats:${employee_id}`);

  return NextResponse.json({ status: record.status });
}
