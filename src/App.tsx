/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DatabaseState, User, SleepDiary, DailyFactors, Assessment, WellnessUsage, Journal } from './types';
import Introduction from './components/Introduction';
import SleepScreening from './components/SleepScreening';
import DailyTracking from './components/DailyTracking';
import WellnessIntervention from './components/WellnessIntervention';
import AIReflection from './components/AIReflection';
import LookerDashboard from './components/LookerDashboard';
import SheetsDatabase from './components/SheetsDatabase';
import { LayoutGrid, Users, Heart, Sparkles, Database, Moon, Activity, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Database state
  const [database, setDatabase] = useState<DatabaseState>({
    users: [],
    sleepDiary: [],
    dailyFactors: [],
    assessments: [],
    wellnessUsage: [],
    journals: []
  });

  const [activeTab, setActiveTab] = useState<'welcome' | 'screening' | 'tracking' | 'wellness' | 'reflection' | 'looker' | 'database'>('welcome');
  const [activePatientId, setActivePatientId] = useState<string>('CZ-1001');
  const [loading, setLoading] = useState(true);
  const [syncMessage, setSyncMessage] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // ---------- Family Name State (แก้ไขได้ที่ Header) ----------
  const [familyName, setFamilyName] = useState<string>(() => {
    return localStorage.getItem('cozmos_family_name') || 'ครอบครัวสุขสันต์';
  });

  const [isEditingFamilyName, setIsEditingFamilyName] = useState(false);
  const [tempFamilyName, setTempFamilyName] = useState(familyName);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempFamilyName(familyName);
    setIsEditingFamilyName(true);
  };

  const handleSaveFamilyName = () => {
    const trimmed = tempFamilyName.trim();
    if (trimmed) {
      setFamilyName(trimmed);
      localStorage.setItem('cozmos_family_name', trimmed);
    }
    setIsEditingFamilyName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveFamilyName();
    } else if (e.key === 'Escape') {
      setIsEditingFamilyName(false);
    }
  };

  // ---------- Data loading (เหมือนเดิม) ----------
  const loadDatabaseStore = async () => {
    try {
      setLoading(true);
      const localDataStr = localStorage.getItem('cozmos_db_v1');
      if (localDataStr) {
        try {
          const localData = JSON.parse(localDataStr) as DatabaseState;
          if (localData && Array.isArray(localData.users) && localData.users.length > 0) {
            setDatabase(localData);
            await fetch('/api/store/sync-full', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(localData)
            }).catch(e => console.error("Sync error:", e));
            if (localData.users.length > 0 && !localData.users.some((u: any) => u.patientId === activePatientId)) {
              setActivePatientId(localData.users[0].patientId);
            }
            return;
          }
        } catch (e) { console.error("localStorage parse error", e); }
      }

      const resp = await fetch('/api/store');
      const serverData = await resp.json();
      if (serverData && serverData.users) {
        setDatabase(serverData);
        localStorage.setItem('cozmos_db_v1', JSON.stringify(serverData));
        if (serverData.users.length > 0 && !serverData.users.some((u: any) => u.patientId === activePatientId)) {
          setActivePatientId(serverData.users[0].patientId);
        }
      }
    } catch (err) {
      console.error("Failed to load database", err);
      const fallback = localStorage.getItem('cozmos_db_v1');
      if (fallback) {
        try {
          const localData = JSON.parse(fallback);
          setDatabase(localData);
          if (localData.users.length > 0) setActivePatientId(localData.users[0].patientId);
        } catch(e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseStore();
  }, []);

  useEffect(() => {
    if (database && database.users && database.users.length > 0) {
      localStorage.setItem('cozmos_db_v1', JSON.stringify(database));
    }
  }, [database]);

  // ---------- API calls (เหมือนเดิม) ----------
  const saveStateToServer = async (payload: { diary?: SleepDiary; factors?: DailyFactors; assessment?: Assessment; wellness?: WellnessUsage; journal?: Journal }) => {
    try {
      setSyncMessage('🔄 กำลังบันทึก...');
      const resp = await fetch('/api/store/log-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (data.success && data.state) {
        setDatabase(data.state);
        setSyncMessage('✅ บันทึกสำเร็จ!');
        setTimeout(() => setSyncMessage(''), 3000);
      }
    } catch (err) {
      console.error(err);
      setDatabase(prev => {
        const next = { ...prev };
        if (payload.diary) {
          const idx = next.sleepDiary.findIndex(d => d.patientId === payload.diary!.patientId && d.date === payload.diary!.date);
          if (idx !== -1) next.sleepDiary[idx] = payload.diary;
          else next.sleepDiary.push(payload.diary);
        }
        if (payload.factors) {
          const idx = next.dailyFactors.findIndex(f => f.patientId === payload.factors!.patientId && f.date === payload.factors!.date);
          if (idx !== -1) next.dailyFactors[idx] = payload.factors;
          else next.dailyFactors.push(payload.factors);
        }
        if (payload.assessment) {
          const idx = next.assessments.findIndex(a => a.patientId === payload.assessment!.patientId && a.date === payload.assessment!.date);
          if (idx !== -1) next.assessments[idx] = payload.assessment;
          else next.assessments.push(payload.assessment);
        }
        if (payload.wellness) {
          const idx = next.wellnessUsage.findIndex(w => w.patientId === payload.wellness!.patientId && w.date === payload.wellness!.date);
          if (idx !== -1) next.wellnessUsage[idx] = payload.wellness;
          else next.wellnessUsage.push(payload.wellness);
        }
        if (payload.journal) {
          const idx = next.journals.findIndex(j => j.patientId === payload.journal!.patientId && j.date === payload.journal!.date);
          if (idx !== -1) next.journals[idx] = payload.journal;
          else next.journals.push(payload.journal);
        }
        return next;
      });
      setSyncMessage('✅ บันทึกเข้าครัวเรือนแล้ว!');
      setTimeout(() => setSyncMessage(''), 3000);
    }
  };

  // User management
  const handleCreatePatient = async (newUser: User) => {
    setDatabase(prev => ({ ...prev, users: [...prev.users, newUser] }));
    setActivePatientId(newUser.patientId);
    setActiveTab('screening');
    try {
      await fetch('/api/store/user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) });
      await loadDatabaseStore();
    } catch (err) { console.error(err); }
  };

  const handleUpdatePatient = async (updatedUser: User) => {
    setDatabase(prev => ({ ...prev, users: prev.users.map(u => u.patientId === updatedUser.patientId ? updatedUser : u) }));
    try {
      await fetch('/api/store/user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedUser) });
      await loadDatabaseStore();
    } catch (err) { console.error(err); }
  };

  const handleDeletePatient = async (patientId: string) => {
    if (database.users.length <= 1) {
      setSyncMessage('⚠️ ไม่สามารถลบสมาชิกคนสุดท้ายได้');
      setTimeout(() => setSyncMessage(''), 4000);
      return;
    }
    let nextId = activePatientId === patientId ? database.users.find(u => u.patientId !== patientId)?.patientId || database.users[0].patientId : activePatientId;
    setDatabase(prev => ({
      ...prev,
      users: prev.users.filter(u => u.patientId !== patientId),
      sleepDiary: prev.sleepDiary.filter(d => d.patientId !== patientId),
      dailyFactors: prev.dailyFactors.filter(f => f.patientId !== patientId),
      assessments: prev.assessments.filter(a => a.patientId !== patientId),
      wellnessUsage: prev.wellnessUsage.filter(w => w.patientId !== patientId),
      journals: prev.journals.filter(j => j.patientId !== patientId),
    }));
    setActivePatientId(nextId);
    try {
      await fetch(`/api/store/user/${patientId}`, { method: 'DELETE' });
      await loadDatabaseStore();
    } catch (err) { console.error(err); }
    setSyncMessage('✅ ลบสมาชิกแล้ว');
    setTimeout(() => setSyncMessage(''), 3000);
  };

  const handleSaveScreening = (assessment: Assessment) => saveStateToServer({ assessment });
  const handleSaveDailyLog = (diary: SleepDiary, factors: DailyFactors, weight?: number, height?: number) => {
    saveStateToServer({ diary, factors });
    if (weight && height && activeUser) {
      const bmi = Number((weight / ((height / 100) * (height / 100))).toFixed(1));
      handleUpdatePatient({ ...activeUser, weight, height, bmi });
    }
  };
  const handleLogWellnessUsage = (wellness: WellnessUsage) => saveStateToServer({ wellness });
  const handleSaveJournalRecord = (journal: Journal) => saveStateToServer({ journal });

  const activeUser = database.users.find(u => u.patientId === activePatientId) || database.users[0];
  const userAssessmentsList = database.assessments.filter(a => a.patientId === activePatientId);
  const activeUserLatestScreening = userAssessmentsList[userAssessmentsList.length - 1];

  if (loading && database.users.length === 0) {
    return (
      <div className="min-h-screen bg-sleep-blue-900 flex flex-col justify-center items-center gap-3">
        <Moon className="w-12 h-12 text-sleep-gold-400 animate-spin" />
        <p className="text-sleep-gold-400">กำลังโหลด Cozmos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1026] via-[#0d1330] to-[#080b1e] text-sleep-blue-950 font-sans pb-12">
      {/* Header */}
      <header className="bg-sleep-blue-900 text-white px-6 py-4 border-b border-sleep-blue-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-sleep-gold-400 rounded-2xl flex items-center justify-center">
              <Moon className="w-6 h-6 text-[#0B1026]" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-sleep-gold-400 flex items-center gap-2 flex-wrap">
                Cozmos เทคโนโลยีดูแลการนอนของ
                {isEditingFamilyName ? (
                  <span className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={tempFamilyName}
                      onChange={(e) => setTempFamilyName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleSaveFamilyName}
                      autoFocus
                      className="bg-slate-900/90 text-white font-semibold px-2 py-0.5 rounded border border-sleep-gold-400 text-sm md:text-md focus:outline-none focus:ring-0 max-w-[150px] md:max-w-[200px]"
                    />
                    <button
                      onMouseDown={(e) => { e.preventDefault(); handleSaveFamilyName(); }}
                      className="bg-sleep-gold-400 text-[#0B1026] p-1 rounded hover:bg-sleep-gold-300 transition-all cursor-pointer inline-flex items-center justify-center"
                      title="บันทึก"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </span>
                ) : (
                  <span
                    onClick={handleStartEdit}
                    className="bg-white/10 px-2 py-0.5 rounded border border-white/20 cursor-pointer hover:bg-white/20 hover:border-sleep-gold-400 transition-all inline-flex items-center gap-1.5 text-base md:text-lg"
                    title="คลิกเพื่อแก้ไขชื่อครอบครัว"
                  >
                    {familyName}
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil opacity-80"><path d="M17 3l4 4-7 7-4 1 1-4 7-7z"/><path d="M6 21l-3-3 3-3 3 3-3 3z"/></svg>
                  </span>
                )}
              </h1>
              <p className="text-xs text-sleep-blue-100 mt-0.5">
                ระบบจัดการและดูแลสุขภาวะการนอนหลับระดับครอบครัว
              </p>
            </div>
          </div>
          {syncMessage && <div className="text-xs text-sleep-gold-400 bg-white/10 px-3 py-1 rounded-xl">{syncMessage}</div>}
          <div className="flex items-center gap-4">
            {activeUser && (
              <div className="hidden md:block text-right">
                <span className="text-[10px] text-sleep-gold-400">กำลังเฝ้าระวัง</span>
                <strong className="block text-sm">{activeUser.patientId} ({activeUser.gender === 'ชาย' ? 'ชาย' : 'หญิง'} {activeUser.age} ปี)</strong>
              </div>
            )}
            <div className="relative">
              <button onClick={() => setShowPatientDropdown(!showPatientDropdown)} className="bg-sleep-blue-955 border border-white/20 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
                เลือกสมาชิก <ChevronDown className={`w-4 h-4 transition-transform ${showPatientDropdown ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showPatientDropdown && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl z-50 text-xs">
                    <div className="p-2 border-b">สลับสมาชิก</div>
                    {database.users.map(user => (
                      <button key={user.patientId} onClick={() => { setActivePatientId(user.patientId); setShowPatientDropdown(false); }} className={`w-full text-left p-2 hover:bg-sleep-cream ${activePatientId === user.patientId ? 'bg-sleep-gold-50 font-bold' : ''}`}>
                        {user.patientId} ({user.age} ปี)
                      </button>
                    ))}
                    <div className="p-2 border-t">
                      <button onClick={() => { setActiveTab('welcome'); setShowPatientDropdown(false); }} className="text-sleep-gold-500">+ เพิ่มสมาชิกใหม่</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar (เหมือนเดิม) */}
        <aside className="lg:col-span-3 space-y-4">
          {activeUser && (
            <div className="bg-sleep-blue-900 text-white rounded-3xl p-5">
              <div className="flex items-center gap-2 pb-3 border-b border-white/10 mb-3">
                <Users className="w-5 h-5 text-sleep-gold-400" />
                <h5 className="text-xs font-semibold">บันทึกสุขภาพ Cozmos</h5>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-sleep-blue-200">รหัส:</span><strong>{activeUser.patientId}</strong></div>
                <div className="flex justify-between"><span className="text-sleep-blue-200">เพศ/อายุ:</span><strong>{activeUser.gender} ({activeUser.age})</strong></div>
                <div className="flex justify-between"><span className="text-sleep-blue-200">BMI:</span><strong>{activeUser.bmi || '-'}</strong></div>
                <div className="flex justify-between"><span className="text-sleep-blue-200">โรค:</span><strong>{activeUser.chronicDiseases || 'ไม่มี'}</strong></div>
                {activeUserLatestScreening && (
                  <div className="pt-2 mt-2 border-t border-white/10 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${activeUserLatestScreening.riskLevel === 'สูง' ? 'bg-red-500' : activeUserLatestScreening.riskLevel === 'ปานกลาง' ? 'bg-orange-500' : 'bg-green-500'}`}>
                      เสี่ยงหยุดหายใจ: {activeUserLatestScreening.riskLevel}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="bg-white rounded-3xl p-4 space-y-1 shadow-sm">
            {[
              { id: 'welcome', label: 'ส่วนต้อนรับ & สมาชิก', icon: Users },
              { id: 'screening', label: 'ประเมินความเสี่ยงการนอน', icon: Heart, iconColor: 'text-red-500' },
              { id: 'tracking', label: 'บันทึกพฤติกรรมประจำวัน', icon: Moon, iconColor: 'text-indigo-700' },
              { id: 'wellness', label: 'กิจกรรมช่วยผ่อนคลาย', icon: Sparkles, iconColor: 'text-amber-500' },
              { id: 'reflection', label: 'จดบันทึกและวิเคราะห์จิตใจ', icon: Activity, iconColor: 'text-blue-600' },
              { id: 'looker', label: 'แดชบอร์ดสุขภาพครอบครัว', icon: LayoutGrid, iconColor: 'text-emerald-500' },
              { id: 'database', label: 'คลังระเบียนบันทึก', icon: Database }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`w-full text-left p-3 rounded-2xl text-sm font-semibold flex items-center justify-between transition ${activeTab === tab.id ? 'bg-sleep-gold-500 text-sleep-blue-950 shadow' : 'text-sleep-blue-700 hover:bg-sleep-blue-50'}`}>
                <span className="flex items-center gap-2"><tab.icon className={`w-4 h-4 ${tab.iconColor || ''}`} /> {tab.label}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Content */}
        <section className="lg:col-span-9">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
              {activeTab === 'welcome' && (
                <Introduction
                  users={database.users}
                  activePatientId={activePatientId}
                  onSelectPatient={(id) => { setActivePatientId(id); setActiveTab('screening'); }}
                  onAddUser={handleCreatePatient}
                  onDeleteUser={handleDeletePatient}
                  familyName={familyName}   // ส่งชื่อไปแสดง (ไม่มีปุ่มแก้ไข)
                />
              )}
              {activeTab === 'screening' && (
                <SleepScreening patientId={activePatientId} onSaveAssessment={handleSaveScreening} existingAssessment={userAssessmentsList[userAssessmentsList.length - 1]} />
              )}
              {activeTab === 'tracking' && (
                <DailyTracking
                  patientId={activePatientId}
                  activeUser={activeUser}
                  onSaveDailyLog={handleSaveDailyLog}
                  onUpdateUser={handleUpdatePatient}
                  existingDiary={database.sleepDiary.find(d => d.patientId === activePatientId && d.date === new Date().toISOString().split('T')[0])}
                  existingFactors={database.dailyFactors.find(f => f.patientId === activePatientId && f.date === new Date().toISOString().split('T')[0])}
                />
              )}
              {activeTab === 'wellness' && (
                <WellnessIntervention patientId={activePatientId} onLogWellnessUsage={handleLogWellnessUsage} />
              )}
              {activeTab === 'reflection' && (
                <AIReflection
                  patientId={activePatientId}
                  onSaveJournalRecord={handleSaveJournalRecord}
                  journalsList={database.journals}
                  currentDailyFactors={database.dailyFactors.find(f => f.patientId === activePatientId && f.date === new Date().toISOString().split('T')[0])}
                />
              )}
              {activeTab === 'looker' && (
                <LookerDashboard database={database} activePatientId={activePatientId} />
              )}
              {activeTab === 'database' && (
                <SheetsDatabase database={database} onUpdateDatabase={setDatabase} />
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
