"use client";

import { useEffect, useRef, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { PieChart as PieIcon, Settings, Upload, LogOut, ChevronRight, ChevronDown } from "lucide-react";
import { useToast } from "@/components/Toast";
import { broadcast, EVENTS } from "@/components/ModalProvider";
import { monthLabel, todayKey } from "@/lib/utils";

export default function MorePage() {
  const toast = useToast();
  const month = todayKey().slice(0, 7);

  const [openCard, setOpenCard] = useState<string | null>(null);
  const [overall, setOverall] = useState<{ present: number; absent: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (openCard !== "pie" || overall) return;
    fetch(`/api/attendance/month-summary?month=${month}`)
      .then((r) => r.json())
      .then((d) => setOverall({ present: d.present, absent: d.absent }));
  }, [openCard, month, overall]);

  const toggle = (key: string) => setOpenCard((k) => (k === key ? null : key));

  const handleImport = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/employees/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.show(`Imported ${data.created} employee(s)${data.skipped ? `, skipped ${data.skipped} duplicate(s)` : ""}`);
      broadcast(EVENTS.EMPLOYEES_CHANGED);
    } catch (e: any) {
      toast.show(e?.message || "Import failed — check the file format.", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="mx-auto max-w-mobile px-4 pt-6 md:max-w-2xl">
      <header className="mb-5">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">More</h1>
        <p className="text-xs text-slate-500">Settings & tools</p>
      </header>

      <div className="space-y-2.5">
        {/* Overall pie chart */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-card">
          <button onClick={() => toggle("pie")} className="flex w-full items-center gap-3 p-4 text-left active:bg-slate-50">
            <IconBadge icon={PieIcon} color="text-brand-600" bg="bg-brand-50" />
            <span className="flex-1 text-sm font-semibold text-slate-800">Overall Pie Charts</span>
            {openCard === "pie" ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
          </button>
          {openCard === "pie" && (
            <div className="border-t border-slate-100 p-4">
              <p className="mb-2 text-xs text-slate-500">Company-wide attendance for {monthLabel(month)}</p>
              {overall && overall.present + overall.absent > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[{ name: "Present", value: overall.present }, { name: "Absent", value: overall.absent }]}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={76}
                        paddingAngle={3}
                      >
                        <Cell fill="#16a34a" />
                        <Cell fill="#dc2626" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">No attendance recorded yet this month.</div>
              )}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-card">
          <button onClick={() => toggle("settings")} className="flex w-full items-center gap-3 p-4 text-left active:bg-slate-50">
            <IconBadge icon={Settings} color="text-slate-600" bg="bg-slate-100" />
            <span className="flex-1 text-sm font-semibold text-slate-800">Settings</span>
            {openCard === "settings" ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
          </button>
          {openCard === "settings" && (
            <div className="space-y-3 border-t border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-800">Sunday off</div>
                  <div className="text-xs text-slate-500">Excluded from working-day and Excel totals</div>
                </div>
                <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-700">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-800">Employees</div>
                  <div className="text-xs text-slate-500">Managed from Home & Add Employee</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Import */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-card">
          <button onClick={() => toggle("import")} className="flex w-full items-center gap-3 p-4 text-left active:bg-slate-50">
            <IconBadge icon={Upload} color="text-blue-600" bg="bg-blue-50" />
            <span className="flex-1 text-sm font-semibold text-slate-800">Import Employees via Excel</span>
            {openCard === "import" ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
          </button>
          {openCard === "import" && (
            <div className="border-t border-slate-100 p-4">
              <p className="mb-3 text-xs text-slate-500">
                Upload an .xlsx with a header row containing at least a <strong>Name</strong> column
                (Employee Code, Department, Designation, Phone, Joining Date are optional).
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx"
                onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
                disabled={uploading}
                className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
              />
              {uploading && <p className="mt-2 text-xs text-brand-600">Importing…</p>}
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={() => toast.show("This demo build has no login system.", "info")}
          className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-card active:bg-slate-50"
        >
          <IconBadge icon={LogOut} color="text-red-600" bg="bg-red-50" />
          <span className="flex-1 text-sm font-semibold text-slate-800">Logout</span>
        </button>
      </div>

      <p className="mb-10 mt-6 text-center text-[11px] text-slate-400">AttendTrack v1.0 · For 20 Employees · Mobile-first PWA</p>
    </div>
  );
}

function IconBadge({ icon: Icon, color, bg }: { icon: any; color: string; bg: string }) {
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg} ${color}`}>
      <Icon size={16} />
    </span>
  );
}
