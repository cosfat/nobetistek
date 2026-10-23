import React, { useState, useEffect } from 'react';
import { User, Period, Unit, Hospital } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { DoctorPortal } from './components/DoctorPortal';
import { ShareLinkModal } from './components/ShareLinkModal';

export default function App() {
  // Check URL query token
  const queryParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = queryParams.get('token');

  // Authentication state - saved user or null
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('nobet_admin_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // ignore
    }
    return null;
  });

  // View mode: 'admin' or 'doctor'
  const [viewMode, setViewMode] = useState<'admin' | 'doctor'>(
    tokenFromUrl ? 'doctor' : 'admin'
  );

  // Active items for sharing
  const [activeHospital, setActiveHospital] = useState<Hospital | null>(null);
  const [activeUnit, setActiveUnit] = useState<Unit | null>(null);
  const [activePeriod, setActivePeriod] = useState<Period | null>(null);

  // Share modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Load basic context for share modal whenever user changes
  useEffect(() => {
    if (!currentUser) return;

    const loadContext = async () => {
      try {
        const [hosps, units, periods] = await Promise.all([
          api.getHospitals(),
          api.getUnits(),
          api.getPeriods(),
        ]);
        if (hosps[0]) setActiveHospital(hosps[0]);
        if (units[0]) setActiveUnit(units[0]);
        if (periods[0]) setActivePeriod(periods[0]);
      } catch (e) {
        console.error(e);
      }
    };
    loadContext();
  }, [currentUser?.id]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('nobet_admin_user', JSON.stringify(user));
    setViewMode('admin');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('nobet_admin_user');
    setViewMode('admin');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        activePeriod={activePeriod}
        activeUnit={activeUnit}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onShareClick={() => setIsShareModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {viewMode === 'doctor' ? (
          <DoctorPortal
            token={tokenFromUrl || activePeriod?.shareToken || 'acil-kasim-2026'}
            onAdminClick={() => setViewMode('admin')}
          />
        ) : !currentUser ? (
          <AdminLogin
            onSuccess={handleLoginSuccess}
            onCancelToDoctorPortal={() => setViewMode('doctor')}
          />
        ) : (
          <AdminDashboard
            key={currentUser.id}
            user={currentUser}
            onShareClick={() => setIsShareModalOpen(true)}
          />
        )}
      </main>

      {/* Universal Share Modal */}
      <ShareLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        period={activePeriod}
        unit={activeUnit}
        hospital={activeHospital}
      />
    </div>
  );
}
