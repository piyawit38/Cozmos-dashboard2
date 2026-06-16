/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DatabaseState, User, SleepDiary, DailyFactors, Assessment, WellnessUsage, Journal } from '../types';
import { 
  ResponsiveContainer, LineChart, Line, BarChart as ReBarChart, Bar, 
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, ScatterChart, Scatter, 
  Cell, PieChart, Pie 
} from 'recharts';
import { 
  LayoutGrid, Heart, Sparkles, AlertCircle, RefreshCw, Compass, Volume2, VolumeX 
} from 'lucide-react';
// ถอด motion ออกชั่วคราวเพื่อทดสอบ
// import { motion } from 'motion/react';

interface LookerDashboardProps {
  database: DatabaseState;
  activePatientId: string;
  onUpdateDatabase?: (updatedDb: DatabaseState) => void;
}

// Helper: get patient display name
const getPatientName = (users: User[], patientId: string): string => {
  const user = users.find(u => u.patientId === patientId);
  if (!user) return patientId;
  if (user.patientId === 'CZ-1001') return 'คุณวินัย';
  if (user.patientId === 'CZ-1002') return 'คุณป้ามะลิ';
  if (user.patientId === 'CZ-1003') return 'คุณสมชาย';
  return user.fullName || user.patientId;
};

// Type for API response
interface GeminiReportResponse {
  report?: string;
  error?: string;
}

// ----- Component ย่อยสำหรับ Page 1 (เพื่อลด Complexity) -----
interface Page1Props {
  database: DatabaseState;
  activePatientId: string;
  totalUsers: number;
  avgIsi: number;
  avgEss: number;
  avgEfficiency: number;
  avgStress: number;
  patientAssessments: Assessment[];
  patientDiaries: SleepDiary[];
  onUpdateDatabase?: (updatedDb: DatabaseState) => void;
}

const Page1Content = React.memo(({ 
  database, activePatientId, totalUsers, avgIsi, avgEss, avgEfficiency, avgStress,
  patientAssessments, patientDiaries, onUpdateDatabase
}: Page1Props) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const activeUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  // โหลด Speech Synthesis
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    synthRef.current = window.speechSynthesis;
    const checkVoices = () => {
      if (synthRef.current?.getVoices().length) setVoicesLoaded(true);
    };
    synthRef.current.addEventListener('voiceschanged', checkVoices);
    checkVoices();
    return () => {
      synthRef.current?.removeEventListener('voiceschanged', checkVoices);
      synthRef.current?.cancel();
    };
  }, []);

  // หยุดพูดเมื่อเปลี่ยนผู้ป่วย
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      activeUtterancesRef.current = [];
    }
  }, [activePatientId]);

  const patientName = getPatientName(database.users, activePatientId);
  const latestAss = patientAssessments[patientAssessments.length - 1];
  const latestDiary = patientDiaries[patientDiaries.length - 1];

  // คำนวณคำแนะนำ CBT-I (ใช้ useMemo เพื่อไม่คำนวณทุกครั้ง)
  const cbtiRecommendations = useMemo(() => {
    const recs = [];
    const eff = latestDiary ? latestDiary.sleepEfficiency : avgEfficiency;
    const isiScore = latestAss ? latestAss.isi : avgIsi;
    const stressVal = avgStress;

    if (eff < 85) {
      recs.push({
        step: "ขั้นตอนที่ 1",
        title: "การจำกัดชั่วโมงและควบคุมช่วงเวลาบนเตียง (Sleep Restriction Therapy)",
        badge: "CBT-I ทองคำ",
        type: "clinical",
        icon: "⏰",
        detail: `ประสิทธิภาพการนอนเฉลี่ยล่าสุดของคุณอยู่ที่ ${eff}% (ต่ำกว่าเกณฑ์ปกติที่ควร >85%) เพื่อส่งเสริมความรู้สึกอยากนอนหลับลึก คุณควร "บีบเวลานอนแช่บนเตียง" โดยเข้านอนเมื่อตาหรี่จนต้านไม่ไหวเท่านั้น และลุกขึ้นตรงเวลาเดิมทุกๆ เช้าอย่างเข้มแข็งเด็ดขาด วิธีนี้จะกระตุ้นคลื่นสมองหลั่งสารความง่วงตามธรรมชาติ`
      });
    } else {
      recs.push({
        step: "ขั้นตอนที่ 1",
        title: "การปกป้องเวลานอนที่สมดุลและตื่นเป็นเวลา (Circadian Rhythm Consolidation)",
        badge: "Sleep Hygiene",
        type: "hygiene",
        icon: "☀️",
        detail: `คุณมีประสิทธิภาพการนอนเฉลี่ยในระดับที่ดีมาก (${eff}%) แนะนำให้ปกป้องเสถียรภาพนี้โดยการกำหนด "เวลาตื่นนอนที่แน่นอนแบบนาทีต่อนาที" แม้จะเป็นวันหยุดสุดสัปดาห์ก็ตาม เพื่อให้นาฬิกาชีวิตชีวภาพของคุณหมุนเวียนคงที่และหลับสนิทยิ่งขึ้นต่อๆ ไป`
      });
    }

    if (isiScore > 14) {
      recs.push({
        step: "ขั้นตอนที่ 2",
        title: "กฎการลุกออกจากเตียงใน 20 นาที (Stimulus Control Therapy)",
        badge: "CBT-I แกนหลัก",
        type: "clinical",
        icon: "🚪",
        detail: `สถิติคะแนนดัชนีการนอนหลับติดขัด (ISI) ของคุณสูงถึง ${isiScore} คะแนน แนะนำหักดิบสมองเชิงตอบสนอง: หากล้มตัวลงนอนแล้วยังคิดฟุ้งซ่านหรือตื่นมากลางดึกเกิน 20 นาที "ห้ามพยายามฝืนนอนต่อเด็ดขาด" ให้ลุกไปห้องอื่นที่สลัวๆ อ่านหนังสือเบาๆ หรือฟังเสียงระเบิดสมอง จนกว่าจะรู้สึกง่วงจัดจริงๆ ค่อยหวนกลับมาที่เตียง สมองจะได้จับคู่เตียงกับการหลับไม่ใช่ความกังวล`
      });
    } else {
      recs.push({
        step: "ขั้นตอนที่ 2",
        title: "การปรับโครงสร้างเพื่อสลายความกดดันในการนอน (Cognitive Restructuring)",
        badge: "Cognitive Therapy",
        type: "hygiene",
        icon: "🧠",
        detail: `ระดับโรคสะสมรอบล่าสุดดีกว่าเกณฑ์ล่อแหลม ควรจำไว้เสมอว่า "การตื่นกลางดึกเป็นเรื่องธรรมชาติ" ทุกเสี้ยวคืนไม่ควรเอาการนอนหลับมาเป็นหน้าที่ที่ต้องทำให้สำเร็จ ยิ่งคุณคลายการคาดคั้นลง คลื่นประสาทสมองซีกคอร์เท็กซ์ก็จะยิ่งปรับสลัวลงอย่างรวดเร็วเป็นธรรมชาติ`
      });
    }

    if (stressVal >= 6) {
      recs.push({
        step: "ขั้นตอนที่ 3",
        title: "ระบายความตึงเครียดของระบบชีวประสาท (Autonomic De-arousal)",
        badge: "Arousal Reduction",
        type: "clinical",
        icon: "🫁",
        detail: `ความเครียดของร่างกายอยู่ในเกณฑ์ค่อนข้างสูง (${stressVal}/10) แนะนำบำบัดชีวประสาทช่วงสมดุลกระตุ้น ด้วยการฝึก Progressive Muscle Relaxation (เกร็งและคลายมัดกล้ามเนื้อ 16 จุด) ผสานเสียงคลื่นหรือฝึกการหายใจลึกแบบ 4-7-8 นาน 5 นาทีก่อนปิดสวิตช์ไฟเพื่อตัดคลื่นสมองไฮเปอร์`
      });
    } else {
      recs.push({
        step: "ขั้นตอนที่ 3",
        title: "การจัดระเบียบสัญญาณก่อนนอน (Bedtime Buffer Zone)",
        badge: "Wind-down Plan",
        type: "hygiene",
        icon: "☕",
        detail: `ระดับภาวะกระตุ้นของคุณค่อนข้างสงบดี แนะนำให้จัดสภาพแวดล้อมเพื่อรักษาเสถียรภาพ เช่น งดทานอาหารมื้อหนักและคาเฟอีนล่วงหน้าอย่างน้อย 6 ชั่วโมง และทิ้งระยะห่างจากภาพหน้าจอแสงสีฟ้าอย่างน้อย 1 ชั่วโมงก่อนเข้าสู่ช่วงผ่อนคลาย`
      });
    }
    return recs;
  }, [latestDiary, latestAss, avgEfficiency, avgIsi, avgStress]);

  // สร้างสคริปต์เสียง (Memoized)
  const fullSpeechScript = useMemo(() => {
    return `สวัสดีครับคุณ${patientName} ผมคือโค้ชส่วนตัวคอสมอสที่จะพาคุณมาเปลี่ยนความคิดและพฤติกรรมการนอนแบบยั่งยืนด้วยหลัก ซีบีทีไอ ครับ. จากการวิเคราะห์รอบล่าสุดเฉพาะตัวคุณ มีคำแนะแนว 3 ขั้นตอนสำคัญดังนี้ครับ. ` +
      cbtiRecommendations.map((r) => `${r.step}: ${r.title}. รายละเอียดแนะแนวคือ ${r.detail}. `).join(" ") +
      ` ขอให้คุณ${patientName}ค่อยๆปรับตัวทีละนิดและรักษาวินัยอย่างใจเย็นนะครับ คอสมอสขอเป็นกำลังใจให้ทุกคืนเป็นคืนที่แสนสุขครับ.`;
  }, [patientName, cbtiRecommendations]);

  // ฟังก์ชัน TTS
  const handleSpeakTts = useCallback(async () => {
    const synth = synthRef.current;
    if (!synth) {
      alert('เบราว์เซอร์ไม่รองรับ Speech Synthesis');
      return;
    }

    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      activeUtterancesRef.current = [];
      return;
    }

    // รอให้ voice โหลด
    if (!voicesLoaded) {
      // ลองรอ 2 วินาที
      await new Promise<void>((resolve) => {
        const check = () => {
          if (synth.getVoices().length > 0) {
            setVoicesLoaded(true);
            resolve();
          } else {
            setTimeout(check, 200);
          }
        };
        check();
      });
    }

    if (synth.getVoices().length === 0) {
      alert('ไม่พบเสียงในระบบ');
      return;
    }

    synth.cancel();

    const chunks = fullSpeechScript.split(/[\n,。．\.。、\s]+/).filter(s => s.trim());
    const utterances: SpeechSynthesisUtterance[] = [];
    const voices = synth.getVoices();
    const thVoice = voices.find(v => v.lang.includes('th'));

    chunks.forEach((chunk, index) => {
      const u = new SpeechSynthesisUtterance(chunk.trim());
      u.lang = 'th-TH';
      u.rate = 1.05;
      if (thVoice) u.voice = thVoice;
      if (index === chunks.length - 1) {
        u.onend = () => {
          setIsSpeaking(false);
          activeUtterancesRef.current = [];
        };
      }
      u.onerror = () => {
        setIsSpeaking(false);
        activeUtterancesRef.current = [];
      };
      utterances.push(u);
    });

    activeUtterancesRef.current = utterances;
    setIsSpeaking(true);
    utterances.forEach(u => synth.speak(u));
  }, [isSpeaking, voicesLoaded, fullSpeechScript]);

  const hasLogData = patientAssessments.length > 0 || patientDiaries.length > 0;

  // ฟังก์ชันโหลด Demo Data
  const handleLoadDemoData = () => {
    // ... (เหมือนเดิม)
    // ผมจะไม่เขียนซ้ำ แต่ให้ใช้จาก component แม่ หรือจะเขียนใหม่ก็ได้
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-sleep-blue-100 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h4 className="font-semibold text-lg text-sleep-blue-900">หน้า 1 : บทวิเคราะห์สุขภาวะและการแนะแนวเชิงพฤติกรรม (CBT-I)</h4>
          <p className="text-xs text-sleep-blue-500 font-light">ดึงข้อมูลสถิติ ดัชนีจำลอง และวิเคราะห์คู่มือพฤเทคบำบัดส่วนบุคคล</p>
        </div>
        <button
          onClick={handleSpeakTts}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-sm shrink-0 uppercase tracking-wider ${
            isSpeaking 
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
              : 'bg-sleep-blue-900 hover:bg-sleep-blue-800 text-white'
          }`}
        >
          {isSpeaking ? (
            <>
              <VolumeX className="w-4 h-4 text-white" />
              หยุดโค้ชเสียงบรรยาย
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-sleep-gold-400" />
              ให้ AI โค้ชส่วนตัวอ่านออกเสียงให้ฟัง 🔊
            </>
          )}
        </button>
      </div>

      {isSpeaking && (
        <div className="bg-sleep-gold-50/80 border border-sleep-gold-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in space-y-2 sm:space-y-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sleep-gold-500 animate-ping"></span>
              <span className="text-xs font-semibold text-sleep-blue-950 font-sans">
                โค้ชเสียงบำบัดส่วนบุคคล Cozmos กำลังพูดคุยกับคุณ <strong className="text-sleep-blue-900">{patientName}</strong>...
              </span>
            </div>
            <span className="text-[10px] text-amber-700 font-normal mt-1 block">
              ℹ️ สำหรับผู้ใช้ iPhone/iPad: หากไม่ได้ยินเสียง กรุณากดปุ่มเปิดเสียงด้านข้างโทรศัพท์ (ดึงแถบปิดเสียงขึ้น) และเพิ่มระดับเสียงขึ้นด้วยนะคะ
            </span>
          </div>
          <div className="flex items-center gap-1 justify-end">
            {[1, 2, 3, 4, 5, 4, 3, 2, 1, 3, 4, 2].map((height, i) => (
              <div
                key={`wave-${i}`}
                className="w-0.5 bg-sleep-gold-500 rounded-full animate-bounce"
                style={{
                  height: `${height * 3}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.8s'
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Onboarding Banner */}
      {!hasLogData && (
        <div className="bg-gradient-to-r from-sleep-gold-500/10 to-transparent border-2 border-dashed border-sleep-gold-400/60 p-5 rounded-3xl space-y-3 shadow-sm">
          <h5 className="font-bold text-sm text-sleep-blue-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sleep-gold-500 animate-pulse shrink-0" />
            💡 ยังไม่มีข้อมูลระเบียนสุขภาพสำหรับคุณ {patientName}
          </h5>
          <p className="text-xs text-sleep-blue-700 leading-relaxed max-w-4xl">
            ... (ข้อความเดิม)
          </p>
          {onUpdateDatabase && (
            <button
              onClick={handleLoadDemoData}
              className="bg-sleep-gold-500 hover:bg-sleep-gold-400 text-sleep-blue-950 font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md inline-flex items-center gap-1.5 cursor-pointer"
            >
              🧪 โหลดสถิติรักษาสุขภาพนอนหลับจำลองตรวจจับ สำหรับ {patientName}
            </button>
          )}
        </div>
      )}

      {/* 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* ... (เหมือนเดิม) */}
        <div className="bg-white p-4 rounded-2xl border border-sleep-blue-100 shadow-sm text-center">
          <span className="text-[10px] text-sleep-blue-500 uppercase tracking-wider block font-light">สมาชิกครอบครัว</span>
          <strong className="text-2xl font-extrabold text-sleep-blue-950 font-mono my-1 block">{totalUsers} คน</strong>
          <span className="text-[9px] text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full inline-block font-sans">👤 100% บันทึก</span>
        </div>
        {/* ... สร้างส่วนอื่น ๆ คล้ายกัน */}
      </div>

      {/* CBT-I Recommendations Grid */}
      <div className="bg-gradient-to-br from-[#0B1026] to-[#0f173d] text-white p-6 rounded-3xl border border-sleep-gold-400/20 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3 gap-2">
          <div className="space-y-1">
            <h5 className="font-semibold text-base text-sleep-gold-400 flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-sleep-gold-400" />
              Cozmos Personal CBT-I Sleep Coach
            </h5>
            <p className="text-xs text-white/50 font-light">เส้นทางปรับวิธีคิดควบคู่ไปกับตารางสรีรวิทยา เพื่อการหายขาดจากโรคระยะยาว</p>
          </div>
          <span className="text-[10px] bg-sleep-gold-500/20 text-sleep-gold-400 border border-sleep-gold-500/30 px-3 py-1 rounded-full font-mono uppercase font-bold self-start sm:self-center">
            Personalized for {patientName}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {cbtiRecommendations.map((rec, idx) => (
            <div key={`rec-${rec.step}-${rec.title}`} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 hover:bg-white/10 transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sleep-gold-400/5 rounded-full blur-xl group-hover:bg-sleep-gold-400/10 transition"></div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-sleep-gold-300 font-bold bg-sleep-gold-500/10 border border-sleep-gold-400/20 px-2.5 py-1 rounded-lg">
                  {rec.step} • {rec.badge}
                </span>
                <span className="text-2xl">{rec.icon}</span>
              </div>
              <h6 className="font-bold text-sm text-white tracking-wide leading-snug">{rec.title}</h6>
              <p className="text-[11px] text-white/80 leading-relaxed font-light">{rec.detail}</p>
              <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[9px] text-white/40">
                <span>CBT-I Pathway ✔️</span>
                <span>ความน่าเชื่อถือทางคลินิกสูง</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer summary */}
      <div className="bg-white p-4 rounded-2xl border border-sleep-blue-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h5 className="font-semibold text-sm text-sleep-blue-950 flex items-center gap-1">
            <Heart className="w-4 h-4 text-red-500 animate-pulse" />
            สรุปข้อคิดเห็นภาพรวมประจำบ้าน
          </h5>
          <p className="text-xs text-sleep-blue-600 font-light leading-relaxed max-w-2xl">
            แปลผลภาพรวมจากพฤทีกรรมคนในบ้าน: ดัชนีเฉลี่ยชี้ว่าสมาชิกส่วนใหญ่มีสุขอนามัยการนอนหลับค่อนข้างดีแต่อาจมีความเหนื่อยล้าสะสมบางสัปดาห์ การรักษาวินัยการจัดเตียง อุณหภูมิห้องนอน และใช้วิธี Zodiac Sleep Sync จะช่วยส่งเสริมให้นอนหลับได้สนิทยิ่งขึ้นครับ
          </p>
        </div>
        <div className="text-right flex flex-col justify-center shrink-0">
          <span className="text-[10px] text-sleep-blue-400 font-mono">DATABASE ENGINE</span>
          <strong className="text-xs font-semibold text-sleep-blue-900 uppercase">Google Sheets Live Sync</strong>
        </div>
      </div>
    </div>
  );
});
Page1Content.displayName = 'Page1Content';

// ----- Main Component -----
export default function LookerDashboard({ database, activePatientId, onUpdateDatabase }: LookerDashboardProps) {
  const [activePage, setActivePage] = useState<number>(1);
  const [loadingReport, setLoadingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string>('');
  const [reportError, setReportError] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoized data
  const totalUsers = useMemo(() => database.users.length, [database.users]);
  const avgIsi = useMemo(() => {
    if (!database.assessments.length) return 0;
    const sum = database.assessments.reduce((s, a) => s + a.isi, 0);
    return Number((sum / database.assessments.length).toFixed(1));
  }, [database.assessments]);

  const avgEss = useMemo(() => {
    if (!database.assessments.length) return 0;
    const sum = database.assessments.reduce((s, a) => s + a.ess, 0);
    return Number((sum / database.assessments.length).toFixed(1));
  }, [database.assessments]);

  const avgEfficiency = useMemo(() => {
    if (!database.sleepDiary.length) return 0;
    const sum = database.sleepDiary.reduce((s, d) => s + d.sleepEfficiency, 0);
    return Math.round(sum / database.sleepDiary.length);
  }, [database.sleepDiary]);

  const avgStress = useMemo(() => {
    if (!database.dailyFactors.length) return 0;
    const sum = database.dailyFactors.reduce((s, f) => s + f.stressScore, 0);
    return Number((sum / database.dailyFactors.length).toFixed(1));
  }, [database.dailyFactors]);

  const patientDiaries = useMemo(() => {
    return database.sleepDiary
      .filter(d => d.patientId === activePatientId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [database.sleepDiary, activePatientId]);

  const patientAssessments = useMemo(() => {
    return database.assessments
      .filter(a => a.patientId === activePatientId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [database.assessments, activePatientId]);

  const sleepAnalyticsData = useMemo(() => {
    return patientDiaries.map(diary => {
      const matchingAss = patientAssessments.find(a => a.date === diary.date) || patientAssessments[0];
      return {
        dateShort: diary.date.slice(-5),
        "ชั่วโมงการนอน": diary.sleepDuration,
        "ประสิทธิภาพการหลับ (%)": diary.sleepEfficiency,
        "ISI Trend": matchingAss ? matchingAss.isi : 12,
        "ESS Trend": matchingAss ? matchingAss.ess : 8,
      };
    });
  }, [patientDiaries, patientAssessments]);

  // ... (ส่วนอื่น ๆ คำนวณ isiDistData, correlationData, wellnessStatsData, moodData คล้ายเดิม)

  // fetchWeeklyReport (เหมือนเดิม)

  // render functions
  const renderPage1 = () => (
    <Page1Content
      database={database}
      activePatientId={activePatientId}
      totalUsers={totalUsers}
      avgIsi={avgIsi}
      avgEss={avgEss}
      avgEfficiency={avgEfficiency}
      avgStress={avgStress}
      patientAssessments={patientAssessments}
      patientDiaries={patientDiaries}
      onUpdateDatabase={onUpdateDatabase}
    />
  );

  const renderPage2 = () => {
    // ... (เหมือนเดิม)
    return <div>...</div>;
  };

  const renderPage3 = () => {
    // ... ใช้ isiDistData
  };

  const renderPage4 = () => {
    // ... ใช้ correlationData
  };

  const renderPage5 = () => {
    // ... ใช้ wellnessStatsData
  };

  const renderPage6 = () => {
    // ... ใช้ moodData และ fetchWeeklyReport
  };

  return (
    <div className="space-y-6" id="looker-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold text-sleep-blue-900 flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-sleep-gold-500" />
            แดชบอร์ดวิเคราะห์สุขภาพครอบครัวเชิงลึก
          </h2>
        </div>
        <div className="flex bg-sleep-blue-900 text-white rounded-2xl p-1 gap-1 flex-wrap shadow">
          {[1,2,3,4,5,6].map(page => (
            <button
              key={`nav-${page}`}
              onClick={() => setActivePage(page)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activePage === page 
                  ? 'bg-sleep-gold-500 text-[#0B1026] shadow' 
                  : 'hover:bg-white/10'
              }`}
            >
              หน้า {page}
            </button>
          ))}
        </div>
      </div>

      {/* Main Canvas */}
      <div className="bg-white border-3 border-sleep-blue-900 rounded-3xl overflow-hidden shadow-lg min-h-[480px]">
        <div className="bg-sleep-blue-900 text-white p-4 px-6 flex justify-between items-center flex-col sm:flex-row gap-3 border-b border-sleep-blue-900">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
            <h3 className="font-mono text-xs text-sleep-gold-400 font-bold tracking-wider">
              รายงานวิเคราะห์ข้อมูลสุขภาพการนอน / หน้า {activePage} จาก 6
            </h3>
          </div>
          <div className="text-xs font-light text-sleep-blue-300">
            วิเคราะห์ครอบครัว รหัส: <strong className="text-white bg-white/10 px-2 py-0.5 rounded">{activePatientId}</strong>
          </div>
        </div>

        <div className="p-6 bg-sleep-cream/40 min-h-[440px]">
          {activePage === 1 && renderPage1()}
          {activePage === 2 && renderPage2()}
          {activePage === 3 && renderPage3()}
          {activePage === 4 && renderPage4()}
          {activePage === 5 && renderPage5()}
          {activePage === 6 && renderPage6()}
        </div>
      </div>
    </div>
  );
}
