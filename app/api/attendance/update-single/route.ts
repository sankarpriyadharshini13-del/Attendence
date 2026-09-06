import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cacheDelByPrefix, claimIdempotencyKey } from "@/lib/redis";

export async function POST(req: NextRequest) {
  const idempotencyKey = req.headers.get("Idempotency-Key") || "";
  const body = await req.json();
  const { employee_id, date, status } = body || {};

  if (!employee_id || !date || !["PRESENT", "ABSENT"].includes(status)) {
    return NextResponse.json({ error: "employee_id, date and a valid status are required." }, { status: 400 });
  }

  const fresh = await claimIdempotencyKey(`attendance:update-single:${idempotencyKey}`);
  if (!fresh) {
    return NextResponse.json({ status, duplicate: true });
  }

  const dateObj = new Date(date);
  const record = await prisma.attendance.upsert({
    where: { employee_id_date: { employee_id: Number(employee_id), date: dateObj } },
    update: { status },
    create: { employee_id: Number(employee_id), date: dateObj, status },
  });

  await cacheDelByPrefix(`attendance:${date}`);
  await cacheDelByPrefix(`attendance:stats:${employee_id}`);

  return NextResponse.json({ status: record.status });
}
