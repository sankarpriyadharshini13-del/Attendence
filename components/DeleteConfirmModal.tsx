"use client";

import { AlertTriangle } from "lucide-react";

interface Props {
  employeeName: string;
  employeeCode: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({ employeeName, employeeCode, isDeleting, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-lg">
        <div className="flex items-center gap-3 border-b border-slate-100 p-4 sm:p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Delete Employee</h2>
        </div>

        <div className="p-4 sm:p-6">
          <p className="mb-2 text-sm text-slate-700">
            Are you sure you want to delete <strong>{employeeName}</strong> ({employeeCode})?
          </p>
          <p className="text-xs text-slate-500">
            This action will remove the employee from the system. This cannot be undone.
          </p>
        </div>

        <div className="flex gap-2 border-t border-slate-100 p-4 sm:p-6">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition active:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
