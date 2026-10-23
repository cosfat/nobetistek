import React, { useState } from 'react';
import { Period, Unit } from '../types';
import { api } from '../services/api';
import { formatDateTR, formatShortDateTR } from '../utils/dateUtils';
import { Calendar, Plus, Share2, Check, Trash2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface PeriodManagerProps {
  periods: Period[];
  unit: Unit | null;
  selectedPeriodId: string;
  onSelectPeriod: (id: string) => void;
  onDataChange: () => void;
  onShareClick: () => void;
}

export const PeriodManager: React.FC<PeriodManagerProps> = ({
  periods,
  unit,
  selectedPeriodId,
  onSelectPeriod,
  onDataChange,
  onShareClick,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('Aralık 2026 Nöbet Listesi');
  const [startDate, setStartDate] = useState('2026-12-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [deadline, setDeadline] = useState('2026-11-25');
  const [requiredDoctors, setRequiredDoctors] = useState(2);
  const [weekendExtra, setWeekendExtra] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit || !name || !startDate || !endDate) return;
    setErrorMessage(null);

    try {
      const created = await api.createPeriod({
        unitId: unit.id,
        name: name.trim(),
        startDate,
        endDate,
        deadline,
        requiredDoctorsPerDay: Number(requiredDoctors) || 1,
        weekendExtraDoctors: Number(weekendExtra) || 0,
      });

      setShowAddModal(false);
      onDataChange();
      onSelectPeriod(created.id);
    } catch (err: any) {
      setErrorMessage('Nöbet dönemi başlatılırken hata: ' + (err?.message || 'Bilinmeyen hata'));
    }
  };

  const handleToggleStatus = async (period: Period) => {
    try {
      const nextStatus = period.status === 'active' ? 'closed' : 'active';
      await api.updatePeriod(period.id, { status: nextStatus });
      onDataChange();
    } catch (err: any) {
      setErrorMessage('Durum güncellenirken hata: ' + (err?.message || 'Hata'));
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await api.deletePeriod(deleteTarget.id);
      setDeleteTarget(null);
      onDataChange();
    } catch (err: any) {
      setErrorMessage('Silme hatası: ' + (err?.message || 'Bilinmeyen hata'));
    } finally {
      setIsDeleting(false);
    }
  };

  const copyPeriodLink = (token: string, id: string) => {
    const url = `${window.location.origin}/?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!unit) {
    return (
      <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
        Lütfen önce bir birim/klinik seçiniz.
      </div>
    );
  }

  const unitPeriods = periods.filter((p) => p.unitId === unit.id);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-slate-400 hover:text-white text-xs underline"
          >
            Kapat
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-teal-400 uppercase tracking-wider mb-1">
            <span>{unit.name}</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Nöbet Dönemleri</span>
            <span className="text-xs bg-slate-800 text-teal-300 font-mono px-2 py-0.5 rounded-full border border-slate-700">
              {unitPeriods.length} Dönem
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Aylık nöbet listeleri, talep toplama takvimi ve bağlantı yönetimi
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Nöbet Dönemi Başlat</span>
        </button>
      </div>

      {/* Period Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {unitPeriods.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-500">
            Bu birim için henüz bir nöbet dönemi açılmamış. "Yeni Nöbet Dönemi Başlat" butonuna tıklayarak ilk dönemi oluşturun.
          </div>
        ) : (
          unitPeriods.map((period) => {
            const isSelected = period.id === selectedPeriodId;

            return (
              <div
                key={period.id}
                onClick={() => onSelectPeriod(period.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-br from-teal-950/40 via-slate-900 to-slate-900 border-teal-500 shadow-lg shadow-teal-500/10'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-base text-white">{period.name}</h4>
                        {isSelected && (
                          <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded font-semibold border border-teal-500/30">
                            Görüntülenen
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-teal-400" />
                        <span>
                          {formatShortDateTR(period.startDate)} - {formatShortDateTR(period.endDate)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(period);
                      }}
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold border transition-colors ${
                        period.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                      }`}
                      title="Durumu değiştirmek için tıklayın"
                    >
                      {period.status === 'active' ? '🟢 Taleplere Açık' : '⚪ Kapatıldı'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Son Bildirim</span>
                      <strong className="text-white font-mono">{formatDateTR(period.deadline, false)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Günlük Nöbetçi</span>
                      <strong className="text-white font-mono">
                        {period.requiredDoctorsPerDay} Hekim {period.weekendExtraDoctors ? `(+${period.weekendExtraDoctors})` : ''}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Card actions */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyPeriodLink(period.shareToken, period.id);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-colors"
                  >
                    {copiedId === period.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedId === period.id ? 'Kopyalandı!' : 'Ortak Linki Kopyala'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({
                        id: period.id,
                        name: period.name,
                      });
                    }}
                    className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                    title="Dönemi Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reusable Delete Modal for Period */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Nöbet Dönemini Sil"
        itemName={deleteTarget?.name || ''}
        description="Bu nöbet dönemi ve hekimler tarafından bu döneme özel gönderilen tüm istekler ve mazeretler kalıcı olarak silinecektir."
        isDeleting={isDeleting}
        onConfirm={handleExecuteDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Modal: Add Duty Period */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h4 className="text-base font-bold text-white mb-4">Yeni Nöbet Dönemi Başlat</h4>
            <form onSubmit={handleCreatePeriod} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Dönem Başlığı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Aralık 2026 Nöbet Listesi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Bitiş Tarihi</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Son Talep Bildirim Tarihi (Deadline)
                </label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Günde Kaç Hekim?
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={requiredDoctors}
                    onChange={(e) => setRequiredDoctors(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Hafta Sonu Ek Hekim
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={weekendExtra}
                    onChange={(e) => setWeekendExtra(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white"
                >
                  Dönemi Başlat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
