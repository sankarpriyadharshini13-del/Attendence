import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { cacheDelByPrefix } from "@/lib/redis";
import { nextEmployeeCode } from "@/lib/utils";

// POST /api/employees/import (multipart/form-data, field "file")
// Expects a worksheet with header row: Name | Employee Code | Department | Designation | Phone | Joining Date
// Employee Code is optional — a code is auto-generated when blank.
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) return NextResponse.json({ error: "Workbook has no worksheets." }, { status: 400 });

  const header = (sheet.getRow(1).values as any[]).map((v) => String(v || "").trim().toLowerCase());
  const col = (name: string) => header.findIndex((h) => h.includes(name));

  const nameCol = col("name");
  const codeCol = col("code");
  const deptCol = col("department");
  const roleCol = col("designation");
  const phoneCol = col("phone");
  const joinCol = col("joining");

  if (nameCol === -1) {
    return NextResponse.json({ error: "Could not find a 'Name' column in the sheet." }, { status: 400 });
  }

  let lastEmp = await prisma.employee.findFirst({ orderBy: { employee_id: "desc" }, select: { employee_code: true } });
  let created = 0;
  let skipped = 0;

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r).values as any[];
    const name = String(row[nameCol] || "").trim();
    if (!name) continue;

    let code = codeCol !== -1 ? String(row[codeCol] || "").trim().toUpperCase() : "";
    if (!code) {
      code = nextEmployeeCode(lastEmp?.employee_code ?? null);
    }

    const existing = await prisma.employee.findUnique({ where: { employee_code: code } });
    if (existing) {
      skipped++;
      continue;
    }

    const emp = await prisma.employee.create({
      data: {
        name,
        employee_code: code,
        department: deptCol !== -1 ? String(row[deptCol] || "Engineering").trim() : "Engineering",
        designation: roleCol !== -1 ? String(row[roleCol] || "").trim() : "",
        phone: phoneCol !== -1 ? String(row[phoneCol] || "").trim() || null : null,
        joining_date: joinCol !== -1 && row[joinCol] ? new Date(row[joinCol]) : new Date(),
        is_active: true,
      },
    });
    lastEmp = { employee_code: emp.employee_code };
    created++;
  }

  await cacheDelByPrefix("employees:all");

  return NextResponse.json({ created, skipped });
}
