/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { HelpCircle, UserCheck, UserPlus, Info, Layers, BarChart, Sparkles, Trash2, Edit2, Check, X } from 'lucide-react';
import { motion } from 'motion/react';

interface IntroductionProps {
  users: User[];
  activePatientId: string;
  onSelectPatient: (id: string) => void;
  onAddUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
}

export default function Introduction({ users, activePatientId, onSelectPatient, onAddUser, onDeleteUser }: IntroductionProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState<number>(30);
  const [gender, setGender] = useState<'ชาย' | 'หญิง' | 'อื่นๆ' | ''>('ชาย');
  const [birthDate, setBirthDate] = useState('1996-01-01');
  const [weight, setWeight] = useState<number>(65);
  const [height, setHeight] = useState<number>(170);
  const [chronic, setChronic] = useState('ไม่มี');

  // Family name feature
  const [familyName, setFamilyName] = useState(() => {
    return localStorage.getItem('cozmos_family_name') || 'ครอบครัวสุขสันต์';
  });
  const [isEditingFamilyName, setIsEditingFamilyName] = useState(false);
  const [tempFamilyName, setTempFamilyName] = useState(familyName);

  // Save family name to localStorage when changed
  useEffect(() => {
    localStorage.setItem('cozmos_family_name', familyName);
  }, [familyName]);

  // Automatically calculate age from birthDate
  useEffect(() => {
    if (birthDate) {
      const today = new Date();
      const birth = new Date(birthDate);
      let calculatedAge = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      const dayDiff = today.getDate() - birth.getDate();
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        calculatedAge--;
      }
      // Clamp age between 0 and 120
      calculatedAge = Math.min(120, Math.max(0, calculatedAge));
      setAge(calculatedAge);
    }
  }, [birthDate]);

  const selectedUser = users.find(u => u.patientId === activePatientId);

  // Generate unique patient ID (4 characters: 2 letters + 2 digits)
  const generatePatientId = (): string => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    let randomPart = '';
    randomPart += letters[Math.floor(Math.random() * letters.length)];
    randomPart += letters[Math.floor(Math.random() * letters.length)];
    randomPart += digits[Math.floor(Math.random() * digits.length)];
    randomPart += digits[Math.floor(Math.random() * digits.length)];
    return `CZ-${randomPart}`;
  };

  const resetForm = () => {
    setFullName('');
    setAge(30);
    setGender('ชาย');
    setBirthDate('1996-01-01');
    setWeight(65);
    setHeight(170);
    setChronic('ไม่มี');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('กรุณากรอกชื่อ-นามสกุลของสมาชิก');
      return;
    }

    const pid = generatePatientId();
    const heightM = height / 100;
    const computedBmi = Number((weight / (heightM * heightM)).toFixed(1));

    const newUser: User = {
      patientId: pid,
      fullName: fullName.trim(),
      age,  // อายุที่คำนวณจากวันเกิด
      gender: gender as string,
      birthDate,
      weight,
      height,
      bmi: computedBmi,
      chronicDiseases: chronic || 'ไม่มี'
    };
    onAddUser(newUser);
    onSelectPatient(pid);
    setIsCreating(false);
    resetForm();
  };

  const handleSaveFamilyName = () => {
    if (tempFamilyName.trim()) {
      setFamilyName(tempFamilyName.trim());
    }
    setIsEditingFamilyName(false);
  };

  const cancelEditFamilyName = () => {
    setTempFamilyName(familyName);
    setIsEditingFamilyName(false);
  };

  // Helper to get display name from user (prefer fullName, fallback to patientId)
  const getUserDisplayName = (user: User): string => {
    if (user.fullName) return user.fullName;
    // Fallback for default users
    if (user.patientId === 'CZ-1001') return 'คุณวินัย (พนักงานออฟฟิศ)';
    if (user.patientId === 'CZ-1002') return 'คุณป้ามะลิ (สูงวัยนอนเช้า)';
    if (user.patientId === 'CZ-1003') return 'คุณสมชาย (สายวิ่งกีฬา)';
    return `สมาชิก ${user.patientId}`;
  };

  const getUserNickname = (user: User): string => {
    if (user.fullName) return user.fullName;
    if (user.patientId === 'CZ-1001') return 'คุณวินัย';
    if (user.patientId === 'CZ-1002') return 'คุณป้ามะลิ';
    if (user.patientId === 'CZ-1003') return 'คุณสมชาย';
    return user.patientId;
  };

  return (
    <div className="space-y-8" id="intro-container">
      {/* Hero Welcome with Family Name Editor */}
      <div className="bg-gradient-to-br from-sleep-blue-900 via-sleep-blue-800 to-sleep-blue-700 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sleep-gold-400/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-sleep-blue-500/10 rounded-full blur-3xl -ml-16 -mb-16"></div>
        
        <div className="relative max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-sleep-gold-500/20 border border-sleep-gold-400/30 px-3 py-1 rounded-full text-sleep-gold-400 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            ระบบดูแลและเฝ้าระวังภาวะหยุดหายใจขณะหลับและสุขภาพการนอนประจำบ้าน
          </div>
          
          {/* Editable Family Name */}
          <div className="flex items-center gap-3 flex-wrap">
            {isEditingFamilyName ? (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5">
                <input
                  type="text"
                  value={tempFamilyName}
                  onChange={(e) => setTempFamilyName(e.target.value)}
                  className="bg-transparent text-white text-2xl md:text-3xl font-semibold border-b border-sleep-gold-400 focus:outline-none min-w-[150px]"
                  autoFocus
                  aria-label="ชื่อครอบครัว"
                />
                <button
                  onClick={handleSaveFamilyName}
                  aria-label="บันทึกชื่อครอบครัว"
                  className="p-1 hover:bg-white/20 rounded-lg transition"
                >
                  <Check className="w-5 h-5 text-green-400" />
                </button>
                <button
                  onClick={cancelEditFamilyName}
                  aria-label="ยกเลิก"
                  className="p-1 hover:bg-white/20 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-red-400" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                  {familyName}
                </h1>
                <button
                  onClick={() => setIsEditingFamilyName(true)}
                  aria-label="แก้ไขชื่อครอบครัว"
                  className="p-1.5 hover:bg-white/20 rounded-full transition"
                >
                  <Edit2 className="w-5 h-5 text-sleep-gold-400" />
                </button>
              </div>
            )}
           
          </div>
        </div>
      </div>

      {/* 5 Ecosystem Modules Map */}
      <div>
        <h2 className="text-xl font-medium text-sleep-blue-900 mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-sleep-gold-500" />
          5 โมดูลหลักสุขภาพการนอนในบ้าน
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-sleep-blue-100 shadow-sm space-y-2">
            <div className="w-10 h-10 bg-sleep-gold-100 text-sleep-gold-500 rounded-xl flex items-center justify-center font-bold text-lg">1</div>
            <h3 className="font-semibold text-sleep-blue-900">คัดกรองความเสี่ยงการนอน</h3>
            <p className="text-xs text-sleep-blue-600 font-light">
              ประเมินความเสี่ยงหยุดหายใจขณะหลับด้วยมาตรฐานสากล ISI, ESS และ STOP-BANG
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-sleep-blue-100 shadow-sm space-y-2">
            <div className="w-10 h-10 bg-sleep-blue-100 text-sleep-blue-600 rounded-xl flex items-center justify-center font-bold text-lg">2</div>
            <h3 className="font-semibold text-sleep-blue-900">บันทึกพฤติกรรมรายวัน</h3>
            <p className="text-xs text-sleep-blue-600 font-light">
              บันทึกเวลาหลับ ระดับความเครียด ปริมาณคาเฟอีน และดัชนีมวลกาย BMI ของคุณ
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-sleep-blue-100 shadow-sm space-y-2">
            <div className="w-10 h-10 bg-sleep-gold-100 text-sleep-gold-500 rounded-xl flex items-center justify-center font-bold text-lg">3</div>
            <h3 className="font-semibold text-sleep-blue-900">กิจกรรมช่วยผ่อนคลาย</h3>
            <p className="text-xs text-sleep-blue-600 font-light">
              ฝึกหายใจบำบัดสูตร 4-7-8 และใช้กลิ่นหรือกลุ่มธาตุช่วยเตรียมตัวก่อนนอนหลับ
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-sleep-blue-100 shadow-sm space-y-2">
            <div className="w-10 h-10 bg-sleep-blue-100 text-sleep-blue-600 rounded-xl flex items-center justify-center font-bold text-lg">4</div>
            <h3 className="font-semibold text-sleep-blue-900">จดสติและถอดเสียงด้วย AI</h3>
            <p className="text-xs text-sleep-blue-600 font-light">
              บันทึกและวิเคราะห์แนวโน้มอารมณ์ความกังวล พร้อมรับคำเสนอแนะจาก AI
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-sleep-blue-100 shadow-sm space-y-2 lg:col-span-2">
            <div className="w-10 h-10 bg-sleep-gold-100 text-sleep-gold-500 rounded-xl flex items-center justify-center font-bold text-lg">5</div>
            <h3 className="font-semibold text-sleep-blue-900">วิเคราะห์สถิติมุมมองรวม</h3>
            <p className="text-xs text-sleep-blue-600 font-light">
              วิเคราะห์เทรนด์พัฒนาการนอน สรุปสถิติรอบด้าน และนำออกข้อมูลในบ้านได้ทันที
            </p>
          </div>
        </div>
      </div>

      {/* User Selection & Profiling */}
      <div className="bg-white rounded-3xl p-6 border border-sleep-blue-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-medium text-sleep-blue-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-sleep-gold-400" />
              สมาชิกใน{familyName}
            </h2>
          </div>
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              aria-label="เพิ่มสมาชิกใหม่"
              className="inline-flex items-center gap-2 bg-sleep-gold-500 hover:bg-sleep-gold-400 text-sleep-blue-950 font-medium px-4 py-2.5 rounded-xl transition duration-200"
              id="btn-create-profile"
            >
              <UserPlus className="w-4 h-4" />
              เพิ่มสมาชิก
            </button>
          )}
        </div>

        {/* Create Profile Form */}
        {isCreating && (
          <motion.form
            onSubmit={handleCreate}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-sleep-gold-50 border border-sleep-gold-200 rounded-2xl space-y-4"
          >
            <h3 className="font-semibold text-sleep-blue-900 text-md">ลงทะเบียนสมาชิกใหม่ใน{familyName}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-sleep-blue-700 font-medium">ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี"
                  className="w-full bg-white border border-sleep-blue-200 rounded-lg p-2 text-sm focus:outline-none focus:border-sleep-gold-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-sleep-blue-700 font-medium">เพศ</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full bg-white border border-sleep-blue-200 rounded-lg p-2 text-sm focus:outline-none"
                  required
                >
                  <option value="ชาย">ชาย</option>
                  <option value="หญิง">หญิง</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>

              {/* แทนที่ input อายุ ด้วยการแสดงค่าที่คำนวณอัตโนมัติ (readonly) */}
              <div className="space-y-1">
                <label className="text-xs text-sleep-blue-700 font-medium">อายุ (ปี)</label>
                <input
                  type="text"
                  value={age}
                  readOnly
                  disabled
                  className="w-full bg-gray-100 border border-sleep-blue-200 rounded-lg p-2 text-sm text-sleep-blue-800 cursor-not-allowed"
                />
                <p className="text-[10px] text-sleep-blue-500">คำนวณอัตโนมัติจากวันเกิด</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-sleep-blue-700 font-medium">วันเกิด</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-white border border-sleep-blue-200 rounded-lg p-2 text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-sleep-blue-700 font-medium">น้ำหนัก (กก.)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full bg-white border border-sleep-blue-200 rounded-lg p-2 text-sm"
                  min="20"
                  max="200"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-sleep-blue-700 font-medium">ส่วนสูง (ซม.)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full bg-white border border-sleep-blue-200 rounded-lg p-2 text-sm"
                  min="100"
                  max="250"
                  required
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs text-sleep-blue-700 font-medium">โรคประจำตัว / ข้อจำกัด</label>
                <input
                  type="text"
                  value={chronic}
                  onChange={(e) => setChronic(e.target.value)}
                  placeholder="เช่น แพ้อากาศ เบาหวาน ความดัน"
                  className="w-full bg-white border border-sleep-blue-200 rounded-lg p-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setIsCreating(false); resetForm(); }}
                className="bg-white hover:bg-sleep-blue-50 border border-sleep-blue-200 text-sleep-blue-700 text-sm px-4 py-2 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="bg-sleep-blue-900 hover:bg-sleep-blue-800 text-white text-sm px-4 py-2 rounded-lg font-medium"
              >
                บันทึกสมาชิกใหม่
              </button>
            </div>
          </motion.form>
        )}

        {/* Existing Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => {
            const isActive = user.patientId === activePatientId;
            const displayName = getUserDisplayName(user);
            const nickname = getUserNickname(user);
            
            return (
              <div
                key={user.patientId}
                onClick={() => onSelectPatient(user.patientId)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectPatient(user.patientId); }}
                role="button"
                tabIndex={0}
                className={`cursor-pointer p-4 rounded-2xl border-2 transition duration-200 focus:outline-none focus:ring-2 focus:ring-sleep-gold-500 ${
                  isActive
                    ? 'border-sleep-gold-500 bg-sleep-gold-50/50 shadow-sm'
                    : 'border-sleep-blue-100 hover:border-sleep-blue-300 hover:bg-sleep-blue-50/20'
                }`}
                id={`patient-card-${user.patientId}`}
                aria-label={`เลือก ${displayName}`}
                aria-current={isActive ? 'true' : 'false'}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-sleep-blue-500 font-semibold">{user.patientId}</span>
                    {isActive ? (
                      <span className="inline-flex items-center bg-sleep-gold-500 text-sleep-blue-950 text-xs px-2 py-0.5 rounded-full font-medium">
                        กำลังใช้งาน
                      </span>
                    ) : (
                      <span className="text-xs text-sleep-blue-400">เลือกดู</span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sleep-blue-900 text-base">{displayName}</h4>
                    <p className="text-xs text-sleep-blue-600 font-light mt-1">
                      เพศ: {user.gender} • อายุ: {user.age} ปี • น้ำหนัก: {user.weight} กก.
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-sleep-blue-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-sleep-blue-600">
                    <span>BMI: <strong className="text-sleep-blue-900">{user.bmi}</strong></span>
                    <span className="truncate max-w-[150px]">โรค: {user.chronicDiseases}</span>
                  </div>

                  {/* Delete confirmation */}
                  <div className="pt-2 border-t border-dashed border-sleep-blue-100 flex justify-end">
                    {confirmDeleteId === user.patientId ? (
                      <div className="bg-red-50 border border-red-200 p-2 rounded-xl flex items-center justify-between w-full text-xs animate-pulse">
                        <span className="text-red-700 font-semibold">ยืนยันลบ {nickname}?</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteUser(user.patientId);
                              setConfirmDeleteId(null);
                            }}
                            aria-label="ยืนยันการลบ"
                            className="bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-1 rounded-lg text-xs"
                          >
                            ยืนยัน
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                            aria-label="ยกเลิกการลบ"
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-2 py-1 rounded-lg text-xs"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(user.patientId);
                        }}
                        aria-label={`ลบสมาชิก ${nickname}`}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 px-2.5 rounded-lg flex items-center gap-1 text-[11px] font-semibold border border-red-100 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบสมาชิก</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected User Summary Details */}
        {selectedUser && (
          <div className="bg-sleep-blue-50/50 rounded-2xl p-4 border border-sleep-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-sleep-blue-900 text-sleep-gold-400 rounded-full flex items-center justify-center font-bold font-mono">
                {selectedUser.patientId.slice(-3)}
              </div>
              <div>
                <span className="text-xs text-sleep-blue-500 font-semibold uppercase tracking-wider font-mono bg-white px-2 py-0.5 rounded border border-sleep-blue-100">
                  {selectedUser.patientId}
                </span>
                <p className="text-sm font-semibold text-sleep-blue-900 mt-1">
                  {getUserDisplayName(selectedUser)} • เพศ {selectedUser.gender} • อายุ {selectedUser.age} ปี
                </p>
                <p className="text-xs text-sleep-blue-600">
                  น้ำหนัก {selectedUser.weight} กก. • ส่วนสูง {selectedUser.height} ซม.
                </p>
              </div>
            </div>
            <div className="text-right flex items-center self-end md:self-auto gap-4">
              <div className="px-3 py-1 bg-white border border-sleep-blue-100 rounded-xl text-center">
                <span className="text-xs text-sleep-blue-400 block font-light">ค่าดัชนี BMI</span>
                <strong className={`text-base font-bold ${selectedUser.bmi >= 25 ? 'text-red-500' : 'text-sleep-blue-900'}`}>
                  {selectedUser.bmi}
                </strong>
              </div>
              <div className="px-3 py-1 bg-white border border-sleep-blue-100 rounded-xl text-center">
                <span className="text-xs text-sleep-blue-400 block font-light">ความเสี่ยงทางกาย</span>
                <strong className="text-sm font-medium text-sleep-blue-900 truncate max-w-[120px] block">
                  {selectedUser.bmi >= 25 ? 'น้ำหนักเกินเกณฑ์' : 'เกณฑ์สุขภาพปกติ'}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
