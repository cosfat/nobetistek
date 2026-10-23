import React, { useState, useEffect } from 'react';
import { AdminUser, Period, Unit, Hospital } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { DoctorPortal } from './components/DoctorPortal';
import { ShareLinkModal } from './components/ShareLinkModal';

export default function App() {
  // Authentication state
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem('nobet_admin_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    // Default logged in as admin for direct access, or can logout anytime
    return {
      username: 'admin',
      name: 'Dr. Yönetici',
      role: 'admin',
    };
  });

  // Check URL query token
  const queryParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = queryParams.get('token');

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

  // Load basic context for share modal
  useEffect(() => {
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
  }, []);

  const handleLoginSuccess = (user: AdminUser) => {
    setAdminUser(user);
    localStorage.setItem('nobet_admin_user', JSON.stringify(user));
    setViewMode('admin');
  };

  const handleLogout = () => {
    setAdminUser(null);
    localStorage.removeItem('nobet_admin_user');
    setViewMode('admin');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        user={adminUser}
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
        ) : !adminUser ? (
          <AdminLogin
            onSuccess={handleLoginSuccess}
            onCancelToDoctorPortal={() => setViewMode('doctor')}
          />
        ) : (
          <AdminDashboard
            user={adminUser}
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
