/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DatabaseState, User, SleepDiary, DailyFactors, Assessment, WellnessUsage, Journal, VitalSign } from './types';
import Introduction from './components/Introduction';
import SleepScreening from './components/SleepScreening';
import DailyTracking from './components/DailyTracking';
import WellnessIntervention from './components/WellnessIntervention';
import AIReflection from './components/AIReflection';
import LookerDashboard from './components/LookerDashboard';
import SheetsDatabase from './components/SheetsDatabase';
import VitalSignsTracker from './components/VitalSignsTracker';
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
    journals: [],
    vitalSigns: []        // <-- เพิ่ม vitalSigns
  });

  const [activeTab, setActiveTab] = useState<'welcome' | 'screening' | 'tracking' | 'wellness' | 'reflection' | 'looker' | 'database' | 'vitals'>('welcome');
  const [activePatientId, setActivePatientId] = useState<string>('CZ-1001');
  const [loading, setLoading] = useState(true);
  const [syncMessage, setSyncMessage] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // ---------- Family Name State (แก้ไขได้ที่ Header) ----------
  const [familyName, setFamilyName] = useState<string>(() => {
    return localStorage.getItem('cozmos_family_name') || 'ครอบครัวสุขสันต์';
  });

  const handleEditFamilyName = () => {
    const newName = window.prompt('กรุณาใส่ชื่อครอบครัวของคุณ', familyName);
    if (newName && newName.trim() && newName.trim() !== familyName) {
      setFamilyName(newName.trim());
      localStorage.setItem('cozmos_family_name', newName.trim());
    }
  };

  // ---------- Data loading ----------
  const loadDatabaseStore = async () => {
    try {
      setLoading(true);
      const localDataStr = localStorage.getItem('cozmos_db_v1');
      if (localDataStr) {
        try {
          const localData = JSON.parse(localDataStr) as DatabaseState;
          if (localData && Array.isArray(localData.users) && localData.users.length > 0) {
            // ตรวจสอบว่า localData มี vitalSigns หรือไม่ (ถ้าไม่มีให้เพิ่ม array ว่าง)
            if (!localData.vitalSigns) localData.vitalSigns = [];
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
        if (!serverData.vitalSigns) serverData.vitalSigns = [];
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
          if (!localData.vitalSigns) localData.vitalSigns = [];
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

  // ---------- API calls ----------
  const saveStateToServer = async (payload: { 
    diary?: SleepDiary; 
    factors?: DailyFactors; 
    assessment?: Assessment; 
    wellness?: WellnessUsage; 
    journal?: Journal;
    vital?: VitalSign;
  }) => {
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
        if (payload.vital) {
          const idx = next.vitalSigns.findIndex(v => v.patientId === payload.vital!.patientId && v.date === payload.vital!.date);
          if (idx !== -1) next.vitalSigns[idx] = payload.vital;
          else next.vitalSigns.push(payload.vital);
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
      vitalSigns: prev.vitalSigns.filter(v => v.patientId !== patientId)
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
  const handleSaveVitalSign = (vital: VitalSign) => saveStateToServer({ vital });

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
<header className="bg-sleep-blue-900 text-white px-4 py-2 md:px-6 md:py-4 border-b border-sleep-blue-100 sticky top-0 z-50">
  <div className="max-w-7xl mx-auto">
    {/* แถวบน: โลโก้ + ชื่อ + ปุ่มแก้ไข */}
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="w-8 h-8 md:w-11 md:h-11 bg-sleep-gold-400 rounded-xl md:rounded-2xl flex items-center justify-center">
          <Moon className="w-4 h-4 md:w-6 md:h-6 text-[#0B1026]" />
        </div>
        <div>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-sm md:text-xl font-bold text-sleep-gold-400">Cozmos</span>
            <span className="hidden sm:inline text-sm md:text-xl font-bold text-sleep-gold-400">เทคโนโลยีดูแลการนอนของ</span>
            <span
              role="button"
              tabIndex={0}
              onClick={handleEditFamilyName}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleEditFamilyName(); }}
              className="bg-white/10 px-1.5 py-0.5 rounded border border-white/20 cursor-pointer hover:bg-white/20 hover:border-sleep-gold-400 transition-all inline-flex items-center gap-0.5 text-sleep-gold-400 font-bold text-xs md:text-sm lg:text-base"
              title="คลิกเพื่อแก้ไขชื่อครอบครัว"
            >
              {familyName}
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3l4 4-7 7-4 1 1-4 7-7z"/><path d="M6 21l-3-3 3-3 3 3-3 3z"/>
              </svg>
            </span>
          </div>
          <p className="text-[10px] md:text-xs text-sleep-blue-100 mt-0.5 hidden sm:block">
            ระบบจัดการและดูแลสุขภาวะการนอนหลับระดับครอบครัว
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {syncMessage && <div className="text-[10px] md:text-xs text-sleep-gold-400 bg-white/10 px-2 py-0.5 md:px-3 md:py-1 rounded-xl">{syncMessage}</div>}
        {activeUser && (
          <div className="hidden sm:block text-right">
            <span className="text-[9px] md:text-[10px] text-sleep-gold-400">กำลังเฝ้าระวัง</span>
            <strong className="block text-xs md:text-sm">{activeUser.patientId} ({activeUser.gender === 'ชาย' ? 'ชาย' : 'หญิง'} {activeUser.age} ปี)</strong>
          </div>
        )}
        {/* dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPatientDropdown(!showPatientDropdown)}
            className="bg-sleep-blue-955 border border-white/20 text-[11px] md:text-xs px-2 py-1 md:px-3 md:py-2 rounded-xl flex items-center gap-1"
          >
            <span className="hidden xs:inline">เลือกสมาชิก</span>
            <span className="xs:hidden">👤</span>
            <ChevronDown className={`w-3 h-3 md:w-4 md:h-4 transition-transform ${showPatientDropdown ? 'rotate-180' : ''}`} />
          </button>
          {/* ... dropdown content (ไม่ต้องเปลี่ยน) ... */}
        </div>
      </div>
    </div>
    <p className="text-[10px] text-sleep-blue-100 mt-1 sm:hidden">
      ระบบดูแลและเฝ้าระวังสุขภาพการนอนระดับครอบครัว
    </p>
  </div>
</header>

      <main className="max-w-7xl mx-auto px-6 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar */}
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
              { id: 'vitals', label: '🩺 สุขภาพกาย (Vital Signs)', icon: Activity, iconColor: 'text-teal-500' },
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
                  familyName={familyName}
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
              {activeTab === 'vitals' && (
                <VitalSignsTracker
                  patientId={activePatientId}
                  existingVitals={database.vitalSigns}
                  onSave={handleSaveVitalSign}
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
