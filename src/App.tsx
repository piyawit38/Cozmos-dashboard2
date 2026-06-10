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
  // Sync state loaded from local JSON server file
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

  // Dropdown UI triggers
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // ---------- Family Name State (อ่านจาก localStorage) ----------
  const [familyName, setFamilyName] = useState<string>(() => {
    return localStorage.getItem('cozmos_family_name') || 'ครอบครัวสุขสันต์';
  });

  // ฟังการเปลี่ยนแปลงของ localStorage จากแท็บอื่น (หรือภายในแอป)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cozmos_family_name') {
        setFamilyName(e.newValue || 'ครอบครัวสุขสันต์');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // เพิ่ม polling เพื่ออัปเดตเมื่อมีการเปลี่ยนแปลงภายในแอปเดียวกัน (storage event ใช้ได้แค่ข้ามแท็บ)
  useEffect(() => {
    const interval = setInterval(() => {
      const current = localStorage.getItem('cozmos_family_name');
      if (current && current !== familyName) {
        setFamilyName(current);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [familyName]);

  // ----------------------------------------------------------------------
  // ส่วนโหลดข้อมูล, saveStateToServer, การจัดการ users และอื่นๆ (เหมือนเดิม)
  // ----------------------------------------------------------------------

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
            }).catch(e => console.error("Sync to server backup failure:", e));

            if (localData.users.length > 0 && !localData.users.some((u: any) => u.patientId === activePatientId)) {
              setActivePatientId(localData.users[0].patientId);
            }
            return;
          }
        } catch (e) {
          console.error("Local storage Parse error", e);
        }
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
      console.error("Failed to load local database state", err);
      const localDataStr = localStorage.getItem('cozmos_db_v1');
      if (localDataStr) {
        try {
          const localData = JSON.parse(localDataStr);
          setDatabase(localData);
          if (localData.users.length > 0 && !localData.users.some((u: any) => u.patientId === activePatientId)) {
            setActivePatientId(localData.users[0].patientId);
          }
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

  const saveStateToServer = async (payload: { diary?: SleepDiary; factors?: DailyFactors; assessment?: Assessment; wellness?: WellnessUsage; journal?: Journal }) => {
    try {
      setSyncMessage('🔄 กำลังผสานส่งข้อมูลหา Google Sheets...');
      const resp = await fetch('/api/store/log-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (data.success && data.state) {
        setDatabase(data.state);
        setSyncMessage('✅ ข้อมูลอัปเดตตรงระบบคลาวด์แล้ว!');
        setTimeout(() => setSyncMessage(''), 3000);
      }
    } catch (err) {
      console.error("Failed to sync state to server", err);
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
      setSyncMessage('✅ บันทึกข้อมูลสำเร็จเข้าเครื่องคนไข้เรียบร้อยแล้ว!');
      setTimeout(() => setSyncMessage(''), 3000);
    }
  };

  const handleCreatePatient = async (newUser: User) => {
    setDatabase(prev => {
      const updatedUsers = [...prev.users];
      const existingIdx = updatedUsers.findIndex(u => u.patientId === newUser.patientId);
      if (existingIdx !== -1) {
        updatedUsers[existingIdx] = newUser;
      } else {
        updatedUsers.push(newUser);
      }
      return { ...prev, users: updatedUsers };
    });
    setActivePatientId(newUser.patientId);
    setActiveTab('screening');

    try {
      const resp = await fetch('/api/store/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      const data = await resp.json();
      if (data.success) {
        await loadDatabaseStore();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePatient = async (updatedUser: User) => {
    setDatabase(prev => {
      const updatedUsers = prev.users.map(u => u.patientId === updatedUser.patientId ? updatedUser : u);
      return { ...prev, users: updatedUsers };
    });

    try {
      const resp = await fetch('/api/store/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      });
      const data = await resp.json();
      if (data.success) {
        await loadDatabaseStore();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    try {
      if (database.users.length <= 1) {
        setSyncMessage('⚠️ ไม่สามารถลบสมาชิกคนสุดท้ายได้ครับ');
        setTimeout(() => setSyncMessage(''), 4000);
        return;
      }

      setSyncMessage('🔄 กำลังลบข้อมูลสมาชิก...');

      let nextPatientId = activePatientId;
      if (activePatientId === patientId) {
        const remainingUsers = database.users.filter(u => u.patientId !== patientId);
        if (remainingUsers.length > 0) {
          nextPatientId = remainingUsers[0].patientId;
        }
      }

      setDatabase(prev => ({
        ...prev,
        users: prev.users.filter(u => u.patientId !== patientId),
        sleepDiary: prev.sleepDiary.filter(d => d.patientId !== patientId),
        dailyFactors: prev.dailyFactors.filter(f => f.patientId !== patientId),
        assessments: prev.assessments.filter(a => a.patientId !== patientId),
        wellnessUsage: prev.wellnessUsage.filter(w => w.patientId !== patientId),
        journals: prev.journals.filter(j => j.patientId !== patientId),
      }));
      setActivePatientId(nextPatientId);
      setSyncMessage('✅ ลบข้อมูลสมาชิกสำเร็จ!');
      setTimeout(() => setSyncMessage(''), 3000);

      const resp = await fetch(`/api/store/user/${patientId}`, {
        method: 'DELETE'
      });
      const data = await resp.json();
      if (data.success) {
        await loadDatabaseStore();
      }
    } catch (err) {
      console.error(err);
      setSyncMessage('❌ เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  const handleSaveScreening = (assessment: Assessment) => {
    saveStateToServer({ assessment });
  };

  const handleSaveDailyLog = (diary: SleepDiary, factors: DailyFactors, weight?: number, height?: number) => {
    saveStateToServer({ diary, factors });
    if (weight && height && activeUser) {
      const computedBmi = Number((weight / ((height / 100) * (height / 100))).toFixed(1));
      handleUpdatePatient({
        ...activeUser,
        weight,
        height,
        bmi: computedBmi
      });
    }
  };

  const handleLogWellnessUsage = (wellness: WellnessUsage) => {
    saveStateToServer({ wellness });
  };

  const handleSaveJournalRecord = (journal: Journal) => {
    saveStateToServer({ journal });
  };

  const activeUser = database.users.find(u => u.patientId === activePatientId) || database.users[0];
  const userAssessmentsList = database.assessments.filter(a => a.patientId === activePatientId);
  const activeUserLatestScreening = userAssessmentsList[userAssessmentsList.length - 1];

  const totalDiariesLogged = database.sleepDiary.filter(d => d.patientId === activePatientId).length;
  const averageSleepDuration = totalDiariesLogged 
    ? (database.sleepDiary.filter(d => d.patientId === activePatientId).reduce((sum, d) => sum + d.sleepDuration, 0) / totalDiariesLogged).toFixed(1)
    : "ไม่มีข้อมูล";

  if (loading && database.users.length === 0) {
    return (
      <div className="min-h-screen bg-sleep-blue-900 flex flex-col justify-center items-center py-10 text-white gap-3">
        <Moon className="w-12 h-12 text-sleep-gold-400 animate-spin" />
        <h4 className="font-semibold text-lg text-sleep-gold-400">COZMOS SLEEP WELLNESS</h4>
        <p className="text-xs text-sleep-blue-300 font-light">กำลังเตรียมข้อมูลระบบดูแลสุขภาพการนอนสำหรับสมาชิกในบ้าน...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1026] bg-gradient-to-b from-[#0B1026] via-[#0d1330] to-[#080b1e] text-sleep-blue-950 flex flex-col font-sans select-none pb-12">
      <header className="bg-sleep-blue-900 text-white px-6 py-4 border-b border-sleep-blue-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-sleep-gold-400 rounded-2xl flex items-center justify-center text-[#0B1026]">
              <Moon className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-sleep-gold-400 tracking-tight flex items-center gap-2 flex-wrap">
                Cozmos เทคโนโลยีดูแลการนอนของ
                <span className="bg-white/10 px-2 py-0.5 rounded border border-white/20 text-sleep-gold-400 ml-1">
                  {familyName}
                </span>
              </h1>
              <p className="text-xs text-sleep-blue-100 font-light mt-0.5">
                ระบบจัดการและดูแลสุขภาวะการนอนหลับระดับครอบครัว เฝ้าระวังความเสี่ยงหยุดหายใจขณะหลับเบื้องต้น และบันทึกพฤติกรรมประจำวันในบ้าน
              </p>
            </div>
          </div>

          {syncMessage && (
            <div className="bg-white/10 border border-white/20 text-xs text-sleep-gold-400 px-3 py-1.5 rounded-xl font-mono animate-bounce md:inline hidden">
              {syncMessage}
            </div>
          )}

          <div className="flex gap-4 items-center relative select-none">
            {activeUser && (
              <div className="flex gap-2 items-center text-right md:inline hidden">
                <span className="text-[10px] text-sleep-gold-400 font-medium block uppercase tracking-wider">กำลังเฝ้าระวัง</span>
                <strong className="text-sm text-white font-semibold">
                  {activeUser.patientId} ({activeUser.gender === 'ชาย' ? 'คุณผู้ชาย' : 'คุณผู้หญิง'} {activeUser.age} ปี)
                </strong>
              </div>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPatientDropdown(!showPatientDropdown)}
                className="bg-sleep-blue-955 border border-white/20 text-xs text-white px-3.5 py-2 rounded-xl flex items-center gap-2"
              >
                <span>เลือกสมาชิก</span>
                <ChevronDown className={`w-4 h-4 text-sleep-gold-400 transition-transform ${showPatientDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showPatientDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-sleep-blue-100 text-sleep-blue-950 text-xs overflow-hidden py-1 z-50"
                  >
                    <div className="p-2 border-b border-sleep-blue-50 text-[10px] text-sleep-blue-400 uppercase tracking-widest block font-medium">สลับสมาชิกครอบครัว</div>
                    <div className="max-h-48 overflow-y-auto">
                      {database.users.map((item) => (
                        <button
                          key={item.patientId}
                          onClick={() => {
                            setActivePatientId(item.patientId);
                            setShowPatientDropdown(false);
                          }}
                          className={`w-full text-left p-2.5 px-4 hover:bg-sleep-cream flex items-center justify-between ${item.patientId === activePatientId ? 'bg-sleep-gold-50 font-bold text-sleep-blue-950' : ''}`}
                        >
                          <span>{item.patientId} ({item.age} ปี)</span>
                          {item.patientId === activePatientId && <Check className="w-3.5 h-3.5 text-sleep-gold-500" />}
                        </button>
                      ))}
                    </div>
                    <div className="p-1 px-2 border-t border-sleep-blue-50 text-center">
                      <button
                        onClick={() => {
                          setActiveTab('welcome');
                          setShowPatientDropdown(false);
                        }}
                        className="w-full text-center py-1.5 text-sleep-gold-500 font-bold hover:bg-sleep-cream block rounded-xl text-[11px]"
                      >
                        ➕ เพิ่มโปรไฟล์สมาชิกรายใหม่
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-6 mt-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="col-span-1 lg:col-span-3 space-y-4">
          {activeUser && (
            <div className="bg-sleep-blue-900 text-white rounded-3xl p-5 border border-sleep-blue-950 relative overflow-hidden shadow">
              <div className="absolute top-0 right-0 w-20 h-20 bg-sleep-gold-400/15 rounded-full blur-xl -mr-6 -mt-6"></div>
              <div className="flex gap-2 items-center pb-3 border-b border-white/10 mb-3">
                <Users className="w-5 h-5 text-sleep-gold-400" />
                <h5 className="font-semibold text-xs text-sleep-gold-400 uppercase tracking-wider block font-medium">บันทึกประวัติสุขภาพ Cozmos</h5>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-sleep-blue-200 font-light">รหัสสมาชิกครอบครัว:</span>
                  <strong className="text-white font-mono">{activeUser.patientId}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-sleep-blue-200 font-light">เพศ / อายุ:</span>
                  <strong className="text-white">{activeUser.gender} ({activeUser.age} ปี)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-sleep-blue-200 font-light">ดัชนี BMI ล่าสุด:</span>
                  <strong className="text-sleep-gold-400 font-mono font-bold">{activeUser.bmi || 22.0}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-sleep-blue-200 font-light">โรคประจำตัว:</span>
                  <strong className="text-white truncate max-w-[110px] block text-right">{activeUser.chronicDiseases || "ไม่มี"}</strong>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2.5 mt-2 flex-col gap-1 text-center">
                  <span className="text-sleep-blue-200 font-light block leading-none text-left">ความเสี่ยงหยุดหายใจสะสม:</span>
                  {activeUserLatestScreening ? (
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold block text-center mt-1 uppercase ${
                      activeUserLatestScreening.riskLevel === 'สูง' ? 'bg-red-500 text-white shadow border border-red-600' :
                      activeUserLatestScreening.riskLevel === 'ปานกลาง' ? 'bg-orange-500 text-white border border-orange-600' : 'bg-green-500 text-white border border-green-600'
                    }`}>
                      🚨 เสี่ยงหยุดหายใจ: {activeUserLatestScreening.riskLevel}
                    </span>
                  ) : (
                    <span className="text-[10px] text-sleep-blue-300 italic block leading-normal pt-1 text-left">
                      ยังไม่เคยคัดกรอง Module
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-sleep-blue-100 rounded-3xl p-4 shadow-sm space-y-1">
            <button
              onClick={() => setActiveTab('welcome')}
              className={`w-full text-left p-3 rounded-2xl text-sm font-semibold flex items-center justify-between transition ${
                activeTab === 'welcome'
                  ? 'bg-sleep-gold-500 text-sleep-blue-950 font-bold shadow'
                  : 'text-sleep-blue-700 hover:bg-sleep-blue-50'
              }`}
            >
              <span className="flex items-center gap-2"><Users className="w-4 h-4" /> ส่วนต้อนรับ & สมาชิกในบ้าน</span>
            </button>
            <button
              onClick={() => setActiveTab('screening')}
              className={`w-full text-left p-3 rounded-2xl text-sm font-semibold flex items-center justify-between transition ${
                activeTab === 'screening'
                  ? 'bg-sleep-gold-500 text-sleep-blue-950 font-bold shadow'
                  : 'text-sleep-blue-700 hover:bg-sleep-blue-50'
              }`}
            >
              <span className="flex items-center gap-2"><Heart className="w-4 h-4 text-red-500" /> ประเมินความเสี่ยงการนอน</span>
            </button>
            <button
              onClick={() => setActiveTab('tracking')}
              className={`w-full text-left p-3 rounded-2xl text-sm font-semibold flex items-center justify-between transition ${
                activeTab === 'tracking'
                  ? 'bg-sleep-gold-500 text-sleep-blue-950 font-bold shadow'
                  : 'text-sleep-blue-700 hover:bg-sleep-blue-50'
              }`}
            >
              <span className="flex items-center gap-2"><Moon className="w-4 h-4 text-indigo-700" /> บันทึกพฤติกรรมประจำวัน</span>
            </button>
            <button
              onClick={() => setActiveTab('wellness')}
              className={`w-full text-left p-3 rounded-2xl text-sm font-semibold flex items-center justify-between transition ${
                activeTab === 'wellness'
                  ? 'bg-sleep-gold-500 text-sleep-blue-950 font-bold shadow'
                  : 'text-sleep-blue-700 hover:bg-sleep-blue-50'
              }`}
            >
              <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500 animate-pulse" /> กิจกรรมช่วยผ่อนคลาย</span>
            </button>
            <button
              onClick={() => setActiveTab('reflection')}
              className={`w-full text-left p-3 rounded-2xl text-sm font-semibold flex items-center justify-between transition ${
                activeTab === 'reflection'
                  ? 'bg-sleep-gold-500 text-sleep-blue-950 font-bold shadow'
                  : 'text-sleep-blue-700 hover:bg-sleep-blue-50'
              }`}
            >
              <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-blue-650" /> จดบันทึกและวิเคราะห์จิตใจ</span>
            </button>
            <button
              onClick={() => setActiveTab('looker')}
              className={`w-full text-left p-3 rounded-2xl text-sm font-semibold flex items-center justify-between transition ${
                activeTab === 'looker'
                  ? 'bg-sleep-gold-500 text-sleep-blue-950 font-bold shadow'
                  : 'text-sleep-blue-700 hover:bg-sleep-blue-50'
              }`}
            >
              <span className="flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-emerald-500" /> แดชบอร์ดสุขภาพครอบครัว</span>
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`w-full text-left p-3 rounded-2xl text-sm font-semibold flex items-center justify-between transition ${
                activeTab === 'database'
                  ? 'bg-sleep-gold-500 text-sleep-blue-950 font-bold shadow'
                  : 'text-sleep-blue-700 hover:bg-sleep-blue-50'
              }`}
            >
              <span className="flex items-center gap-2"><Database className="w-4 h-4" /> คลังระเบียนบันทึกครอบครัว</span>
            </button>
          </div>
        </section>

        <section className="col-span-1 lg:col-span-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'welcome' && (
                <Introduction
                  users={database.users}
                  activePatientId={activePatientId}
                  onSelectPatient={(id) => {
                    setActivePatientId(id);
                    setActiveTab('screening');
                  }}
                  onAddUser={handleCreatePatient}
                  onDeleteUser={handleDeletePatient}
                />
              )}
              {activeTab === 'screening' && (
                <SleepScreening
                  patientId={activePatientId}
                  onSaveAssessment={handleSaveScreening}
                  existingAssessment={userAssessmentsList[userAssessmentsList.length - 1]}
                />
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
                <WellnessIntervention
                  patientId={activePatientId}
                  onLogWellnessUsage={handleLogWellnessUsage}
                />
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
                <LookerDashboard
                  database={database}
                  activePatientId={activePatientId}
                />
              )}
              {activeTab === 'database' && (
                <SheetsDatabase
                  database={database}
                  onUpdateDatabase={setDatabase}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
