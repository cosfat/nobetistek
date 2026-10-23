import React, { useState } from 'react';
import { 
  Period, Unit, Hospital, Doctor, Preference 
} from '../types';
import { 
  formatDateTR, formatShortDateTR, isWeekend, 
  getDatesBetween, downloadCSV, TURKISH_DAYS_SHORT 
} from '../utils/dateUtils';
import { 
  Calendar, Check, X, Printer, Download, Sparkles, AlertTriangle, 
  HelpCircle, UserCheck, Clock, Share2, Info, Users, ArrowUpDown
} from 'lucide-react';
import { api } from '../services/api';

interface DutyMatrixTableProps {
  period: Period;
  unit: Unit;
  hospital: Hospital | null;
  doctors: Doctor[];
  preferences: Preference[];
  onShareClick: () => void;
  onRefresh: () => void;
}

export const DutyMatrixTable: React.FC<DutyMatrixTableProps> = ({
  period,
  unit,
  hospital,
  doctors,
  preferences,
  onShareClick,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'daily' | 'official' | 'autoSchedule'>('matrix');
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [scheduleData, setScheduleData] = useState<Record<string, string[]>>(period.draftSchedule || {});
  const [hoveredReason, setHoveredReason] = useState<{ doctorName: string; date: string; note: string } | null>(null);

  const dates = getDatesBetween(period.startDate, period.endDate);

  // Stats calculation
  const totalDoctors = doctors.length;
  const submittedCount = preferences.length;
  const submissionRate = totalDoctors > 0 ? Math.round((submittedCount / totalDoctors) * 100) : 0;

  // Day stats: count how many want / avoid each day
  const dayStats = dates.map((dateStr) => {
    let wantCount = 0;
    let avoidCount = 0;
    preferences.forEach((pref) => {
      if (pref.wantDates.includes(dateStr)) wantCount++;
      if (pref.avoidDates.includes(dateStr)) avoidCount++;
    });
    const isWknd = isWeekend(dateStr);
    const required = period.requiredDoctorsPerDay + (isWknd ? (period.weekendExtraDoctors || 0) : 0);
    const isCritical = wantCount < required && (totalDoctors - avoidCount) < required;
    return {
      dateStr,
      wantCount,
      avoidCount,
      required,
      isCritical,
      neutralCount: totalDoctors - wantCount - avoidCount,
    };
  });

  // Handle Export to CSV
  const handleExportCSV = () => {
    let csv = `Hastane;${hospital?.name || ''}\n`;
    csv += `Birim;${unit.name}\n`;
    csv += `Nöbet Dönemi;${period.name} (${period.startDate} - ${period.endDate})\n\n`;

    // Headers: Doktor / Unvan / Telefon / Hedef / Tarihler... / Mazeret Notu
    const headers = ['Unvan', 'Doktor Adı', 'Hedef Nöbet', 'Durum', ...dates.map(d => formatShortDateTR(d)), 'Mazeret Notu'];
    csv += headers.join(';') + '\n';

    doctors.forEach((doc) => {
      const pref = preferences.find((p) => p.doctorId === doc.id);
      const row = [
        doc.title,
        doc.name,
        doc.targetShifts || 6,
        pref ? 'Gönderdi' : 'Bekliyor',
      ];

      dates.forEach((dateStr) => {
        if (!pref) {
          row.push('-');
        } else if (pref.wantDates.includes(dateStr)) {
          row.push('İSTİYOR (+)');
        } else if (pref.avoidDates.includes(dateStr)) {
          row.push('MAZERET (X)');
        } else {
          row.push('Fark Etmez');
        }
      });

      row.push(pref?.notes ? `"${pref.notes.replace(/"/g, '""')}"` : '');
      csv += row.join(';') + '\n';
    });

    // Summary row
    csv += '\nTOPLAM İSTEYEN;;;;' + dayStats.map(s => s.wantCount).join(';') + '\n';
    csv += 'TOPLAM MAZERETLİ;;;;' + dayStats.map(s => s.avoidCount).join(';') + '\n';

    downloadCSV(`${unit.name}_Nobet_Talepleri_${period.startDate}.csv`, csv);
  };

  // Handle Auto-Schedule algorithm
  const handleGenerateSchedule = async () => {
    try {
      setGeneratingSchedule(true);
      const res = await api.generateSchedule(period.id);
      if (res.success && res.draftSchedule) {
        setScheduleData(res.draftSchedule);
        setActiveTab('autoSchedule');
        onRefresh();
      }
    } catch (err: any) {
      alert('Otomatik çizelge oluşturulurken hata: ' + (err?.message || 'Hata'));
    } finally {
      setGeneratingSchedule(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Status Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-teal-400 uppercase tracking-wider mb-1">
              <span>{hospital?.name}</span>
              <span>•</span>
              <span className="text-white">{unit.name}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-3">
              <span>{period.name}</span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  period.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {period.status === 'active' ? 'Talepler Açık' : 'Tamamlandı'}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Nöbet Tarihleri: <strong className="text-slate-300">{formatDateTR(period.startDate, false)}</strong> -{' '}
              <strong className="text-slate-300">{formatDateTR(period.endDate, false)}</strong> (Son Bildirim:{' '}
              {formatDateTR(period.deadline, false)})
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onShareClick}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/25 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Ortak Linki Paylaş</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
              title="Excel formatında indir"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Excel (CSV) İndir</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>Yazdır / PDF</span>
            </button>

            <button
              onClick={handleGenerateSchedule}
              disabled={generatingSchedule}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-purple-600/25 transition-all disabled:opacity-50"
              title="İstek ve mazeretleri gözeterek otomatik taslak nöbet listesi dağıtır"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{generatingSchedule ? 'Hesaplanıyor...' : 'Akıllı Nöbet Çizelgesi Üret'}</span>
            </button>
          </div>
        </div>

        {/* Participation Progress Bar & Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Katılım Oranı</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-lg font-bold text-teal-400">%{submissionRate}</span>
              <span className="text-xs text-slate-500">({submittedCount}/{totalDoctors} Doktor)</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-teal-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${submissionRate}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Günlük İhtiyaç</span>
            <div className="text-lg font-bold text-white mt-0.5">
              {period.requiredDoctorsPerDay} Doktor <span className="text-xs text-slate-400 font-normal">/ gün</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">
              Hafta sonu: +{period.weekendExtraDoctors || 0} ek
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Toplam Nöbet Günü</span>
            <div className="text-lg font-bold text-white mt-0.5">
              {dates.length} Gün
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">
              {dates.filter(isWeekend).length} Gün Hafta Sonu
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Kritik Günler</span>
            <div className="text-lg font-bold text-amber-400 mt-0.5">
              {dayStats.filter((d) => d.isCritical).length} Gün
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">
              {dayStats.filter((d) => d.isCritical).length > 0 ? 'Yetersiz gönüllü' : 'Tüm günler dengeli'}
            </span>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-800 space-x-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
            activeTab === 'matrix'
              ? 'border-teal-500 text-teal-300 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Doktor / Gün Matris Tablosu</span>
        </button>

        <button
          onClick={() => setActiveTab('official')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
            activeTab === 'official'
              ? 'border-teal-500 text-teal-300 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Resmi Teslim Formatı (Birim İletim Listesi)</span>
        </button>

        <button
          onClick={() => setActiveTab('daily')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
            activeTab === 'daily'
              ? 'border-teal-500 text-teal-300 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Gün Gün İstek / Mazeret Dağılımı</span>
        </button>

        {Object.keys(scheduleData).length > 0 && (
          <button
            onClick={() => setActiveTab('autoSchedule')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'autoSchedule'
                ? 'border-purple-500 text-purple-300 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Otomatik Taslak Nöbet Çizelgesi</span>
          </button>
        )}
      </div>

      {/* TAB 1: FULL MATRIX VIEW */}
      {activeTab === 'matrix' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Legend bar */}
          <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-semibold text-white">Gösterge:</span>
              <div className="flex items-center space-x-1.5">
                <span className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500 text-emerald-300 flex items-center justify-center text-[10px] font-bold">✓</span>
                <span>Nöbet İstiyor</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-4 h-4 rounded bg-rose-500/20 border border-rose-500 text-rose-300 flex items-center justify-center text-[10px] font-bold">✕</span>
                <span>Mazeret / İstemiyor</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-4 h-4 rounded bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center text-[10px]">-</span>
                <span>Fark Etmez</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 italic">
              * Mazeret notlarını görmek için kırmızı hücrelerin veya doktor satırının üzerine gelin
            </div>
          </div>

          {/* Responsive Scrollable Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="p-3 font-semibold sticky left-0 bg-slate-950 z-20 w-56 shadow-r">
                    Doktor
                  </th>
                  <th className="p-2 text-center w-16">Hedef</th>
                  <th className="p-2 text-center w-16">İstek</th>
                  <th className="p-2 text-center w-16">Mazeret</th>
                  {dates.map((dateStr) => {
                    const [year, month, day] = dateStr.split('-').map(Number);
                    const isWknd = isWeekend(dateStr);
                    const dayIdx = new Date(year, month - 1, day).getDay();
                    const dayName = TURKISH_DAYS_SHORT[dayIdx];

                    return (
                      <th
                        key={dateStr}
                        className={`p-1.5 text-center min-w-[34px] border-l border-slate-850 ${
                          isWknd ? 'bg-amber-950/20 text-amber-300 font-bold' : ''
                        }`}
                      >
                        <div className="text-xs font-bold">{day}</div>
                        <div className="text-[9px] font-normal opacity-75">{dayName}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60 text-xs">
                {doctors.map((doc) => {
                  const pref = preferences.find((p) => p.doctorId === doc.id);
                  const wantCount = pref ? pref.wantDates.length : 0;
                  const avoidCount = pref ? pref.avoidDates.length : 0;

                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-850/50 transition-colors group"
                    >
                      {/* Doctor Name (sticky left) */}
                      <td className="p-3 sticky left-0 bg-slate-900 group-hover:bg-slate-850 z-10 border-r border-slate-800 shadow-sm">
                        <div className="font-semibold text-white flex items-center justify-between">
                          <span>
                            <span className="text-slate-400 font-normal mr-1">{doc.title}</span>
                            {doc.name}
                          </span>
                          {!pref && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">
                              Bekliyor
                            </span>
                          )}
                        </div>
                        {pref?.notes && (
                          <div className="text-[10px] text-teal-400/90 truncate max-w-[200px] mt-0.5" title={pref.notes}>
                            📝 {pref.notes}
                          </div>
                        )}
                      </td>

                      <td className="p-2 text-center text-slate-300 font-mono">
                        {doc.targetShifts || 6}
                      </td>

                      <td className="p-2 text-center font-bold text-emerald-400 font-mono bg-emerald-950/20">
                        {wantCount}
                      </td>

                      <td className="p-2 text-center font-bold text-rose-400 font-mono bg-rose-950/20">
                        {avoidCount}
                      </td>

                      {/* Day Cells */}
                      {dates.map((dateStr) => {
                        const isWknd = isWeekend(dateStr);
                        if (!pref) {
                          return (
                            <td
                              key={dateStr}
                              className={`p-1 text-center border-l border-slate-850 text-slate-600 ${
                                isWknd ? 'bg-slate-900/40' : ''
                              }`}
                            >
                              -
                            </td>
                          );
                        }

                        const isWanted = pref.wantDates.includes(dateStr);
                        const isAvoided = pref.avoidDates.includes(dateStr);

                        return (
                          <td
                            key={dateStr}
                            className={`p-1 text-center border-l border-slate-850 transition-all ${
                              isWanted
                                ? 'bg-emerald-950/70'
                                : isAvoided
                                ? 'bg-rose-950/70'
                                : isWknd
                                ? 'bg-slate-900/40'
                                : ''
                            }`}
                            onMouseEnter={() => {
                              if (isAvoided && pref.notes) {
                                setHoveredReason({
                                  doctorName: `${doc.title} ${doc.name}`,
                                  date: dateStr,
                                  note: pref.notes,
                                });
                              }
                            }}
                            onMouseLeave={() => setHoveredReason(null)}
                          >
                            {isWanted && (
                              <span
                                className="inline-flex w-6 h-6 items-center justify-center rounded-md bg-emerald-500 text-white font-bold text-xs shadow-sm"
                                title={`${doc.title} ${doc.name} bu gün nöbet tutmak istiyor.`}
                              >
                                ✓
                              </span>
                            )}
                            {isAvoided && (
                              <span
                                className="inline-flex w-6 h-6 items-center justify-center rounded-md bg-rose-600 text-white font-bold text-xs shadow-sm cursor-help"
                                title={`Mazeret: ${pref.notes || 'Nöbet istenmiyor'}`}
                              >
                                ✕
                              </span>
                            )}
                            {!isWanted && !isAvoided && (
                              <span className="text-slate-600 text-xs">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Summary Row 1: Wanted Count */}
                <tr className="bg-emerald-950/40 border-t-2 border-emerald-500/40 font-bold text-xs">
                  <td className="p-3 sticky left-0 bg-emerald-950 z-10 text-emerald-300 border-r border-slate-800">
                    Toplam Nöbet İsteyen
                  </td>
                  <td className="p-2 text-center text-slate-400">-</td>
                  <td className="p-2 text-center text-emerald-400 font-mono">
                    {dayStats.reduce((acc, d) => acc + d.wantCount, 0)}
                  </td>
                  <td className="p-2 text-center text-slate-400">-</td>
                  {dayStats.map((stat) => (
                    <td
                      key={stat.dateStr}
                      className="p-1 text-center border-l border-emerald-800/40 text-emerald-300 font-mono"
                    >
                      {stat.wantCount > 0 ? stat.wantCount : '-'}
                    </td>
                  ))}
                </tr>

                {/* Summary Row 2: Avoided Count */}
                <tr className="bg-rose-950/40 border-t border-rose-900/40 font-bold text-xs">
                  <td className="p-3 sticky left-0 bg-rose-950 z-10 text-rose-300 border-r border-slate-800">
                    Toplam Mazeretli
                  </td>
                  <td className="p-2 text-center text-slate-400">-</td>
                  <td className="p-2 text-center text-slate-400">-</td>
                  <td className="p-2 text-center text-rose-400 font-mono">
                    {dayStats.reduce((acc, d) => acc + d.avoidCount, 0)}
                  </td>
                  {dayStats.map((stat) => (
                    <td
                      key={stat.dateStr}
                      className="p-1 text-center border-l border-rose-800/40 text-rose-300 font-mono"
                    >
                      {stat.avoidCount > 0 ? stat.avoidCount : '-'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Hovered Reason Note popover */}
          {hoveredReason && (
            <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-teal-500/50 p-4 rounded-xl shadow-2xl max-w-sm animate-in fade-in duration-150">
              <div className="text-xs font-semibold text-teal-400 mb-1">
                {hoveredReason.doctorName} • {formatShortDateTR(hoveredReason.date)}
              </div>
              <p className="text-xs text-slate-200">"{hoveredReason.note}"</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OFFICIAL PRINT & DELIVERY FORMAT */}
      {activeTab === 'official' && (
        <div className="bg-white text-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-300 font-sans print:shadow-none print:border-none print:p-0">
          {/* Official Letterhead */}
          <div className="text-center border-b-2 border-slate-900 pb-5 mb-6">
            <h1 className="text-lg font-black uppercase tracking-wider text-slate-900">
              T.C. SAĞLIK BAKANLIĞI
            </h1>
            <h2 className="text-base font-bold text-slate-800 uppercase">
              {hospital?.name || 'HASTANE BAŞHEKİMLİĞİ'}
            </h2>
            <h3 className="text-sm font-semibold text-teal-900 uppercase mt-1">
              {unit.name} - NÖBET İSTEK VE MAZERET ÇİZELGESİ
            </h3>
            <div className="text-xs text-slate-600 mt-2 flex justify-center space-x-6">
              <span>Dönem: <strong>{period.name}</strong></span>
              <span>Tarih Aralığı: <strong>{formatDateTR(period.startDate, false)} - {formatDateTR(period.endDate, false)}</strong></span>
              <span>Rapor Tarihi: <strong>{new Date().toLocaleDateString('tr-TR')}</strong></span>
            </div>
          </div>

          <p className="text-xs text-slate-700 mb-4 leading-relaxed">
            İlgili birim nöbet planlama komisyonunun dikkatine; aşağıdaki çizelgede {unit.name} bünyesinde görev yapan hekimlerin {period.name} için bildirdikleri nöbet tercihleri, uygun oldukları günler ve mazeretleri yer almaktadır.
          </p>

          {/* Printable Structured Table */}
          <table className="w-full text-xs border border-slate-400 border-collapse mb-6">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-400 font-bold text-slate-900">
                <th className="border border-slate-300 p-2 text-left w-10">No</th>
                <th className="border border-slate-300 p-2 text-left w-48">Hekim Adı Soyadı</th>
                <th className="border border-slate-300 p-2 text-center w-16">Hedef Nöbet</th>
                <th className="border border-slate-300 p-2 text-left">Nöbet İstediği Günler (+)</th>
                <th className="border border-slate-300 p-2 text-left">Mazeretli / İstemediği Günler (X)</th>
                <th className="border border-slate-300 p-2 text-left w-56">Mazeret Notu / Gerekçe</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc, idx) => {
                const pref = preferences.find((p) => p.doctorId === doc.id);

                return (
                  <tr key={doc.id} className="border-b border-slate-300 hover:bg-slate-50">
                    <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                    <td className="border border-slate-300 p-2 font-bold text-slate-900">
                      {doc.title} {doc.name}
                    </td>
                    <td className="border border-slate-300 p-2 text-center font-mono">
                      {doc.targetShifts || 6}
                    </td>
                    <td className="border border-slate-300 p-2">
                      {pref && pref.wantDates.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {pref.wantDates.map((d) => (
                            <span key={d} className="bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded text-[10px]">
                              {formatShortDateTR(d)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Belirtilmedi</span>
                      )}
                    </td>
                    <td className="border border-slate-300 p-2">
                      {pref && pref.avoidDates.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {pref.avoidDates.map((d) => (
                            <span key={d} className="bg-rose-100 text-rose-800 font-semibold px-1.5 py-0.5 rounded text-[10px]">
                              {formatShortDateTR(d)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Belirtilmedi</span>
                      )}
                    </td>
                    <td className="border border-slate-300 p-2 text-slate-700 italic">
                      {pref?.notes || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Signature Block for Head of Clinic / Administration */}
          <div className="grid grid-cols-2 gap-12 pt-8 text-center text-xs text-slate-800">
            <div>
              <div className="font-bold uppercase">Nöbet Hazırlama Sorumlusu</div>
              <div className="text-slate-500 mt-1">İmza / Tarih</div>
              <div className="h-16"></div>
              <div className="border-t border-slate-400 w-48 mx-auto pt-1 font-semibold">
                ...............................................
              </div>
            </div>

            <div>
              <div className="font-bold uppercase">Klinik İdari Sorumlusu / Başhekimlik</div>
              <div className="text-slate-500 mt-1">Onay / Mühür</div>
              <div className="h-16"></div>
              <div className="border-t border-slate-400 w-48 mx-auto pt-1 font-semibold">
                ...............................................
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DAILY DETAIL BREAKDOWN */}
      {activeTab === 'daily' && (
        <div className="space-y-3">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center justify-between">
            <span>Her gün için talepte bulunan hekimler ve mazeretliler:</span>
            <span className="text-teal-400 font-semibold">Günde {period.requiredDoctorsPerDay} Hekim Gerekli</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dates.map((dateStr) => {
              const isWknd = isWeekend(dateStr);
              const wantingDoctors = doctors.filter((doc) => {
                const pref = preferences.find((p) => p.doctorId === doc.id);
                return pref?.wantDates.includes(dateStr);
              });
              const avoidingDoctors = doctors.filter((doc) => {
                const pref = preferences.find((p) => p.doctorId === doc.id);
                return pref?.avoidDates.includes(dateStr);
              });
              const neutralDoctors = doctors.filter((doc) => {
                const pref = preferences.find((p) => p.doctorId === doc.id);
                return !pref || (!pref.wantDates.includes(dateStr) && !pref.avoidDates.includes(dateStr));
              });

              return (
                <div
                  key={dateStr}
                  className={`p-4 rounded-xl border bg-slate-900 transition-all ${
                    isWknd ? 'border-amber-500/30' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                    <span className="font-bold text-sm text-white flex items-center space-x-1.5">
                      <span>{formatShortDateTR(dateStr)}</span>
                      {isWknd && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-normal">
                          H.Sonu
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      İstek: <strong className="text-emerald-400">{wantingDoctors.length}</strong> / Mazeret:{' '}
                      <strong className="text-rose-400">{avoidingDoctors.length}</strong>
                    </span>
                  </div>

                  {/* Wanting doctors */}
                  <div className="space-y-1 mb-2">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                      Nöbet İsteyenler ({wantingDoctors.length})
                    </span>
                    {wantingDoctors.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {wantingDoctors.map((d) => (
                          <span
                            key={d.id}
                            className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[11px] font-medium"
                          >
                            {d.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">Doğrudan istek yok</span>
                    )}
                  </div>

                  {/* Avoiding doctors */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-rose-400 block tracking-wider">
                      Mazeretliler ({avoidingDoctors.length})
                    </span>
                    {avoidingDoctors.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {avoidingDoctors.map((d) => (
                          <span
                            key={d.id}
                            className="bg-rose-500/10 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded text-[11px] font-medium"
                          >
                            {d.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">Mazeret bildiren yok</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: AUTO-SCHEDULED DRAFT */}
      {activeTab === 'autoSchedule' && (
        <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold text-white">
                  Akıllı Taslak Nöbet Çizelgesi
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Tüm doktor istekleri, mazeretleri, hedef nöbet sayıları ve hafta sonu dengesi gözetilerek otomatik hazırlanmıştır.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleGenerateSchedule}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-600/30 flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Yeniden Dağıt</span>
              </button>
            </div>
          </div>

          {/* Grid of days with assigned doctors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {dates.map((dateStr) => {
              const assignedDocIds = scheduleData[dateStr] || [];
              const assignedDocs = assignedDocIds.map((id) => doctors.find((d) => d.id === id)).filter(Boolean) as Doctor[];
              const isWknd = isWeekend(dateStr);

              return (
                <div
                  key={dateStr}
                  className={`p-3.5 rounded-xl border bg-slate-950 flex flex-col justify-between ${
                    isWknd ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-white">
                      {formatShortDateTR(dateStr)}
                    </span>
                    {isWknd && (
                      <span className="text-[10px] text-amber-300 font-semibold">Hafta Sonu</span>
                    )}
                  </div>

                  <div className="space-y-1.5 min-h-[44px]">
                    {assignedDocs.map((doc) => {
                      const pref = preferences.find((p) => p.doctorId === doc.id);
                      const isWanted = pref?.wantDates.includes(dateStr);

                      return (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-750 text-xs"
                        >
                          <span className="font-medium text-slate-200 truncate">
                            {doc.title} {doc.name}
                          </span>
                          {isWanted && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded font-bold">
                              İstekli
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
