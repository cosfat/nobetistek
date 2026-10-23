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

interface User {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  createdAt: string;
}

interface Hospital {
  id: string;
  userId: string;
  name: string;
  city: string;
  createdAt: string;
}

interface Unit {
  id: string;
  userId: string;
  hospitalId: string;
  name: string;
  minDoctorsPerShift: number;
  shareToken: string;
  createdAt: string;
}

interface Doctor {
  id: string;
  userId: string;
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
  userId: string;
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
  users: User[];
  hospitals: Hospital[];
  units: Unit[];
  doctors: Doctor[];
  periods: Period[];
  preferences: Preference[];
}

const DEFAULT_USER_ID = 'user-default';

const initialSeed: DB = {
  users: [
    {
      id: DEFAULT_USER_ID,
      username: 'admin',
      passwordHash: '123456',
      name: 'Dr. Yönetici',
      createdAt: new Date().toISOString(),
    },
  ],
  hospitals: [
    {
      id: 'hosp-1',
      userId: DEFAULT_USER_ID,
      name: 'İstanbul Şehir Hastanesi',
      city: 'İstanbul',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'hosp-2',
      userId: DEFAULT_USER_ID,
      name: 'Ankara Bilkent Şehir Hastanesi',
      city: 'Ankara',
      createdAt: new Date().toISOString(),
    },
  ],
  units: [
    {
      id: 'unit-1',
      userId: DEFAULT_USER_ID,
      hospitalId: 'hosp-1',
      name: 'Acil Tıp Kliniği (Sarı / Kırmızı Alan)',
      minDoctorsPerShift: 2,
      shareToken: 'acil-tip-kasim',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'unit-2',
      userId: DEFAULT_USER_ID,
      hospitalId: 'hosp-1',
      name: 'İç Hastalıkları (Dahiliye)',
      minDoctorsPerShift: 1,
      shareToken: 'dahiliye-nobet',
      createdAt: new Date().toISOString(),
    },
  ],
  doctors: [
    { id: 'doc-1', userId: DEFAULT_USER_ID, unitId: 'unit-1', title: 'Uzm. Dr.', name: 'Ahmet Yılmaz', phone: '0532 111 2233', email: 'ahmet@hastane.gov.tr', targetShifts: 6, createdAt: new Date().toISOString() },
    { id: 'doc-2', userId: DEFAULT_USER_ID, unitId: 'unit-1', title: 'Uzm. Dr.', name: 'Fatma Çelik', phone: '0533 222 3344', email: 'fatma@hastane.gov.tr', targetShifts: 5, createdAt: new Date().toISOString() },
    { id: 'doc-3', userId: DEFAULT_USER_ID, unitId: 'unit-1', title: 'Asis. Dr.', name: 'Mehmet Kaya', phone: '0535 333 4455', email: 'mehmet@hastane.gov.tr', targetShifts: 7, createdAt: new Date().toISOString() },
    { id: 'doc-4', userId: DEFAULT_USER_ID, unitId: 'unit-1', title: 'Asis. Dr.', name: 'Zeynep Demir', phone: '0542 444 5566', email: 'zeynep@hastane.gov.tr', targetShifts: 7, createdAt: new Date().toISOString() },
    { id: 'doc-5', userId: DEFAULT_USER_ID, unitId: 'unit-1', title: 'Asis. Dr.', name: 'Burak Öztürk', phone: '0555 555 6677', email: 'burak@hastane.gov.tr', targetShifts: 6, createdAt: new Date().toISOString() },
    { id: 'doc-6', userId: DEFAULT_USER_ID, unitId: 'unit-1', title: 'Asis. Dr.', name: 'Elif Şahin', phone: '0505 666 7788', email: 'elif@hastane.gov.tr', targetShifts: 7, createdAt: new Date().toISOString() },
    { id: 'doc-7', userId: DEFAULT_USER_ID, unitId: 'unit-1', title: 'Asis. Dr.', name: 'Caner Aydın', phone: '0544 777 8899', email: 'caner@hastane.gov.tr', targetShifts: 6, createdAt: new Date().toISOString() },
    { id: 'doc-8', userId: DEFAULT_USER_ID, unitId: 'unit-1', title: 'Asis. Dr.', name: 'Merve Koç', phone: '0530 888 9900', email: 'merve@hastane.gov.tr', targetShifts: 6, createdAt: new Date().toISOString() },
  ],
  periods: [
    {
      id: 'period-1',
      userId: DEFAULT_USER_ID,
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
      const data = JSON.parse(content);
      
      // Migration: convert single admin to users array
      if (!data.users || !Array.isArray(data.users)) {
        data.users = [
          {
            id: DEFAULT_USER_ID,
            username: data.admin?.username || 'admin',
            passwordHash: data.admin?.passwordHash || '123456',
            name: data.admin?.name || 'Dr. Yönetici',
            createdAt: new Date().toISOString(),
          },
        ];
      }

      // Backfill userId on existing items
      if (Array.isArray(data.hospitals)) {
        data.hospitals.forEach((h: any) => {
          if (!h.userId) h.userId = DEFAULT_USER_ID;
        });
      }
      if (Array.isArray(data.units)) {
        data.units.forEach((u: any) => {
          if (!u.userId) u.userId = DEFAULT_USER_ID;
        });
      }
      if (Array.isArray(data.doctors)) {
        data.doctors.forEach((d: any) => {
          if (!d.userId) d.userId = DEFAULT_USER_ID;
        });
      }
      if (Array.isArray(data.periods)) {
        data.periods.forEach((p: any) => {
          if (!p.userId) p.userId = DEFAULT_USER_ID;
        });
      }

      return data;
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

// Helper to get userId from request
function getRequestUserId(req: express.Request): string {
  const headerUserId = req.headers['x-user-id'] as string;
  if (headerUserId && headerUserId.trim()) {
    return headerUserId.trim();
  }
  const queryUserId = req.query.userId as string;
  if (queryUserId && queryUserId.trim()) {
    return queryUserId.trim();
  }
  return DEFAULT_USER_ID;
}

// API Endpoints

// 1. Auth: Register
app.post('/api/auth/register', (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ success: false, message: 'Tüm alanları doldurunuz.' });
  }

  const cleanUsername = username.trim().toLowerCase();
  const db = readDB();

  const existing = db.users.find((u) => u.username.toLowerCase() === cleanUsername);
  if (existing) {
    return res.status(400).json({ success: false, message: 'Bu kullanıcı adı zaten kullanılıyor. Lütfen başka bir kullanıcı adı seçin.' });
  }

  const newUser: User = {
    id: 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    username: cleanUsername,
    passwordHash: String(password).trim(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  writeDB(db);

  return res.json({
    success: true,
    user: {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
    },
    message: 'Hesabınız başarıyla oluşturuldu.',
  });
});

// 2. Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre gereklidir.' });
  }

  const cleanUsername = String(username).trim().toLowerCase();
  const cleanPassword = String(password).trim();
  const db = readDB();

  const user = db.users.find(
    (u) => u.username.toLowerCase() === cleanUsername && u.passwordHash === cleanPassword
  );

  if (user) {
    return res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
      },
    });
  }

  return res.status(401).json({ success: false, message: 'Geçersiz kullanıcı adı veya şifre!' });
});

// 3. Auth: Update Profile
app.post('/api/auth/profile', (req, res) => {
  const userId = getRequestUserId(req);
  const { username, password, name } = req.body;
  const db = readDB();

  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
  }

  if (username) {
    const cleanUsername = username.trim().toLowerCase();
    const duplicate = db.users.find((u) => u.username.toLowerCase() === cleanUsername && u.id !== userId);
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Bu kullanıcı adı zaten kullanılıyor.' });
    }
    user.username = cleanUsername;
  }
  if (password && password.trim()) {
    user.passwordHash = password.trim();
  }
  if (name && name.trim()) {
    user.name = name.trim();
  }

  writeDB(db);
  return res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
    },
    message: 'Kullanıcı bilgileri güncellendi.',
  });
});

// 4. Quick starter template for new user (optional helper)
app.post('/api/user/load-template', (req, res) => {
  const userId = getRequestUserId(req);
  const db = readDB();

  // Create a sample hospital for this user
  const hospId = 'hosp-' + Date.now();
  const newHosp: Hospital = {
    id: hospId,
    userId,
    name: 'Devlet Hastanesi (Örnek)',
    city: 'İstanbul',
    createdAt: new Date().toISOString(),
  };

  const unitId = 'unit-' + Date.now();
  const newUnit: Unit = {
    id: unitId,
    userId,
    hospitalId: hospId,
    name: 'Acil Servis Kliniği',
    minDoctorsPerShift: 2,
    shareToken: 'ornek-nobet-' + Math.random().toString(36).substring(2, 6),
    createdAt: new Date().toISOString(),
  };

  const sampleDoctors: Doctor[] = [
    { id: 'doc-' + Date.now() + '-1', userId, unitId, title: 'Uzm. Dr.', name: 'Ahmet Kaya', targetShifts: 6, createdAt: new Date().toISOString() },
    { id: 'doc-' + Date.now() + '-2', userId, unitId, title: 'Uzm. Dr.', name: 'Fatma Şahin', targetShifts: 6, createdAt: new Date().toISOString() },
    { id: 'doc-' + Date.now() + '-3', userId, unitId, title: 'Asis. Dr.', name: 'Mehmet Çelik', targetShifts: 7, createdAt: new Date().toISOString() },
    { id: 'doc-' + Date.now() + '-4', userId, unitId, title: 'Asis. Dr.', name: 'Ayşe Yıldız', targetShifts: 7, createdAt: new Date().toISOString() },
    { id: 'doc-' + Date.now() + '-5', userId, unitId, title: 'Dr.', name: 'Burak Demir', targetShifts: 6, createdAt: new Date().toISOString() },
  ];

  const periodId = 'period-' + Date.now();
  const newPeriod: Period = {
    id: periodId,
    userId,
    unitId,
    name: 'Aralık 2026 Nöbet Listesi',
    startDate: '2026-12-01',
    endDate: '2026-12-31',
    deadline: '2026-11-25',
    requiredDoctorsPerDay: 2,
    weekendExtraDoctors: 1,
    status: 'active',
    shareToken: 'nobet-' + Math.random().toString(36).substring(2, 8),
    createdAt: new Date().toISOString(),
  };

  db.hospitals.push(newHosp);
  db.units.push(newUnit);
  db.doctors.push(...sampleDoctors);
  db.periods.push(newPeriod);
  writeDB(db);

  return res.json({ success: true, hospital: newHosp, unit: newUnit, period: newPeriod });
});

// 5. Hospitals (User-Scoped)
app.get('/api/hospitals', (req, res) => {
  const userId = getRequestUserId(req);
  const db = readDB();
  const userHospitals = db.hospitals.filter((h) => h.userId === userId);
  res.json(userHospitals);
});

app.post('/api/hospitals', (req, res) => {
  const userId = getRequestUserId(req);
  const { name, city } = req.body;
  if (!name) return res.status(400).json({ error: 'Hastane adı zorunludur' });
  const db = readDB();
  const newHospital: Hospital = {
    id: 'hosp-' + Date.now(),
    userId,
    name: name.trim(),
    city: city ? city.trim() : 'Genel',
    createdAt: new Date().toISOString(),
  };
  db.hospitals.push(newHospital);
  writeDB(db);
  res.json(newHospital);
});

app.delete('/api/hospitals/:id', (req, res) => {
  const userId = getRequestUserId(req);
  const { id } = req.params;
  const db = readDB();

  // Find target hospital and verify ownership
  const target = db.hospitals.find((h) => h.id === id);
  if (!target || target.userId !== userId) {
    return res.status(403).json({ error: 'Bu hastaneyi silme yetkiniz yok.' });
  }

  db.hospitals = db.hospitals.filter((h) => h.id !== id);
  // Also cleanup child units, doctors, periods belonging to this hospital
  const unitIdsToRemove = db.units.filter((u) => u.hospitalId === id).map((u) => u.id);
  db.units = db.units.filter((u) => u.hospitalId !== id);
  db.doctors = db.doctors.filter((d) => !unitIdsToRemove.includes(d.unitId));
  const periodIdsToRemove = db.periods.filter((p) => unitIdsToRemove.includes(p.unitId)).map((p) => p.id);
  db.periods = db.periods.filter((p) => !unitIdsToRemove.includes(p.unitId));
  db.preferences = db.preferences.filter((pref) => !periodIdsToRemove.includes(pref.periodId));
  writeDB(db);
  res.json({ success: true });
});

// 6. Units (User-Scoped)
app.get('/api/units', (req, res) => {
  const userId = getRequestUserId(req);
  const { hospitalId } = req.query;
  const db = readDB();

  let userUnits = db.units.filter((u) => u.userId === userId);
  if (hospitalId) {
    userUnits = userUnits.filter((u) => u.hospitalId === hospitalId);
  }
  res.json(userUnits);
});

app.post('/api/units', (req, res) => {
  const userId = getRequestUserId(req);
  const { hospitalId, name, minDoctorsPerShift } = req.body;
  if (!hospitalId || !name) return res.status(400).json({ error: 'Hastane ve birim adı zorunludur' });
  const db = readDB();
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
  db.units.push(newUnit);
  writeDB(db);
  res.json(newUnit);
});

app.delete('/api/units/:id', (req, res) => {
  const userId = getRequestUserId(req);
  const { id } = req.params;
  const db = readDB();

  const target = db.units.find((u) => u.id === id);
  if (!target || target.userId !== userId) {
    return res.status(403).json({ error: 'Bu birimi silme yetkiniz yok.' });
  }

  db.units = db.units.filter((u) => u.id !== id);
  db.doctors = db.doctors.filter((d) => d.unitId !== id);
  const periodIdsToRemove = db.periods.filter((p) => p.unitId === id).map((p) => p.id);
  db.periods = db.periods.filter((p) => p.unitId !== id);
  db.preferences = db.preferences.filter((pref) => !periodIdsToRemove.includes(pref.periodId));
  writeDB(db);
  res.json({ success: true });
});

// 7. Doctors (User-Scoped)
app.get('/api/doctors', (req, res) => {
  const userId = getRequestUserId(req);
  const { unitId } = req.query;
  const db = readDB();

  // Doctors belonging to user's units
  const userUnitIds = new Set(db.units.filter((u) => u.userId === userId).map((u) => u.id));
  let userDoctors = db.doctors.filter((d) => d.userId === userId || userUnitIds.has(d.unitId));

  if (unitId) {
    userDoctors = userDoctors.filter((d) => d.unitId === unitId);
  }
  res.json(userDoctors);
});

app.post('/api/doctors', (req, res) => {
  const userId = getRequestUserId(req);
  const { unitId, title, name, phone, email, targetShifts, notes } = req.body;
  if (!unitId || !name) return res.status(400).json({ error: 'Birim ve doktor adı zorunludur' });
  const db = readDB();
  const newDoctor: Doctor = {
    id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
    userId,
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
  const userId = getRequestUserId(req);
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
        userId,
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
  const userId = getRequestUserId(req);
  const { id } = req.params;
  const db = readDB();

  const target = db.doctors.find((d) => d.id === id);
  if (!target || (target.userId && target.userId !== userId)) {
    // If unit belongs to user, allow delete
    const unit = db.units.find((u) => u.id === target?.unitId);
    if (!unit || unit.userId !== userId) {
      return res.status(403).json({ error: 'Bu doktoru silme yetkiniz yok.' });
    }
  }

  db.doctors = db.doctors.filter((d) => d.id !== id);
  db.preferences = db.preferences.filter((p) => p.doctorId !== id);
  writeDB(db);
  res.json({ success: true });
});

// 8. Duty Periods (User-Scoped)
app.get('/api/periods', (req, res) => {
  const userId = getRequestUserId(req);
  const { unitId } = req.query;
  const db = readDB();

  const userUnitIds = new Set(db.units.filter((u) => u.userId === userId).map((u) => u.id));
  let userPeriods = db.periods.filter((p) => p.userId === userId || userUnitIds.has(p.unitId));

  if (unitId) {
    userPeriods = userPeriods.filter((p) => p.unitId === unitId);
  }
  res.json(userPeriods);
});

app.post('/api/periods', (req, res) => {
  const userId = getRequestUserId(req);
  const { unitId, name, startDate, endDate, deadline, requiredDoctorsPerDay, weekendExtraDoctors } = req.body;
  if (!unitId || !name || !startDate || !endDate) {
    return res.status(400).json({ error: 'Zorunlu alanlar eksik' });
  }
  const db = readDB();
  const token = 'nobet-' + Math.random().toString(36).substring(2, 9);
  const newPeriod: Period = {
    id: 'period-' + Date.now(),
    userId,
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
  const userId = getRequestUserId(req);
  const { id } = req.params;
  const updates = req.body;
  const db = readDB();
  const period = db.periods.find((p) => p.id === id);
  if (!period) return res.status(404).json({ error: 'Dönem bulunamadı' });
  if (period.userId && period.userId !== userId) {
    return res.status(403).json({ error: 'Bu dönemi düzenleme yetkiniz yok.' });
  }
  Object.assign(period, updates);
  writeDB(db);
  res.json(period);
});

app.delete('/api/periods/:id', (req, res) => {
  const userId = getRequestUserId(req);
  const { id } = req.params;
  const db = readDB();
  const period = db.periods.find((p) => p.id === id);
  if (!period || (period.userId && period.userId !== userId)) {
    return res.status(403).json({ error: 'Bu dönemi silme yetkiniz yok.' });
  }

  db.periods = db.periods.filter((p) => p.id !== id);
  db.preferences = db.preferences.filter((p) => p.periodId !== id);
  writeDB(db);
  res.json({ success: true });
});

// 9. PUBLIC PORTAL ENDPOINT (FOR ALL DOCTORS VIA SHARED LINK - NO AUTH REQUIRED)
app.get('/api/public/portal/:token', (req, res) => {
  const { token } = req.params;
  const db = readDB();

  // Find period by token or id
  const period = db.periods.find((p) => p.shareToken === token || p.id === token);
  if (!period) {
    // If not found as period token, check if it's a unit share token
    const unit = db.units.find((u) => u.shareToken === token || u.id === token);
    if (unit) {
      const activePeriod =
        db.periods.find((p) => p.unitId === unit.id && p.status === 'active') ||
        db.periods.find((p) => p.unitId === unit.id);
      if (activePeriod) {
        const hospital = db.hospitals.find((h) => h.id === unit.hospitalId) || null;
        const doctors = db.doctors.filter((d) => d.unitId === unit.id);
        const preferences = db.preferences.filter((p) => p.periodId === activePeriod.id);
        return res.json({
          period: activePeriod,
          unit,
          hospital,
          doctors,
          preferences,
        });
      }
    }
    return res.status(404).json({ error: 'Nöbet dönemi bulunamadı veya paylaşılan link geçersiz.' });
  }

  const unit = db.units.find((u) => u.id === period.unitId);
  const hospital = unit ? db.hospitals.find((h) => h.id === unit.hospitalId) || null : null;
  const doctors = unit ? db.doctors.filter((d) => d.unitId === unit.id) : [];
  const preferences = db.preferences.filter((p) => p.periodId === period.id);

  res.json({
    period,
    unit,
    hospital,
    doctors,
    preferences,
  });
});

// 10. Submit preference from doctor via shared link (Public - No Login required)
app.post('/api/public/submit-preference', (req, res) => {
  const { periodId, doctorId, wantDates, avoidDates, notes } = req.body;
  if (!periodId || !doctorId) {
    return res.status(400).json({ error: 'Dönem ve doktor seçimi zorunludur' });
  }

  const db = readDB();
  const existingIndex = db.preferences.findIndex(
    (p) => p.periodId === periodId && p.doctorId === doctorId
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

// 11. Auto-schedule draft algorithm
app.post('/api/periods/:id/generate-schedule', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const period = db.periods.find((p) => p.id === id);
  if (!period) return res.status(404).json({ error: 'Dönem bulunamadı' });

  const doctors = db.doctors.filter((d) => d.unitId === period.unitId);
  const preferences = db.preferences.filter((p) => p.periodId === id);

  // Timezone-safe date list
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

  const prefMap = new Map<string, { want: Set<string>; avoid: Set<string> }>();
  doctors.forEach((doc) => {
    const p = preferences.find((pr) => pr.doctorId === doc.id);
    prefMap.set(doc.id, {
      want: new Set(p ? p.wantDates : []),
      avoid: new Set(p ? p.avoidDates : []),
    });
  });

  const shiftCounts = new Map<string, number>();
  const weekendCounts = new Map<string, number>();
  doctors.forEach((d) => {
    shiftCounts.set(d.id, 0);
    weekendCounts.set(d.id, 0);
  });

  const schedule: Record<string, string[]> = {};
  const previousDayDoctors = new Set<string>();

  for (const dateStr of dates) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dObj = new Date(y, m - 1, d, 12, 0, 0);
    const dayOfWeek = dObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const requiredCount = period.requiredDoctorsPerDay + (isWeekend ? (period.weekendExtraDoctors || 0) : 0);

    const scoredDoctors = doctors.map((doc) => {
      const prefs = prefMap.get(doc.id)!;
      const avoids = prefs.avoid.has(dateStr);
      const wants = prefs.want.has(dateStr);
      const workedYesterday = previousDayDoctors.has(doc.id);
      const currentShifts = shiftCounts.get(doc.id) || 0;
      const targetShifts = doc.targetShifts || 6;
      const weekendShifts = weekendCounts.get(doc.id) || 0;

      let score = 0;
      if (avoids) score -= 1000;
      if (workedYesterday) score -= 500;
      if (wants) score += 80;

      const shiftDeficit = targetShifts - currentShifts;
      score += shiftDeficit * 15;

      if (isWeekend) score -= weekendShifts * 10;

      return { doctor: doc, score };
    });

    scoredDoctors.sort((a, b) => b.score - a.score);
    const picked = scoredDoctors.slice(0, Math.min(requiredCount, scoredDoctors.length)).map((s) => s.doctor.id);
    schedule[dateStr] = picked;

    previousDayDoctors.clear();
    picked.forEach((docId) => {
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
