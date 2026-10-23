import React, { useState } from 'react';
import { Doctor, Unit } from '../types';
import { api } from '../services/api';
import { UserPlus, Users, Trash2, Phone, Mail, FileText, Check, Plus, MessageSquare, AlertCircle } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface DoctorManagerProps {
  doctors: Doctor[];
  unit: Unit | null;
  onDataChange: () => void;
}

export const DoctorManager: React.FC<DoctorManagerProps> = ({
  doctors,
  unit,
  onDataChange,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Single Add Form
  const [title, setTitle] = useState('Asis. Dr.');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [targetShifts, setTargetShifts] = useState(6);

  // Batch Form
  const [batchText, setBatchText] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !unit) return;
    setErrorMessage(null);

    try {
      await api.createDoctor({
        unitId: unit.id,
        title,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        targetShifts: Number(targetShifts) || 6,
      });
      setName('');
      setPhone('');
      setEmail('');
      setShowAddModal(false);
      onDataChange();
    } catch (err: any) {
      setErrorMessage('Doktor eklenirken hata: ' + (err?.message || 'Bilinmeyen hata'));
    }
  };

  const handleBatchAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchText.trim() || !unit) return;
    setErrorMessage(null);

    // Parse lines
    const lines = batchText.split('\n').map((l) => l.trim()).filter(Boolean);
    const doctorList: Partial<Doctor>[] = [];

    const knownTitles = ['Prof. Dr.', 'Doç. Dr.', 'Uzm. Dr.', 'Asis. Dr.', 'Dr.'];

    lines.forEach((line) => {
      let docTitle = 'Dr.';
      let docName = line;

      for (const t of knownTitles) {
        if (line.toLowerCase().startsWith(t.toLowerCase())) {
          docTitle = t;
          docName = line.slice(t.length).trim();
          break;
        }
      }

      if (docName) {
        doctorList.push({
          title: docTitle,
          name: docName,
          targetShifts: 6,
        });
      }
    });

    if (doctorList.length === 0) {
      setErrorMessage('Geçerli doktor ismi bulunamadı.');
      return;
    }

    try {
      await api.createBatchDoctors(unit.id, doctorList);
      setBatchText('');
      setShowBatchModal(false);
      onDataChange();
    } catch (err: any) {
      setErrorMessage('Toplu eklemede hata: ' + (err?.message || 'Bilinmeyen hata'));
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await api.deleteDoctor(deleteTarget.id);
      setDeleteTarget(null);
      onDataChange();
    } catch (err: any) {
      setErrorMessage('Silme hatası: ' + (err?.message || 'Bilinmeyen hata'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!unit) {
    return (
      <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
        Lütfen önce sol taraftan veya menüden bir birim/klinik seçiniz.
      </div>
    );
  }

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
            <span>Klinik Doktor Listesi</span>
            <span className="text-xs bg-slate-800 text-teal-300 font-mono px-2 py-0.5 rounded-full border border-slate-700">
              {doctors.length} Hekim
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Bu birimde nöbet tutacak hekim kadrosu ve aylık hedef nöbet kotaları
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>Toplu Hızlı Yapıştır</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Hekim Ekle</span>
          </button>
        </div>
      </div>

      {/* Doctor Cards / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
        {doctors.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-500">
            Bu klinikte henüz kayıtlı doktor bulunmuyor. "Hekim Ekle" veya "Toplu Hızlı Yapıştır" ile doktor ekleyin.
          </div>
        ) : (
          doctors.map((doc) => (
            <div
              key={doc.id}
              className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 font-bold text-xs flex items-center justify-center">
                      {doc.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        <span className="text-slate-400 font-normal mr-1">{doc.title}</span>
                        {doc.name}
                      </div>
                      <div className="text-[11px] text-teal-400 font-medium">
                        Hedef: ~{doc.targetShifts || 6} Nöbet / Ay
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setDeleteTarget({ id: doc.id, name: `${doc.title} ${doc.name}` })}
                    className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                    title="Doktoru Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Contact info if present */}
                <div className="mt-3 pt-2.5 border-t border-slate-850 text-[11px] text-slate-400 space-y-1">
                  {doc.phone && (
                    <div className="flex items-center space-x-1.5">
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>{doc.phone}</span>
                    </div>
                  )}
                  {doc.email && (
                    <div className="flex items-center space-x-1.5">
                      <Mail className="w-3 h-3 text-slate-500" />
                      <span className="truncate">{doc.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick WhatsApp Reminder Button */}
              {doc.phone && (
                <div className="mt-3 pt-2">
                  <a
                    href={`https://wa.me/${doc.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Merhaba ${doc.title} ${doc.name}, nöbet tercihlerinizi henüz iletmediyseniz lütfen ortak linkten bildiriniz.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold transition-colors"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>WhatsApp Hatırlat</span>
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Reusable Delete Modal for Doctor */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Doktoru Sil"
        itemName={deleteTarget?.name || ''}
        description="Bu hekim silindiğinde bildirdiği tüm nöbet tercihleri ve mazeretleri de silinecektir."
        isDeleting={isDeleting}
        onConfirm={handleExecuteDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Modal: Single Doctor Add */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h4 className="text-base font-bold text-white mb-4">Yeni Hekim Ekle</h4>
            <form onSubmit={handleAddDoctor} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Unvan</label>
                  <select
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Prof. Dr.">Prof. Dr.</option>
                    <option value="Doç. Dr.">Doç. Dr.</option>
                    <option value="Uzm. Dr.">Uzm. Dr.</option>
                    <option value="Asis. Dr.">Asis. Dr.</option>
                    <option value="Dr.">Dr.</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Ad Soyad</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Burak Özdemir"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Telefon (WhatsApp)</label>
                  <input
                    type="text"
                    placeholder="05XX XXX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Aylık Hedef Nöbet</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={targetShifts}
                    onChange={(e) => setTargetShifts(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">E-Posta (İsteğe Bağlı)</label>
                <input
                  type="email"
                  placeholder="hekim@hastane.gov.tr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
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
                  Hekim Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Batch Add */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h4 className="text-base font-bold text-white mb-2">Toplu Hızlı Hekim Listesi Ekle</h4>
            <p className="text-xs text-slate-400 mb-4">
              WhatsApp grubundan veya Excel'den hekim isimlerini kopyalayıp alt alta yapıştırın. Unvanlar (Prof. Dr., Uzm. Dr., Asis. Dr.) otomatik tespit edilir.
            </p>

            <form onSubmit={handleBatchAdd} className="space-y-4">
              <textarea
                rows={8}
                required
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder="Örnek:
Uzm. Dr. Selin Doğan
Asis. Dr. Murat Yücel
Asis. Dr. Gamze Acar
Dr. Onur Keskin"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white"
                >
                  Listeyi Ayrıştır ve Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
