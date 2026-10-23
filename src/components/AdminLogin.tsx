import React, { useState } from 'react';
import { Lock, User as UserIcon, ShieldCheck, ArrowRight, AlertCircle, UserPlus, Stethoscope, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface AdminLoginProps {
  onSuccess: (user: User) => void;
  onCancelToDoctorPortal?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onCancelToDoctorPortal }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Lütfen adınızı ve unvanınızı giriniz.');
        return;
      }
      if (password.length < 4) {
        setError('Şifre en az 4 karakter olmalıdır.');
        return;
      }
      if (password !== passwordConfirm) {
        setError('Girdiğiniz şifreler birbiriyle eşleşmiyor.');
        return;
      }

      setLoading(true);
      try {
        const res = await api.register(username, password, name);
        if (res.success && res.user) {
          setSuccessMsg('Hesabınız oluşturuldu! Giriş yapılıyor...');
          setTimeout(() => {
            onSuccess(res.user!);
          }, 600);
        } else {
          setError(res.message || 'Kayıt sırasında bir hata oluştu.');
        }
      } catch (err: any) {
        setError(err?.message || 'Sunucu bağlantı hatası.');
      } finally {
        setLoading(false);
      }
    } else {
      // Login mode
      setLoading(true);
      try {
        const res = await api.login(username, password);
        if (res.success && res.user) {
          onSuccess(res.user);
        } else {
          setError(res.message || 'Kullanıcı adı veya şifre hatalı!');
        }
      } catch (err: any) {
        setError(err?.message || 'Giriş yapılırken sunucu hatası oluştu.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleQuickDemo = (user: string, pass: string) => {
    setMode('login');
    setUsername(user);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-950/60">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8">
        {/* Header Icon & Title */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-3 shadow-lg shadow-teal-500/10">
            {mode === 'login' ? <ShieldCheck className="w-8 h-8" /> : <UserPlus className="w-8 h-8" />}
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {mode === 'login' ? 'Yönetici Girişi' : 'Yeni Yönetici Hesabı Oluştur'}
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            {mode === 'login'
              ? 'Kendi hastane, birim ve doktor kadronuzu yönetmek için giriş yapın.'
              : 'Oluşturduğunuz hastaneler, birimler ve nöbet listeleri yalnızca size özel kalır.'}
          </p>
        </div>

        {/* Tab switch between Login and Register */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
              setUsername('');
              setPassword('');
              setPasswordConfirm('');
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'register'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Kayıt Ol (Yeni Hesap)
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Adınız & Unvanınız
              </label>
              <div className="relative">
                <Stethoscope className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: Doç. Dr. Selin Doğan"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Kullanıcı Adı
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Örn: selindogan"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Şifre
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Şifre Tekrarı
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-teal-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            <span>
              {loading
                ? 'İşleniyor...'
                : mode === 'login'
                ? 'Giriş Yap'
                : 'Hesabımı Oluştur'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fast Login Helper */}
        {mode === 'login' && (
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 mb-2">Hazır Test Giriş Bilgileri:</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('admin', '123456')}
                className="cursor-pointer inline-flex items-center space-x-1.5 bg-slate-800/70 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 transition-colors"
              >
                <span className="font-mono text-teal-400 font-semibold">admin</span>
                <span className="text-slate-600">/</span>
                <span className="font-mono text-teal-400 font-semibold">123456</span>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded">Tıkla & Doldur</span>
              </button>
            </div>
          </div>
        )}

        {onCancelToDoctorPortal && (
          <div className="mt-4 text-center">
            <button
              onClick={onCancelToDoctorPortal}
              className="text-xs text-slate-400 hover:text-white underline underline-offset-4"
            >
              Doktor Talep Sayfasına Dön
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
