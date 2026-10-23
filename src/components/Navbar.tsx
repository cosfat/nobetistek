import React from 'react';
import { Stethoscope, Calendar, Share2, LogOut, ShieldCheck, UserCheck, Eye, Copy, Check } from 'lucide-react';
import { AdminUser, Period, Unit } from '../types';

interface NavbarProps {
  user: AdminUser | null;
  onLogout: () => void;
  activePeriod?: Period | null;
  activeUnit?: Unit | null;
  viewMode: 'admin' | 'doctor';
  setViewMode: (mode: 'admin' | 'doctor') => void;
  onShareClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  activePeriod,
  activeUnit,
  viewMode,
  setViewMode,
  onShareClick,
}) => {
  const [copied, setCopied] = React.useState(false);

  const getShareUrl = () => {
    const origin = window.location.origin;
    if (activePeriod) {
      return `${origin}/?token=${activePeriod.shareToken}`;
    }
    if (activeUnit) {
      return `${origin}/?token=${activeUnit.shareToken}`;
    }
    return `${origin}/?token=acil-kasim-2026`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-teal-200 bg-clip-text text-transparent">
                  NöbetTalep
                </span>
                <span className="text-xs bg-teal-500/20 text-teal-300 font-medium px-2 py-0.5 rounded-full border border-teal-500/30">
                  Klinik Portalı
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Doktor Nöbet Tercih & Planlama Çizelgesi
              </p>
            </div>
          </div>

          {/* Center: View Switcher (Admin / Doctor Preview) */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setViewMode('admin')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'admin'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Yönetici Paneli</span>
            </button>
            <button
              onClick={() => setViewMode('doctor')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'doctor'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Doktor Portalı (Önizle)</span>
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick Share Link button */}
            <button
              onClick={onShareClick}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
              title="Doktorlar için paylaşım linkini göster"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Ortak Linki Paylaş</span>
            </button>

            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-700">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-200">{user.name}</div>
                  <div className="text-[10px] text-teal-400">Yönetici</div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                  title="Çıkış Yap"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setViewMode('admin')}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg font-medium border border-slate-700"
              >
                Giriş Yap
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
