import React, { useState, useEffect } from 'react';
import { Hospital, Unit, Doctor, Period, Preference, User } from '../types';
import { api } from '../services/api';
import { DutyMatrixTable } from './DutyMatrixTable';
import { HospitalManager } from './HospitalManager';
import { DoctorManager } from './DoctorManager';
import { PeriodManager } from './PeriodManager';
import { 
  Building2, Layers, Users, Calendar, BarChart3, Settings, 
  Share2, RefreshCw, Sparkles, Plus, AlertCircle, Check 
} from 'lucide-react';

interface AdminDashboardProps {
  user: User;
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
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // Load all initial data for this user
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

      // Set default selected hospital (fallback if deleted or empty)
      let currentHospId = selectedHospitalId;
      if (!hospList.some((h) => h.id === currentHospId)) {
        currentHospId = hospList[0] ? hospList[0].id : '';
      }
      setSelectedHospitalId(currentHospId);

      // Set default selected unit (fallback if deleted or empty)
      const availableUnits = unitList.filter((u) => u.hospitalId === currentHospId);
      let currentUnitId = selectedUnitId;
      if (!availableUnits.some((u) => u.id === currentUnitId)) {
        currentUnitId = availableUnits[0] ? availableUnits[0].id : (unitList[0] ? unitList[0].id : '');
      }
      setSelectedUnitId(currentUnitId);

      // Set default selected period (fallback if deleted or empty)
      const availablePeriods = perList.filter((p) => p.unitId === currentUnitId);
      let currentPeriodId = selectedPeriodId;
      if (!availablePeriods.some((p) => p.id === currentPeriodId)) {
        currentPeriodId = availablePeriods[0] ? availablePeriods[0].id : (perList[0] ? perList[0].id : '');
      }
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
  }, [user.id]);

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
      const res = await api.updateAdminProfile({
        name: adminName,
        username: adminUsername,
        password: adminPassword || undefined,
      });
      if (res.success) {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2500);
      } else {
        alert(res.message || 'Hata oluştu');
      }
    } catch (err: any) {
      alert('Ayarlar güncellenirken hata: ' + (err?.message || 'Bilinmeyen hata'));
    }
  };

  // Load starter template
  const handleLoadTemplate = async () => {
    setLoadingTemplate(true);
    try {
      await api.loadStarterTemplate();
      await loadData();
    } catch (err: any) {
      alert('Şablon yüklenirken hata: ' + (err?.message || 'Hata'));
    } finally {
      setLoadingTemplate(false);
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
      {/* Welcome & Empty State Banner if user has 0 hospitals */}
      {hospitals.length === 0 && (
        <div className="bg-gradient-to-r from-teal-950/70 via-slate-900 to-indigo-950/70 border border-teal-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-teal-400 uppercase tracking-widest bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20">
                Hesabınız Hazır
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Hoş Geldiniz, {user.name}!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                Bu hesap tamamen size özeldir. Kendi hastanenizi, birimlerinizi ve doktor kadronuzu ekleyerek nöbet taleplerini toplamaya başlayabilirsiniz.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleLoadTemplate}
                disabled={loadingTemplate}
                className="px-4 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{loadingTemplate ? 'Yükleniyor...' : 'Örnek Klinik Şablonu Yükle'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('hospitals')}
                className="px-4 py-2.5 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/30 flex items-center justify-center space-x-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Kendi Hastanemi Ekle</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
              disabled={hospitals.length === 0}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500 truncate disabled:opacity-50"
            >
              {hospitals.length === 0 ? (
                <option value="">(Henüz Hastane Eklenmedi)</option>
              ) : (
                hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))
              )}
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
              disabled={units.length === 0}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500 truncate disabled:opacity-50"
            >
              {units.length === 0 ? (
                <option value="">(Birim Yok)</option>
              ) : (
                units
                  .filter((u) => u.hospitalId === selectedHospitalId)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))
              )}
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
              disabled={periods.length === 0}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500 truncate disabled:opacity-50"
            >
              {periods.length === 0 ? (
                <option value="">(Dönem Yok)</option>
              ) : (
                periods
                  .filter((p) => p.unitId === selectedUnitId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))
              )}
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
            disabled={!currentPeriod}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/20 transition-all disabled:opacity-40"
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
          <span>Hastanelerim & Birimler ({hospitals.length})</span>
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
          <span>Doktor Kadrom ({currentDoctors.length})</span>
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
          <span>Hesap Ayarları</span>
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
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-4">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">Görüntülenecek Nöbet Listesi Yok</h3>
              <p className="text-xs max-w-md mx-auto leading-relaxed">
                {hospitals.length === 0
                  ? 'Henüz bir hastane veya birim eklemediniz. "Hastanelerim & Birimler" sekmesinden ilk biriminizi oluşturabilir veya yukarıdaki örnek şablonu kullanabilirsiniz.'
                  : 'Seçili klinik için aktif bir nöbet dönemi bulunmuyor. "Nöbet Dönemleri" sekmesinden yeni bir dönem açabilirsiniz.'}
              </p>
              <div className="flex justify-center gap-3 pt-2">
                {hospitals.length === 0 ? (
                  <button
                    onClick={() => setActiveTab('hospitals')}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white"
                  >
                    Hastane ve Birim Ekle
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab('periods')}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white"
                  >
                    Yeni Nöbet Dönemi Aç
                  </button>
                )}
              </div>
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
        <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Hesap ve Giriş Bilgileri</h3>
              <p className="text-xs text-slate-400">
                Hesap adınızı, kullanıcı adınızı ve şifrenizi güncelleyin
              </p>
            </div>
          </div>

          {settingsSaved && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Hesap bilgileriniz başarıyla güncellendi.</span>
            </div>
          )}

          <form onSubmit={handleUpdateAdmin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Adınız & Unvanınız
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
                Kullanıcı Adı
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
