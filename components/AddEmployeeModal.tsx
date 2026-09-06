"use client";

import { useEffect, useState } from "react";
import { X, UserPlus } from "lucide-react";
import { useToast } from "./Toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const emptyForm = {
  name: "",
  employee_code: "",
  designation: "",
  phone: "",
  joining_date: new Date().toISOString().slice(0, 10),
};

export default function AddEmployeeModal({ isOpen, onClose, onSuccess }: Props) {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedCode, setSuggestedCode] = useState("EMP-1001");

  useEffect(() => {
    if (!isOpen) return;
    setForm({ ...emptyForm, joining_date: new Date().toISOString().slice(0, 10) });
    setError(null);
    fetch("/api/employees?suggestCode=1")
      .then((r) => r.json())
      .then((d) => {
        setSuggestedCode(d.suggestedCode || "EMP-1001");
        setForm((f) => ({ ...f, employee_code: d.suggestedCode || "EMP-1001" }));
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: key === "employee_code" ? value.toUpperCase() : value }));

  const submit = async () => {
    if (!form.name.trim() || !form.employee_code.trim()) {
      setError("Name and employee code are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not add employee.");
        setSaving(false);
        return;
      }
      toast.show(`${form.name} added — welcome aboard!`);
      onSuccess();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 md:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-mobile overflow-y-auto rounded-t-24 bg-white p-5 shadow-xl md:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
              <UserPlus size={18} />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Add Employee</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 active:scale-95">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Name *">
            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Alice Kim"
              className="input"
            />
          </Field>

          <Field label="Employee Code *" hint={`Suggested: ${suggestedCode}`}>
            <input
              value={form.employee_code}
              onChange={(e) => update("employee_code", e.target.value)}
              placeholder="EMP-1021"
              className="input uppercase"
            />
          </Field>

          <Field label="Designation">
            <input
              value={form.designation}
              onChange={(e) => update("designation", e.target.value)}
              placeholder="e.g. Product Designer"
              className="input"
            />
          </Field>

          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="9876543210"
              className="input"
            />
          </Field>

          <Field label="Joining Date">
            <input
              type="date"
              value={form.joining_date}
              onChange={(e) => update("joining_date", e.target.value)}
              className="input"
            />
          </Field>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <button
            onClick={submit}
            disabled={saving}
            className="mt-2 w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-card transition active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Employee"}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          padding: 0.6rem 0.8rem;
          font-size: 0.9rem;
          background: #f8fafc;
          color: #0f172a;
        }
        .input:focus {
          outline: none;
          border-color: #3b82f6;
          background: white;
        }
      `}</style>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </label>
  );
}