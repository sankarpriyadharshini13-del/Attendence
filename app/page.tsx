"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight, Users, CalendarDays } from "lucide-react";
import EmployeeCard from "@/components/EmployeeCard";
import EmployeePiePopup from "@/components/EmployeePiePopup";
import { ListSkeleton } from "@/components/Skeleton";
import { EVENTS, broadcast } from "@/components/ModalProvider";
import { useToast } from "@/components/Toast";
import { monthKeyOf, monthLabel, shortDate, todayKey, dateKeyToDate, MONTH_NAMES } from "@/lib/utils";
import type { EmployeeDTO, EmployeeWithStatus, AttendanceStatus } from "@/lib/types";

interface MonthSummary {
  totalWorkingDays: number;
  present: number;
  absent: number;
  totalPossible: number;
  rate: number;
}

export default function HomePage() {
  const toast = useToast();
  const today = todayKey();

  const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [missing, setMissing] = useState<{ count: number; dates: string[] }>({ count: 0, dates: [] });
  const [pieEmployee, setPieEmployee] = useState<EmployeeDTO | null>(null);

  const [month, setMonth] = useState(monthKeyOf(today));
  const [summary, setSummary] = useState<MonthSummary | null>(null);

  const loadEmployeesAndAttendance = async () => {
    setLoading(true);
    try {
      const [empRes, attRes] = await Promise.all([
        fetch("/api/employees").then((r) => r.json()),
        fetch(`/api/attendance?date=${today}`).then((r) => r.json()),
      ]);
      setEmployees(empRes.employees || []);
      setStatuses(attRes.statuses || {});
    } finally {
      setLoading(false);
    }
  };

  const loadMissing = () => {
    fetch("/api/attendance/missing").then((r) => r.json()).then(setMissing).catch(() => {});
  };

  const loadSummary = (m: string) => {
    fetch(`/api/attendance/month-summary?month=${m}`).then((r) => r.json()).then(setSummary).catch(() => {});
  };

  useEffect(() => {
    loadEmployeesAndAttendance();
    loadMissing();
    const refresh = () => {
      loadEmployeesAndAttendance();
      loadMissing();
    };
    window.addEventListener(EVENTS.EMPLOYEES_CHANGED, refresh);
    window.addEventListener(EVENTS.ATTENDANCE_CHANGED, refresh);
    return () => {
      window.removeEventListener(EVENTS.EMPLOYEES_CHANGED, refresh);
      window.removeEventListener(EVENTS.ATTENDANCE_CHANGED, refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSummary(month);
    const refresh = () => loadSummary(month);
    window.addEventListener(EVENTS.ATTENDANCE_CHANGED, refresh);
    return () => window.removeEventListener(EVENTS.ATTENDANCE_CHANGED, refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const list: EmployeeWithStatus[] = useMemo(
    () => employees.map((e) => ({ ...e, status: (statuses[String(e.employee_id)] as AttendanceStatus) ?? null })),
    [employees, statuses]
  );

  const toggle = async (employeeId: number) => {
    setTogglingId(employeeId);
    // optimistic update
    const prevStatus = statuses[String(employeeId)] as AttendanceStatus | undefined;
    const optimisticNext: AttendanceStatus = prevStatus === "PRESENT" ? "ABSENT" : "PRESENT";
    setStatuses((s) => ({ ...s, [String(employeeId)]: optimisticNext }));

    try {
      const res = await fetch("/api/attendance/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ employee_id: employeeId, date: today }),
      });
      const data = await res.json();
      if (data.status) {
        setStatuses((s) => ({ ...s, [String(employeeId)]: data.status }));
      }
      broadcast(EVENTS.ATTENDANCE_CHANGED);
    } catch {
      setStatuses((s) => ({ ...s, [String(employeeId)]: prevStatus as AttendanceStatus }));
      toast.show("Could not update attendance", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const [saving, setSaving] = useState(false);

  const saveAll = async () => {
    const updates = Object.entries(statuses)
      .filter(([, status]) => status === "PRESENT" || status === "ABSENT")
      .map(([employee_id, status]) => ({ employee_id: Number(employee_id), status }));

    if (updates.length === 0) {
      toast.show("Nothing marked yet for today", "info");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/attendance/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ date: today, updates }),
      });
      if (!res.ok) throw new Error();
      toast.show(`Attendance saved for today (${updates.length} of ${employees.length})`);
      broadcast(EVENTS.ATTENDANCE_CHANGED);
    } catch {
      toast.show("Could not save attendance", "error");
    } finally {
      setSaving(false);
    }
  };

  const monthOptions = useMemo(() => {
    const opts: string[] = [];
    const [y, m] = today.split("-").map(Number);
    for (let i = 0; i < 6; i++) {
      const d = new Date(y, m - 1 - i, 1);
      opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return opts;
  }, [today]);

  return (
    <div className="mx-auto max-w-mobile px-4 pt-6 md:max-w-5xl">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">AttendTrack</h1>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          {employees.length} Employees <Users size={17} className="text-slate-400" />
        </span>
      </header>

      {missing.count > 0 && (
        <Link
          href={`/edit-past?date=${missing.dates[missing.dates.length - 1]}`}
          className="mb-4 flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-3.5 transition active:scale-[0.99]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-orange-800">{missing.count} Days Missing</div>
            <div className="truncate text-xs text-orange-700">
              Review pending attendance for {missing.dates.slice(0, 2).map(shortDate).join(" & ")}
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-0.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white">
            Fix Now <ChevronRight size={13} />
          </span>
        </Link>
      )}

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">Today's Attendance</h2>
        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
          {MONTH_NAMES[dateKeyToDate(today).getMonth()].slice(0, 4)} {dateKeyToDate(today).getDate()}, {dateKeyToDate(today).getFullYear()}
          <CalendarDays size={15} className="text-slate-400" />
        </span>
      </div>

      {loading ? (
        <ListSkeleton />
      ) : list.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-card">
          <p className="text-sm font-semibold text-slate-700">No employees yet</p>
          <p className="mt-1 text-xs text-slate-500">Tap "Add Employee" in the bottom bar to add your first one.</p>
        </div>
      ) : (
        <div className="space-y-2.5 md:grid md:grid-cols-2 md:gap-2.5 md:space-y-0">
          {list.map((emp) => (
            <EmployeeCard
              key={emp.employee_id}
              employee={emp}
              toggling={togglingId === emp.employee_id}
              onToggle={() => toggle(emp.employee_id)}
              onOpenPie={() => setPieEmployee(emp)}
            />
          ))}
        </div>
      )}

      {list.length > 0 && (
        <div className="mt-3">
          <button
            onClick={saveAll}
            disabled={saving}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white shadow-card transition active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Attendance"}
          </button>
          <p className="mt-1.5 text-center text-[11px] text-slate-400">
            Each tap already saves instantly — use this to re-sync everything at once.
          </p>
        </div>
      )}

      {/* Total Days / Present — month-wise progress */}
      <div className="my-5 rounded-2xl bg-white p-4 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600">Team attendance this month</span>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
        </div>
        {summary ? (
          <>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-lg font-bold text-slate-900">
                {summary.present}
                <span className="text-sm font-medium text-slate-400"> / {summary.totalPossible}</span>
              </span>
              <span className="text-xs font-semibold text-brand-600">{summary.rate}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${summary.rate}%` }} />
            </div>
            <div className="mt-1.5 text-[11px] text-slate-400">
              {summary.totalWorkingDays} working days so far in {monthLabel(month)}
            </div>
          </>
        ) : (
          <div className="skeleton h-10 rounded-xl bg-slate-100" />
        )}
      </div>

      {pieEmployee && (
        <EmployeePiePopup employee={pieEmployee} initialDate={today} onClose={() => setPieEmployee(null)} />
      )}
    </div>
  );
}