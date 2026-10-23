export interface User {
  id: string;
  username: string;
  name: string;
  createdAt?: string;
}

export type AdminUser = User;

export interface Hospital {
  id: string;
  userId?: string;
  name: string;
  city: string;
  createdAt: string;
}

export interface Unit {
  id: string;
  userId?: string;
  hospitalId: string;
  name: string;
  minDoctorsPerShift: number;
  shareToken: string;
  createdAt: string;
}

export interface Doctor {
  id: string;
  userId?: string;
  unitId: string;
  title: string;
  name: string;
  phone?: string;
  email?: string;
  targetShifts?: number;
  notes?: string;
  createdAt: string;
}

export interface Period {
  id: string;
  userId?: string;
  unitId: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  deadline: string; // YYYY-MM-DD
  requiredDoctorsPerDay: number;
  weekendExtraDoctors?: number;
  status: 'active' | 'closed' | 'scheduled';
  shareToken: string;
  draftSchedule?: Record<string, string[]>; // date -> doctorIds
  createdAt: string;
}

export interface Preference {
  id: string;
  periodId: string;
  doctorId: string;
  wantDates: string[]; // YYYY-MM-DD
  avoidDates: string[]; // YYYY-MM-DD
  notes?: string;
  submittedAt: string;
}

export interface PortalData {
  period: Period;
  unit: Unit;
  hospital: Hospital | null;
  doctors: Doctor[];
  preferences: Preference[];
}
