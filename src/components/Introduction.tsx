import React, { useState } from 'react';
import { User } from '../types';
import { UserPlus, UserCheck, Sparkles, Trash2, Check, X } from 'lucide-react';
import { motion } from 'motion/react';

interface IntroductionProps {
  users: User[];
  activePatientId: string;
  onSelectPatient: (id: string) => void;
  onAddUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  familyName: string;
}

export default function Introduction({
  users,
  activePatientId,
  onSelectPatient,
  onAddUser,
  onDeleteUser,
  familyName,
}: IntroductionProps) {
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

  const generatePatientId = (): string => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `CZ-${timestamp}${random}`;
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

  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const birth = new Date(dobString);
    if (isNaN(birth.getTime())) return 0;
    const today = new Date();
    let calculatedAge = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      calculatedAge--;
    }
    return calculatedAge >= 0 ? calculatedAge : 0;
  };

  const handleBirthDateChange = (val: string) => {
    setBirthDate(val);
    setAge(calculateAge(val));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('กรุณากรอกชื่อ-นามสกุล');
      return;
    }
    const heightM = height / 100;
    const bmi = Number((weight / (heightM * heightM)).toFixed(1));
    const newUser: User = {
      patientId: generatePatientId(),
      fullName: fullName.trim(),
      age,
      gender: gender as any,
      birthDate,
      weight,
      height,
      bmi,
      chronicDiseases: chronic || 'ไม่มี',
    };
    onAddUser(newUser);
    setIsCreating(false);
    resetForm();
  };

  const getUserDisplayName = (user: User): string => {
    if (user.fullName) return user.fullName;
    if (user.patientId === 'CZ-1001') return 'คุณวินัย (พนักงานออฟฟิศ)';
    if (user.patientId === 'CZ-1002') return 'คุณป้ามะลิ (สูงวัยนอนเช้า)';
    if (user.patientId === 'CZ-1003') return 'คุณสมชาย (สายวิ่งกีฬา)';
    return `สมาชิก ${user.patientId}`;
  };

  const selectedUser = users.find(u => u.patientId === activePatientId);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Hero Welcome */}
      <div className="bg-gradient-to-br from-sleep-blue-900 via-sleep-blue-800 to-sleep-blue-700 text-white rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-sleep-gold-400/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative max-w-3xl space-y-3 md:space-y-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 md:gap-2 bg-sleep-gold-500/20 border border-sleep-gold-400/30 px-2.5 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-medium text-sleep-gold-400">
            <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">ระบบดูแลและเฝ้าระวังภาวะหยุดหายใจขณะหลับและสุขภาพการนอนประจำบ้าน</span>
            <span className="sm:hidden">OSA & Sleep Care</span>
          </div>

          
        </div>
      </div>

      {/* สมาชิกในครอบครัว */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 border border-sleep-blue-100 shadow-sm space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-lg md:text-xl font-medium flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-sleep-gold-400" />
            สมาชิกใน{familyName}
          </h2>
          {!isCreating && (
            <button onClick={() => setIsCreating(true)} className="bg-sleep-gold-500 hover:bg-sleep-gold-400 text-sleep-blue-950 font-medium px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-sm flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> เพิ่มสมาชิก
            </button>
          )}
        </div>

        {/* ฟอร์มเพิ่มสมาชิก */}
        {isCreating && (
          <motion.form onSubmit={handleCreate} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-5 bg-sleep-gold-50 rounded-xl md:rounded-2xl space-y-4">
            <h3 className="font-semibold text-sm md:text-base">ลงทะเบียนสมาชิกใหม่</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-sleep-blue-900 mb-1">ชื่อ-นามสกุล</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-white border border-sleep-blue-100 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-sleep-gold-400" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-sleep-blue-900 mb-1">เพศ</label>
                <select value={gender} onChange={e => setGender(e.target.value as any)} className="w-full bg-white border border-sleep-blue-100 rounded-lg p-2 text-sm focus:outline-none-focus:ring-1 focus:ring-sleep-gold-400">
                  <option value="ชาย">ชาย</option>
                  <option value="หญิง">หญิง</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-sleep-blue-900 mb-1">อายุ</label>
                <input type="number" value={age || ''} onChange={e => setAge(Number(e.target.value))} className="w-full bg-white border border-sleep-blue-100 rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-sleep-blue-900 mb-1">วันเกิด</label>
                <input type="date" value={birthDate} onChange={e => handleBirthDateChange(e.target.value)} className="w-full bg-white border border-sleep-blue-100 rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-sleep-blue-900 mb-1">น้ำหนัก (กก.)</label>
                <input type="number" value={weight || ''} onChange={e => setWeight(Number(e.target.value))} className="w-full bg-white border border-sleep-blue-100 rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-sleep-blue-900 mb-1">ส่วนสูง (ซม.)</label>
                <input type="number" value={height || ''} onChange={e => setHeight(Number(e.target.value))} className="w-full bg-white border border-sleep-blue-100 rounded-lg p-2 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-sleep-blue-900 mb-1">โรคประจำตัว</label>
                <input type="text" value={chronic} onChange={e => setChronic(e.target.value)} placeholder="เช่น แพ้อากาศ, ความดัน" className="w-full bg-white border border-sleep-blue-100 rounded-lg p-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setIsCreating(false); resetForm(); }} className="border bg-white px-3 py-1.5 md:px-4 rounded-lg text-sm cursor-pointer">ยกเลิก</button>
              <button type="submit" className="bg-sleep-blue-900 text-white px-3 py-1.5 md:px-4 rounded-lg text-sm cursor-pointer">บันทึก</button>
            </div>
          </motion.form>
        )}

        {/* รายชื่อสมาชิก */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {users.map(user => {
            const isActive = user.patientId === activePatientId;
            return (
              <div key={user.patientId} onClick={() => onSelectPatient(user.patientId)} className={`cursor-pointer p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition ${isActive ? 'border-sleep-gold-500 bg-sleep-gold-50/50' : 'border-sleep-blue-100 hover:bg-sleep-blue-50/20'}`}>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] md:text-xs text-sleep-blue-500 font-mono">{user.patientId}</span>
                  {isActive && <span className="bg-sleep-gold-500 text-sleep-blue-950 text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full">กำลังใช้งาน</span>}
                </div>
                <div className="mt-1 md:mt-2">
                  <h4 className="font-semibold text-sm md:text-base">{getUserDisplayName(user)}</h4>
                  <p className="text-[10px] md:text-xs text-sleep-blue-600">เพศ {user.gender} • อายุ {user.age} ปี</p>
                  <p className="text-[10px] md:text-xs text-sleep-blue-600">BMI {user.bmi} • {user.chronicDiseases}</p>
                </div>
                {confirmDeleteId === user.patientId ? (
                  <div className="mt-3 flex justify-between items-center bg-red-50 p-2 rounded-lg">
                    <span className="text-red-700 text-xs">ยืนยันลบ?</span>
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); onDeleteUser(user.patientId); setConfirmDeleteId(null); }} className="bg-red-600 text-white px-2 py-1 rounded text-xs">ใช่</button>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} className="bg-gray-200 px-2 py-1 rounded text-xs select-none">ยกเลิก</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(user.patientId); }} className="mt-3 text-red-500 text-[11px] md:text-xs hover:underline">ลบสมาชิก</button>
                )}
              </div>
            );
          })}
        </div>

        {/* สรุปผู้ใช้ที่เลือก */}
        {selectedUser && (
          <div className="bg-sleep-blue-50/50 rounded-xl md:rounded-2xl p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <p className="text-sm font-semibold">{getUserDisplayName(selectedUser)} • {selectedUser.gender} • {selectedUser.age} ปี</p>
              <p className="text-xs text-sleep-blue-600">น้ำหนัก {selectedUser.weight} กก. • ส่วนสูง {selectedUser.height} ซม.</p>
            </div>
            <div className="text-center sm:text-right">
              <span className="text-xs text-sleep-blue-500">BMI</span>
              <strong className={`block text-base md:text-lg ${selectedUser.bmi >= 25 ? 'text-red-500' : 'text-sleep-blue-900'}`}>{selectedUser.bmi}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
