"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, UserPlus, CalendarClock, PieChart, MoreHorizontal } from "lucide-react";
import { useAddEmployeeModal, EVENTS } from "./ModalProvider";

const TABS = [
  { key: "home", href: "/", label: "Home", icon: Home },
  { key: "add", href: null, label: "Add Employee", icon: UserPlus },
  { key: "edit-past", href: "/edit-past", label: "Edit Past", icon: CalendarClock },
  { key: "dashboard", href: "/dashboard", label: "Dashboard", icon: PieChart },
  { key: "more", href: "/more", label: "More", icon: MoreHorizontal },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const { openAddEmployee } = useAddEmployeeModal();
  const [missingCount, setMissingCount] = useState(0);

  const loadMissing = () => {
    fetch("/api/attendance/missing")
      .then((r) => r.json())
      .then((d) => setMissingCount(d.count || 0))
      .catch(() => {});
  };

  useEffect(() => {
    loadMissing();
    window.addEventListener(EVENTS.ATTENDANCE_CHANGED, loadMissing);
    window.addEventListener(EVENTS.EMPLOYEES_CHANGED, loadMissing);
    return () => {
      window.removeEventListener(EVENTS.ATTENDANCE_CHANGED, loadMissing);
      window.removeEventListener(EVENTS.EMPLOYEES_CHANGED, loadMissing);
    };
  }, []);

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto max-w-mobile rounded-t-24 border-t border-slate-100 bg-white shadow-nav md:hidden">
        <div className="flex items-stretch justify-between px-2 pt-2">
          {TABS.map((tab) => {
            const isActive = tab.href ? pathname === tab.href : false;
            const Icon = tab.icon;
            const content = (
              <div className="relative flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-1.5">
                <div
                  className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition ${
                    isActive ? "bg-brand-100 text-brand-600" : tab.key === "add" ? "bg-brand-600 text-white" : "text-slate-400"
                  }`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.4 : 2} />
                  {tab.key === "edit-past" && missingCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                      {missingCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10.5px] font-medium ${isActive ? "text-brand-600" : "text-slate-500"}`}>
                  {tab.label}
                </span>
                {isActive && <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-brand-600" />}
              </div>
            );

            if (tab.key === "add") {
              return (
                <button key={tab.key} onClick={openAddEmployee} className="flex flex-1">
                  {content}
                </button>
              );
            }
            return (
              <Link key={tab.key} href={tab.href!} className="flex flex-1">
                {content}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop top nav */}
      <nav className="sticky top-0 z-40 hidden border-b border-slate-200 bg-white/90 backdrop-blur md:block">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-6 py-3">
          <span className="mr-6 text-base font-bold text-slate-900">AttendTrack</span>
          {TABS.map((tab) => {
            const isActive = tab.href ? pathname === tab.href : false;
            const Icon = tab.icon;
            const cls = `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive ? "bg-brand-50 text-brand-600" : "text-slate-600 hover:bg-slate-50"
            }`;
            if (tab.key === "add") {
              return (
                <button key={tab.key} onClick={openAddEmployee} className={cls}>
                  <Icon size={16} /> {tab.label}
                </button>
              );
            }
            return (
              <Link key={tab.key} href={tab.href!} className={`relative ${cls}`}>
                <Icon size={16} /> {tab.label}
                {tab.key === "edit-past" && missingCount > 0 && (
                  <span className="ml-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                    {missingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
