"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Download, FileSpreadsheet, Files, PieChart as PieIcon, Eye, ChevronRight } from "lucide-react";
import EmployeePiePopup from "@/components/EmployeePiePopup";
import { ListSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { monthLabel, todayKey } from "@/lib/utils";
import type { EmployeeDTO } from "@/lib/types";

interface EmployeeRow extends EmployeeDTO {
  present: number;
  total_work_days: number;
  rate: number;
}

interface RecentExport {
  filename: string;
  timestamp: string;
}

const RECENT_EXPORTS_KEY = "attendtrack:recent-exports";

function loadRecentExports(): RecentExport[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_EXPORTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function pushRecentExport(filename: string) {
  const list = [{ filename, timestamp: new Date().toISOString() }, ...loadRecentExports()].slice(0, 5);
  localStorage.setItem(RECENT_EXPORTS_KEY, JSON.stringify(list));
  return list;
}

export default function DashboardPage() {
  const toast = useToast();
  const today = todayKey();
  const month = today.slice(0, 7);

  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState({ present: 0, absent: 0, total: 0 });
  const [pieEmployee, setPieEmployee] = useState<EmployeeDTO | null>(null);
  const [exports, setExports] = useState<RecentExport[]>([]);
  const [exportingKey, setExportingKey] = useState<string | null>(null);

  useEffect(() => {
    setExports(loadRecentExports());
    setLoading(true);
    Promise.all([
      fetch(`/api/attendance/employee-summary?month=${month}`).then((r) => r.json()),
      fetch("/api/employees").then((r) => r.json()),
      fetch(`/api/attendance?date=${today}`).then((r) => r.json()),
    ]).then(([summaryRes, empRes, attRes]) => {
      setRows(summaryRes.rows || []);
      const total = (empRes.employees || []).length;
      const statuses: Record<string, string> = attRes.statuses || {};
      const present = Object.values(statuses).filter((s) => s === "PRESENT").length;
      const absent = Object.values(statuses).filter((s) => s === "ABSENT").length;
      setTodayStats({ present, absent, total });
      setLoading(false);
    });
  }, [month, today]);

  const rate = todayStats.total > 0 ? Math.round((todayStats.present / todayStats.total) * 100) : 0;

  const downloadReport = async (url: string, filename: string, key: string) => {
    setExportingKey(key);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
      setExports(pushRecentExport(filename));
      toast.show(`${filename} downloaded`);
    } catch {
      toast.show("Could not generate the report", "error");
    } finally {
      setExportingKey(null);
    }
  };

  return (
    <div className="mx-auto max-w-mobile px-4 pt-6 md:max-w-5xl">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <button className="relative rounded-full bg-white p-2 shadow-card">
          <Bell size={17} className="text-slate-500" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-orange-500" />
        </button>
      </header>

      <button
        onClick={() => downloadReport(`/api/reports/excel?month=${month}`, `Attendance_${month}.xlsx`, "quick")}
        disabled={exportingKey === "quick"}
        className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white shadow-card transition active:scale-[0.98] disabled:opacity-60"
      >
        <Download size={16} /> {exportingKey === "quick" ? "Preparing…" : "Export Excel"}
      </button>

      <h2 className="mb-2 text-sm font-bold text-slate-700">Download Options</h2>
      <div className="mb-5 overflow-hidden rounded-2xl bg-white shadow-card">
        <button
          onClick={() => downloadReport(`/api/reports/excel?month=${month}`, `Attendance_${month}.xlsx`, "month")}
          disabled={exportingKey === "month"}
          className="flex w-full items-center gap-3 border-b border-slate-100 p-3.5 text-left transition active:bg-slate-50 disabled:opacity-60"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600">
            <FileSpreadsheet size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900">This Month</div>
            <div className="truncate text-xs text-slate-500">{monthLabel(month)} · .xlsx</div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-slate-300" />
        </button>

        <button
          onClick={() => downloadReport(`/api/reports/excel?all=true&month=${month}`, `Attendance_AllMonths_${month.slice(0, 4)}.xlsx`, "all")}
          disabled={exportingKey === "all"}
          className="flex w-full items-center gap-3 border-b border-slate-100 p-3.5 text-left transition active:bg-slate-50 disabled:opacity-60"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Files size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900">All Months Workbook</div>
            <div className="truncate text-xs text-slate-500">12 sheets inside · .xlsx</div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-slate-300" />
        </button>

        <a
          href="#employee-summary-table"
          className="flex w-full items-center gap-3 p-3.5 text-left transition active:bg-slate-50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <PieIcon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900">Attendance Summary</div>
            <div className="truncate text-xs text-slate-500">Per-employee breakdown · This month</div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-slate-300" />
        </a>
      </div>

      <h2 className="mb-2 text-sm font-bold text-slate-700">Overview — Today</h2>
      <div className="mb-5 grid grid-cols-3 gap-2.5">
        <StatCard label="Present" value={todayStats.present} sub="Employees" color="text-green-600" bg="bg-green-50" />
        <StatCard label="Absent" value={todayStats.absent} sub="Employees" color="text-red-600" bg="bg-red-50" />
        <StatCard label="Rate" value={`${rate}%`} sub="Attendance" color="text-brand-600" bg="bg-brand-50" />
      </div>

      <h2 id="employee-summary-table" className="mb-2 scroll-mt-6 text-sm font-bold text-slate-700">All Employees — {monthLabel(month)}</h2>
      {loading ? (
        <ListSkeleton />
      ) : (
        <div className="mb-5 overflow-hidden rounded-2xl bg-white shadow-card">
          <div className="grid grid-cols-[1fr_70px_60px] gap-2 border-b border-slate-100 px-3.5 py-2 text-[11px] font-bold text-slate-400">
            <span>NAME</span>
            <span className="text-center">PRESENT</span>
            <span className="text-center">VIEW</span>
          </div>
          {rows.map((r) => (
            <div key={r.employee_id} className="grid grid-cols-[1fr_70px_60px] items-center gap-2 border-b border-slate-50 px-3.5 py-2.5 last:border-none">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">{r.name}</div>
                <div className="truncate text-[11px] text-slate-400">{r.employee_code}</div>
              </div>
              <div className="text-center text-xs font-bold text-slate-700">
                {r.present}/{r.total_work_days}
              </div>
              <div className="flex justify-center">
                <button onClick={() => setPieEmployee(r)} className="rounded-lg bg-brand-50 p-1.5 text-brand-600 active:scale-90">
                  <Eye size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-2 text-sm font-bold text-slate-700">Recent Exports</h2>
      <div className="mb-8 space-y-2">
        {exports.length === 0 ? (
          <div className="rounded-2xl bg-white p-4 text-center text-xs text-slate-400 shadow-card">
            Nothing exported yet — your downloads will show up here.
          </div>
        ) : (
          exports.map((exp, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-card">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <PieIcon size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-slate-800">{exp.filename}</div>
                <div className="text-[10.5px] text-slate-400">
                  {new Date(exp.timestamp).toLocaleDateString()} {new Date(exp.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {pieEmployee && (
        <EmployeePiePopup employee={pieEmployee} initialDate={today} onClose={() => setPieEmployee(null)} />
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color, bg }: { label: string; value: string | number; sub: string; color: string; bg: string }) {
  return (
    <div className={`rounded-2xl ${bg} p-3 text-center shadow-card`}>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[10.5px] font-semibold text-slate-500">{label}</div>
      <div className="text-[10px] text-slate-400">{sub}</div>
    </div>
  );
}
