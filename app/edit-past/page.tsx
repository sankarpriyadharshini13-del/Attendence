"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, X as Cross, CalendarClock } from "lucide-react";
import { ListSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { broadcast, EVENTS } from "@/components/ModalProvider";
import {
  allDateKeysInMonth,
  dateKeyToDate,
  monthKeyOf,
  monthLabel,
  niceDate,
  todayKey,
} from "@/lib/utils";
import type { EmployeeDTO, AttendanceStatus } from "@/lib/types";
import type { DayStatus } from "@/app/api/attendance/calendar/route";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function EditPastContent() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const today = todayKey();

  const [month, setMonth] = useState(monthKeyOf(searchParams.get("date") || today));
  const [selectedDate, setSelectedDate] = useState(searchParams.get("date") || today);
  const [calendar, setCalendar] = useState<Record<string, DayStatus>>({});
  const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadCalendar = (m: string) => {
    fetch(`/api/attendance/calendar?month=${m}`)
      .then((r) => r.json())
      .then((d) => setCalendar(d.days || {}));
  };

  const loadDay = async (date: string) => {
    setLoading(true);
    try {
      const [empRes, attRes] = await Promise.all([
        fetch("/api/employees").then((r) => r.json()),
        fetch(`/api/attendance?date=${date}`).then((r) => r.json()),
      ]);
      setEmployees(empRes.employees || []);
      setStatuses(attRes.statuses || {});
      setDirty(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar(month);
  }, [month]);

  useEffect(() => {
    const checkForNewDay = () => {
      const currentDate = todayKey();
      if (currentDate === today) return;
      setMonth(monthKeyOf(currentDate));
      setSelectedDate(currentDate);
    };

    const interval = window.setInterval(checkForNewDay, 60_000);
    window.addEventListener("focus", checkForNewDay);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", checkForNewDay);
    };
  }, [today]);

  useEffect(() => {
    loadDay(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const setLocalStatus = (employeeId: number, status: AttendanceStatus) => {
    setStatuses((s) => ({ ...s, [String(employeeId)]: status }));
    setDirty(true);
  };

  const markAll = (status: AttendanceStatus) => {
    const next: Record<string, AttendanceStatus> = {};
    employees.forEach((e) => (next[String(e.employee_id)] = status));
    setStatuses(next);
    setDirty(true);
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const updates = employees.map((e) => ({
        employee_id: e.employee_id,
        status: (statuses[String(e.employee_id)] as AttendanceStatus) || "ABSENT",
      }));
      const res = await fetch("/api/attendance/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ date: selectedDate, updates }),
      });
      if (!res.ok) throw new Error();
      toast.show(`Saved attendance for ${niceDate(selectedDate)}`);
      broadcast(EVENTS.ATTENDANCE_CHANGED);
      loadCalendar(month);
      setDirty(false);
    } catch {
      toast.show("Could not save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  const dayKeys = useMemo(() => allDateKeysInMonth(month), [month]);
  const leadingBlanks = dateKeyToDate(dayKeys[0]).getDay();

  const monthOptions = useMemo(() => {
    const opts: string[] = [];
    const [y, m] = today.split("-").map(Number);
    for (let i = 0; i < 12; i++) {
      const d = new Date(y, m - 1 - i, 1);
      opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return opts;
  }, [today]);

  const dayColor = (status: DayStatus | undefined, isSelected: boolean) => {
    if (isSelected) return "bg-brand-600 text-white";
    switch (status) {
      case "taken": return "bg-green-100 text-green-700";
      case "partial": return "bg-yellow-100 text-yellow-700";
      case "missing": return "bg-red-100 text-red-700";
      case "sunday": return "bg-slate-200 text-slate-400";
      case "future": return "text-slate-300";
      case "none": return "text-slate-300";
      default: return "text-slate-500";
    }
  };

  return (
    <div className="mx-auto max-w-mobile px-4 pt-6 md:max-w-3xl">
      <header className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
          <CalendarClock size={18} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Edit Past Attendance</h1>
          <p className="text-xs text-slate-500">Fix missing or incorrect days</p>
        </div>
      </header>

      <div className="mb-3 flex items-center justify-between rounded-2xl bg-white p-3 shadow-card">
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-semibold text-slate-700"
        >
          {monthOptions.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <Legend color="bg-green-400" label="Taken" />
          <Legend color="bg-red-400" label="Missing" />
          <Legend color="bg-slate-300" label="Sunday" />
        </div>
      </div>

      <div className="mb-5 rounded-2xl bg-white p-3.5 shadow-card">
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
          {WEEKDAYS.map((w, i) => <div key={i}>{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`blank-${i}`} />)}
          {dayKeys.map((dk) => {
            const status = calendar[dk];
            const isSelected = dk === selectedDate;
            const disabled = status === "future" || status === "none";
            return (
              <button
                key={dk}
                disabled={disabled}
                onClick={() => setSelectedDate(dk)}
                className={`aspect-square rounded-lg text-xs font-semibold transition active:scale-95 disabled:cursor-not-allowed ${dayColor(status, isSelected)}`}
              >
                {Number(dk.slice(-2))}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-700">{niceDate(selectedDate)}</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => markAll("PRESENT")}
            className="rounded-lg bg-green-100 px-2.5 py-1.5 text-xs font-bold text-green-700 active:scale-95"
          >
            Mark All Present
          </button>
          <button
            onClick={() => markAll("ABSENT")}
            className="rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-bold text-red-700 active:scale-95"
          >
            Mark All Absent
          </button>
        </div>
      </div>

      {loading ? (
        <ListSkeleton />
      ) : (
        <div className="space-y-2 pb-4">
          {employees.map((emp) => {
            const status = statuses[String(emp.employee_id)] as AttendanceStatus | undefined;
            return (
              <div key={emp.employee_id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-card">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{emp.name}</div>
                  <div className="truncate text-xs text-slate-500">{emp.employee_code}</div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => setLocalStatus(emp.employee_id, "PRESENT")}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition active:scale-90 ${
                      status === "PRESENT" ? "bg-green-500 text-white" : "bg-green-50 text-green-400"
                    }`}
                  >
                    <Check size={15} strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => setLocalStatus(emp.employee_id, "ABSENT")}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition active:scale-90 ${
                      status === "ABSENT" ? "bg-red-500 text-white" : "bg-red-50 text-red-400"
                    }`}
                  >
                    <Cross size={15} strokeWidth={3} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={saveChanges}
        disabled={!dirty || saving}
        className="sticky bottom-24 w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-40 md:bottom-4"
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${color}`} /> {label}
    </span>
  );
}

export default function EditPastPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading…</div>}>
      <EditPastContent />
    </Suspense>
  );
}