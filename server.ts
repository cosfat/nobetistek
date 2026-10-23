import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Persistence file
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface Hospital {
  id: string;
  name: string;
  city: string;
  createdAt: string;
}

interface Unit {
  id: string;
  hospitalId: string;
  name: string;
  minDoctorsPerShift: number;
  shareToken: string;
  createdAt: string;
}

interface Doctor {
  id: string;
  unitId: string;
  title: string;
  name: string;
  phone?: string;
  email?: string;
  targetShifts?: number;
  notes?: string;
  createdAt: string;
}

interface Period {
  id: string;
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

interface Preference {
  id: string;
  periodId: string;
  doctorId: string;
  wantDates: string[]; // YYYY-MM-DD
  avoidDates: string[]; // YYYY-MM-DD
  notes?: string;
  submittedAt: string;
}

interface DB {
  admin: {
    username: string;
    passwordHash: string; // plain for demo simplicity or hashed
    name: string;
  };
  hospitals: Hospital[];
  units: Unit[];
  doctors: Doctor[];
  periods: Period[];
  preferences: Preference[];
}

const initialSeed: DB = {
  admin: {
    username: 'admin',
    passwordHash: '123456',
    name: 'Dr. Yönetici',
  },
  hospitals: [
    {
      id: 'hosp-1',
      name: 'İstanbul Şehir Hastanesi',
      city: 'İstanbul',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'hosp-2',
      name: 'Ankara Bilkent Şehir Hastanesi',
      city: 'Ankara',
      createdAt: new Date().toISOString(),
    },
  ],
  units: [
    {
      id: 'unit-1',
      hospitalId: 'hosp-1',
      name: 'Acil Tıp Kliniği (Sarı / Kırmızı Alan)',
      minDoctorsPerShift: 2,
      shareToken: 'acil-tip-kasim',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'unit-2',
      hospitalId: 'hosp-1',
      name: 'İç Hastalıkları (Dahiliye)',
      minDoctorsPerShift: 1,
      shareToken: 'dahiliye-nobet',
      createdAt: new Date().toISOString(),
    },
  ],
  doctors: [
    { id: 'doc-1', unitId: 'unit-1', title: 'Uzm. Dr.', name: 'Ahmet Yılmaz', phone: '0532 111 2233', email: 'ahmet@hastane.gov.tr', targetShifts: 6, createdAt: new Date().toISOString() },
    { id: 'doc-2', unitId: 'unit-1', title: 'Uzm. Dr.', name: 'Fatma Çelik', phone: '0533 222 3344', email: 'fatma@hastane.gov.tr', targetShifts: 5, createdAt: new Date().toISOString() },
    { id: 'doc-3', unitId: 'unit-1', title: 'Asis. Dr.', name: 'Mehmet Kaya', phone: '0535 333 4455', email: 'mehmet@hastane.gov.tr', targetShifts: 7, createdAt: new Date().toISOString() },
    { id: 'doc-4', unitId: 'unit-1', title: 'Asis. Dr.', name: 'Zeynep Demir', phone: '0542 444 5566', email: 'zeynep@hastane.gov.tr', targetShifts: 7, createdAt: new Date().toISOString() },
    { id: 'doc-5', unitId: 'unit-1', title: 'Asis. Dr.', name: 'Burak Öztürk', phone: '0555 555 6677', email: 'burak@hastane.gov.tr', targetShifts: 6, createdAt: new Date().toISOString() },
    { id: 'doc-6', unitId: 'unit-1', title: 'Asis. Dr.', name: 'Elif Şahin', phone: '0505 666 7788', email: 'elif@hastane.gov.tr', targetShifts: 7, createdAt: new Date().toISOString() },
    { id: 'doc-7', unitId: 'unit-1', title: 'Asis. Dr.', name: 'Caner Aydın', phone: '0544 777 8899', email: 'caner@hastane.gov.tr', targetShifts: 6, createdAt: new Date().toISOString() },
    { id: 'doc-8', unitId: 'unit-1', title: 'Asis. Dr.', name: 'Merve Koç', phone: '0530 888 9900', email: 'merve@hastane.gov.tr', targetShifts: 6, createdAt: new Date().toISOString() },
  ],
  periods: [
    {
      id: 'period-1',
      unitId: 'unit-1',
      name: 'Kasım 2026 Nöbet Listesi',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      deadline: '2026-10-28',
      requiredDoctorsPerDay: 2,
      weekendExtraDoctors: 1,
      status: 'active',
      shareToken: 'acil-kasim-2026',
      createdAt: new Date().toISOString(),
    },
  ],
  preferences: [
    {
      id: 'pref-1',
      periodId: 'period-1',
      doctorId: 'doc-1',
      wantDates: ['2026-11-06', '2026-11-13', '2026-11-20'],
      avoidDates: ['2026-11-01', '2026-11-02', '2026-11-15'],
      notes: '15 Kasım tarihinde sempozyum sunumum var, nöbet yazılmamasını rica ederim.',
      submittedAt: new Date().toISOString(),
    },
    {
      id: 'pref-2',
      periodId: 'period-1',
      doctorId: 'doc-2',
      wantDates: ['2026-11-07', '2026-11-14', '2026-11-28'],
      avoidDates: ['2026-11-21', '2026-11-22'],
      notes: '21-22 Kasım hafta sonu aile ziyareti.',
      submittedAt: new Date().toISOString(),
    },
    {
      id: 'pref-3',
      periodId: 'period-1',
      doctorId: 'doc-3',
      wantDates: ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23'],
      avoidDates: ['2026-11-06', '2026-11-07'],
      notes: 'Pazartesi günleri nöbet tercihimdir.',
      submittedAt: new Date().toISOString(),
    },
  ],
};

function readDB(): DB {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading db.json, returning initial seed:', err);
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialSeed, null, 2), 'utf-8');
  return initialSeed;
}

function writeDB(data: DB) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing db.json:', err);
  }
}

// Ensure db exists on startup
readDB();

// API Endpoints

// 1. Auth Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  if (
    username === db.admin.username &&
    password === db.admin.passwordHash
  ) {
    return res.json({
      success: true,
      user: {
        username: db.admin.username,
        name: db.admin.name,
        role: 'admin',
      },
      token: 'admin-session-token-' + Date.now(),
    });
  }
  return res.status(401).json({ success: false, message: 'Geçersiz kullanıcı adı veya şifre!' });
});

// Update Admin Profile / Credentials
app.post('/api/auth/profile', (req, res) => {
  const { username, password, name } = req.body;
  const db = readDB();
  if (username) db.admin.username = username.trim();
  if (password) db.admin.passwordHash = password.trim();
  if (name) db.admin.name = name.trim();
  writeDB(db);
  return res.json({ success: true, message: 'Yönetici bilgileri güncellendi.' });
});

// 2. Hospitals
app.get('/api/hospitals', (_req, res) => {
  const db = readDB();
  res.json(db.hospitals);
});

app.post('/api/hospitals', (req, res) => {
  const { name, city } = req.body;
  if (!name) return res.status(400).json({ error: 'Hastane adı zorunludur' });
  const db = readDB();
  const newHospital: Hospital = {
    id: 'hosp-' + Date.now(),
    name: name.trim(),
    city: city ? city.trim() : 'Genel',
    createdAt: new Date().toISOString(),
  };
  db.hospitals.push(newHospital);
  writeDB(db);
  res.json(newHospital);
});

app.delete('/api/hospitals/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.hospitals = db.hospitals.filter(h => h.id !== id);
  // Also cleanup child units, doctors, periods
  const unitIdsToRemove = db.units.filter(u => u.hospitalId === id).map(u => u.id);
  db.units = db.units.filter(u => u.hospitalId !== id);
  db.doctors = db.doctors.filter(d => !unitIdsToRemove.includes(d.unitId));
  const periodIdsToRemove = db.periods.filter(p => unitIdsToRemove.includes(p.unitId)).map(p => p.id);
  db.periods = db.periods.filter(p => !unitIdsToRemove.includes(p.unitId));
  db.preferences = db.preferences.filter(pref => !periodIdsToRemove.includes(pref.periodId));
  writeDB(db);
  res.json({ success: true });
});

// 3. Units
app.get('/api/units', (req, res) => {
  const { hospitalId } = req.query;
  const db = readDB();
  if (hospitalId) {
    return res.json(db.units.filter(u => u.hospitalId === hospitalId));
  }
  res.json(db.units);
});

app.post('/api/units', (req, res) => {
  const { hospitalId, name, minDoctorsPerShift } = req.body;
  if (!hospitalId || !name) return res.status(400).json({ error: 'Hastane ve birim adı zorunludur' });
  const db = readDB();
  // slugify name for shareToken
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 16) + '-' + Math.random().toString(36).substring(2, 6);
  const newUnit: Unit = {
    id: 'unit-' + Date.now(),
    hospitalId,
    name: name.trim(),
    minDoctorsPerShift: Number(minDoctorsPerShift) || 1,
    shareToken: slug,
    createdAt: new Date().toISOString(),
  };
  db.units.push(newUnit);
  writeDB(db);
  res.json(newUnit);
});

app.delete('/api/units/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.units = db.units.filter(u => u.id !== id);
  db.doctors = db.doctors.filter(d => d.unitId !== id);
  const periodIdsToRemove = db.periods.filter(p => p.unitId === id).map(p => p.id);
  db.periods = db.periods.filter(p => p.unitId !== id);
  db.preferences = db.preferences.filter(pref => !periodIdsToRemove.includes(pref.periodId));
  writeDB(db);
  res.json({ success: true });
});

// 4. Doctors
app.get('/api/doctors', (req, res) => {
  const { unitId } = req.query;
  const db = readDB();
  if (unitId) {
    return res.json(db.doctors.filter(d => d.unitId === unitId));
  }
  res.json(db.doctors);
});

app.post('/api/doctors', (req, res) => {
  const { unitId, title, name, phone, email, targetShifts, notes } = req.body;
  if (!unitId || !name) return res.status(400).json({ error: 'Birim ve doktor adı zorunludur' });
  const db = readDB();
  const newDoctor: Doctor = {
    id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
    unitId,
    title: title || 'Dr.',
    name: name.trim(),
    phone: phone ? phone.trim() : '',
    email: email ? email.trim() : '',
    targetShifts: Number(targetShifts) || 6,
    notes: notes ? notes.trim() : '',
    createdAt: new Date().toISOString(),
  };
  db.doctors.push(newDoctor);
  writeDB(db);
  res.json(newDoctor);
});

// Batch doctor add
app.post('/api/doctors/batch', (req, res) => {
  const { unitId, doctors } = req.body;
  if (!unitId || !Array.isArray(doctors) || doctors.length === 0) {
    return res.status(400).json({ error: 'Geçerli doktor listesi gönderilmedi' });
  }
  const db = readDB();
  const created: Doctor[] = [];
  doctors.forEach((d, idx) => {
    if (d.name && d.name.trim()) {
      const doc: Doctor = {
        id: 'doc-' + (Date.now() + idx) + '-' + Math.random().toString(36).substring(2, 5),
        unitId,
        title: d.title || 'Dr.',
        name: d.name.trim(),
        phone: d.phone ? d.phone.trim() : '',
        email: d.email ? d.email.trim() : '',
        targetShifts: Number(d.targetShifts) || 6,
        createdAt: new Date().toISOString(),
      };
      db.doctors.push(doc);
      created.push(doc);
    }
  });
  writeDB(db);
  res.json({ success: true, count: created.length, doctors: created });
});

app.delete('/api/doctors/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.doctors = db.doctors.filter(d => d.id !== id);
  db.preferences = db.preferences.filter(p => p.doctorId !== id);
  writeDB(db);
  res.json({ success: true });
});

// 5. Duty Periods
app.get('/api/periods', (req, res) => {
  const { unitId } = req.query;
  const db = readDB();
  if (unitId) {
    return res.json(db.periods.filter(p => p.unitId === unitId));
  }
  res.json(db.periods);
});

app.post('/api/periods', (req, res) => {
  const { unitId, name, startDate, endDate, deadline, requiredDoctorsPerDay, weekendExtraDoctors } = req.body;
  if (!unitId || !name || !startDate || !endDate) {
    return res.status(400).json({ error: 'Zorunlu alanlar eksik' });
  }
  const db = readDB();
  const token = 'nobet-' + Math.random().toString(36).substring(2, 9);
  const newPeriod: Period = {
    id: 'period-' + Date.now(),
    unitId,
    name: name.trim(),
    startDate,
    endDate,
    deadline: deadline || endDate,
    requiredDoctorsPerDay: Number(requiredDoctorsPerDay) || 1,
    weekendExtraDoctors: Number(weekendExtraDoctors) || 0,
    status: 'active',
    shareToken: token,
    createdAt: new Date().toISOString(),
  };
  db.periods.push(newPeriod);
  writeDB(db);
  res.json(newPeriod);
});

app.patch('/api/periods/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const db = readDB();
  const period = db.periods.find(p => p.id === id);
  if (!period) return res.status(404).json({ error: 'Dönem bulunamadı' });
  Object.assign(period, updates);
  writeDB(db);
  res.json(period);
});

app.delete('/api/periods/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.periods = db.periods.filter(p => p.id !== id);
  db.preferences = db.preferences.filter(p => p.periodId !== id);
  writeDB(db);
  res.json({ success: true });
});

// 6. Public Portal endpoint for shared link:
// Can query by period shareToken or periodId
app.get('/api/public/portal/:token', (req, res) => {
  const { token } = req.params;
  const db = readDB();
  
  // Find period by token or id
  const period = db.periods.find(p => p.shareToken === token || p.id === token);
  if (!period) {
    // If not found as period token, maybe it's a unit share token? Find active period for this unit
    const unit = db.units.find(u => u.shareToken === token || u.id === token);
    if (unit) {
      const activePeriod = db.periods.find(p => p.unitId === unit.id && p.status === 'active') || db.periods.find(p => p.unitId === unit.id);
      if (activePeriod) {
        const hospital = db.hospitals.find(h => h.id === unit.hospitalId);
        const doctors = db.doctors.filter(d => d.unitId === unit.id);
        const preferences = db.preferences.filter(p => p.periodId === activePeriod.id);
        return res.json({
          period: activePeriod,
          unit,
          hospital,
          doctors,
          preferences,
        });
      }
    }
    return res.status(404).json({ error: 'Nöbet dönemi bulunamadı veya link geçersiz.' });
  }

  const unit = db.units.find(u => u.id === period.unitId);
  const hospital = unit ? db.hospitals.find(h => h.id === unit.hospitalId) : null;
  const doctors = unit ? db.doctors.filter(d => d.unitId === unit.id) : [];
  const preferences = db.preferences.filter(p => p.periodId === period.id);

  res.json({
    period,
    unit,
    hospital,
    doctors,
    preferences,
  });
});

// 7. Submit or Update Doctor Preference
app.post('/api/public/submit-preference', (req, res) => {
  const { periodId, doctorId, wantDates, avoidDates, notes } = req.body;
  if (!periodId || !doctorId) {
    return res.status(400).json({ error: 'Dönem ve doktor seçimi zorunludur' });
  }

  const db = readDB();
  const existingIndex = db.preferences.findIndex(
    p => p.periodId === periodId && p.doctorId === doctorId
  );

  const pref: Preference = {
    id: existingIndex >= 0 ? db.preferences[existingIndex].id : 'pref-' + Date.now(),
    periodId,
    doctorId,
    wantDates: Array.isArray(wantDates) ? wantDates : [],
    avoidDates: Array.isArray(avoidDates) ? avoidDates : [],
    notes: notes ? String(notes).trim() : '',
    submittedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    db.preferences[existingIndex] = pref;
  } else {
    db.preferences.push(pref);
  }

  writeDB(db);
  res.json({ success: true, preference: pref });
});

// 8. Auto-schedule draft algorithm
app.post('/api/periods/:id/generate-schedule', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const period = db.periods.find(p => p.id === id);
  if (!period) return res.status(404).json({ error: 'Dönem bulunamadı' });

  const unit = db.units.find(u => u.id === period.unitId);
  const doctors = db.doctors.filter(d => d.unitId === period.unitId);
  const preferences = db.preferences.filter(p => p.periodId === id);

  // Generate date list between start and end date (timezone safe)
  const dates: string[] = [];
  const [sY, sM, sD] = period.startDate.split('-').map(Number);
  const [eY, eM, eD] = period.endDate.split('-').map(Number);
  const current = new Date(sY, sM - 1, sD, 12, 0, 0);
  const end = new Date(eY, eM - 1, eD, 12, 0, 0);

  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }

  // Pre-index preferences
  const prefMap = new Map<string, { want: Set<string>; avoid: Set<string> }>();
  doctors.forEach(doc => {
    const p = preferences.find(pr => pr.doctorId === doc.id);
    prefMap.set(doc.id, {
      want: new Set(p ? p.wantDates : []),
      avoid: new Set(p ? p.avoidDates : []),
    });
  });

  // Track shift count per doctor to ensure fair distribution
  const shiftCounts = new Map<string, number>();
  const weekendCounts = new Map<string, number>();
  doctors.forEach(d => {
    shiftCounts.set(d.id, 0);
    weekendCounts.set(d.id, 0);
  });

  const schedule: Record<string, string[]> = {};
  const previousDayDoctors = new Set<string>();

  for (const dateStr of dates) {
    const dObj = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = dObj.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const requiredCount = period.requiredDoctorsPerDay + (isWeekend ? (period.weekendExtraDoctors || 0) : 0);

    schedule[dateStr] = [];

    // Candidate scoring:
    // Disqualified if in avoidDates or worked yesterday (no back-to-back shifts)
    // Preference score: +10 if in wantDates
    // Workload score: Lower current shifts gets higher priority
    // Weekend fairness: Lower weekend shifts get higher priority on weekends
    const scoredDoctors = doctors.map(doc => {
      const prefs = prefMap.get(doc.id)!;
      const avoids = prefs.avoid.has(dateStr);
      const wants = prefs.want.has(dateStr);
      const workedYesterday = previousDayDoctors.has(doc.id);
      const currentShifts = shiftCounts.get(doc.id) || 0;
      const targetShifts = doc.targetShifts || 6;
      const weekendShifts = weekendCounts.get(doc.id) || 0;

      let score = 0;
      if (avoids) {
        score -= 1000; // Strong penalty for mazeret / avoid
      }
      if (workedYesterday) {
        score -= 500; // No back-to-back unless impossible
      }
      if (wants) {
        score += 80; // High reward for requested day
      }

      // Prioritize those below their target shift count
      const shiftDeficit = targetShifts - currentShifts;
      score += shiftDeficit * 15;

      if (isWeekend) {
        score -= weekendShifts * 10;
      }

      return {
        doctor: doc,
        score,
        avoids,
        wants,
        workedYesterday,
      };
    });

    // Sort descending by score
    scoredDoctors.sort((a, b) => b.score - a.score);

    // Pick top requiredCount doctors
    const picked = scoredDoctors.slice(0, Math.min(requiredCount, scoredDoctors.length)).map(s => s.doctor.id);
    schedule[dateStr] = picked;

    // Update state
    previousDayDoctors.clear();
    picked.forEach(docId => {
      previousDayDoctors.add(docId);
      shiftCounts.set(docId, (shiftCounts.get(docId) || 0) + 1);
      if (isWeekend) {
        weekendCounts.set(docId, (weekendCounts.get(docId) || 0) + 1);
      }
    });
  }

  period.draftSchedule = schedule;
  period.status = 'scheduled';
  writeDB(db);

  res.json({ success: true, draftSchedule: schedule, shiftCounts: Object.fromEntries(shiftCounts) });
});

// Save edited draft schedule
app.post('/api/periods/:id/save-schedule', (req, res) => {
  const { id } = req.params;
  const { draftSchedule } = req.body;
  const db = readDB();
  const period = db.periods.find(p => p.id === id);
  if (!period) return res.status(404).json({ error: 'Dönem bulunamadı' });

  period.draftSchedule = draftSchedule;
  writeDB(db);
  res.json({ success: true, draftSchedule });
});

// Setup Vite in middleware mode for dev
async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🏥 NöbetTalep Sunucusu http://0.0.0.0:${PORT} adresinde aktif!\n`);
  });
}

startServer();
