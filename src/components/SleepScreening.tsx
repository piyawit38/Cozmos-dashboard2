/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Assessment } from '../types';
import { ClipboardCheck, Sparkles, Check, ChevronRight, Activity, Moon, Sun, AlertTriangle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SleepScreeningProps {
  patientId: string;
  onSaveAssessment: (assessment: Assessment) => void;
  existingAssessment?: Assessment;
  existingDate?: string;
  onBack?: () => void;
}

// ISI Questions แบบประเมินง่าย
const ISI_QUESTIONS = [
  { text: "การหลับยาก (Sleep Onset Latency)", options: ["< 15 นาที (0)", "16-30 นาที (1)", "31-45 นาที (2)", "46-60 นาที (3)", "> 60 นาที (4)"], values: [0,1,2,3,4] },
  { text: "การตื่นกลางดึก (WASO)", options: ["ไม่ตื่น / หลับต่อทันที (0)", "< 15 นาที (1)", "15-30 นาที (2)", "30-45 นาที (3)", "> 45 นาที (4)"], values: [0,1,2,3,4] },
  { text: "การตื่นเช้ามืด", options: ["ไม่เลย (0)", "เล็กน้อย (1)", "ปานกลาง (2)", "รุนแรง (3)", "รุนแรงมาก (4)"], values: [0,1,2,3,4] },
  { text: "ความพึงพอใจต่อการนอน", options: ["พอใจมาก (0)", "พอใจ (1)", "ปานกลาง (2)", "ไม่ค่อยพอใจ (3)", "ไม่พอใจเลย (4)"], values: [0,1,2,3,4] },
  { text: "การรบกวนการใช้ชีวิต", options: ["ไม่รบกวน (0)", "เล็กน้อย (1)", "ปานกลาง (2)", "มาก (3)", "รบกวนมากที่สุด (4)"], values: [0,1,2,3,4] },
  { text: "ความกังวลเรื่องการนอน", options: ["ไม่กังวล (0)", "เล็กน้อย (1)", "ปานกลาง (2)", "มาก (3)", "กังวลมากที่สุด (4)"], values: [0,1,2,3,4] },
  { text: "คนรอบข้างสังเกตเห็นปัญหาการนอน", options: ["ไม่เห็น (0)", "เห็นเล็กน้อย (1)", "เห็นปานกลาง (2)", "เห็นมาก (3)", "เห็นชัดเจนมากที่สุด (4)"], values: [0,1,2,3,4] }
];

const ESS_QUESTIONS = [
  "นั่งอ่านหนังสือเงียบๆ ในห้องส่วนตัว",
  "นั่งดูโทรทัศน์ หรือภาพยนตร์ยาวๆ",
  "นั่งเฉยๆ ในสถานที่สาธารณะ เช่น ในโรงละคร หรือในห้องประชุม",
  "นั่งโดยสารในรถยนต์ นั่งเฉยๆ เป็นเวลา 1 ชั่วโมงโดยไม่ลุกไปไหน",
  "นอนราบเพื่อพักผ่อนในเวลากลางวัน หรือบ่ายเมื่อเอื้ออำนวย",
  "นั่งพูดคุยสนทนากับเพื่อนหรือครอบครัว",
  "นั่งอยู่อย่างเงียบสงบหลังจากรับประทานอาหารกลางวัน (โดยไม่ดื่มแอลกอฮอล์)",
  "นั่งอยู่ในรถยนต์ขณะที่จราจรติดขัดหรือหยุดรอสัญญาณไฟสักครู่"
];

const STOPBANG_QUESTIONS = [
  "คุณนอนกรนเสียงดัง (ดังกว่าเสียงพูดคุยปกติ หรือดังทะลุประตูห้องปิดสนิทขณะคุณหลับ) หรือไม่? [Snoring]",
  "คุณรู้สึกเหนื่อยล้า อ่อนเพลีย หรือรู้สึกง่วงนอนในเวลากลางวันบ่อยๆ หรือไม่? (เช่น อ่อนแอ หมดแรงประจำ) [Tired]",
  "มีใครสังเกตเห็นว่าคุณมีช่วงเฉียบพลันหยุดหายใจ หรือสะดุ้งสำลักขาดอากาศขณะนอนหลับหรือไม่? [Observed apnea]",
  "คุณมีภาวะความดันโลหิตสูง หรือกำลังรับประทานยาควบคุมความดันโลหิตอยู่หรือไม่? [Pressure]",
  "คุณมีค่าดัชนีมวลกาย (BMI) เกินกว่า 35 กิโลกรัม/เมตร² หรือไม่? [BMI]",
  "คุณมีอายุ 50 ปีบริบูรณ์ขึ้นไปหรือไม่? [Age]",
  "คุณมีรอบลำคอใหญ่เด่นชัด (เพศชายรอบคอตั้งแต่ 43 ซม. [17 นิ้ว] หรือเพศหญิงตั้งแต่ 40 ซม. [16 นิ้ว]) หรือไม่? [Neck]",
  "ท่านเป็นเพศชายหรือไม่? [Gender]"
];

export default function SleepScreening({ 
  patientId, 
  onSaveAssessment, 
  existingAssessment,
  existingDate,
  onBack 
}: SleepScreeningProps) {
  // ISI state
  const [isiAnswers, setIsiAnswers] = useState<number[]>(() => {
    if (existingAssessment?.isiAnswers) return existingAssessment.isiAnswers;
    return [0, 0, 0, 0, 0, 0, 0];
  });
  
  // ESS state
  const [essAnswers, setEssAnswers] = useState<number[]>(() => {
    if (existingAssessment?.essAnswers) return existingAssessment.essAnswers;
    return [0, 0, 0, 0, 0, 0, 0, 0];
  });
  
  // STOP-BANG state
  const [stopBangAnswers, setStopBangAnswers] = useState<number[]>(() => {
    if (existingAssessment?.stopBangAnswers) return existingAssessment.stopBangAnswers;
    return [0, 0, 0, 0, 0, 0, 0, 0];
  });

  const [activeSubTab, setActiveSubTab] = useState<'isi' | 'ess' | 'stopbang'>('isi');
  const [isiIndex, setIsiIndex] = useState<number>(0);
  const [essIndex, setEssIndex] = useState<number>(0);
  const [stopBangIndex, setStopBangIndex] = useState<number>(0);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // คำนวณคะแนนรวม
  const totalIsi = useMemo(() => isiAnswers.reduce((s, v) => s + v, 0), [isiAnswers]);
  const totalEss = useMemo(() => essAnswers.reduce((s, v) => s + v, 0), [essAnswers]);
  const totalStopBang = useMemo(() => stopBangAnswers.reduce((s, v) => s + v, 0), [stopBangAnswers]);

  const computeOverallRisk = useCallback(() => {
    if (totalIsi >= 15 || totalStopBang >= 5 || totalEss >= 10) return 'สูง';
    if (totalIsi >= 8 || totalStopBang >= 3) return 'ปานกลาง';
    return 'ต่ำ';
  }, [totalIsi, totalEss, totalStopBang]);

  const overallRisk = useMemo(() => computeOverallRisk(), [computeOverallRisk]);

  const getIsiCategory = useCallback((score: number) => {
    if (score <= 7) return { text: "ปกติ (No significant insomnia)", color: "text-green-700 bg-green-50 border-green-200", bg: "bg-green-50" };
    if (score <= 14) return { text: "อาการนอนไม่หลับเล็กน้อยระดับเฝ้าระวัง (Subthreshold insomnia)", color: "text-amber-700 bg-amber-50 border-amber-200", bg: "bg-amber-50" };
    if (score <= 21) return { text: "ปัญหานอนไม่หลับระดับความรุนแรงปานกลาง (Clinical insomnia - moderate)", color: "text-orange-700 bg-orange-50 border-orange-200", bg: "bg-orange-50" };
    return { text: "มีอาการนอนไม่หลับอย่างรุนแรงวิกฤต (Clinical insomnia - severe) — ควรปรึกษาแพทย์เฉพาะทาง", color: "text-red-700 bg-red-50 border-red-200", bg: "bg-red-50" };
  }, []);

  const getEssCategory = useCallback((score: number) => {
    if (score <= 9) return { text: "อยู่ในเกณฑ์ปกติ (Normal daytime sleepiness)", color: "text-green-700 bg-green-50 border-green-200", bg: "bg-green-50" };
    if (score <= 14) return { text: "ความง่วงเหนื่อยกลางวันระดับสูงสะสม (Mild-to-moderate sleep debt)", color: "text-orange-700 bg-orange-50 border-orange-200", bg: "bg-orange-50" };
    return { text: "ความง่วงนอนกลางวันผิดปกติร้ายแรง (Critical excessive sleepiness) — มีความเสี่ยงหลับในสูง ควรประเมินต้นตออาการและปรึกษาแพทย์", color: "text-red-700 bg-red-50 border-red-200", bg: "bg-red-50" };
  }, []);

  const getStopBangCategory = useCallback((score: number) => {
    if (score <= 2) return { text: "ความเสี่ยงต่ำ (Low risk of obstructive sleep apnea)", color: "text-green-700 bg-green-50 border-green-200", bg: "bg-green-50" };
    if (score <= 4) return { text: "ความเสี่ยงปานกลาง (Intermediate risk of OSA)", color: "text-orange-700 bg-orange-50 border-orange-200", bg: "bg-orange-50" };
    return { text: "ความเสี่ยงสูงวิกฤต (High risk of OSA) — ควรตรวจ Sleep Test", color: "text-red-700 bg-red-50 border-red-200", bg: "bg-red-50" };
  }, []);

  // --- ฟังก์ชันจัดการคำตอบแบบ Auto advance ทันที ---
  const handleIsiChange = useCallback((index: number, val: number) => {
    setIsiAnswers(prev => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
    // เลื่อนไปข้อถัดไปหรือเปลี่ยนแท็บ
    setTimeout(() => {
      if (index < 6) {
        setIsiIndex(prev => prev + 1);
      } else if (index === 6) {
        setActiveSubTab('ess');
        setEssIndex(0);
      }
    }, 150);
  }, []);

  const handleEssChange = useCallback((index: number, val: number) => {
    setEssAnswers(prev => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
    setTimeout(() => {
      if (index < 7) {
        setEssIndex(prev => prev + 1);
      } else if (index === 7) {
        setActiveSubTab('stopbang');
        setStopBangIndex(0);
      }
    }, 150);
  }, []);

  const handleStopBangChange = useCallback((index: number, val: number) => {
    setStopBangAnswers(prev => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
    setTimeout(() => {
      if (index < 7) {
        setStopBangIndex(prev => prev + 1);
      }
      // เมื่อจบ STOP-BANG ไม่ต้องเปลี่ยนแท็บ (จบแบบประเมิน)
    }, 150);
  }, []);

  // Navigation: ปุ่มถัดไป/ย้อนกลับ
  const clickNext = useCallback(() => {
    if (activeSubTab === 'isi') {
      if (isiIndex < 6) setIsiIndex(prev => prev + 1);
      else { setActiveSubTab('ess'); setEssIndex(0); }
    } else if (activeSubTab === 'ess') {
      if (essIndex < 7) setEssIndex(prev => prev + 1);
      else { setActiveSubTab('stopbang'); setStopBangIndex(0); }
    } else if (activeSubTab === 'stopbang') {
      if (stopBangIndex < 7) setStopBangIndex(prev => prev + 1);
    }
  }, [activeSubTab, isiIndex, essIndex, stopBangIndex]);

  const clickBack = useCallback(() => {
    if (activeSubTab === 'isi') {
      if (isiIndex > 0) setIsiIndex(prev => prev - 1);
    } else if (activeSubTab === 'ess') {
      if (essIndex > 0) setEssIndex(prev => prev - 1);
      else { setActiveSubTab('isi'); setIsiIndex(6); }
    } else if (activeSubTab === 'stopbang') {
      if (stopBangIndex > 0) setStopBangIndex(prev => prev - 1);
      else { setActiveSubTab('ess'); setEssIndex(7); }
    }
  }, [activeSubTab, isiIndex, essIndex, stopBangIndex]);

  // AI Advice
  const fetchAiAdvice = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoadingAdvice(true);
    setAiAdvice('');
    try {
      const resp = await fetch('/api/gemini/analyze-screening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          isi: totalIsi,
          ess: totalEss,
          stopBang: totalStopBang,
          riskLevel: overallRisk
        }),
        signal: controller.signal
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Request failed');
      setAiAdvice(data.advice || 'ไม่ได้รับข้อเสนอแนะ');
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setAiAdvice('ไม่สามารถติดต่อ AI ในขณะนี้');
    } finally {
      setLoadingAdvice(false);
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    }
  }, [patientId, totalIsi, totalEss, totalStopBang, overallRisk]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handleSubmit = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    if (existingDate === today) {
      if (!window.confirm(`มีแบบประเมินของวันที่ ${today} อยู่แล้ว คุณต้องการเขียนทับหรือไม่?`)) return;
    }
    const payload: Assessment = {
      patientId,
      date: today,
      isi: totalIsi,
      ess: totalEss,
      stopBang: totalStopBang,
      riskLevel: overallRisk,
      isiAnswers,
      essAnswers,
      stopBangAnswers
    };
    onSaveAssessment(payload);
    setSaveStatus('✅ บันทึกผลการคัดกรองเรียบร้อยแล้ว!');
    setTimeout(() => setSaveStatus(''), 4500);
  }, [patientId, totalIsi, totalEss, totalStopBang, overallRisk, isiAnswers, essAnswers, stopBangAnswers, existingDate, onSaveAssessment]);

  const handleLoadExisting = useCallback(() => {
    if (existingAssessment) {
      setIsiIndex(0);
      setEssIndex(0);
      setStopBangIndex(0);
      setActiveSubTab('isi');
      alert(`โหลดข้อมูลจากวันที่ ${existingAssessment.date}`);
    }
  }, [existingAssessment]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-full hover:bg-sleep-blue-100">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-2xl md:text-3xl font-semibold text-sleep-blue-900 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-sleep-gold-500" />
            คัดกรองประเมินความเสี่ยงอาการนอนหลับ
          </h2>
        </div>
        {existingAssessment && (
          <button onClick={handleLoadExisting} className="text-xs bg-sleep-gold-100 hover:bg-sleep-gold-200 px-4 py-2 rounded-xl">
            ดึงข้อมูลล่าสุด ({existingAssessment.date})
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-2">
          {[
            { id: 'isi', label: 'ISI (นอนไม่หลับ)', icon: Moon },
            { id: 'ess', label: 'ESS (ง่วงนอนกลางวัน)', icon: Sun },
            { id: 'stopbang', label: 'STOP-BANG (หยุดหายใจ)', icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id as any);
                if (tab.id === 'isi') setIsiIndex(0);
                else if (tab.id === 'ess') setEssIndex(0);
                else setStopBangIndex(0);
              }}
              className={`w-full text-left p-4 rounded-2xl border transition ${
                activeSubTab === tab.id
                  ? 'bg-sleep-blue-900 text-white border-sleep-blue-950 shadow-md'
                  : 'bg-white text-sleep-blue-800 border-sleep-blue-100 hover:bg-sleep-blue-50'
              }`}
            >
              <span className="font-semibold text-sm flex items-center gap-2">
                <tab.icon className="w-4 h-4 text-sleep-gold-400" />
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 bg-white border border-sleep-blue-100 rounded-3xl p-6 shadow-sm min-h-[480px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {activeSubTab === 'isi' && (
              <motion.div key="isi" initial={{ opacity:0, x:15 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-15 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">ISI - แบบประเมินง่าย</h3>
                  <span className="bg-sleep-blue-900 text-white text-xs px-3 py-1 rounded-full">ข้อ {isiIndex+1}/7</span>
                </div>
                <div className="flex justify-center gap-2">
                  {ISI_QUESTIONS.map((_, idx) => (
                    <button key={idx} onClick={() => setIsiIndex(idx)} className={`h-2 rounded-full transition-all ${idx===isiIndex ? 'w-6 bg-sleep-gold-500' : 'w-2 bg-sleep-blue-200'}`} />
                  ))}
                </div>
                <div className="bg-sleep-cream/30 p-5 rounded-2xl space-y-4">
                  <h4 className="text-lg font-semibold">{isiIndex+1}. {ISI_QUESTIONS[isiIndex].text}</h4>
                  <select
                    value={isiAnswers[isiIndex]}
                    onChange={(e) => handleIsiChange(isiIndex, parseInt(e.target.value))}
                    className="w-full p-3 rounded-xl border border-sleep-blue-200 bg-white"
                  >
                    {ISI_QUESTIONS[isiIndex].options.map((opt, i) => (
                      <option key={i} value={i}>{opt}</option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
            {activeSubTab === 'ess' && (
              <motion.div key="ess" initial={{ opacity:0, x:15 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-15 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">ESS - ระดับง่วงนอนกลางวัน</h3>
                  <span className="bg-sleep-blue-900 text-white text-xs px-3 py-1 rounded-full">ข้อ {essIndex+1}/8</span>
                </div>
                <div className="flex justify-center gap-2">
                  {ESS_QUESTIONS.map((_, idx) => (
                    <button key={idx} onClick={() => setEssIndex(idx)} className={`h-2 rounded-full transition-all ${idx===essIndex ? 'w-6 bg-sleep-gold-500' : 'w-2 bg-sleep-blue-200'}`} />
                  ))}
                </div>
                <div className="bg-sleep-cream/30 p-5 rounded-2xl space-y-4">
                  <h4 className="text-lg font-semibold">{essIndex+1}. {ESS_QUESTIONS[essIndex]}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[0,1,2,3].map(v => (
                      <button key={v} onClick={() => handleEssChange(essIndex, v)} className={`p-3 rounded-xl border ${essAnswers[essIndex]===v ? 'bg-sleep-gold-500 border-sleep-gold-600 font-bold' : 'bg-white border-sleep-blue-100'}`}>
                        {v===0?'ไม่มีโอกาส':v===1?'เล็กน้อย':v===2?'ปานกลาง':'สูงมาก'} ({v})
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            {activeSubTab === 'stopbang' && (
              <motion.div key="stopbang" initial={{ opacity:0, x:15 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-15 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">STOP-BANG - ความเสี่ยงหยุดหายใจ</h3>
                  <span className="bg-sleep-blue-900 text-white text-xs px-3 py-1 rounded-full">ข้อ {stopBangIndex+1}/8</span>
                </div>
                <div className="flex justify-center gap-2">
                  {STOPBANG_QUESTIONS.map((_, idx) => (
                    <button key={idx} onClick={() => setStopBangIndex(idx)} className={`h-2 rounded-full transition-all ${idx===stopBangIndex ? 'w-6 bg-sleep-gold-500' : 'w-2 bg-sleep-blue-200'}`} />
                  ))}
                </div>
                <div className="bg-sleep-cream/30 p-5 rounded-2xl space-y-4">
                  <h4 className="text-lg font-semibold">{stopBangIndex+1}. {STOPBANG_QUESTIONS[stopBangIndex]}</h4>
                  <div className="flex gap-4 justify-center">
                    <button onClick={() => handleStopBangChange(stopBangIndex, 1)} className={`px-6 py-3 rounded-xl text-white font-bold ${stopBangAnswers[stopBangIndex]===1 ? 'bg-red-600' : 'bg-sleep-blue-900'}`}>ใช่</button>
                    <button onClick={() => handleStopBangChange(stopBangIndex, 0)} className={`px-6 py-3 rounded-xl text-white font-bold ${stopBangAnswers[stopBangIndex]===0 ? 'bg-green-600' : 'bg-sleep-blue-900'}`}>ไม่ใช่</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between items-center pt-6 mt-6 border-t">
            <button onClick={clickBack} disabled={activeSubTab==='isi' && isiIndex===0} className="px-4 py-2 rounded-xl border disabled:opacity-40">← ย้อนกลับ</button>
            <div>
              {activeSubTab !== 'stopbang' && (
                <button onClick={clickNext} className="px-4 py-2 rounded-xl bg-sleep-blue-900 text-white">ข้าม/ถัดไป →</button>
              )}
              {activeSubTab === 'stopbang' && stopBangIndex===7 && <span className="text-green-600">✅ ตอบครบถ้วน</span>}
            </div>
          </div>
        </div>
      </div>

      {/* สรุปผลและปุ่มบันทึก เหมือนเดิม */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-2xl border ${getIsiCategory(totalIsi).bg}`}>
          <h4 className="font-semibold">ISI รวม: {totalIsi} คะแนน</h4>
          <p className="text-sm">{getIsiCategory(totalIsi).text}</p>
        </div>
        <div className={`p-4 rounded-2xl border ${getEssCategory(totalEss).bg}`}>
          <h4 className="font-semibold">ESS รวม: {totalEss} คะแนน</h4>
          <p className="text-sm">{getEssCategory(totalEss).text}</p>
        </div>
        <div className={`p-4 rounded-2xl border ${getStopBangCategory(totalStopBang).bg}`}>
          <h4 className="font-semibold">STOP-BANG: {totalStopBang} ข้อ</h4>
          <p className="text-sm">{getStopBangCategory(totalStopBang).text}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow border">
        <div className="flex justify-between items-center">
          <div className="flex gap-2"><Sparkles className="text-sleep-gold-500"/> <span>Cozmos Sleep AI</span></div>
          <button onClick={fetchAiAdvice} disabled={loadingAdvice} className="bg-sleep-gold-500 px-4 py-2 rounded-xl text-sm">วิเคราะห์ด้วย AI</button>
        </div>
        {aiAdvice && <div className="mt-4 p-4 bg-sleep-blue-50 rounded-xl">{aiAdvice}</div>}
      </div>

      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500"><AlertTriangle className="inline w-4 h-4"/> การประเมินเบื้องต้น ไม่สามารถทดแทนการวินิจฉัยจากแพทย์</div>
        <div className="flex gap-3">
          {saveStatus && <span className="text-green-600 text-sm">{saveStatus}</span>}
          <button onClick={handleSubmit} className="bg-sleep-gold-500 px-6 py-2 rounded-xl font-bold">บันทึกผลประเมิน</button>
        </div>
      </div>
    </div>
  );
}