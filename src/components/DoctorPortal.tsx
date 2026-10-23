import React, { useState, useEffect } from 'react';
import { 
  Calendar, CheckCircle, AlertTriangle, Send, User, ChevronRight, 
  HelpCircle, Sparkles, Check, X, ShieldAlert, ArrowLeft, RefreshCw 
} from 'lucide-react';
import { PortalData, Doctor, Preference } from '../types';
import { api } from '../services/api';
import { 
  formatDateTR, formatShortDateTR, isWeekend, 
  getDayOfWeekIndexMondayFirst, getDatesBetween, TURKISH_DAYS_ORDERED, TURKISH_MONTHS 
} from '../utils/dateUtils';

interface DoctorPortalProps {
  token?: string;
  initialPortalData?: PortalData | null;
  onAdminClick?: () => void;
}

export const DoctorPortal: React.FC<DoctorPortalProps> = ({
  token,
  initialPortalData,
  onAdminClick,
}) => {
  const [loading, setLoading] = useState(!initialPortalData);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PortalData | null>(initialPortalData || null);

  // Selected doctor
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [doctorSearch, setDoctorSearch] = useState<string>('');

  // Preference state
  const [wantDates, setWantDates] = useState<string[]>([]);
  const [avoidDates, setAvoidDates] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');

  // Current active mode for clicking: 'toggle' | 'want' | 'avoid' | 'clear'
  const [activeTool, setActiveTool] = useState<'want' | 'avoid' | 'clear'>('want');

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Load portal data if not provided
  useEffect(() => {
    if (!initialPortalData) {
      loadPortal();
    } else {
      setData(initialPortalData);
      setLoading(false);
    }
  }, [token, initialPortalData]);

  const loadPortal = async () => {
    try {
      setLoading(true);
      setError(null);
      const activeToken = token || new URLSearchParams(window.location.search).get('token') || 'acil-kasim-2026';
      const portalData = await api.getPortalData(activeToken);
      setData(portalData);
    } catch (err: any) {
      setError(err?.message || 'Nöbet bağlantısı yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  // When doctor is selected, populate if existing preference found
  const handleSelectDoctor = (docId: string) => {
    setSelectedDoctorId(docId);
    setSubmittedSuccess(false);

    if (data) {
      const existing = data.preferences.find((p) => p.doctorId === docId);
      if (existing) {
        setWantDates([...existing.wantDates]);
        setAvoidDates([...existing.avoidDates]);
        setNotes(existing.notes || '');
      } else {
        setWantDates([]);
        setAvoidDates([]);
        setNotes('');
      }
    }
  };

  // Handle cell click
  const handleDateClick = (dateStr: string) => {
    if (!selectedDoctorId) {
      alert('Lütfen önce yukarıdaki listeden adınızı seçiniz!');
      return;
    }

    if (activeTool === 'want') {
      if (wantDates.includes(dateStr)) {
        // deselect
        setWantDates(wantDates.filter((d) => d !== dateStr));
      } else {
        // select want, remove from avoid if present
        setWantDates([...wantDates, dateStr]);
        setAvoidDates(avoidDates.filter((d) => d !== dateStr));
      }
    } else if (activeTool === 'avoid') {
      if (avoidDates.includes(dateStr)) {
        // deselect
        setAvoidDates(avoidDates.filter((d) => d !== dateStr));
      } else {
        // select avoid, remove from want if present
        setAvoidDates([...avoidDates, dateStr]);
        setWantDates(wantDates.filter((d) => d !== dateStr));
      }
    } else if (activeTool === 'clear') {
      setWantDates(wantDates.filter((d) => d !== dateStr));
      setAvoidDates(avoidDates.filter((d) => d !== dateStr));
    }
  };

  // Quick helper: mark all weekends as avoid
  const handleMarkWeekendsAvoid = () => {
    if (!data?.period) return;
    const allDates = getDatesBetween(data.period.startDate, data.period.endDate);
    const weekends = allDates.filter(isWeekend);
    
    // add weekends to avoid, remove from want
    const newAvoid = Array.from(new Set([...avoidDates, ...weekends]));
    const newWant = wantDates.filter((d) => !weekends.includes(d));
    setAvoidDates(newAvoid);
    setWantDates(newWant);
  };

  const handleClearAll = () => {
    if (confirm('Tüm tarih seçimleriniz temizlensin mi?')) {
      setWantDates([]);
      setAvoidDates([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !data?.period) return;

    try {
      setSubmitting(true);
      await api.submitPreference({
        periodId: data.period.id,
        doctorId: selectedDoctorId,
        wantDates,
        avoidDates,
        notes,
      });

      // Update local preference state in data
      const existingIdx = data.preferences.findIndex((p) => p.doctorId === selectedDoctorId);
      const newPref: Preference = {
        id: 'pref-temp-' + Date.now(),
        periodId: data.period.id,
        doctorId: selectedDoctorId,
        wantDates,
        avoidDates,
        notes,
        submittedAt: new Date().toISOString(),
      };
      const updatedPrefs = [...data.preferences];
      if (existingIdx >= 0) {
        updatedPrefs[existingIdx] = newPref;
      } else {
        updatedPrefs.push(newPref);
      }
      setData({ ...data, preferences: updatedPrefs });

      setSubmittedSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      alert('Talepler kaydedilirken bir hata oluştu: ' + (err?.message || 'Bilinmeyen hata'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-slate-300">
        <RefreshCw className="w-8 h-8 text-teal-400 animate-spin mb-4" />
        <p className="text-sm font-medium">Nöbet Portalı Yükleniyor...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Bağlantı Geçersiz veya Bulunamadı</h3>
        <p className="text-sm text-slate-400 mb-6">{error || 'Bu nöbet dönemi kapatılmış veya bağlantı süresi dolmuş olabilir.'}</p>
        {onAdminClick && (
          <button
            onClick={onAdminClick}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm transition-all"
          >
            Yönetici Paneline Geç
          </button>
        )}
      </div>
    );
  }

  const { period, unit, hospital, doctors, preferences } = data;
  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  // Generate calendar grid dates
  const allPeriodDates = getDatesBetween(period.startDate, period.endDate);
  const firstDateStr = allPeriodDates[0];
  const startDayPadding = firstDateStr ? getDayOfWeekIndexMondayFirst(firstDateStr) : 0;

  // Filter doctors based on search
  const filteredDoctors = doctors.filter((d) =>
    `${d.title} ${d.name}`.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Banner: Hospital & Unit Info */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/40 border border-teal-500/20 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-teal-400 uppercase tracking-wider mb-1">
              <span>{hospital?.name || 'Hastane'}</span>
              <span>•</span>
              <span>{hospital?.city || 'Şehir'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {unit?.name || 'Klinik Nöbet Portalı'}
            </h1>
            <div className="flex items-center space-x-3 mt-2 text-xs text-slate-300">
              <span className="flex items-center space-x-1 font-medium bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span>{period.name}</span>
              </span>
              <span className="text-slate-400">
                Tarih Aralığı: <strong className="text-slate-200">{formatShortDateTR(period.startDate)} - {formatShortDateTR(period.endDate)}</strong>
              </span>
            </div>
          </div>

          <div className="sm:text-right shrink-0 bg-teal-500/10 border border-teal-500/20 p-3 rounded-xl">
            <span className="text-[11px] uppercase tracking-wider text-teal-300 font-semibold block">
              Son İstek Bildirimi
            </span>
            <span className="text-sm font-bold text-white">
              {formatDateTR(period.deadline, false)}
            </span>
          </div>
        </div>
      </div>

      {/* SUCCESS BANNER */}
      {submittedSuccess && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-emerald-900/60 to-slate-900 border border-emerald-500/40 shadow-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-base text-emerald-200">
                Talebiniz Başarıyla İletildi!
              </h3>
              <p className="text-xs text-emerald-300/80 mt-0.5">
                Sayın {selectedDoctor?.title} {selectedDoctor?.name}, tercihleriniz yönetici paneline işlendi.
              </p>
            </div>
          </div>
          <div className="text-xs text-right sm:border-l sm:border-emerald-700/50 sm:pl-4">
            <div className="font-semibold text-emerald-300">
              {wantDates.length} İstek • {avoidDates.length} Mazeret
            </div>
            <div className="text-[11px] text-emerald-400/80">
              İstediğiniz zaman tekrar güncelleyebilirsiniz.
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: SELECT DOCTOR NAME */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold flex items-center justify-center border border-teal-500/30">
                1
              </span>
              <h2 className="text-base font-bold text-white">Adınızı Seçiniz</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 ml-8">
              Klinikte kayıtlı doktor listesinden kendi adınızı seçin
            </p>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="İsim ile hızlı ara..."
              value={doctorSearch}
              onChange={(e) => setDoctorSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Doctor selector cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
          {filteredDoctors.map((doc) => {
            const isSelected = selectedDoctorId === doc.id;
            const existingPref = preferences.find((p) => p.doctorId === doc.id);
            const hasSubmitted = !!existingPref;

            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => handleSelectDoctor(doc.id)}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-teal-500/20 border-teal-500 text-white shadow-md shadow-teal-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected
                        ? 'bg-teal-500 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {doc.name.charAt(0)}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold truncate text-white">
                      <span className="text-slate-400 font-normal mr-1">{doc.title}</span>
                      {doc.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Hedef: ~{doc.targetShifts || 6} nöbet
                    </div>
                  </div>
                </div>

                {hasSubmitted ? (
                  <span
                    className="text-[10px] font-medium bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0 ml-1 flex items-center space-x-1"
                    title={`${existingPref.wantDates.length} istek, ${existingPref.avoidDates.length} mazeret bildirildi`}
                  >
                    <Check className="w-3 h-3" />
                    <span className="hidden sm:inline">Gönderildi</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0 ml-1">
                    Bekliyor
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selectedDoctor && (
          <div className="mt-4 p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl flex items-center justify-between text-xs text-teal-200">
            <div>
              Seçilen Doktor:{' '}
              <strong className="text-white">
                {selectedDoctor.title} {selectedDoctor.name}
              </strong>
            </div>
            <div className="text-[11px] text-teal-300">
              Aşağıdaki takvimden tercihlerinizi işaretleyebilirsiniz ↓
            </div>
          </div>
        )}
      </div>

      {/* STEP 2: INTERACTIVE CALENDAR & DATE PICKER */}
      <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md transition-opacity ${!selectedDoctorId ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold flex items-center justify-center border border-teal-500/30">
                2
              </span>
              <h2 className="text-base font-bold text-white">Nöbet İstek ve Mazeret Günlerini Seçin</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 ml-8">
              Önce işaretleme modunu seçin, ardından günlerin üzerine tıklayın
            </p>
          </div>

          {/* Tool selector buttons */}
          <div className="flex items-center space-x-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTool('want')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTool === 'want'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Nöbet İstiyorum</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('avoid')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTool === 'avoid'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <X className="w-3.5 h-3.5" />
              <span>Mazeret / İstemiyorum</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('clear')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTool === 'clear'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
              title="Tıklanan günü nötr yapar"
            >
              <span>Temizle</span>
            </button>
          </div>
        </div>

        {/* Legend & Counters */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 mb-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-500 flex items-center justify-center text-white text-[9px] font-bold">✓</span>
              <span className="text-slate-300">İstediğim:</span>
              <strong className="text-emerald-400 font-bold">{wantDates.length} gün</strong>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 rounded bg-rose-600 flex items-center justify-center text-white text-[9px] font-bold">✕</span>
              <span className="text-slate-300">Mazeretli:</span>
              <strong className="text-rose-400 font-bold">{avoidDates.length} gün</strong>
            </div>

            <div className="flex items-center space-x-1.5 text-slate-400">
              <span className="w-3.5 h-3.5 rounded bg-slate-800 border border-slate-700"></span>
              <span>Fark etmez:</span>
              <strong className="text-slate-300">{allPeriodDates.length - wantDates.length - avoidDates.length} gün</strong>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleMarkWeekendsAvoid}
              className="text-[11px] text-slate-400 hover:text-rose-300 hover:underline"
            >
              Hafta sonlarını mazeret yap
            </button>
            <span className="text-slate-700">•</span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] text-slate-400 hover:text-white hover:underline"
            >
              Sıfırla
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 bg-slate-900 border-b border-slate-800 text-center py-2 text-xs font-semibold text-slate-400">
            {TURKISH_DAYS_ORDERED.map((day, idx) => (
              <div
                key={day}
                className={idx >= 5 ? 'text-amber-400/90 font-bold' : ''}
              >
                {day}
                {idx >= 5 && <span className="text-[9px] block font-normal opacity-80">Hafta Sonu</span>}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-px bg-slate-800/60 p-1">
            {/* Empty padding cells for start of month */}
            {Array.from({ length: startDayPadding }).map((_, i) => (
              <div key={`pad-${i}`} className="min-h-[72px] sm:min-h-[84px] bg-slate-950/40 opacity-25 rounded-lg" />
            ))}

            {/* Days in period */}
            {allPeriodDates.map((dateStr) => {
              const [year, month, day] = dateStr.split('-').map(Number);
              const isWknd = isWeekend(dateStr);
              const isWanted = wantDates.includes(dateStr);
              const isAvoided = avoidDates.includes(dateStr);

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => handleDateClick(dateStr)}
                  className={`min-h-[72px] sm:min-h-[84px] p-2 rounded-lg text-left transition-all relative flex flex-col justify-between border ${
                    isWanted
                      ? 'bg-emerald-950/80 border-emerald-500/80 text-white shadow-inner shadow-emerald-500/20'
                      : isAvoided
                      ? 'bg-rose-950/80 border-rose-500/80 text-white shadow-inner shadow-rose-500/20'
                      : isWknd
                      ? 'bg-slate-900/90 border-slate-800/80 hover:border-slate-600 text-slate-300'
                      : 'bg-slate-950 hover:bg-slate-900 border-slate-850 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs sm:text-sm font-bold ${
                        isWanted
                          ? 'text-emerald-300 font-extrabold'
                          : isAvoided
                          ? 'text-rose-300 font-extrabold'
                          : isWknd
                          ? 'text-amber-400'
                          : 'text-slate-200'
                      }`}
                    >
                      {day}
                    </span>

                    {/* Status Badge */}
                    {isWanted && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow">
                        ✓
                      </span>
                    )}
                    {isAvoided && (
                      <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold shadow">
                        ✕
                      </span>
                    )}
                  </div>

                  {/* Cell bottom label */}
                  <div className="mt-1">
                    {isWanted && (
                      <span className="text-[10px] font-semibold text-emerald-300 leading-tight block">
                        İstiyorum
                      </span>
                    )}
                    {isAvoided && (
                      <span className="text-[10px] font-semibold text-rose-300 leading-tight block">
                        Mazeretli
                      </span>
                    )}
                    {!isWanted && !isAvoided && (
                      <span className="text-[9px] text-slate-500 block truncate">
                        {isWknd ? 'H.Sonu' : 'Uygun'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* STEP 3: REASON & NOTES */}
      <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md transition-opacity ${!selectedDoctorId ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center space-x-2 mb-2">
          <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold flex items-center justify-center border border-teal-500/30">
            3
          </span>
          <h2 className="text-base font-bold text-white">Mazeret Notu veya Tercih Açıklaması (İsteğe Bağlı)</h2>
        </div>
        <p className="text-xs text-slate-400 mb-3 ml-8">
          Kongre, bilimsel çalışma, sınav veya özel mazeretlerinizi nöbet sorumlusuna iletmek için buraya yazabilirsiniz.
        </p>

        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Örn: 14-16 Kasım kongre nedeniyle şehir dışındayım. Hafta sonu nöbetimi ayın başında tutmayı tercih ederim."
          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />

        {/* Submit Button */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            {selectedDoctor ? (
              <span>
                <strong className="text-white">{selectedDoctor.title} {selectedDoctor.name}</strong> adına toplam{' '}
                <strong className="text-emerald-400">{wantDates.length} istek</strong> ve{' '}
                <strong className="text-rose-400">{avoidDates.length} mazeret</strong> kaydedilecek.
              </span>
            ) : (
              'Lütfen önce adınızı seçin'
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedDoctorId}
            className="px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-xl shadow-teal-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Kaydediliyor...' : 'Taleplerimi Gönder ve Onayla'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
