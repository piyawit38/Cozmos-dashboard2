/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { SleepDiary, DailyFactors, User } from '../types';
import { Calendar, Moon, Zap, UserCheck, Check, Sparkles, Scale, Percent, Clock, Coffee, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface DailyTrackingProps {
  patientId: string;
  activeUser?: User;
  onSaveDailyLog: (diary: SleepDiary, factors: DailyFactors, weight?: number, height?: number) => void;
  onUpdateUser: (updatedUser: User) => void;
  existingDiary?: SleepDiary;
  existingFactors?: DailyFactors;
}

export default function DailyTracking({
  patientId,
  activeUser,
  onSaveDailyLog,
  onUpdateUser,
  existingDiary,
  existingFactors
}: DailyTrackingProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);

  // Sleep Diary States
  const [bedTime, setBedTime] = useState(existingDiary?.bedTime || activeUser?.defaultBedTime || '22:30');
  const [wakeTime, setWakeTime] = useState(existingDiary?.wakeTime || activeUser?.defaultWakeTime || '06:30');
  const [sleepDuration, setSleepDuration] = useState<number>(existingDiary?.sleepDuration || 7.5);
  const [awakenings, setAwakenings] = useState<number>(existingDiary?.awakenings || 1);

  // Daily Factors States
  const [stressScore, setStressScore] = useState<number>(existingFactors?.stressScore || 4);
  const [caffeine, setCaffeine] = useState<number>(existingFactors?.caffeine || 1);
  const [exercise, setExercise] = useState<number>(existingFactors?.exercise || 30);
  const [screenTime, setScreenTime] = useState<number>(existingFactors?.screenTime || 2);
  const [napDuration, setNapDuration] = useState<number>(existingFactors?.napDuration || 0);

  // Profile overrides (Weight & Height for BMI)
  const [weight, setWeight] = useState<number>(activeUser?.weight || 65);
  const [height, setHeight] = useState<number>(activeUser?.height || 170);

  const [saveMessage, setSaveMessage] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // ---------- Helper: คำนวณ Time in Bed และ Sleep Efficiency (ใช้ date จริง) ----------
  const calculateSleepMetrics = useCallback(() => {
    if (!date) return { efficiency: 85, timeInBed: 8 };
    
    try {
      const bedDateTime = new Date(`${date}T${bedTime}`);
      let wakeDateTime = new Date(`${date}T${wakeTime}`);
      
      // ถ้าตื่นนอนในวันถัดไป
      if (wakeDateTime <= bedDateTime) {
        wakeDateTime.setDate(wakeDateTime.getDate() + 1);
      }
      
      const timeInBedHours = (wakeDateTime.getTime() - bedDateTime.getTime()) / (1000 * 60 * 60);
      // จำกัด sleepDuration ไม่ให้เกิน timeInBed
      let actualSleep = Math.min(sleepDuration, timeInBedHours);
      
      const efficiency = timeInBedHours > 0 
        ? Math.min(Math.round((actualSleep / timeInBedHours) * 100), 100)
        : 85;
        
      return { efficiency, timeInBed: timeInBedHours };
    } catch (error) {
      console.error("Error calculating sleep metrics:", error);
      return { efficiency: 85, timeInBed: 8 };
    }
  }, [date, bedTime, wakeTime, sleepDuration]);

  // ใช้ useMemo เพื่อป้องกันการคำนวณซ้ำโดยไม่จำเป็น
  const { efficiency, timeInBed } = useMemo(
    () => calculateSleepMetrics(),
    [calculateSleepMetrics]
  );

  // ---------- Dynamic Daily Wellness Score Algorithm (out of 100) ----------
  const computeDailyWellnessScore = useCallback(() => {
    let score = 100;

    // 1. Duration deviation (Target 7-9 hours)
    if (sleepDuration < 6) {
      score -= (6 - sleepDuration) * 12;
    } else if (sleepDuration > 9) {
      score -= (sleepDuration - 9) * 5;
    }

    // 2. Awakenings
    score -= awakenings * 4;

    // 3. Sleep Efficiency
    if (efficiency < 85) {
      score -= (85 - efficiency) * 0.8;
    }

    // 4. Stress Score
    if (stressScore > 5) {
      score -= (stressScore - 5) * 6;
    }

    // 5. Screen Time before sleep (Optimal < 2 hrs)
    if (screenTime > 3) {
      score -= (screenTime - 3) * 5;
    }

    // 6. Caffeine intake (> 2 cups penalized)
    if (caffeine > 2) {
      score -= (caffeine - 2) * 4;
    }

    // 7. Exercise bonus
    if (exercise >= 30) {
      score += 8;
    } else if (exercise > 0) {
      score += 3;
    }

    // Cap between 10 and 100
    return Math.max(10, Math.min(Math.round(score), 100));
  }, [sleepDuration, awakenings, efficiency, stressScore, screenTime, caffeine, exercise]);

  const wellnessScore = useMemo(
    () => computeDailyWellnessScore(),
    [computeDailyWellnessScore]
  );

  // ---------- BMI และสถานะ ----------
  const currentBmi = useMemo(() => {
    const heightM = height / 100;
    return Number((weight / (heightM * heightM)).toFixed(1));
  }, [weight, height]);

  const getBmiStatus = useCallback((bmi: number) => {
    if (bmi < 18.5) return { text: "ผอม / น้ำหนักต่ำกว่าเกณฑ์", color: "text-blue-500" };
    if (bmi < 23) return { text: "ปกติ (น้ำหนักตัวเพื่อสุขภาพ)", color: "text-green-600" };
    if (bmi < 25) return { text: "น้ำหนักเกินเกณฑ์เล็กน้อย", color: "text-yellow-600" };
    if (bmi < 30) return { text: "อ้วนระดับ 1 (เสี่ยงภาวะสลีปแอพเนียบ้าง)", color: "text-orange-600" };
    return { text: "อ้วนอันตราย (ระวังโรคอ้วนหยุดหายใจหลับรุนแรง)", color: "text-red-600" };
  }, []);

  // ---------- ตรวจสอบว่ามีข้อมูลซ้ำในวันนี้หรือไม่ (parent component อาจส่ง flag) ----------
  // จำลอง: ถ้ามี existingDiary และ date ตรงกับ existingDiary?.date แสดง warning
  useEffect(() => {
    if (existingDiary && existingDiary.date === date) {
      setDuplicateWarning(true);
    } else {
      setDuplicateWarning(false);
    }
  }, [existingDiary, date]);

  // ---------- อัปเดต weight/height เมื่อ activeUser เปลี่ยน ----------
  useEffect(() => {
    if (activeUser) {
      setWeight(activeUser.weight);
      setHeight(activeUser.height);
    }
  }, [activeUser]);

  // ---------- บันทึกข้อมูล ----------
  const handleSave = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // ตรวจสอบ sleepDuration ไม่เกิน timeInBed
      if (sleepDuration > timeInBed + 0.1) {
        const confirmOver = window.confirm(
          `ระยะเวลาหลับ (${sleepDuration} ชม.) มากกว่าเวลาที่อยู่ในเตียง (${timeInBed.toFixed(1)} ชม.)\n` +
          `คุณต้องการบันทึกโดยให้ระบบปรับระยะเวลาหลับให้เหมาะสมหรือไม่?`
        );
        if (!confirmOver) return;
      }

      // ถ้ามีข้อมูลซ้ำ ให้ถามก่อน overwrite
      if (duplicateWarning) {
        const confirmOverwrite = window.confirm(
          `วันนี้ (${date}) มีบันทึกของสมาชิกนี้อยู่แล้ว คุณต้องการเขียนทับข้อมูลเดิมหรือไม่?`
        );
        if (!confirmOverwrite) return;
      }

      // อัปเดต BMI ใน User object
      if (activeUser) {
        const updatedUser: User = {
          ...activeUser,
          weight,
          height,
          bmi: currentBmi
        };
        onUpdateUser(updatedUser);
      }

      const diaryLog: SleepDiary = {
        patientId,
        date,
        bedTime,
        wakeTime,
        sleepDuration: Math.min(sleepDuration, timeInBed), // บันทึกค่าที่ถูกต้อง
        sleepEfficiency: efficiency,
        awakenings
      };

      const factorLog: DailyFactors = {
        patientId,
        date,
        stressScore,
        caffeine,
        exercise,
        screenTime,
        napDuration
      };

      onSaveDailyLog(diaryLog, factorLog, weight, height);
      setSaveMessage('✅ บันทึกสุขภาพและสุขอนามัยการนอนรายวันเรียบร้อยแล้ว!');
      
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => setSaveMessage(''), 4000);
    },
    [
      patientId, date, bedTime, wakeTime, sleepDuration, awakenings,
      stressScore, caffeine, exercise, screenTime, napDuration,
      weight, height, activeUser, onSaveDailyLog, onUpdateUser,
      currentBmi, efficiency, timeInBed, duplicateWarning
    ]
  );

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  return (
    <div className="space-y-6" id="tracking-container">
      {/* Module Title */}
      <div>
        <h2 className="text-2xl md:text-3xl font-semibold text-sleep-blue-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-sleep-gold-500" />
          บันทึกติดตามพฤติกรรมการนอนประจำวันประจำบ้าน
        </h2>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Sleep Diary Card */}
        <div className="bg-white border border-sleep-blue-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-sleep-blue-50 pb-3 flex items-center justify-between">
            <h3 className="font-semibold text-sleep-blue-900 text-lg flex items-center gap-1.5">
              <Moon className="w-5 h-5 text-sleep-blue-600" />
              1. บันทึกไดอารี่การนอนหลับ
            </h3>
            <span className="text-xs bg-sleep-blue-100 text-sleep-blue-800 font-sans px-2.5 py-1 rounded-full font-medium">
              วันปัจจุบัน
            </span>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="diary-date" className="text-xs text-sleep-blue-700 font-medium font-mono">
                ระบุวันที่ประเมิน
              </label>
              <input
                id="diary-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-sleep-cream border border-sleep-blue-100 rounded-xl p-3 text-sm focus:outline-none focus:border-sleep-gold-500 font-mono"
                required
                aria-label="วันที่บันทึก"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="bed-time" className="text-xs text-sleep-blue-700 font-semibold text-center block">
                  เวลาเข้านอน
                </label>
                <input
                  id="bed-time"
                  type="time"
                  value={bedTime}
                  onChange={(e) => setBedTime(e.target.value)}
                  className="w-full bg-sleep-cream border border-sleep-blue-100 rounded-xl p-3 text-sm focus:outline-none font-mono text-center"
                  required
                  aria-label="เวลาเข้านอน"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="wake-time" className="text-xs text-sleep-blue-700 font-semibold text-center block">
                  เวลาตื่นนอน
                </label>
                <input
                  id="wake-time"
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="w-full bg-sleep-cream border border-sleep-blue-105 rounded-xl p-3 text-sm focus:outline-none font-mono text-center"
                  required
                  aria-label="เวลาตื่นนอน"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-sleep-blue-700">
                <span>จำนวนระยะเวลาการหลับจริงๆ (ชั่วโมง):</span>
                <span className="font-bold text-sleep-blue-900 font-mono">{sleepDuration} ชม.</span>
              </div>
              <input
                type="range"
                value={sleepDuration}
                onChange={(e) => setSleepDuration(Number(e.target.value))}
                step="0.1"
                min="3"
                max="12"
                className="w-full h-1.5 bg-sleep-blue-100 rounded-lg appearance-none cursor-pointer accent-sleep-gold-500"
                aria-label="ระยะเวลาหลับจริง (ชั่วโมง)"
                aria-valuetext={`${sleepDuration} ชั่วโมง`}
              />
              <span className="text-[10px] text-sleep-blue-500 block opacity-80 leading-normal">
                เวลาที่อยู่ในเตียงทั้งหมด: {timeInBed.toFixed(1)} ชม.
              </span>
              {sleepDuration > timeInBed + 0.1 && (
                <p className="text-red-500 text-[10px] flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  ⚠️ ระยะเวลาหลับเกินเวลาในเตียง กรุณาปรับเวลาหลับหรือเวลานอน
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-sleep-blue-700 font-medium block">
                ตื่นกลางดึกกลางคัน (ครั้ง/คืน)
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[0, 1, 2, 3, 4].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAwakenings(v)}
                    aria-label={`ตื่นกลางดึก ${v} ครั้ง`}
                    className={`p-2 rounded-xl text-center border text-sm transition-all ${
                      awakenings === v
                        ? 'bg-sleep-blue-900 text-white border-sleep-blue-950 font-bold'
                        : 'bg-sleep-cream text-sleep-blue-700 border-sleep-blue-100 hover:bg-sleep-blue-50'
                    }`}
                  >
                    {v === 4 ? '4+' : v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Middle Side: Daily Factors Card */}
        <div className="bg-white border border-sleep-blue-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-sleep-blue-50 pb-3">
            <h3 className="font-semibold text-sleep-blue-900 text-lg flex items-center gap-1.5">
              <Zap className="w-5 h-5 text-sleep-gold-500" />
              2. ปัจจัยพฤติกรรมประจำวัน
            </h3>
          </div>

          <div className="space-y-5">
            {/* Stress Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-sleep-blue-700">
                <span>สัมผัสระบายระดับความเครียดสะสม (0-10):</span>
                <span className={`font-bold ${stressScore >= 7 ? 'text-red-500' : 'text-sleep-blue-950'}`}>
                  {stressScore} / 10
                </span>
              </div>
              <input
                type="range"
                value={stressScore}
                onChange={(e) => setStressScore(Number(e.target.value))}
                min="0"
                max="10"
                className="w-full h-1.5 bg-sleep-blue-100 rounded-lg appearance-none cursor-pointer accent-sleep-blue-900"
                aria-label="ระดับความเครียด 0-10"
                aria-valuetext={`${stressScore} จาก 10`}
              />
            </div>

            {/* Caffeine Selector */}
            <div className="space-y-1">
              <label className="text-xs text-sleep-blue-700 font-medium flex items-center gap-1">
                <Coffee className="w-4 h-4 text-amber-700" />
                การดื่มคาเฟอีน (แก้ว/วัน)
              </label>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setCaffeine(v)}
                    aria-label={`กาแฟ ${v} แก้ว`}
                    className={`flex-1 py-2 rounded-xl text-center border text-xs transition-all ${
                      caffeine === v
                        ? 'bg-sleep-gold-400 border-sleep-gold-500 text-[#0B1026] font-bold'
                        : 'bg-sleep-cream text-sleep-blue-700 border-sleep-blue-100 hover:bg-sleep-blue-50'
                    }`}
                  >
                    {v === 4 ? '4+' : `${v}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Physical Training Minute */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-sleep-blue-700">
                <span>เวลาออกกำลังกาย (นาที/วัน):</span>
                <span className="font-bold text-sleep-blue-900 font-mono">{exercise} นาที</span>
              </div>
              <input
                type="range"
                value={exercise}
                onChange={(e) => setExercise(Number(e.target.value))}
                step="5"
                min="0"
                max="120"
                className="w-full h-1.5 bg-sleep-blue-100 rounded-lg appearance-none cursor-pointer accent-sleep-gold-500"
                aria-label="เวลาออกกำลังกาย (นาที)"
                aria-valuetext={`${exercise} นาที`}
              />
            </div>

            {/* Screen Time Hours */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-sleep-blue-700">
                <span>สกรีนไทม์ใกล้จอ / เล่นมือถือก่อนนอน (ชั่วโมง):</span>
                <span className="font-bold text-sleep-blue-900 font-mono">{screenTime} ชม.</span>
              </div>
              <input
                type="range"
                value={screenTime}
                onChange={(e) => setScreenTime(Number(e.target.value))}
                step="0.5"
                min="0"
                max="8"
                className="w-full h-1.5 bg-sleep-blue-100 rounded-lg appearance-none cursor-pointer accent-sleep-blue-900"
                aria-label="เวลาหน้าจอก่อนนอน (ชั่วโมง)"
                aria-valuetext={`${screenTime} ชั่วโมง`}
              />
            </div>

            {/* Nap Duration */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-sleep-blue-700">
                <span>งีบระหว่างวัน (นาที):</span>
                <span className="font-bold text-sleep-blue-900 font-mono">{napDuration} นาที</span>
              </div>
              <input
                type="range"
                value={napDuration}
                onChange={(e) => setNapDuration(Number(e.target.value))}
                step="5"
                min="0"
                max="120"
                className="w-full h-1.5 bg-sleep-blue-100 rounded-lg appearance-none cursor-pointer accent-sleep-gold-500"
                aria-label="ระยะเวลางีบ (นาที)"
                aria-valuetext={`${napDuration} นาที`}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Calculated Scores & Auto BMI Tracker */}
        <div className="bg-white border border-sleep-blue-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-6">
          <div className="space-y-6">
            <div className="border-b border-sleep-blue-50 pb-3">
              <h3 className="font-semibold text-sleep-blue-900 text-lg flex items-center gap-1.5">
                <Scale className="w-5 h-5 text-sleep-gold-500" />
                3. คะแนนพฤติกรรม & ดัชนี BMI
              </h3>
            </div>

            {/* Live Computed Metrics */}
            <div className="bg-sleep-blue-900 text-white rounded-2xl p-5 text-center relative overflow-hidden flex flex-col items-center justify-center py-6 shadow">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sleep-gold-400/10 rounded-full blur-xl -mr-6 -mt-6"></div>
              <span className="text-xs text-sleep-gold-400 uppercase tracking-wider font-sans font-semibold block">
                คะแนนพฤติกรรมการนอนวันนี้
              </span>
              <strong className="text-5xl font-extrabold text-sleep-gold-400 font-mono my-2 block">
                {wellnessScore}
              </strong>
              <span className="text-[11px] text-sleep-blue-100 font-light block line-clamp-2 max-w-[200px]">
                {wellnessScore >= 85 ? 'ยอดเยี่ยม! สุขอนามัยการนอนหลับมีแบบแผนเกรดพรีเมียม' :
                 wellnessScore >= 70 ? 'ปานกลาง มีแนวโน้มชั่วโมงหรือพฤติกรรมบางประการผิดเพี้ยน' :
                 'ค่อนข้างไม่เหมาะสม มีพฤติกรรมเสี่ยงความตึงเครียดสะสมหนัก'}
              </span>
            </div>

            {/* Auto BMI segment and input overrides */}
            <div className="bg-sleep-cream border border-sleep-blue-100 rounded-2xl p-4 space-y-3">
              <h4 className="font-semibold text-sm text-sleep-blue-900 flex items-center gap-1">
                <Percent className="w-4 h-4 text-sleep-gold-400" />
                ดัชนีมวลกาย BMI ปัจจุบัน
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label htmlFor="weight-input" className="text-[10px] text-sleep-blue-500 font-medium">
                    น้ำหนัก (กก.)
                  </label>
                  <input
                    id="weight-input"
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full bg-white border border-sleep-blue-100 p-1.5 text-xs rounded-lg text-center"
                    min="30"
                    max="180"
                    aria-label="น้ำหนัก (กิโลกรัม)"
                  />
                </div>
                <div className="space-y-0.5">
                  <label htmlFor="height-input" className="text-[10px] text-sleep-blue-500 font-medium">
                    ส่วนสูง (ซม.)
                  </label>
                  <input
                    id="height-input"
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full bg-white border border-sleep-blue-100 p-1.5 text-xs rounded-lg text-center"
                    min="100"
                    max="220"
                    aria-label="ส่วนสูง (เซนติเมตร)"
                  />
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-sleep-blue-50 flex items-center justify-between text-xs mt-1">
                <span className="font-light">ค่า BMI ปัจจุบัน:</span>
                <span className="font-bold text-sleep-blue-900 font-mono text-sm">{currentBmi}</span>
              </div>
              <p className={`text-[11px] font-medium ${getBmiStatus(currentBmi).color} leading-none text-right`}>
                สถานะ: {getBmiStatus(currentBmi).text}
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs text-sleep-blue-500 font-light px-1">
              <span>ประสิทธิภาพหลับเฉลี่ย:</span>
              <span className="font-bold text-sleep-blue-900 font-mono">{efficiency}%</span>
            </div>
            
            <button
              type="submit"
              className="w-full bg-sleep-gold-500 hover:bg-sleep-gold-400 text-[#0B1026] font-bold py-3 px-4 rounded-xl text-sm shadow-md transition duration-200"
              id="btn-save-daily"
              aria-label="บันทึกผลการติดตามวันนี้"
            >
              บันทึกผลการติดตามวันนี้
            </button>
            {saveMessage && (
              <p role="status" className="text-[11px] text-green-700 text-center font-bold animate-pulse">
                {saveMessage}
              </p>
            )}
            {duplicateWarning && !saveMessage && (
              <p role="alert" className="text-[11px] text-amber-600 text-center">
                ⚠️ มีข้อมูลของวันนี้อยู่แล้ว การบันทึกจะเขียนทับ
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}