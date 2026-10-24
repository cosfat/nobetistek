import { Hospital, Unit, Doctor, Period, Preference, PortalData, User } from '../types';
import { getDatesBetween, isWeekend } from '../utils/dateUtils';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    const saved = localStorage.getItem('nobet_admin_user');
    if (saved) {
      const user = JSON.parse(saved);
      if (user?.id) {
        headers['x-user-id'] = user.id;
      }
    }
  } catch (e) {
    // ignore
  }
  return headers;
}

function getCurrentUserId(): string {
  try {
    const saved = localStorage.getItem('nobet_admin_user');
    if (saved) {
      const user = JSON.parse(saved);
      if (user?.id) return user.id;
    }
  } catch (e) {
    // ignore
  }
  return 'user-default';
}

// ----------------------------------------------------
// LOCAL FALLBACK STORE (Active if VPS / Nginx does not proxy /api to Node server)
// ----------------------------------------------------
const LOCAL_USERS_KEY = 'nobet_local_users';
const LOCAL_HOSPITALS_KEY = 'nobet_local_hospitals';
const LOCAL_UNITS_KEY = 'nobet_local_units';
const LOCAL_DOCTORS_KEY = 'nobet_local_doctors';
const LOCAL_PERIODS_KEY = 'nobet_local_periods';
const LOCAL_PREFERENCES_KEY = 'nobet_local_preferences';

function getFromStorage<T>(key: string, defaultVal: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item) return JSON.parse(item);
  } catch (e) {
    console.error(e);
  }
  return defaultVal;
}

function saveToStorage<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(e);
  }
}

// Ensure initial local seeds
function initLocalSeeds() {
  const users = getFromStorage<User[]>(LOCAL_USERS_KEY, []);
  if (users.length === 0) {
    saveToStorage(LOCAL_USERS_KEY, [
      {
        id: 'user-default',
        username: 'admin',
        passwordHash: '123456',
        name: 'Dr. Yönetici',
      } as any,
    ]);
  }

  const hospitals = getFromStorage<Hospital[]>(LOCAL_HOSPITALS_KEY, []);
  if (hospitals.length === 0) {
    saveToStorage(LOCAL_HOSPITALS_KEY, [
      {
        id: 'hosp-1',
        userId: 'user-default',
        name: 'İstanbul Şehir Hastanesi',
        city: 'İstanbul',
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  const units = getFromStorage<Unit[]>(LOCAL_UNITS_KEY, []);
  if (units.length === 0) {
    saveToStorage(LOCAL_UNITS_KEY, [
      {
        id: 'unit-1',
        userId: 'user-default',
        hospitalId: 'hosp-1',
        name: 'Acil Tıp Kliniği (Sarı / Kırmızı Alan)',
        minDoctorsPerShift: 2,
        shareToken: 'acil-tip-kasim',
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  const doctors = getFromStorage<Doctor[]>(LOCAL_DOCTORS_KEY, []);
  if (doctors.length === 0) {
    saveToStorage(LOCAL_DOCTORS_KEY, [
      { id: 'doc-1', userId: 'user-default', unitId: 'unit-1', title: 'Uzm. Dr.', name: 'Ahmet Yılmaz', phone: '0532 111 2233', email: 'ahmet@hastane.gov.tr', targetShifts: 6, createdAt: new Date().toISOString() },
      { id: 'doc-2', userId: 'user-default', unitId: 'unit-1', title: 'Uzm. Dr.', name: 'Fatma Çelik', phone: '0533 222 3344', email: 'fatma@hastane.gov.tr', targetShifts: 5, createdAt: new Date().toISOString() },
      { id: 'doc-3', userId: 'user-default', unitId: 'unit-1', title: 'Asis. Dr.', name: 'Mehmet Kaya', phone: '0535 333 4455', email: 'mehmet@hastane.gov.tr', targetShifts: 7, createdAt: new Date().toISOString() },
      { id: 'doc-4', userId: 'user-default', unitId: 'unit-1', title: 'Asis. Dr.', name: 'Zeynep Demir', phone: '0542 444 5566', email: 'zeynep@hastane.gov.tr', targetShifts: 7, createdAt: new Date().toISOString() },
      { id: 'doc-5', userId: 'user-default', unitId: 'unit-1', title: 'Asis. Dr.', name: 'Burak Öztürk', phone: '0555 555 6677', email: 'burak@hastane.gov.tr', targetShifts: 6, createdAt: new Date().toISOString() },
      { id: 'doc-6', userId: 'user-default', unitId: 'unit-1', title: 'Asis. Dr.', name: 'Elif Şahin', phone: '0505 666 7788', email: 'elif@hastane.gov.tr', targetShifts: 7, createdAt: new Date().toISOString() },
    ]);
  }

  const periods = getFromStorage<Period[]>(LOCAL_PERIODS_KEY, []);
  if (periods.length === 0) {
    saveToStorage(LOCAL_PERIODS_KEY, [
      {
        id: 'period-1',
        userId: 'user-default',
        unitId: 'unit-1',
        name: 'Aralık 2026 Nöbet Listesi',
        startDate: '2026-12-01',
        endDate: '2026-12-31',
        deadline: '2026-11-25',
        requiredDoctorsPerDay: 2,
        weekendExtraDoctors: 1,
        status: 'active',
        shareToken: 'acil-kasim-2026',
        createdAt: new Date().toISOString(),
      },
    ]);
  }
}

initLocalSeeds();

const localStore = {
  register(username: string, password: string, name: string) {
    const cleanUsername = username.trim().toLowerCase();
    const users = getFromStorage<any[]>(LOCAL_USERS_KEY, []);
    const existing = users.find((u) => u.username.toLowerCase() === cleanUsername);
    if (existing) {
      return { success: false, message: 'Bu kullanıcı adı zaten kullanılıyor. Lütfen başka bir kullanıcı adı seçin.' };
    }
    const newUser = {
      id: 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      username: cleanUsername,
      passwordHash: String(password).trim(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    saveToStorage(LOCAL_USERS_KEY, users);
    return {
      success: true,
      user: { id: newUser.id, username: newUser.username, name: newUser.name },
      message: 'Hesabınız başarıyla oluşturuldu.',
    };
  },

  login(username: string, password: string) {
    const cleanUsername = String(username).trim().toLowerCase();
    const cleanPassword = String(password).trim();
    const users = getFromStorage<any[]>(LOCAL_USERS_KEY, []);
    const user = users.find(
      (u) => u.username.toLowerCase() === cleanUsername && u.passwordHash === cleanPassword
    );
    if (user) {
      return {
        success: true,
        user: { id: user.id, username: user.username, name: user.name },
      };
    }
    return { success: false, message: 'Geçersiz kullanıcı adı veya şifre!' };
  },

  updateProfile(userId: string, data: { username?: string; password?: string; name?: string }) {
    const users = getFromStorage<any[]>(LOCAL_USERS_KEY, []);
    const user = users.find((u) => u.id === userId);
    if (!user) return { success: false, message: 'Kullanıcı bulunamadı.' };
    if (data.username) user.username = data.username.trim().toLowerCase();
    if (data.password) user.passwordHash = data.password.trim();
    if (data.name) user.name = data.name.trim();
    saveToStorage(LOCAL_USERS_KEY, users);
    return { success: true, user: { id: user.id, username: user.username, name: user.name }, message: 'Güncellendi' };
  },

  getHospitals(userId: string): Hospital[] {
    const hospitals = getFromStorage<Hospital[]>(LOCAL_HOSPITALS_KEY, []);
    return hospitals.filter((h) => h.userId === userId);
  },

  createHospital(userId: string, name: string, city: string): Hospital {
    const hospitals = getFromStorage<Hospital[]>(LOCAL_HOSPITALS_KEY, []);
    const newHosp: Hospital = {
      id: 'hosp-' + Date.now(),
      userId,
      name: name.trim(),
      city: city ? city.trim() : 'Genel',
      createdAt: new Date().toISOString(),
    };
    hospitals.push(newHosp);
    saveToStorage(LOCAL_HOSPITALS_KEY, hospitals);
    return newHosp;
  },

  deleteHospital(userId: string, id: string) {
    let hospitals = getFromStorage<Hospital[]>(LOCAL_HOSPITALS_KEY, []);
    hospitals = hospitals.filter((h) => h.id !== id);
    saveToStorage(LOCAL_HOSPITALS_KEY, hospitals);
    return { success: true };
  },

  getUnits(userId: string, hospitalId?: string): Unit[] {
    const units = getFromStorage<Unit[]>(LOCAL_UNITS_KEY, []);
    let userUnits = units.filter((u) => u.userId === userId);
    if (hospitalId) {
      userUnits = userUnits.filter((u) => u.hospitalId === hospitalId);
    }
    return userUnits;
  },

  createUnit(userId: string, hospitalId: string, name: string, minDoctorsPerShift: number): Unit {
    const units = getFromStorage<Unit[]>(LOCAL_UNITS_KEY, []);
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 16) + '-' + Math.random().toString(36).substring(2, 6);
    const newUnit: Unit = {
      id: 'unit-' + Date.now(),
      userId,
      hospitalId,
      name: name.trim(),
      minDoctorsPerShift: Number(minDoctorsPerShift) || 1,
      shareToken: slug,
      createdAt: new Date().toISOString(),
    };
    units.push(newUnit);
    saveToStorage(LOCAL_UNITS_KEY, units);
    return newUnit;
  },

  deleteUnit(userId: string, id: string) {
    let units = getFromStorage<Unit[]>(LOCAL_UNITS_KEY, []);
    units = units.filter((u) => u.id !== id);
    saveToStorage(LOCAL_UNITS_KEY, units);
    return { success: true };
  },

  getDoctors(userId: string, unitId?: string): Doctor[] {
    const doctors = getFromStorage<Doctor[]>(LOCAL_DOCTORS_KEY, []);
    const units = getFromStorage<Unit[]>(LOCAL_UNITS_KEY, []);
    const userUnitIds = new Set(units.filter((u) => u.userId === userId).map((u) => u.id));
    let userDoctors = doctors.filter((d) => d.userId === userId || userUnitIds.has(d.unitId));
    if (unitId) {
      userDoctors = userDoctors.filter((d) => d.unitId === unitId);
    }
    return userDoctors;
  },

  createDoctor(userId: string, doc: Partial<Doctor>): Doctor {
    const doctors = getFromStorage<Doctor[]>(LOCAL_DOCTORS_KEY, []);
    const newDoctor: Doctor = {
      id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      userId,
      unitId: doc.unitId || '',
      title: doc.title || 'Dr.',
      name: (doc.name || '').trim(),
      phone: doc.phone ? doc.phone.trim() : '',
      email: doc.email ? doc.email.trim() : '',
      targetShifts: Number(doc.targetShifts) || 6,
      notes: doc.notes ? doc.notes.trim() : '',
      createdAt: new Date().toISOString(),
    };
    doctors.push(newDoctor);
    saveToStorage(LOCAL_DOCTORS_KEY, doctors);
    return newDoctor;
  },

  createBatchDoctors(userId: string, unitId: string, docList: Partial<Doctor>[]) {
    const doctors = getFromStorage<Doctor[]>(LOCAL_DOCTORS_KEY, []);
    const created: Doctor[] = [];
    docList.forEach((d, idx) => {
      if (d.name && d.name.trim()) {
        const item: Doctor = {
          id: 'doc-' + (Date.now() + idx) + '-' + Math.random().toString(36).substring(2, 5),
          userId,
          unitId,
          title: d.title || 'Dr.',
          name: d.name.trim(),
          phone: d.phone ? d.phone.trim() : '',
          email: d.email ? d.email.trim() : '',
          targetShifts: Number(d.targetShifts) || 6,
          createdAt: new Date().toISOString(),
        };
        doctors.push(item);
        created.push(item);
      }
    });
    saveToStorage(LOCAL_DOCTORS_KEY, doctors);
    return { success: true, count: created.length, doctors: created };
  },

  deleteDoctor(userId: string, id: string) {
    let doctors = getFromStorage<Doctor[]>(LOCAL_DOCTORS_KEY, []);
    doctors = doctors.filter((d) => d.id !== id);
    saveToStorage(LOCAL_DOCTORS_KEY, doctors);
    return { success: true };
  },

  getPeriods(userId: string, unitId?: string): Period[] {
    const periods = getFromStorage<Period[]>(LOCAL_PERIODS_KEY, []);
    const units = getFromStorage<Unit[]>(LOCAL_UNITS_KEY, []);
    const userUnitIds = new Set(units.filter((u) => u.userId === userId).map((u) => u.id));
    let userPeriods = periods.filter((p) => p.userId === userId || userUnitIds.has(p.unitId));
    if (unitId) {
      userPeriods = userPeriods.filter((p) => p.unitId === unitId);
    }
    return userPeriods;
  },

  createPeriod(userId: string, p: Partial<Period>): Period {
    const periods = getFromStorage<Period[]>(LOCAL_PERIODS_KEY, []);
    const token = 'nobet-' + Math.random().toString(36).substring(2, 9);
    const newPeriod: Period = {
      id: 'period-' + Date.now(),
      userId,
      unitId: p.unitId || '',
      name: (p.name || '').trim(),
      startDate: p.startDate || '',
      endDate: p.endDate || '',
      deadline: p.deadline || p.endDate || '',
      requiredDoctorsPerDay: Number(p.requiredDoctorsPerDay) || 1,
      weekendExtraDoctors: Number(p.weekendExtraDoctors) || 0,
      status: 'active',
      shareToken: token,
      createdAt: new Date().toISOString(),
    };
    periods.push(newPeriod);
    saveToStorage(LOCAL_PERIODS_KEY, periods);
    return newPeriod;
  },

  updatePeriod(id: string, updates: Partial<Period>): Period {
    const periods = getFromStorage<Period[]>(LOCAL_PERIODS_KEY, []);
    const period = periods.find((p) => p.id === id);
    if (period) {
      Object.assign(period, updates);
      saveToStorage(LOCAL_PERIODS_KEY, periods);
    }
    return period!;
  },

  deletePeriod(id: string) {
    let periods = getFromStorage<Period[]>(LOCAL_PERIODS_KEY, []);
    periods = periods.filter((p) => p.id !== id);
    saveToStorage(LOCAL_PERIODS_KEY, periods);
    return { success: true };
  },

  getPortalData(token: string): PortalData {
    const periods = getFromStorage<Period[]>(LOCAL_PERIODS_KEY, []);
    const units = getFromStorage<Unit[]>(LOCAL_UNITS_KEY, []);
    const hospitals = getFromStorage<Hospital[]>(LOCAL_HOSPITALS_KEY, []);
    const doctors = getFromStorage<Doctor[]>(LOCAL_DOCTORS_KEY, []);
    const preferences = getFromStorage<Preference[]>(LOCAL_PREFERENCES_KEY, []);

    let period = periods.find((p) => p.shareToken === token || p.id === token);
    let unit: Unit | undefined;

    if (!period) {
      unit = units.find((u) => u.shareToken === token || u.id === token);
      if (unit) {
        period = periods.find((p) => p.unitId === unit!.id && p.status === 'active') || periods.find((p) => p.unitId === unit!.id);
      }
    } else {
      unit = units.find((u) => u.id === period!.unitId);
    }

    if (!period || !unit) {
      throw new Error('Nöbet dönemi bulunamadı veya bağlantı geçersiz.');
    }

    const hospital = hospitals.find((h) => h.id === unit!.hospitalId) || null;
    const unitDoctors = doctors.filter((d) => d.unitId === unit!.id);
    const periodPreferences = preferences.filter((p) => p.periodId === period!.id);

    return {
      period,
      unit,
      hospital,
      doctors: unitDoctors,
      preferences: periodPreferences,
    };
  },

  submitPreference(data: { periodId: string; doctorId: string; wantDates: string[]; avoidDates: string[]; notes?: string }) {
    const preferences = getFromStorage<Preference[]>(LOCAL_PREFERENCES_KEY, []);
    const existingIndex = preferences.findIndex(
      (p) => p.periodId === data.periodId && p.doctorId === data.doctorId
    );
    const pref: Preference = {
      id: existingIndex >= 0 ? preferences[existingIndex].id : 'pref-' + Date.now(),
      periodId: data.periodId,
      doctorId: data.doctorId,
      wantDates: data.wantDates || [],
      avoidDates: data.avoidDates || [],
      notes: data.notes || '',
      submittedAt: new Date().toISOString(),
    };
    if (existingIndex >= 0) {
      preferences[existingIndex] = pref;
    } else {
      preferences.push(pref);
    }
    saveToStorage(LOCAL_PREFERENCES_KEY, preferences);
    return { success: true, preference: pref };
  },

  generateSchedule(periodId: string) {
    const periods = getFromStorage<Period[]>(LOCAL_PERIODS_KEY, []);
    const doctors = getFromStorage<Doctor[]>(LOCAL_DOCTORS_KEY, []);
    const preferences = getFromStorage<Preference[]>(LOCAL_PREFERENCES_KEY, []);

    const period = periods.find((p) => p.id === periodId);
    if (!period) throw new Error('Dönem bulunamadı');

    const unitDoctors = doctors.filter((d) => d.unitId === period.unitId);
    const unitPrefs = preferences.filter((p) => p.periodId === periodId);

    const dates = getDatesBetween(period.startDate, period.endDate);
    const schedule: Record<string, string[]> = {};
    const shiftCounts = new Map<string, number>();
    unitDoctors.forEach((d) => shiftCounts.set(d.id, 0));

    dates.forEach((dateStr) => {
      const isWknd = isWeekend(dateStr);
      const req = period.requiredDoctorsPerDay + (isWknd ? (period.weekendExtraDoctors || 0) : 0);
      const sorted = [...unitDoctors].sort((a, b) => {
        const prefA = unitPrefs.find((p) => p.doctorId === a.id);
        const prefB = unitPrefs.find((p) => p.doctorId === b.id);
        let scoreA = -(shiftCounts.get(a.id) || 0);
        let scoreB = -(shiftCounts.get(b.id) || 0);
        if (prefA?.wantDates.includes(dateStr)) scoreA += 50;
        if (prefA?.avoidDates.includes(dateStr)) scoreA -= 500;
        if (prefB?.wantDates.includes(dateStr)) scoreB += 500;
        if (prefB?.avoidDates.includes(dateStr)) scoreB -= 500;
        return scoreB - scoreA;
      });
      const picked = sorted.slice(0, Math.min(req, sorted.length)).map((d) => d.id);
      schedule[dateStr] = picked;
      picked.forEach((id) => shiftCounts.set(id, (shiftCounts.get(id) || 0) + 1));
    });

    period.draftSchedule = schedule;
    period.status = 'scheduled';
    saveToStorage(LOCAL_PERIODS_KEY, periods);

    return { success: true, draftSchedule: schedule, shiftCounts: Object.fromEntries(shiftCounts) };
  },

  loadStarterTemplate(userId: string) {
    const hosp = this.createHospital(userId, 'Şehir Hastanesi (Örnek)', 'İstanbul');
    const unit = this.createUnit(userId, hosp.id, 'Acil Tıp Kliniği', 2);
    this.createBatchDoctors(userId, unit.id, [
      { title: 'Uzm. Dr.', name: 'Ahmet Kaya', targetShifts: 6 },
      { title: 'Uzm. Dr.', name: 'Fatma Şahin', targetShifts: 6 },
      { title: 'Asis. Dr.', name: 'Mehmet Çelik', targetShifts: 7 },
      { title: 'Asis. Dr.', name: 'Ayşe Yıldız', targetShifts: 7 },
      { title: 'Dr.', name: 'Burak Demir', targetShifts: 6 },
    ]);
    const period = this.createPeriod(userId, {
      unitId: unit.id,
      name: 'Aralık 2026 Nöbet Listesi',
      startDate: '2026-12-01',
      endDate: '2026-12-31',
      deadline: '2026-11-25',
      requiredDoctorsPerDay: 2,
      weekendExtraDoctors: 1,
    });
    return { success: true, hospital: hosp, unit, period };
  },
};

// ----------------------------------------------------
// SMART RESILIENT API CLIENT
// Tries remote Express server first; if unreachable or 404 (Hestia static), falls back to localStore!
// ----------------------------------------------------
async function safeFetch<T>(
  url: string,
  options?: RequestInit,
  fallbackFn?: () => T
): Promise<T> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';

    // If server returned 404, 502, 503, 504, or HTML error page
    if (!res.ok || res.status >= 500 || res.status === 404 || contentType.includes('text/html')) {
      if (fallbackFn) {
        console.warn(`[NöbetTalep] Sunucu yanıtı (${res.status} ${res.statusText}). Yerel depolama motoru devreye alındı.`);
        return fallbackFn();
      }
    }

    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (parseError) {
      if (fallbackFn) {
        return fallbackFn();
      }
      throw parseError;
    }
  } catch (err) {
    console.warn(`[NöbetTalep] Ağ bağlantı hatası (${url}):`, err);
    if (fallbackFn) return fallbackFn();
    throw err;
  }
}

export const api = {
  // Auth
  async register(username: string, password: string, name: string): Promise<{ success: boolean; user?: User; message?: string }> {
    return safeFetch(
      '/api/auth/register',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name }),
      },
      () => localStore.register(username, password, name)
    );
  },

  async login(username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> {
    return safeFetch(
      '/api/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      },
      () => localStore.login(username, password)
    );
  },

  async updateAdminProfile(data: { username?: string; password?: string; name?: string }): Promise<{ success: boolean; user?: User; message: string }> {
    const userId = getCurrentUserId();
    return safeFetch(
      '/api/auth/profile',
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      },
      () => localStore.updateProfile(userId, data)
    );
  },

  async loadStarterTemplate(): Promise<{ success: boolean; hospital: Hospital; unit: Unit; period: Period }> {
    const userId = getCurrentUserId();
    return safeFetch(
      '/api/user/load-template',
      {
        method: 'POST',
        headers: getAuthHeaders(),
      },
      () => localStore.loadStarterTemplate(userId)
    );
  },

  // Hospitals (User-Scoped)
  async getHospitals(): Promise<Hospital[]> {
    const userId = getCurrentUserId();
    return safeFetch(
      '/api/hospitals',
      { headers: getAuthHeaders() },
      () => localStore.getHospitals(userId)
    );
  },

  async createHospital(name: string, city: string): Promise<Hospital> {
    const userId = getCurrentUserId();
    return safeFetch(
      '/api/hospitals',
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, city }),
      },
      () => localStore.createHospital(userId, name, city)
    );
  },

  async deleteHospital(id: string): Promise<{ success: boolean }> {
    const userId = getCurrentUserId();
    return safeFetch(
      `/api/hospitals/${id}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      },
      () => localStore.deleteHospital(userId, id)
    );
  },

  // Units (User-Scoped)
  async getUnits(hospitalId?: string): Promise<Unit[]> {
    const userId = getCurrentUserId();
    const url = hospitalId ? `/api/units?hospitalId=${encodeURIComponent(hospitalId)}` : '/api/units';
    return safeFetch(
      url,
      { headers: getAuthHeaders() },
      () => localStore.getUnits(userId, hospitalId)
    );
  },

  async createUnit(hospitalId: string, name: string, minDoctorsPerShift: number): Promise<Unit> {
    const userId = getCurrentUserId();
    return safeFetch(
      '/api/units',
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ hospitalId, name, minDoctorsPerShift }),
      },
      () => localStore.createUnit(userId, hospitalId, name, minDoctorsPerShift)
    );
  },

  async deleteUnit(id: string): Promise<{ success: boolean }> {
    const userId = getCurrentUserId();
    return safeFetch(
      `/api/units/${id}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      },
      () => localStore.deleteUnit(userId, id)
    );
  },

  // Doctors (User-Scoped)
  async getDoctors(unitId?: string): Promise<Doctor[]> {
    const userId = getCurrentUserId();
    const url = unitId ? `/api/doctors?unitId=${encodeURIComponent(unitId)}` : '/api/doctors';
    return safeFetch(
      url,
      { headers: getAuthHeaders() },
      () => localStore.getDoctors(userId, unitId)
    );
  },

  async createDoctor(doctor: Partial<Doctor>): Promise<Doctor> {
    const userId = getCurrentUserId();
    return safeFetch(
      '/api/doctors',
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(doctor),
      },
      () => localStore.createDoctor(userId, doctor)
    );
  },

  async createBatchDoctors(unitId: string, doctors: Partial<Doctor>[]): Promise<{ success: boolean; count: number; doctors: Doctor[] }> {
    const userId = getCurrentUserId();
    return safeFetch(
      '/api/doctors/batch',
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ unitId, doctors }),
      },
      () => localStore.createBatchDoctors(userId, unitId, doctors)
    );
  },

  async deleteDoctor(id: string): Promise<{ success: boolean }> {
    const userId = getCurrentUserId();
    return safeFetch(
      `/api/doctors/${id}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      },
      () => localStore.deleteDoctor(userId, id)
    );
  },

  // Periods (User-Scoped)
  async getPeriods(unitId?: string): Promise<Period[]> {
    const userId = getCurrentUserId();
    const url = unitId ? `/api/periods?unitId=${encodeURIComponent(unitId)}` : '/api/periods';
    return safeFetch(
      url,
      { headers: getAuthHeaders() },
      () => localStore.getPeriods(userId, unitId)
    );
  },

  async createPeriod(period: Partial<Period>): Promise<Period> {
    const userId = getCurrentUserId();
    return safeFetch(
      '/api/periods',
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(period),
      },
      () => localStore.createPeriod(userId, period)
    );
  },

  async updatePeriod(id: string, updates: Partial<Period>): Promise<Period> {
    return safeFetch(
      `/api/periods/${id}`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      },
      () => localStore.updatePeriod(id, updates)
    );
  },

  async deletePeriod(id: string): Promise<{ success: boolean }> {
    return safeFetch(
      `/api/periods/${id}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      },
      () => localStore.deletePeriod(id)
    );
  },

  // Schedule Generation
  async generateSchedule(periodId: string): Promise<{ success: boolean; draftSchedule: Record<string, string[]>; shiftCounts: Record<string, number> }> {
    return safeFetch(
      `/api/periods/${periodId}/generate-schedule`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      },
      () => localStore.generateSchedule(periodId)
    );
  },

  async saveSchedule(periodId: string, draftSchedule: Record<string, string[]>): Promise<{ success: boolean }> {
    return safeFetch(
      `/api/periods/${periodId}/save-schedule`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ draftSchedule }),
      },
      () => {
        localStore.updatePeriod(periodId, { draftSchedule });
        return { success: true };
      }
    );
  },

  // Public Portal for Shared Doctor Link
  async getPortalData(token: string): Promise<PortalData> {
    return safeFetch(
      `/api/public/portal/${encodeURIComponent(token)}`,
      undefined,
      () => localStore.getPortalData(token)
    );
  },

  async submitPreference(data: {
    periodId: string;
    doctorId: string;
    wantDates: string[];
    avoidDates: string[];
    notes?: string;
  }): Promise<{ success: boolean; preference: Preference }> {
    return safeFetch(
      '/api/public/submit-preference',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      () => localStore.submitPreference(data)
    );
  },
};
