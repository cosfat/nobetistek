import React, { useState } from 'react';
import { Hospital, Unit } from '../types';
import { api } from '../services/api';
import { Building2, Plus, Trash2, Layers, Share2, Check, Copy } from 'lucide-react';

interface HospitalManagerProps {
  hospitals: Hospital[];
  units: Unit[];
  selectedHospitalId: string;
  selectedUnitId: string;
  onSelectHospital: (id: string) => void;
  onSelectUnit: (id: string) => void;
  onDataChange: () => void;
}

export const HospitalManager: React.FC<HospitalManagerProps> = ({
  hospitals,
  units,
  selectedHospitalId,
  selectedUnitId,
  onSelectHospital,
  onSelectUnit,
  onDataChange,
}) => {
  // New Hospital Modal
  const [showNewHospital, setShowNewHospital] = useState(false);
  const [newHospName, setNewHospName] = useState('');
  const [newHospCity, setNewHospCity] = useState('İstanbul');

  // New Unit Modal
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitMinShifts, setNewUnitMinShifts] = useState(2);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHospName.trim()) return;
    try {
      const created = await api.createHospital(newHospName, newHospCity);
      setNewHospName('');
      setShowNewHospital(false);
      onDataChange();
      onSelectHospital(created.id);
    } catch (err: any) {
      alert('Hastane eklenirken hata: ' + err.message);
    }
  };

  const handleDeleteHospital = async (id: string, name: string) => {
    if (confirm(`"${name}" hastanesini ve altındaki tüm birimleri silmek istediğinize emin misiniz?`)) {
      try {
        await api.deleteHospital(id);
        onDataChange();
      } catch (err: any) {
        alert('Silme hatası: ' + err.message);
      }
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim() || !selectedHospitalId) return;
    try {
      const created = await api.createUnit(selectedHospitalId, newUnitName, newUnitMinShifts);
      setNewUnitName('');
      setShowNewUnit(false);
      onDataChange();
      onSelectUnit(created.id);
    } catch (err: any) {
      alert('Birim eklenirken hata: ' + err.message);
    }
  };

  const handleDeleteUnit = async (id: string, name: string) => {
    if (confirm(`"${name}" birimini ve doktorlarını silmek istediğinize emin misiniz?`)) {
      try {
        await api.deleteUnit(id);
        onDataChange();
      } catch (err: any) {
        alert('Silme hatası: ' + err.message);
      }
    }
  };

  const copyUnitLink = (token: string) => {
    const url = `${window.location.origin}/?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const hospitalUnits = units.filter((u) => u.hospitalId === selectedHospitalId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Hospitals List & Add */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Hastaneler</h3>
              <p className="text-xs text-slate-400">Sistemdeki sağlık kurumları</p>
            </div>
          </div>

          <button
            onClick={() => setShowNewHospital(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-md shadow-teal-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Hastane</span>
          </button>
        </div>

        {/* Hospital cards */}
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {hospitals.map((hosp) => {
            const isSelected = hosp.id === selectedHospitalId;
            const countUnits = units.filter((u) => u.hospitalId === hosp.id).length;

            return (
              <div
                key={hosp.id}
                onClick={() => onSelectHospital(hosp.id)}
                className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-teal-950/40 border-teal-500 text-white shadow-md'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-semibold text-sm text-white flex items-center space-x-2">
                    <span>{hosp.name}</span>
                    {isSelected && (
                      <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded font-medium">
                        Aktif
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {hosp.city} • <span className="text-teal-400">{countUnits} Birim</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteHospital(hosp.id, hosp.name);
                  }}
                  className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                  title="Hastaneyi Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Units (Departments) List & Add */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Birimler / Klinikler</h3>
              <p className="text-xs text-slate-400">
                {hospitals.find((h) => h.id === selectedHospitalId)?.name || 'Seçili Hastane'} birimleri
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowNewUnit(true)}
            disabled={!selectedHospitalId}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Birim</span>
          </button>
        </div>

        {/* Units list */}
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {hospitalUnits.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Bu hastanede henüz birim bulunmuyor. Yeni birim ekleyin.
            </div>
          ) : (
            hospitalUnits.map((unit) => {
              const isSelected = unit.id === selectedUnitId;

              return (
                <div
                  key={unit.id}
                  onClick={() => onSelectUnit(unit.id)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm text-white flex items-center space-x-2">
                      <span>{unit.name}</span>
                      {isSelected && (
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-medium">
                          Seçili
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Vardiya Başı: <strong className="text-slate-300">{unit.minDoctorsPerShift} Hekim</strong>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyUnitLink(unit.shareToken);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs flex items-center space-x-1"
                      title="Bu birimin ortak nöbet talep linkini kopyala"
                    >
                      {copiedToken === unit.shareToken ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteUnit(unit.id, unit.name);
                      }}
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Birimi Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: New Hospital */}
      {showNewHospital && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h4 className="text-base font-bold text-white mb-4">Yeni Hastane Ekle</h4>
            <form onSubmit={handleCreateHospital} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Hastane Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ankara Bilkent Şehir Hastanesi"
                  value={newHospName}
                  onChange={(e) => setNewHospName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Şehir</label>
                <input
                  type="text"
                  placeholder="Örn: Ankara"
                  value={newHospCity}
                  onChange={(e) => setNewHospCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewHospital(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Unit */}
      {showNewUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h4 className="text-base font-bold text-white mb-4">Yeni Birim / Klinik Ekle</h4>
            <form onSubmit={handleCreateUnit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Birim / Klinik Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Çocuk Cerrahisi Kliniği"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Günlük Gereken Nöbetçi Hekim Sayısı
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={newUnitMinShifts}
                  onChange={(e) => setNewUnitMinShifts(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewUnit(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Birim Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
