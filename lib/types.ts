export type AttendanceStatus = "PRESENT" | "ABSENT";

export interface EmployeeDTO {
  employee_id: number;
  employee_code: string;
  name: string;
  department: string;
  designation: string;
  phone: string | null;
  joining_date: string;
  is_active: boolean;
}

export interface EmployeeWithStatus extends EmployeeDTO {
  status: AttendanceStatus | null; // null = not marked yet for the viewed date
}

export interface AttendanceStats {
  employee_id: number;
  month: string;
  present: number;
  absent: number;
  total_work_days: number;
  rate: number;
  daily: { date: string; status: AttendanceStatus | null }[];
}

export interface MissingInfo {
  count: number;
  dates: string[]; // date keys, most recent first, capped
}
