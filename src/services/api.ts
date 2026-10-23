import { Hospital, Unit, Doctor, Period, Preference, PortalData, AdminUser } from '../types';

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ success: boolean; user?: AdminUser; token?: string; message?: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return res.json();
  },

  async updateAdminProfile(data: { username?: string; password?: string; name?: string }): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Hospitals
  async getHospitals(): Promise<Hospital[]> {
    const res = await fetch('/api/hospitals');
    return res.json();
  },

  async createHospital(name: string, city: string): Promise<Hospital> {
    const res = await fetch('/api/hospitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, city }),
    });
    return res.json();
  },

  async deleteHospital(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/hospitals/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Units
  async getUnits(hospitalId?: string): Promise<Unit[]> {
    const url = hospitalId ? `/api/units?hospitalId=${encodeURIComponent(hospitalId)}` : '/api/units';
    const res = await fetch(url);
    return res.json();
  },

  async createUnit(hospitalId: string, name: string, minDoctorsPerShift: number): Promise<Unit> {
    const res = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hospitalId, name, minDoctorsPerShift }),
    });
    return res.json();
  },

  async deleteUnit(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/units/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Doctors
  async getDoctors(unitId?: string): Promise<Doctor[]> {
    const url = unitId ? `/api/doctors?unitId=${encodeURIComponent(unitId)}` : '/api/doctors';
    const res = await fetch(url);
    return res.json();
  },

  async createDoctor(doctor: Partial<Doctor>): Promise<Doctor> {
    const res = await fetch('/api/doctors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doctor),
    });
    return res.json();
  },

  async createBatchDoctors(unitId: string, doctors: Partial<Doctor>[]): Promise<{ success: boolean; count: number; doctors: Doctor[] }> {
    const res = await fetch('/api/doctors/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitId, doctors }),
    });
    return res.json();
  },

  async deleteDoctor(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/doctors/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Periods
  async getPeriods(unitId?: string): Promise<Period[]> {
    const url = unitId ? `/api/periods?unitId=${encodeURIComponent(unitId)}` : '/api/periods';
    const res = await fetch(url);
    return res.json();
  },

  async createPeriod(period: Partial<Period>): Promise<Period> {
    const res = await fetch('/api/periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(period),
    });
    return res.json();
  },

  async updatePeriod(id: string, updates: Partial<Period>): Promise<Period> {
    const res = await fetch(`/api/periods/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  async deletePeriod(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/periods/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Schedule Generation
  async generateSchedule(periodId: string): Promise<{ success: boolean; draftSchedule: Record<string, string[]>; shiftCounts: Record<string, number> }> {
    const res = await fetch(`/api/periods/${periodId}/generate-schedule`, {
      method: 'POST',
    });
    return res.json();
  },

  async saveSchedule(periodId: string, draftSchedule: Record<string, string[]>): Promise<{ success: boolean }> {
    const res = await fetch(`/api/periods/${periodId}/save-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftSchedule }),
    });
    return res.json();
  },

  // Public Portal for Shared Doctor Link
  async getPortalData(token: string): Promise<PortalData> {
    const res = await fetch(`/api/public/portal/${encodeURIComponent(token)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Nöbet bağlantısı geçersiz veya bulunamadı.');
    }
    return res.json();
  },

  async submitPreference(data: {
    periodId: string;
    doctorId: string;
    wantDates: string[];
    avoidDates: string[];
    notes?: string;
  }): Promise<{ success: boolean; preference: Preference }> {
    const res = await fetch('/api/public/submit-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};
