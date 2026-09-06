import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cacheDelByPrefix, claimIdempotencyKey } from "@/lib/redis";

interface Update {
  employee_id: number;
  status: "PRESENT" | "ABSENT";
}

export async function POST(req: NextRequest) {
  const idempotencyKey = req.headers.get("Idempotency-Key") || "";
  const body = await req.json();
  const { date, updates } = body as { date: string; updates: Update[] };

  if (!date || !Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "date and a non-empty updates array are required." }, { status: 400 });
  }

  const fresh = await claimIdempotencyKey(`attendance:bulk:${idempotencyKey}`);
  if (!fresh) {
    return NextResponse.json({ updated: 0, duplicate: true });
  }

  const dateObj = new Date(date);

  await prisma.$transaction(
    updates.map((u) =>
      prisma.attendance.upsert({
        where: { employee_id_date: { employee_id: Number(u.employee_id), date: dateObj } },
        update: { status: u.status },
        create: { employee_id: Number(u.employee_id), date: dateObj, status: u.status },
      })
    )
  );

  await cacheDelByPrefix(`attendance:${date}`);
  await cacheDelByPrefix("attendance:stats:");

  return NextResponse.json({ updated: updates.length });
}
