import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet, cacheDelByPrefix, claimIdempotencyKey, CACHE_TTL } from "@/lib/redis";
import { nextEmployeeCode } from "@/lib/utils";
import type { EmployeeDTO } from "@/lib/types";

const EMPLOYEES_CACHE_KEY = "employees:all";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get("suggestCode")) {
    const last = await prisma.employee.findFirst({
      orderBy: { employee_id: "desc" },
      select: { employee_code: true },
    });
    return NextResponse.json({ suggestedCode: nextEmployeeCode(last?.employee_code ?? null) });
  }

  const cached = await cacheGet<EmployeeDTO[]>(EMPLOYEES_CACHE_KEY);
  if (cached) {
    return NextResponse.json({ employees: cached, cached: true });
  }

  const employees = await prisma.employee.findMany({
    where: { is_active: true },
    orderBy: { employee_id: "asc" },
  });

  const dtos: EmployeeDTO[] = employees.map((e: (typeof employees)[number]) => ({
    employee_id: e.employee_id,
    employee_code: e.employee_code,
    name: e.name,
    department: e.department,
    designation: e.designation,
    phone: e.phone,
    joining_date: e.joining_date.toISOString(),
    is_active: e.is_active,
  }));

  await cacheSet(EMPLOYEES_CACHE_KEY, dtos, CACHE_TTL.EMPLOYEES);
  return NextResponse.json({ employees: dtos, cached: false });
}

export async function POST(req: NextRequest) {
  const idempotencyKey = req.headers.get("Idempotency-Key") || "";
  const fresh = await claimIdempotencyKey(`employees:create:${idempotencyKey}`);
  if (!fresh) {
    return NextResponse.json({ error: "Duplicate request ignored (idempotency key already used)." }, { status: 409 });
  }

  const body = await req.json();
  const { name, employee_code, designation, phone, joining_date } = body || {};

  if (!name?.trim() || !employee_code?.trim()) {
    return NextResponse.json({ error: "Name and employee code are required." }, { status: 400 });
  }

  const code = String(employee_code).trim().toUpperCase();

  const existing = await prisma.employee.findUnique({ where: { employee_code: code } });
  if (existing) {
    return NextResponse.json({ error: `Employee code ${code} is already in use.` }, { status: 409 });
  }

  const employee = await prisma.employee.create({
    data: {
      name: name.trim(),
      employee_code: code,
      // The Add Employee form no longer collects a department — the
      // column stays on the model (other tooling/imports may still
      // use it) but every employee added from the UI gets this
      // neutral default instead of asking for one.
      department: "General",
      designation: designation || "",
      phone: phone || null,
      joining_date: joining_date ? new Date(joining_date) : new Date(),
      is_active: true,
    },
  });

  await cacheDelByPrefix(EMPLOYEES_CACHE_KEY);

  return NextResponse.json({ employee }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("id");

  if (!employeeId) {
    return NextResponse.json({ error: "Employee ID is required." }, { status: 400 });
  }

  const id = parseInt(employeeId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid employee ID." }, { status: 400 });
  }

  const employee = await prisma.employee.findUnique({
    where: { employee_id: id },
  });

  if (!employee) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  // Soft delete: set is_active to false
  const updated = await prisma.employee.update({
    where: { employee_id: id },
    data: { is_active: false },
  });

  await cacheDelByPrefix(EMPLOYEES_CACHE_KEY);

  return NextResponse.json({ employee: updated });
}