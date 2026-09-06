"use client";

import { Check, X as Cross, Pencil, Trash2 } from "lucide-react";
import { avatarColor, initials } from "@/lib/utils";
import type { EmployeeWithStatus } from "@/lib/types";

interface Props {
  employee: EmployeeWithStatus;
  onToggle: () => void;
  onOpenPie: () => void;
  onDelete: () => void;
  toggling: boolean;
}

export default function EmployeeCard({ employee, onToggle, onOpenPie, onDelete, toggling }: Props) {
  const status = employee.status;
  const avatar = avatarColor(employee.employee_id);
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
      <button
        onClick={onOpenPie}
        style={{ backgroundColor: avatar.bg, color: avatar.fg }}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold"
      >
        {initials(employee.name)}
      </button>

      <button onClick={onOpenPie} className="min-w-0 flex-1 text-left">
        <div className="truncate text-sm font-semibold text-slate-900">{employee.name}</div>
        <div className="truncate text-xs text-slate-500">{employee.employee_code} · {employee.designation}</div>
      </button>

      <button
        onClick={onOpenPie}
        className="hidden shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-50 sm:block"
        aria-label="Edit"
      >
        <Pencil size={15} />
      </button>

      <button
        onClick={onDelete}
        className="hidden shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-50 sm:block"
        aria-label="Delete"
      >
        <Trash2 size={15} />
      </button>

      <button
        onClick={onToggle}
        disabled={toggling}
        aria-label={status === "PRESENT" ? "Present — tap to mark absent" : status === "ABSENT" ? "Absent — tap to mark present" : "Not marked — tap to mark present"}
        className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold text-white transition active:scale-95 disabled:opacity-60 ${
          status === "PRESENT"
            ? "bg-green-500"
            : status === "ABSENT"
            ? "bg-red-500"
            : "bg-slate-300"
        }`}
      >
        {status === "ABSENT" ? <Cross size={14} strokeWidth={3} /> : <Check size={14} strokeWidth={3} />}
        {status === "PRESENT" ? "Present" : status === "ABSENT" ? "Absent" : "Mark"}
      </button>
    </div>
  );
}
