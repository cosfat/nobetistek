import React, { useState } from 'react';
import { X, Copy, Check, Share2, MessageCircle, QrCode, ExternalLink, Calendar, Users } from 'lucide-react';
import { Period, Unit, Hospital } from '../types';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  period?: Period | null;
  unit?: Unit | null;
  hospital?: Hospital | null;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  isOpen,
  onClose,
  period,
  unit,
  hospital,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!isOpen) return null;

  const token = period?.shareToken || unit?.shareToken || 'acil-kasim-2026';
  const shareUrl = `${window.location.origin}/?token=${token}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappMessage = encodeURIComponent(
    `🏥 *${hospital?.name || 'Hastane'} - ${unit?.name || 'Klinik'}*\n` +
    `📅 *${period?.name || 'Nöbet Talepleri'}*\n\n` +
    `Değerli meslektaşlarım, yeni nöbet listesi için istek ve mazeretlerinizi topluyoruz.\n` +
    `Lütfen aşağıdaki ortak bağlantıya tıklayarak adınızı seçip nöbet istediğiniz ve istemediğiniz günleri işaretleyiniz:\n\n` +
    `👉 ${shareUrl}\n\n` +
    `Son Bildirim Tarihi: ${period?.deadline || 'En kısa sürede'}`
  );

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(shareUrl)}&color=0f172a&bgcolor=ffffff`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Ortak Nöbet Talep Linki</h3>
              <p className="text-xs text-slate-400">Tüm doktorlar aynı bu linki kullanacaktır</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Unit & Period summary */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 space-y-1">
            <div className="font-semibold text-white text-sm flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              <span>{unit?.name || 'Seçili Birim'}</span>
            </div>
            <div className="text-slate-400">
              {hospital?.name} • <span className="text-teal-300">{period?.name || 'Aktif Dönem'}</span>
            </div>
          </div>

          {/* Link box */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Paylaşılacak Bağlantı
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-teal-300 focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2.5 rounded-xl font-medium text-xs flex items-center space-x-1.5 transition-all shrink-0 ${
                  copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/30'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Kopyalandı!' : 'Kopyala'}</span>
              </button>
            </div>
          </div>

          {/* WhatsApp and QR Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`https://wa.me/?text=${whatsappMessage}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-600/20"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp ile Paylaş</span>
            </a>

            <button
              onClick={() => setShowQr(!showQr)}
              className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition-all"
            >
              <QrCode className="w-4 h-4 text-teal-400" />
              <span>{showQr ? 'QR Kodu Gizle' : 'Klinik QR Kodu'}</span>
            </button>
          </div>

          {/* QR Code view */}
          {showQr && (
            <div className="p-4 rounded-xl bg-white text-slate-900 text-center flex flex-col items-center justify-center space-y-2 animate-in zoom-in-95 duration-150">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Doktor Odası İçin QR Kod
              </p>
              <img
                src={qrImageUrl}
                alt="QR Code"
                className="w-44 h-44 rounded-lg border border-slate-200 shadow-sm"
              />
              <p className="text-[11px] text-slate-500">
                Doktorlar telefon kamerasıyla okutarak hızlıca taleplerini iletebilir.
              </p>
            </div>
          )}

          {/* How it works info */}
          <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-200">
            <div className="font-semibold text-teal-300 mb-1">Doktorlar Ne Yapacak?</div>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
              <li>Bu bağlantıyı açacaklar (şifre gerektirmez).</li>
              <li>Listeden kendi isimlerini seçecekler.</li>
              <li>İstedikleri ve istemedikleri günleri işaretleyip gönderecekler.</li>
              <li>Sonuçlar anında sizin bu yönetim panelinize yansıyacaktır.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
