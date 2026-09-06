"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { X, Check, Ban } from "lucide-react";
import { avatarColor, initials, monthKeyOf, monthLabel, niceDate } from "@/lib/utils";
import type { AttendanceStats, EmployeeDTO, AttendanceStatus } from "@/lib/types";
import { useToast } from "./Toast";
import { broadcast, EVENTS } from "./ModalProvider";

interface Props {
  employee: EmployeeDTO;
  initialDate: string;
  onClose: () => void;
}

const PRESENT_COLOR = "#16a34a";
const ABSENT_COLOR = "#dc2626";

export default function EmployeePiePopup({ employee, initialDate, onClose }: Props) {
  const toast = useToast();
  const [date, setDate] = useState(initialDate);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const month = monthKeyOf(date);

  const load = () => {
    setLoading(true);
    fetch(`/api/attendance/stats?employee_id=${employee.employee_id}&month=${month}`)
      .then((r) => r.json())
      .then((d) => setStats(d))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, employee.employee_id]);

  const currentStatus: AttendanceStatus | null =
    stats?.daily.find((d) => d.date === date)?.status ?? null;

  const setStatus = async (status: AttendanceStatus) => {
    setSaving(true);
    try {
      const res = await fetch("/api/attendance/update-single", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ employee_id: employee.employee_id, date, status }),
      });
      if (!res.ok) throw new Error();
      toast.show(`Marked ${status === "PRESENT" ? "present" : "absent"} for ${niceDate(date)}`);
      broadcast(EVENTS.ATTENDANCE_CHANGED);
      load();
    } catch {
      toast.show("Could not update attendance", "error");
    } finally {
      setSaving(false);
    }
  };

  const pieData = stats
    ? [
        { name: "Present", value: stats.present },
        { name: "Absent", value: stats.absent },
      ]
    : [];
  const rate = stats?.rate ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 md:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-mobile overflow-y-auto rounded-t-24 bg-white p-5 shadow-xl md:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: avatarColor(employee.employee_id).bg, color: avatarColor(employee.employee_id).fg }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold"
            >
              {initials(employee.name)}
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">{employee.name}</div>
              <div className="text-xs text-slate-500">{employee.employee_code} · {employee.designation}</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 active:scale-95">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
          <span className="text-xs font-medium text-slate-500">Editing date</span>
          <input
            type="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-sm font-semibold text-slate-800 outline-none"
          />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => setStatus("PRESENT")}
            disabled={saving}
            className={`flex flex-col items-center gap-1 rounded-2xl border-2 py-3 transition active:scale-[0.97] ${
              currentStatus === "PRESENT" ? "border-green-500 bg-green-50" : "border-slate-100 bg-slate-50"
            }`}
          >
            <Check size={20} className="text-green-600" />
            <span className="text-sm font-semibold text-green-700">Present</span>
          </button>
          <button
            onClick={() => setStatus("ABSENT")}
            disabled={saving}
            className={`flex flex-col items-center gap-1 rounded-2xl border-2 py-3 transition active:scale-[0.97] ${
              currentStatus === "ABSENT" ? "border-red-500 bg-red-50" : "border-slate-100 bg-slate-50"
            }`}
          >
            <Ban size={20} className="text-red-600" />
            <span className="text-sm font-semibold text-red-700">Absent</span>
          </button>
        </div>

        <div className="mb-2 text-xs font-semibold text-slate-500">{monthLabel(month)} overview</div>

        {loading ? (
          <div className="skeleton h-48 rounded-2xl bg-slate-100" />
        ) : stats && stats.present + stats.absent > 0 ? (
          <>
            <div className="relative h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={3} stroke="none">
                    <Cell fill={PRESENT_COLOR} />
                    <Cell fill={ABSENT_COLOR} />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">{rate}%</span>
                <span className="text-[11px] text-slate-500">attendance</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <StatBox label="Total Days" value={stats.total_work_days} color="text-slate-800" bg="bg-slate-50" />
              <StatBox label="Present" value={stats.present} color="text-green-700" bg="bg-green-50" />
              <StatBox label="Absent" value={stats.absent} color="text-red-700" bg="bg-red-50" />
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-slate-50 py-10 text-center text-sm text-slate-500">
            No attendance recorded for {monthLabel(month)} yet.
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`rounded-xl ${bg} py-2 text-center`}>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10.5px] text-slate-500">{label}</div>
    </div>
  );
}