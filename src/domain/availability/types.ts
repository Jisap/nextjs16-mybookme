export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Domingo … 6=Sábado (= EXTRACT(DOW))

export interface WorkingHour {
  dayOfWeek: DayOfWeek;
  /** HH:mm local negocio */
  startTime: string;
  /** HH:mm local negocio */
  endTime: string;
  /** null/undefined = general */
  staffId?: string | null;
}

export type ScheduleExceptionType = "CLOSED" | "OPEN" | "BLOCKED";

export interface ScheduleException {
  /** YYYY-MM-DD en tz negocio */
  date: string;
  /** HH:mm local, obligatorio en BLOCKED/OPEN */
  startTime?: string | null;
  endTime?: string | null;
  type: ScheduleExceptionType;
  staffId?: string | null;
}

export interface BusyAppointment {
  staffId: string;
  startAt: Date | string;
  endAt: Date | string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW" | string;
}

export interface AvailabilityInput {
  /** YYYY-MM-DD en tz negocio */
  dateStr: string;
  timezone: string;
  durationMinutes: number;
  slotIntervalMinutes?: number;
  bufferMinutes?: number;
  minimumAdvanceMinutes?: number;
  maximumAdvanceDays?: number;
  now?: Date;
  staffId: string;
  workingHours: WorkingHour[];
  exceptions: ScheduleException[];
  appointments: BusyAppointment[];
}

export interface Interval {
  start: Date;
  end: Date;
}

export interface Slot {
  start: Date;
  end: Date;
}
