import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { allDateKeysInMonth, excelDateHeader, isSunday, monthLabel, workingDaysInMonth } from "@/lib/utils";

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" } };

const PRESENT_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
const PRESENT_FONT: Partial<ExcelJS.Font> = { color: { argb: "FF15803D" }, bold: true };
const ABSENT_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
const ABSENT_FONT: Partial<ExcelJS.Font> = { color: { argb: "FFB91C1C" }, bold: true };
const SUNDAY_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
const SUNDAY_FONT: Partial<ExcelJS.Font> = { color: { argb: "FF6B7280" } };
const MISSING_FONT: Partial<ExcelJS.Font> = { color: { argb: "FF9CA3AF" } };

/**
 * Builds one worksheet for `monthKey` (e.g. "2026-09") in the exact
 * format required:
 *   S.NO | NAME | EMP CODE | <one column per date> | Total Work Count
 *   | Employee Present Count | Absent Count | Rate %
 */
export async function addMonthSheet(workbook: ExcelJS.Workbook, monthKey: string) {
  const employees = await prisma.employee.findMany({
    where: { is_active: true },
    orderBy: { employee_id: "asc" },
  });

  const [y, m] = monthKey.split("-").map(Number);
  const rangeStart = new Date(y, m - 1, 1);
  const rangeEnd = new Date(y, m, 1);

  const records = await prisma.attendance.findMany({
    where: { date: { gte: rangeStart, lt: rangeEnd } },
    select: { employee_id: true, date: true, status: true },
  });

  const statusByEmpDate = new Map<string, "PRESENT" | "ABSENT">();
  for (const r of records) {
    statusByEmpDate.set(`${r.employee_id}:${r.date.toISOString().slice(0, 10)}`, r.status as "PRESENT" | "ABSENT");
  }

  const allDates = allDateKeysInMonth(monthKey);
  const workDays = workingDaysInMonth(monthKey, false); // all non-Sunday days in the month
  const totalWorkCount = workDays.length;

  const sheetName = monthLabel(monthKey).slice(0, 31);
  const sheet = workbook.addWorksheet(sheetName, { views: [{ state: "frozen", xSplit: 3, ySplit: 1 }] });

  const header = [
    "S.NO",
    "NAME",
    "EMP CODE",
    ...allDates.map(excelDateHeader),
    "Total Work Count",
    "Employee Present Count",
    "Absent Count",
    "Rate %",
  ];
  sheet.addRow(header);
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  headerRow.height = 22;

  employees.forEach((emp: (typeof employees)[number], idx: number) => {
    let present = 0;

    const dateCells = allDates.map((d) => {
      if (isSunday(d)) return "S";
      const status = statusByEmpDate.get(`${emp.employee_id}:${d}`);
      if (status === "PRESENT") {
        present++;
        return "P";
      }
      if (status === "ABSENT") return "A";
      return "-";
    });

    const absentCount = totalWorkCount - present;
    const rate = totalWorkCount > 0 ? Math.round((present / totalWorkCount) * 1000) / 10 : 0;

    const row = sheet.addRow([
      idx + 1,
      emp.name,
      emp.employee_code,
      ...dateCells,
      totalWorkCount,
      present,
      absentCount,
      rate,
    ]);

    row.eachCell((cell, colNumber) => {
      cell.alignment = { horizontal: colNumber <= 3 ? "left" : "center", vertical: "middle" };
      const dateColStart = 4;
      const dateColEnd = 3 + allDates.length;
      if (colNumber >= dateColStart && colNumber <= dateColEnd) {
        const value = cell.value;
        if (value === "P") {
          cell.fill = PRESENT_FILL;
          cell.font = PRESENT_FONT;
        } else if (value === "A") {
          cell.fill = ABSENT_FILL;
          cell.font = ABSENT_FONT;
        } else if (value === "S") {
          cell.fill = SUNDAY_FILL;
          cell.font = SUNDAY_FONT;
        } else {
          cell.font = MISSING_FONT;
        }
      }
    });
  });

  // Column widths — NAME gets 18 as specified, dates stay compact.
  sheet.columns.forEach((col, i) => {
    if (i === 0) col.width = 6; // S.NO
    else if (i === 1) col.width = 18; // NAME
    else if (i === 2) col.width = 12; // EMP CODE
    else if (i < 3 + allDates.length) col.width = 11; // date columns
    else col.width = 16; // summary columns
  });

  return sheet;
}
