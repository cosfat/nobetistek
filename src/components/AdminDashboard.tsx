import React, { useState, useEffect } from 'react';
import { Hospital, Unit, Doctor, Period, Preference, AdminUser } from '../types';
import { api } from '../services/api';
import { DutyMatrixTable } from './DutyMatrixTable';
import { HospitalManager } from './HospitalManager';
import { DoctorManager } from './DoctorManager';
import { PeriodManager } from './PeriodManager';
import { 
  Building2, Layers, Users, Calendar, BarChart3, Settings, 
  Share2, RefreshCw, KeyRound, Check, ShieldCheck 
} from 'lucide-react';

interface AdminDashboardProps {
  user: AdminUser;
  onShareClick: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  onShareClick,
}) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'matrix' | 'hospitals' | 'doctors' | 'periods' | 'settings'>('matrix');

  // Core Data
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);

  // Selection states
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');

  // Admin Profile form
  const [adminName, setAdminName] = useState(user.name);
  const [adminUsername, setAdminUsername] = useState(user.username);
  const [adminPassword, setAdminPassword] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Load all initial data
  const loadData = async () => {
    try {
      setLoading(true);
      const [hospList, unitList, docList, perList] = await Promise.all([
        api.getHospitals(),
        api.getUnits(),
        api.getDoctors(),
        api.getPeriods(),
      ]);

      setHospitals(hospList);
      setUnits(unitList);
      setDoctors(docList);
      setPeriods(perList);

      // Set default selected hospital if none selected
      const currentHospId = selectedHospitalId || (hospList[0] ? hospList[0].id : '');
      setSelectedHospitalId(currentHospId);

      // Set default selected unit
      const availableUnits = unitList.filter((u) => u.hospitalId === currentHospId);
      const currentUnitId = selectedUnitId || (availableUnits[0] ? availableUnits[0].id : (unitList[0] ? unitList[0].id : ''));
      setSelectedUnitId(currentUnitId);

      // Set default selected period
      const availablePeriods = perList.filter((p) => p.unitId === currentUnitId);
      const currentPeriodId = selectedPeriodId || (availablePeriods[0] ? availablePeriods[0].id : (perList[0] ? perList[0].id : ''));
      setSelectedPeriodId(currentPeriodId);

      // Load preferences for this period if any
      if (currentPeriodId) {
        try {
          const activePeriod = perList.find((p) => p.id === currentPeriodId);
          if (activePeriod) {
            const portal = await api.getPortalData(activePeriod.shareToken);
            setPreferences(portal.preferences || []);
          }
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When selected hospital changes, update unit
  const handleHospitalChange = (hospId: string) => {
    setSelectedHospitalId(hospId);
    const relatedUnits = units.filter((u) => u.hospitalId === hospId);
    if (relatedUnits.length > 0) {
      handleUnitChange(relatedUnits[0].id);
    } else {
      setSelectedUnitId('');
      setSelectedPeriodId('');
    }
  };

  // When selected unit changes, update period & preferences
  const handleUnitChange = async (unitId: string) => {
    setSelectedUnitId(unitId);
    const relatedPeriods = periods.filter((p) => p.unitId === unitId);
    if (relatedPeriods.length > 0) {
      handlePeriodChange(relatedPeriods[0].id);
    } else {
      setSelectedPeriodId('');
      setPreferences([]);
    }
  };

  // When selected period changes, load preferences
  const handlePeriodChange = async (periodId: string) => {
    setSelectedPeriodId(periodId);
    const p = periods.find((item) => item.id === periodId);
    if (p) {
      try {
        const portal = await api.getPortalData(p.shareToken);
        setPreferences(portal.preferences || []);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateAdminProfile({
        name: adminName,
        username: adminUsername,
        password: adminPassword || undefined,
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch (err: any) {
      alert('Ayarlar güncellenirken hata: ' + err.message);
    }
  };

  const currentHospital = hospitals.find((h) => h.id === selectedHospitalId) || null;
  const currentUnit = units.find((u) => u.id === selectedUnitId) || null;
  const currentPeriod = periods.find((p) => p.id === selectedPeriodId) || null;
  const currentDoctors = doctors.filter((d) => d.unitId === selectedUnitId);

  if (loading && hospitals.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-slate-300">
        <RefreshCw className="w-8 h-8 text-teal-400 animate-spin mb-3" />
        <p className="text-sm">Yönetim verileri yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Filter & Context Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto flex-1">
          {/* Hospital Select */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
              <Building2 className="w-3 h-3 text-teal-400" />
              <span>Hastane</span>
            </label>
            <select
              value={selectedHospitalId}
              onChange={(e) => handleHospitalChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500 truncate"
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Select */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
              <Layers className="w-3 h-3 text-indigo-400" />
              <span>Birim / Klinik</span>
            </label>
            <select
              value={selectedUnitId}
              onChange={(e) => handleUnitChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500 truncate"
            >
              {units
                .filter((u) => u.hospitalId === selectedHospitalId)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Period Select */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-emerald-400" />
              <span>Nöbet Dönemi</span>
            </label>
            <select
              value={selectedPeriodId}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500 truncate"
            >
              {periods
                .filter((p) => p.unitId === selectedUnitId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Refresh & Quick Share actions */}
        <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Verileri Yenile"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onShareClick}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/20 transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Ortak Linki Paylaş</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-1 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center space-x-2 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'matrix'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Nöbet Çizelgesi & İstek Matrisi</span>
        </button>

        <button
          onClick={() => setActiveTab('hospitals')}
          className={`flex items-center space-x-2 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'hospitals'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Hastane & Birimler ({hospitals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('doctors')}
          className={`flex items-center space-x-2 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'doctors'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Doktor Kadrosu ({currentDoctors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('periods')}
          className={`flex items-center space-x-2 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'periods'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Nöbet Dönemleri</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center space-x-2 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'settings'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Yönetici Ayarları</span>
        </button>
      </div>

      {/* TAB CONTENTS */}

      {/* 1. Nöbet Çizelgesi & Matris */}
      {activeTab === 'matrix' && (
        <>
          {currentPeriod && currentUnit ? (
            <DutyMatrixTable
              period={currentPeriod}
              unit={currentUnit}
              hospital={currentHospital}
              doctors={currentDoctors}
              preferences={preferences}
              onShareClick={onShareClick}
              onRefresh={loadData}
            />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">Nöbet Dönemi Bulunamadı</h3>
              <p className="text-xs max-w-sm mx-auto">
                Bu klinik için henüz bir nöbet dönemi tanımlanmamış. "Nöbet Dönemleri" sekmesinden yeni bir dönem açabilirsiniz.
              </p>
              <button
                onClick={() => setActiveTab('periods')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white"
              >
                Yeni Dönem Başlat
              </button>
            </div>
          )}
        </>
      )}

      {/* 2. Hastane & Birim Yönetimi */}
      {activeTab === 'hospitals' && (
        <HospitalManager
          hospitals={hospitals}
          units={units}
          selectedHospitalId={selectedHospitalId}
          selectedUnitId={selectedUnitId}
          onSelectHospital={handleHospitalChange}
          onSelectUnit={handleUnitChange}
          onDataChange={loadData}
        />
      )}

      {/* 3. Doktor Yönetimi */}
      {activeTab === 'doctors' && (
        <DoctorManager
          doctors={currentDoctors}
          unit={currentUnit}
          onDataChange={loadData}
        />
      )}

      {/* 4. Nöbet Dönemleri */}
      {activeTab === 'periods' && (
        <PeriodManager
          periods={periods}
          unit={currentUnit}
          selectedPeriodId={selectedPeriodId}
          onSelectPeriod={handlePeriodChange}
          onDataChange={loadData}
          onShareClick={onShareClick}
        />
      )}

      {/* 5. Yönetici Ayarları */}
      {activeTab === 'settings' && (
        <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Yönetici Hesap Bilgileri</h3>
              <p className="text-xs text-slate-400">Giriş kullanıcı adı ve şifrenizi güncelleyebilirsiniz</p>
            </div>
          </div>

          {settingsSaved && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Yönetici bilgileri başarıyla güncellendi.</span>
            </div>
          )}

          <form onSubmit={handleUpdateAdmin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Yönetici Adı & Unvanı
              </label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Giriş Kullanıcı Adı
              </label>
              <input
                type="text"
                required
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Yeni Şifre (Değiştirmek istemiyorsanız boş bırakın)
              </label>
              <input
                type="password"
                placeholder="Yeni şifre..."
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/30 transition-all"
              >
                Bilgileri Güncelle
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
