import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { addMonthSheet } from "@/lib/excel";
import { monthKeyOf, todayKey } from "@/lib/utils";

// GET /api/reports/excel?month=2026-09   -> one sheet for that month
// GET /api/reports/excel?all=true        -> 12 sheets, Jan–Dec of the current year
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";
  const month = searchParams.get("month");

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AttendTrack";
  workbook.created = new Date();

  let filename = "attendance.xlsx";

  if (all) {
    const year = Number((month || todayKeyYear()).slice(0, 4));
    for (let m = 1; m <= 12; m++) {
      const mk = `${year}-${String(m).padStart(2, "0")}`;
      await addMonthSheet(workbook, mk);
    }
    filename = `Attendance_AllMonths_${year}.xlsx`;
  } else {
    const mk = month || monthKeyOf(todayKey());
    await addMonthSheet(workbook, mk);
    filename = `Attendance_${mk}.xlsx`;
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    },
  });
}

function todayKeyYear() {
  return todayKey();
}
