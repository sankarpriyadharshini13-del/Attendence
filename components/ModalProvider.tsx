"use client";

import { createContext, useCallback, useContext, useState } from "react";
import AddEmployeeModal from "./AddEmployeeModal";

interface ModalContextValue {
  openAddEmployee: () => void;
  closeAddEmployee: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function useAddEmployeeModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useAddEmployeeModal must be used within ModalProvider");
  return ctx;
}

// Simple cross-page pub/sub — dispatched as window CustomEvents so
// Home / Dashboard / BottomNav (each mounted independently by the
// App Router) can react to data changes without a global store.
export const EVENTS = {
  EMPLOYEES_CHANGED: "attendtrack:employees-changed",
  ATTENDANCE_CHANGED: "attendtrack:attendance-changed",
};

export function broadcast(eventName: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(eventName));
  }
}

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);

  const openAddEmployee = useCallback(() => setAddEmployeeOpen(true), []);
  const closeAddEmployee = useCallback(() => setAddEmployeeOpen(false), []);

  return (
    <ModalContext.Provider value={{ openAddEmployee, closeAddEmployee }}>
      {children}
      <AddEmployeeModal
        isOpen={addEmployeeOpen}
        onClose={closeAddEmployee}
        onSuccess={() => {
          broadcast(EVENTS.EMPLOYEES_CHANGED);
          closeAddEmployee();
        }}
      />
    </ModalContext.Provider>
  );
}
