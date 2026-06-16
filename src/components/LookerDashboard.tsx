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
import { motion } from 'motion/react';

interface LookerDashboardProps {
  database: DatabaseState;
  activePatientId: string;
  onUpdateDatabase?: (updatedDb: DatabaseState) => void;
}

// Helper: get patient display name
const getPatientName = (users: User[], patientId: string): string => {
  const user = users.find(u => u.patientId === patientId);
  if (!user) return patientId;
  // Optional: custom nicknames
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

export default function LookerDashboard({ database, activePatientId, onUpdateDatabase }: LookerDashboardProps) {
  const [activePage, setActivePage] = useState<number>(1);
  const [loadingReport, setLoadingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string>('');
  const [reportError, setReportError] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // ---------- TTS related state & refs ----------
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const activeUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);

  // Initialize Speech Synthesis and load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('Speech Synthesis not supported');
      return;
    }

    const synth = window.speechSynthesis;
    synthRef.current = synth;

    // Function to check and set voices loaded
    const checkVoices = () => {
      if (synth.getVoices().length > 0) {
        setVoicesLoaded(true);
      } else {
        // In some browsers, voices may load later
        setVoicesLoaded(false);
      }
    };

    // Initial check
    checkVoices();

    // Listen for voices changed event
    synth.addEventListener('voiceschanged', checkVoices);

    return () => {
      synth.removeEventListener('voiceschanged', checkVoices);
      synth.cancel();
      synthRef.current = null;
    };
  }, []);

  // Stop speaking on page/patient transition
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      activeUtterancesRef.current = [];
    }
  }, [activePage, activePatientId]);

  // ---------- TTS helper: ensure voices are loaded ----------
  const ensureVoicesLoaded = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const synth = synthRef.current;
      if (!synth) {
        resolve(); // will be handled later
        return;
      }

      if (synth.getVoices().length > 0) {
        setVoicesLoaded(true);
        resolve();
      } else {
        // Wait for voices to load, check every 200ms
        const check = () => {
          if (synth.getVoices().length > 0) {
            setVoicesLoaded(true);
            resolve();
          } else {
            setTimeout(check, 200);
          }
        };
        check();
      }
    });
  }, []);

  // Split text into manageable chunks for TTS
  const splitTextIntoSentences = (text: string): string[] => {
    const parts = text.split(/[\n,。．\.。、\s]+/);
    const chunks: string[] = [];
    let currentChunk = "";
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      
      if (currentChunk.length + trimmed.length > 120) {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = trimmed;
      } else {
        currentChunk = currentChunk ? currentChunk + " " + trimmed : trimmed;
      }
    }
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    return chunks;
  };

  // Main TTS handler
  const handleSpeakTts = useCallback(async (textToSpeak: string) => {
    const synth = synthRef.current;
    if (!synth) {
      alert('เบราว์เซอร์ของคุณไม่รองรับการอ่านออกเสียง (Speech Synthesis)');
      return;
    }

    // Toggle off if already speaking
    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      activeUtterancesRef.current = [];
      return;
    }

    // Wait for voices to be ready
    try {
      await ensureVoicesLoaded();
    } catch (err) {
      console.error('Error loading voices:', err);
      alert('ไม่สามารถโหลดเสียงได้ กรุณาลองใหม่อีกครั้ง');
      return;
    }

    // If still no voices after waiting, show alert
    if (synth.getVoices().length === 0) {
      alert('ไม่พบเสียงในระบบ กรุณาลองใช้อุปกรณ์อื่นหรือตรวจสอบการตั้งค่าเสียง');
      return;
    }

    // Cancel any ongoing speech
    synth.cancel();

    // Clean and split text
    const cleanText = textToSpeak.replace(/[#*`_~]/g, '');
    const chunks = splitTextIntoSentences(cleanText);
    const utterances: SpeechSynthesisUtterance[] = [];

    setIsSpeaking(true);

    chunks.forEach((chunk, index) => {
      const u = new SpeechSynthesisUtterance(chunk);
      u.lang = 'th-TH';
      u.rate = 1.05;

      const voices = synth.getVoices();
      const thVoice = voices.find(v => v.lang.includes('th') || v.lang === 'th-TH');
      if (thVoice) {
        u.voice = thVoice;
      } else {
        // Fallback to first available voice if no Thai voice
        if (voices.length > 0) u.voice = voices[0];
      }

      if (index === chunks.length - 1) {
        u.onend = () => {
          setIsSpeaking(false);
          activeUtterancesRef.current = [];
        };
      }
      u.onerror = (e) => {
        console.error('Speech error:', e);
        setIsSpeaking(false);
        activeUtterancesRef.current = [];
        // Optionally show a brief error (but avoid alert spam)
        // We can set a state to show a toast, but for simplicity we just log
      };
      u.onstart = () => {
        console.log(`Speaking chunk ${index + 1}/${chunks.length}`);
      };
      utterances.push(u);
    });

    activeUtterancesRef.current = utterances;

    // Speak each utterance sequentially
    utterances.forEach(u => synth.speak(u));
  }, [isSpeaking, ensureVoicesLoaded]);

  // ---------- Load demo data (unchanged) ----------
  const handleLoadDemoData = () => {
    const targetId = activePatientId;
    const patientName = getPatientName(database.users, targetId);
    
    const demoDiaries: SleepDiary[] = [
      { patientId: targetId, date: "2026-06-05", bedTime: "23:45", wakeTime: "06:30", sleepDuration: 6, sleepEfficiency: 85, awakenings: 2 },
      { patientId: targetId, date: "2026-06-06", bedTime: "00:15", wakeTime: "06:00", sleepDuration: 5.2, sleepEfficiency: 79, awakenings: 3 },
      { patientId: targetId, date: "2026-06-07", bedTime: "01:30", wakeTime: "07:00", sleepDuration: 5, sleepEfficiency: 75, awakenings: 4 },
      { patientId: targetId, date: "2026-06-08", bedTime: "23:50", wakeTime: "06:30", sleepDuration: 6.2, sleepEfficiency: 87, awakenings: 1 },
      { patientId: targetId, date: "2026-06-09", bedTime: "01:10", wakeTime: "06:45", sleepDuration: 5.1, sleepEfficiency: 78, awakenings: 3 },
      { patientId: targetId, date: "2026-06-10", bedTime: "22:30", wakeTime: "06:30", sleepDuration: 7.5, sleepEfficiency: 94, awakenings: 1 },
    ];

    const demoFactors: DailyFactors[] = [
      { patientId: targetId, date: "2026-06-05", stressScore: 7, caffeine: 3, exercise: 0, screenTime: 4.5, napDuration: 0 },
      { patientId: targetId, date: "2026-06-06", stressScore: 8, caffeine: 4, exercise: 0, screenTime: 5, napDuration: 30 },
      { patientId: targetId, date: "2026-06-07", stressScore: 9, caffeine: 3, exercise: 0, screenTime: 6, napDuration: 20 },
      { patientId: targetId, date: "2026-06-08", stressScore: 5, caffeine: 2, exercise: 30, screenTime: 2.5, napDuration: 0 },
      { patientId: targetId, date: "2026-06-09", stressScore: 8, caffeine: 4, exercise: 0, screenTime: 4.8, napDuration: 40 },
      { patientId: targetId, date: "2026-06-10", stressScore: 4, caffeine: 1, exercise: 30, screenTime: 2, napDuration: 0 },
    ];

    const demoAssessments: Assessment[] = [
      { patientId: targetId, date: "2026-06-05", isi: 16, ess: 13, stopBang: 4, riskLevel: "ปานกลาง" },
      { patientId: targetId, date: "2026-06-10", isi: 9, ess: 12, stopBang: 3, riskLevel: "สูง", isiAnswers: [1, 1, 1, 2, 2, 2, 0], essAnswers: [2, 2, 2, 2, 0, 2, 2, 0], stopBangAnswers: [1, 0, 1, 0, 1, 0, 0, 0] }
    ];

    const demoWellness: WellnessUsage[] = [
      { patientId: targetId, date: "2026-06-05", zodiacType: "ไฟ", whiteNoise: 0, rainSound: 0, oceanSound: 0, forestSound: 0, breathingSession: 1, brainDump: 1 },
      { patientId: targetId, date: "2026-06-06", zodiacType: "ไฟ", whiteNoise: 15, rainSound: 0, oceanSound: 0, forestSound: 0, breathingSession: 0, brainDump: 1 },
      { patientId: targetId, date: "2026-06-07", zodiacType: "ไฟ", whiteNoise: 20, rainSound: 0, oceanSound: 5, forestSound: 0, breathingSession: 2, brainDump: 1 },
      { patientId: targetId, date: "2026-06-08", zodiacType: "ไฟ", whiteNoise: 0, rainSound: 0, oceanSound: 0, forestSound: 0, breathingSession: 1, brainDump: 0 },
      { patientId: targetId, date: "2026-06-09", zodiacType: "ไฟ", whiteNoise: 10, rainSound: 0, oceanSound: 0, forestSound: 0, breathingSession: 1, brainDump: 1 },
      { patientId: targetId, date: "2026-06-10", zodiacType: "ไฟ", whiteNoise: 1, rainSound: 0, oceanSound: 0, forestSound: 0, breathingSession: 0, brainDump: 0 }
    ];

    const demoJournals: Journal[] = [
      { patientId: targetId, date: "2026-06-05", mood: "Stress", journalText: "วันนี้เครียดเรื่องงานมาก สมองไม่ยอมหยุดคิด พยายามข่มตานอนแล้วก็ตื่นบ่อย", voiceJournal: false, aiInsight: "จากการวิเคราะห์ความเครียดสูงสัมพันธ์กับการจดจ่อความคิด แนะนำให้ระบายความคิด Brain Dump ก่อนนอน" },
      { patientId: targetId, date: "2026-06-06", mood: "Stress", journalText: "ทำงานด่วนถึงดึก ดื่มกาแฟตอนทุ่มนึง นอนไม่หลับเลย หลับได้แปปเดียวตื่นอีก", voiceJournal: true, aiInsight: "การดื่มคาเฟอีนหลังบ่ายสองส่งผลต่อระยะเวลาและการเข้าสู่ช่วงหลับลึกอย่างเห็นได้ชัด" },
      { patientId: targetId, date: "2026-06-07", mood: "Sad", journalText: "รู้สึกเหนื่อยล้าสะสมจากหลายวันที่นอนน้อย สุขภาพเริ่มแย่ลง มีตื่นกลางดึกบ่อยมาก", voiceJournal: false, aiInsight: "สภาวะอารมณ์ดิ่งอาจเชื่อมโยงกับการอดนอนสะสม หลีกเลี่ยงการดูหน้าจอสมาร์ทโฟนก่อนนอน" },
      { patientId: targetId, date: "2026-06-08", mood: "Neutral", journalText: "หลังจากไปเตะบอลและลดการจับมือถือ รู้สึกนอนได้ลึกขึ้น ตื่นน้อยลงนิดนึง ดีกว่าวันก่อนๆ", voiceJournal: false, aiInsight: "การออกกำลังกายช่วยผ่อนคลายกล้ามเนื้อและลดความเครียดสะสมได้อย่างยอดเยี่ยม" },
      { patientId: targetId, date: "2026-06-09", mood: "Stress", journalText: "นอนไม่หลับอีกแล้ว เครียดเรื่องประชุมสัปดาห์หน้า เล่นทวิตเตอร์ในที่มืดนานเกินไป", voiceJournal: true, aiInsight: "Screen time ในที่มืดลดการผลิตสารเมลาโทนิน แนะนำให้งดใช้อุปกรณ์ก่อนนอน 1 ชั่วโมง" }
    ];

    const nextDb = {
      ...database,
      sleepDiary: [...database.sleepDiary.filter(d => d.patientId !== targetId), ...demoDiaries],
      dailyFactors: [...database.dailyFactors.filter(f => f.patientId !== targetId), ...demoFactors],
      assessments: [...database.assessments.filter(a => a.patientId !== targetId), ...demoAssessments],
      wellnessUsage: [...database.wellnessUsage.filter(w => w.patientId !== targetId), ...demoWellness],
      journals: [...database.journals.filter(j => j.patientId !== targetId), ...demoJournals],
    };

    if (onUpdateDatabase) {
      onUpdateDatabase(nextDb);
    }
  };

  // ---------- Memoized calculations (unchanged) ----------
  const totalUsers = database.users.length;

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

  // Page 2 data: sleep analytics for selected patient
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

  // Page 3: ISI distribution
  const isiDistData = useMemo(() => {
    let normal = 0, mild = 0, moderate = 0, severe = 0;
    database.assessments.forEach(a => {
      if (a.isi <= 7) normal++;
      else if (a.isi <= 14) mild++;
      else if (a.isi <= 21) moderate++;
      else severe++;
    });
    return [
      { name: 'ปกติ (0-7)', count: normal, fill: '#4ade80' },
      { name: 'เล็กน้อย (8-14)', count: mild, fill: '#facc15' },
      { name: 'ปานกลาง (15-21)', count: moderate, fill: '#fb923c' },
      { name: 'รุนแรง (22-28)', count: severe, fill: '#f87171' }
    ].filter(d => d.count > 0);
  }, [database.assessments]);

  // Page 4: correlation data
  const correlationData = useMemo(() => {
    const result: any[] = [];
    database.sleepDiary.forEach(diary => {
      const factor = database.dailyFactors.find(f => f.patientId === diary.patientId && f.date === diary.date);
      const assessment = database.assessments.find(a => a.patientId === diary.patientId);
      if (factor && assessment) {
        result.push({
          stress: factor.stressScore,
          isi: assessment.isi,
          caffeine: factor.caffeine,
          sleepDuration: diary.sleepDuration,
          screenTime: factor.screenTime,
          sleepEfficiency: diary.sleepEfficiency,
          patientId: diary.patientId
        });
      }
    });
    return result;
  }, [database.sleepDiary, database.dailyFactors, database.assessments]);

  // Page 5: wellness usage stats
  const wellnessStatsData = useMemo(() => {
    let whiteSum = 0, rainSum = 0, oceanSum = 0, forestSum = 0, breathingSum = 0, dumpSum = 0;
    database.wellnessUsage.forEach(w => {
      whiteSum += w.whiteNoise;
      rainSum += w.rainSound;
      oceanSum += w.oceanSound;
      forestSum += w.forestSound || 0;
      breathingSum += w.breathingSession;
      dumpSum += w.brainDump || 0;
    });
    return [
      { name: 'White Noise (นาที)', value: whiteSum, fill: '#f1b32d' },
      { name: 'ฝนตก (นาที)', value: rainSum, fill: '#3d5a80' },
      { name: 'คลื่นทะเล (นาที)', value: oceanSum, fill: '#98c1d9' },
      { name: 'พนาไพร (นาที)', value: forestSum, fill: '#4a6fa5' },
      { name: 'ฝึกการหายใจ (นาที)', value: breathingSum * 5, fill: '#e9c46a' },
      { name: 'เขียนทิ้งระเบิดสมอง (นาที)', value: dumpSum * 5, fill: '#2d426b' }
    ].filter(d => d.value > 0);
  }, [database.wellnessUsage]);

  // Page 6: mood distribution
  const moodData = useMemo(() => {
    let pos = 0, neu = 0, sad = 0, str = 0;
    database.journals.forEach(j => {
      if (j.mood === 'Positive') pos++;
      else if (j.mood === 'Neutral') neu++;
      else if (j.mood === 'Sad') sad++;
      else str++;
    });
    return [
      { name: 'Positive 😊', value: pos, fill: '#4ade80' },
      { name: 'Neutral 😐', value: neu, fill: '#94a3b8' },
      { name: 'Sad 😔', value: sad, fill: '#3b82f6' },
      { name: 'Stress 😫', value: str, fill: '#f87171' }
    ].filter(d => d.value > 0);
  }, [database.journals]);

  // ---------- API call for AI report (unchanged) ----------
  const fetchWeeklyReport = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoadingReport(true);
    setAiReport('');
    setReportError('');

    try {
      const response = await fetch('/api/gemini/generate-weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: activePatientId }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: GeminiReportResponse = await response.json();
      if (data.error) throw new Error(data.error);
      
      setAiReport(data.report || 'ไม่พบสรุปรายงานสำหรับสมาชิกครอบครัวนี้');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Fetch aborted');
        return;
      }
      console.error(err);
      setReportError(
        'ไม่สามารถเชื่อมต่อกับระบบ AI ได้ในขณะนี้ กรุณาลองอีกครั้งภายหลัง หรือตรวจสอบว่า backend server ทำงานอยู่'
      );
      if (process.env.NODE_ENV === 'development') {
        setAiReport('[โหมดพัฒนา] รายงานตัวอย่าง: สมาชิกในครอบครัวมีแนวโน้มความเครียดลดลง 10% เมื่อเทียบกับสัปดาห์ที่ผ่านมา แนะนำฝึกหายใจก่อนนอนอย่างน้อย 5 นาที');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setLoadingReport(false);
    }
  }, [activePatientId]);

  useEffect(() => {
    if (activePage === 6) {
      fetchWeeklyReport();
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [activePage, activePatientId, fetchWeeklyReport]);

  // ---------- Render pages (unchanged except TTS button) ----------
  const renderPage1 = () => {
    const latestAss = patientAssessments[patientAssessments.length - 1];
    const latestDiary = patientDiaries[patientDiaries.length - 1];
    const patientName = getPatientName(database.users, activePatientId);

    const cbtiRecommendations = [];
    
    const eff = latestDiary ? latestDiary.sleepEfficiency : avgEfficiency;
    if (eff < 85) {
      cbtiRecommendations.push({
        step: "ขั้นตอนที่ 1",
        title: "การจำกัดชั่วโมงและควบคุมช่วงเวลาบนเตียง (Sleep Restriction Therapy)",
        badge: "CBT-I ทองคำ",
        type: "clinical",
        icon: "⏰",
        detail: `ประสิทธิภาพการนอนเฉลี่ยล่าสุดของคุณอยู่ที่ ${eff}% (ต่ำกว่าเกณฑ์ปกติที่ควร >85%) เพื่อส่งเสริมความรู้สึกอยากนอนหลับลึก คุณควร "บีบเวลานอนแช่บนเตียง" โดยเข้านอนเมื่อตาหรี่จนต้านไม่ไหวเท่านั้น และลุกขึ้นตรงเวลาเดิมทุกๆ เช้าอย่างเข้มแข็งเด็ดขาด วิธีนี้จะกระตุ้นคลื่นสมองหลั่งสารความง่วงตามธรรมชาติ`
      });
    } else {
      cbtiRecommendations.push({
        step: "ขั้นตอนที่ 1",
        title: "การปกป้องเวลานอนที่สมดุลและตื่นเป็นเวลา (Circadian Rhythm Consolidation)",
        badge: "Sleep Hygiene",
        type: "hygiene",
        icon: "☀️",
        detail: `คุณมีประสิทธิภาพการนอนเฉลี่ยในระดับที่ดีมาก (${eff}%) แนะนำให้ปกป้องเสถียรภาพนี้โดยการกำหนด "เวลาตื่นนอนที่แน่นอนแบบนาทีต่อนาที" แม้จะเป็นวันหยุดสุดสัปดาห์ก็ตาม เพื่อให้นาฬิกาชีวิตชีวภาพของคุณหมุนเวียนคงที่และหลับสนิทยิ่งขึ้นต่อๆ ไป`
      });
    }

    const isiScore = latestAss ? latestAss.isi : avgIsi;
    if (isiScore > 14) {
      cbtiRecommendations.push({
        step: "ขั้นตอนที่ 2",
        title: "กฎการลุกออกจากเตียงใน 20 นาที (Stimulus Control Therapy)",
        badge: "CBT-I แกนหลัก",
        type: "clinical",
        icon: "🚪",
        detail: `สถิติคะแนนดัชนีการนอนหลับติดขัด (ISI) ของคุณสูงถึง ${isiScore} คะแนน แนะนำหักดิบสมองเชิงตอบสนอง: หากล้มตัวลงนอนแล้วยังคิดฟุ้งซ่านหรือตื่นมากลางดึกเกิน 20 นาที "ห้ามพยายามฝืนนอนต่อเด็ดขาด" ให้ลุกไปห้องอื่นที่สลัวๆ อ่านหนังสือเบาๆ หรือฟังเสียงระเบิดสมอง จนกว่าจะรู้สึกง่วงจัดจริงๆ ค่อยหวนกลับมาที่เตียง สมองจะได้จับคู่เตียงกับการหลับไม่ใช่ความกังวล`
      });
    } else {
      cbtiRecommendations.push({
        step: "ขั้นตอนที่ 2",
        title: "การปรับโครงสร้างเพื่อสลายความกดดันในการนอน (Cognitive Restructuring)",
        badge: "Cognitive Therapy",
        type: "hygiene",
        icon: "🧠",
        detail: `ระดับโรคสะสมรอบล่าสุดดีกว่าเกณฑ์ล่อแหลม ควรจำไว้เสมอว่า "การตื่นกลางดึกเป็นเรื่องธรรมชาติ" ทุกเสี้ยวคืนไม่ควรเอาการนอนหลับมาเป็นหน้าที่ที่ต้องทำให้สำเร็จ ยิ่งคุณคลายการคาดคั้นลง คลื่นประสาทสมองซีกคอร์เท็กซ์ก็จะยิ่งปรับสลัวลงอย่างรวดเร็วเป็นธรรมชาติ`
      });
    }

    const stressVal = avgStress;
    if (stressVal >= 6) {
      cbtiRecommendations.push({
        step: "ขั้นตอนที่ 3",
        title: "ระบายความตึงเครียดของระบบชีวประสาท (Autonomic De-arousal)",
        badge: "Arousal Reduction",
        type: "clinical",
        icon: "🫁",
        detail: `ความเครียดของร่างกายอยู่ในเกณฑ์ค่อนข้างสูง (${stressVal}/10) แนะนำบำบัดชีวประสาทช่วงสมดุลกระตุ้น ด้วยการฝึก Progressive Muscle Relaxation (เกร็งและคลายมัดกล้ามเนื้อ 16 จุด) ผสานเสียงคลื่นหรือฝึกการหายใจลึกแบบ 4-7-8 นาน 5 นาทีก่อนปิดสวิตช์ไฟเพื่อตัดคลื่นสมองไฮเปอร์`
      });
    } else {
      cbtiRecommendations.push({
        step: "ขั้นตอนที่ 3",
        title: "การจัดระเบียบสัญญาณก่อนนอน (Bedtime Buffer Zone)",
        badge: "Wind-down Plan",
        type: "hygiene",
        icon: "☕",
        detail: `ระดับภาวะกระตุ้นของคุณค่อนข้างสงบดี แนะนำให้จัดสภาพแวดล้อมเพื่อรักษาเสถียรภาพ เช่น งดทานอาหารมื้อหนักและคาเฟอีนล่วงหน้าอย่างน้อย 6 ชั่วโมง และทิ้งระยะห่างจากภาพหน้าจอแสงสีฟ้าอย่างน้อย 1 ชั่วโมงก่อนเข้าสู่ช่วงผ่อนคลาย`
      });
    }

    const fullSpeechScript = `สวัสดีครับคุณ${patientName} ผมคือโค้ชส่วนตัวคอสมอสที่จะพาคุณมาเปลี่ยนความคิดและพฤติกรรมการนอนแบบยั่งยืนด้วยหลัก ซีบีทีไอ ครับ. จากการวิเคราะห์รอบล่าสุดเฉพาะตัวคุณ มีคำแนะแนว 3 ขั้นตอนสำคัญดังนี้ครับ. ` +
      cbtiRecommendations.map((r) => `${r.step}: ${r.title}. รายละเอียดแนะแนวคือ ${r.detail}. `).join(" ") +
      ` ขอให้คุณ${patientName}ค่อยๆปรับตัวทีละนิดและรักษาวินัยอย่างใจเย็นนะครับ คอสมอสขอเป็นกำลังใจให้ทุกคืนเป็นคืนที่แสนสุขครับ.`;

    const hasLogData = patientAssessments.length > 0 || patientDiaries.length > 0;

    return (
      <div className="space-y-6">
        <div className="border-b border-sleep-blue-100 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h4 className="font-semibold text-lg text-sleep-blue-900">หน้า 1 : บทวิเคราะห์สุขภาวะและการแนะแนวเชิงพฤติกรรม (CBT-I)</h4>
            <p className="text-xs text-sleep-blue-500 font-light">ดึงข้อมูลสถิติ ดัชนีจำลอง และวิเคราะห์คู่มือพฤเทคบำบัดส่วนบุคคล</p>
          </div>
          
          {/* TTS Button with status */}
          <button
            onClick={() => handleSpeakTts(fullSpeechScript)}
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

        {/* Voice wave visualizer */}
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
                  key={i}
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

        {!hasLogData && (
          <div className="bg-gradient-to-r from-sleep-gold-500/10 to-transparent border-2 border-dashed border-sleep-gold-400/60 p-5 rounded-3xl space-y-3 shadow-sm">
            <h5 className="font-bold text-sm text-sleep-blue-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sleep-gold-500 animate-pulse shrink-0" />
              💡 ยังไม่มีข้อมูลระเบียนสุขภาพสำหรับคุณ {patientName} (หน้าจอแสดงเป็น 0)
            </h5>
            <p className="text-xs text-sleep-blue-700 leading-relaxed max-w-4xl">
              เนื่องจากคุณยังไม่มีระเบียบบันทึกสุขภาพ คะแนน สถิติความง่วงนอน ดัชนีนอนไม่หลับ (ISI) และประสิทธิภาพการนอนหลับจึงคํานวณหาค่าเฉลี่ยเป็นศูนย์ (0) ทั้งหมดครับ. ระบบยินดีรองรับการคัดกรองส่วนตัวของคุณ โดยคุณสามารถทำประเมินจริง หรือ <strong className="text-sleep-blue-950 font-extrabold">กดปุ่มสีทองด้านล่างเพื่อโหลดโปรไฟล์จำลองสุขภาพทางการแพทย์อัตโนมัติ</strong> เพื่อเห็นบทวิเคราะห์และรายงานสรุปวิเคราะห์ทั้งหมดของระบบ Cozmos ทันที!
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-sleep-blue-100 shadow-sm text-center">
            <span className="text-[10px] text-sleep-blue-500 uppercase tracking-wider block font-light">สมาชิกครอบครัว</span>
            <strong className="text-2xl font-extrabold text-sleep-blue-950 font-mono my-1 block">{totalUsers} คน</strong>
            <span className="text-[9px] text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full inline-block font-sans">👤 100% บันทึก</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-sleep-blue-100 shadow-sm text-center">
            <span className="text-[10px] text-sleep-blue-500 uppercase tracking-wider block font-light">ดัชนีนอนไม่หลับเฉลี่ย</span>
            <strong className="text-2xl font-extrabold text-sleep-blue-950 font-mono my-1 block">{avgIsi}</strong>
            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full inline-block font-sans ${
              avgIsi > 14 ? 'text-red-600 bg-red-50' : 'text-orange-600 bg-orange-50'
            }`}>
              {avgIsi > 14 ? '⚠️ ระดับปานกลาง' : '🟢 ระดับเฝ้าระวัง'}
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-sleep-blue-100 shadow-sm text-center">
            <span className="text-[10px] text-sleep-blue-500 uppercase tracking-wider block font-light">ความง่วงสะสม ESS</span>
            <strong className="text-2xl font-extrabold text-sleep-blue-950 font-mono my-1 block">{avgEss}</strong>
            <span className="text-[9px] text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full inline-block font-sans">⚡ ล้าง่วงสะสม</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-sleep-blue-100 shadow-sm text-center">
            <span className="text-[10px] text-sleep-blue-500 uppercase tracking-wider block font-light">ประสิทธิภาพหลับรวม</span>
            <strong className="text-2xl font-extrabold text-sleep-blue-950 font-mono my-1 block">{avgEfficiency}%</strong>
            <span className="text-[9px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-block font-sans">🟢 รักษาเสถียรภาพ</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-sleep-blue-100 shadow-sm text-center">
            <span className="text-[10px] text-sleep-blue-500 uppercase tracking-wider block font-light">ระดับเครียดร่างกาย</span>
            <strong className="text-2xl font-extrabold text-sleep-blue-950 font-mono my-1 block">{avgStress}/10</strong>
            <span className="text-[9px] text-red-500 bg-red-50 px-2 py-0.5 rounded-full inline-block font-sans">🔴 ผ่อนคลายกล้ามเนื้อ</span>
          </div>
        </div>

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
            {cbtiRecommendations.map((rec, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 hover:bg-white/10 transition-all relative overflow-hidden group">
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
  };

  const renderPage2 = () => (
    <div className="space-y-6">
      <div className="border-b border-sleep-blue-100 pb-3">
        <h4 className="font-semibold text-lg text-sleep-blue-900">หน้า 2 : สถิติและรายละเอียดพฤติกรรมการนอนในบ้าน</h4>
        <p className="text-xs text-sleep-blue-500 font-light">แสดงสถิติกราฟเส้นชั่วโมงการนอนและเปรียบเทียบอาการคะแนนประเมินของสมาชิก</p>
      </div>

      {sleepAnalyticsData.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-dashed text-xs text-sleep-blue-600">
          ไม่มีประวัติการส่งไดอารี่ของสมาชิกคนนี้ ลองจดบันทึกพฤติกรรมก่อนนะครับ
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-2xl border border-sleep-blue-100 shadow-sm">
            <h5 className="font-semibold text-xs text-sleep-blue-900 mb-3 uppercase tracking-wider text-center">กราฟ 1: ชั่วโมงการนอนรายวัน</h5>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sleepAnalyticsData} margin={{ top: 10, right: 10, left: 15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="dateShort" stroke="#64748B" style={{ fontSize: '10px' }} label={{ value: 'วันที่ (ดด/วว)', position: 'insideBottom', offset: -10, style: { fontSize: 10, fill: '#64748B', fontWeight: 'bold' } }} />
                  <YAxis domain={[3, 11]} stroke="#64748B" style={{ fontSize: '10px' }} label={{ value: 'เวลาหลับ (ชั่วโมง)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#64748B', fontWeight: 'bold' } }} />
                  <Tooltip formatter={(value) => [`${value} ชั่วโมง`, 'ระยะเวลาการนอน']} />
                  <Line type="monotone" dataKey="ชั่วโมงการนอน" stroke="#f1b32d" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-sleep-blue-100 shadow-sm">
            <h5 className="font-semibold text-xs text-sleep-blue-900 mb-3 uppercase tracking-wider text-center">กราฟ 2: ดัชนีความเครียดและง่วงนอน (ISI & ESS)</h5>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sleepAnalyticsData} margin={{ top: 10, right: 10, left: 15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="dateShort" stroke="#64748B" style={{ fontSize: '10px' }} label={{ value: 'วันที่ (ดด/วว)', position: 'insideBottom', offset: -10, style: { fontSize: 10, fill: '#64748B', fontWeight: 'bold' } }} />
                  <YAxis stroke="#64748B" style={{ fontSize: '10px' }} label={{ value: 'ระดับคะแนน (คะแนน)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#64748B', fontWeight: 'bold' } }} />
                  <Tooltip formatter={(value, name) => [`${value} คะแนน`, name === 'ISI Trend' ? 'ดัชนีนอนไม่หลับ (ISI)' : 'ความง่วงนอนกลางวัน (ESS)']} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
                  <Line type="monotone" dataKey="ISI Trend" stroke="#ef4444" strokeWidth={2} name="คะแนน ISI" />
                  <Line type="monotone" dataKey="ESS Trend" stroke="#3b82f6" strokeWidth={2} name="คะแนน ESS" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPage3 = () => (
    <div className="space-y-6">
      <div className="border-b border-sleep-blue-100 pb-3">
        <h4 className="font-semibold text-lg text-sleep-blue-900">หน้า 3 : การเฝ้าระวังความรุนแรงนอนไม่หลับ (ISI)</h4>
        <p className="text-xs text-sleep-blue-500 font-light">สัดส่วนของเกณฑ์คลินิก ISI แยกตามระดับความรุนแรง</p>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-sleep-blue-100 shadow-sm">
        <h5 className="font-semibold text-xs text-sleep-blue-950 mb-4 text-center">เกณฑ์กระจายโรค ISI Scale</h5>
        <div className="h-64 max-w-lg mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <ReBarChart data={isiDistData} margin={{ top: 15, right: 10, left: 15, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" stroke="#64748B" style={{ fontSize: '10px' }} label={{ value: 'ระดับความรุนแรง (คะแนน ISI)', position: 'insideBottom', offset: -15, style: { fontSize: 10, fill: '#64748B', fontWeight: 'bold' } }} />
              <YAxis stroke="#64748B" allowDecimals={false} style={{ fontSize: '10px' }} label={{ value: 'จำนวนสมาชิก (คน)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#64748B', fontWeight: 'bold' } }} />
              <Tooltip formatter={(value) => [`${value} คน`, 'จำนวนครั้งที่คัดกรอง']} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {isiDistData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </ReBarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-sleep-blue-50 text-center text-xs">
          <div><span className="text-green-500 font-extrabold">● ปกติ</span><p className="text-sleep-blue-600">ไม่มีโรคแทรกซ้อน</p></div>
          <div><span className="text-yellow-500 font-extrabold">● เล็กน้อย</span><p className="text-sleep-blue-600">ความเสี่ยงสุขวิทยา</p></div>
          <div><span className="text-orange-500 font-extrabold">● ปานกลาง</span><p className="text-sleep-blue-600">รบกวนงานกลางวัน</p></div>
          <div><span className="text-red-500 font-extrabold">● รุนแรง</span><p className="text-sleep-blue-600">ปัญหานอนติดขัด</p></div>
        </div>
      </div>
    </div>
  );

  const renderPage4 = () => (
    <div className="space-y-6">
      <div className="border-b border-sleep-blue-100 pb-3">
        <h4 className="font-semibold text-lg text-sleep-blue-900">หน้า 4 : ปัจจัยพฤติกรรม (Correlation)</h4>
        <p className="text-xs text-sleep-blue-500 font-light">ความสัมพันธ์ระหว่างความเครียด คาเฟอีน หน้าจอ กับคุณภาพการนอน</p>
      </div>
      {correlationData.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-dashed text-xs text-sleep-blue-600">
          ยังไม่มีข้อมูลที่สมบูรณ์สำหรับการวิเคราะห์สหสัมพันธ์ (ต้องการทั้ง sleep diary, daily factors และ assessments)
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-2xl border shadow-sm">
            <h5 className="font-semibold text-xs text-center mb-2">1. ความเครียด vs ISI</h5>
            <div className="h-48">
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid stroke="#f1f5f9" />
                  <XAxis type="number" dataKey="stress" domain={[0,10]} stroke="#94a3b8" style={{ fontSize: '9px' }} label={{ value: 'ระดับความเครียด (คะแนน)', position: 'insideBottom', offset: -10, style: { fontSize: 9, fill: '#64748B' } }} />
                  <YAxis type="number" dataKey="isi" domain={[0,24]} stroke="#94a3b8" style={{ fontSize: '9px' }} label={{ value: 'ดัชนี ISI (คะแนน)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 9, fill: '#64748B' } }} />
                  <Tooltip formatter={(value, name) => [value, name === 'stress' ? 'ระดับความเครียด (คะแนน)' : 'ดัชนีนอนไม่หลับ (ISI)']} />
                  <Scatter data={correlationData} fill="#ef4444" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border shadow-sm">
            <h5 className="font-semibold text-xs text-center mb-2">2. คาเฟอีน vs ชั่วโมงนอน</h5>
            <div className="h-48">
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid stroke="#f1f5f9" />
                  <XAxis type="number" dataKey="caffeine" domain={[0,5]} stroke="#94a3b8" style={{ fontSize: '9px' }} label={{ value: 'ปริมาณคาเฟอีน (แก้ว)', position: 'insideBottom', offset: -10, style: { fontSize: 9, fill: '#64748B' } }} />
                  <YAxis type="number" dataKey="sleepDuration" domain={[3,10]} stroke="#94a3b8" style={{ fontSize: '9px' }} label={{ value: 'เวลาหลับ (ชั่วโมง)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 9, fill: '#64748B' } }} />
                  <Tooltip formatter={(value, name) => [value, name === 'caffeine' ? 'คาเฟอีน (แก้ว)' : 'ชั่วโมงการนอน (ชั่วโมง)']} />
                  <Scatter data={correlationData} fill="#b45309" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border shadow-sm">
            <h5 className="font-semibold text-xs text-center mb-2">3. หน้าจอ vs ประสิทธิภาพหลับ</h5>
            <div className="h-48">
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid stroke="#f1f5f9" />
                  <XAxis type="number" dataKey="screenTime" domain={[0,8]} stroke="#94a3b8" style={{ fontSize: '9px' }} label={{ value: 'เวลาหน้าจอ (ชั่วโมง)', position: 'insideBottom', offset: -10, style: { fontSize: 9, fill: '#64748B' } }} />
                  <YAxis type="number" dataKey="sleepEfficiency" domain={[50,100]} stroke="#94a3b8" style={{ fontSize: '9px' }} label={{ value: 'ประสิทธิภาพ (%)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 9, fill: '#64748B' } }} />
                  <Tooltip formatter={(value, name) => [value, name === 'screenTime' ? 'ระยะเวลาใช้หน้าจอ (ชั่วโมง)' : 'ประสิทธิภาพการนอน (%)']} />
                  <Scatter data={correlationData} fill="#3b82f6" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPage5 = () => (
    <div className="space-y-6">
      <div className="border-b border-sleep-blue-100 pb-3">
        <h4 className="font-semibold text-lg text-sleep-blue-900">หน้า 5 : สถิติการใช้งานเครื่องมือบำบัดนอนหลับ</h4>
        <p className="text-xs text-sleep-blue-500 font-light">ปริมาณนาทีและจำนวนครั้งของการฝึกหายใจ เสียงคลื่น ฯลฯ</p>
      </div>
      <div className="bg-white p-5 rounded-3xl border shadow-sm">
        <h5 className="font-semibold text-xs text-center mb-4">สัดส่วนนาทีรักษาสมดุล</h5>
        <div className="h-64">
          <ResponsiveContainer>
            <ReBarChart data={wellnessStatsData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke="#64748B" style={{ fontSize: '10px' }} label={{ value: 'เวลาใช้งานสะสม (นาที)', position: 'insideBottom', offset: -10, style: { fontSize: 10, fill: '#64748B', fontWeight: 'bold' } }} />
              <YAxis type="category" dataKey="name" width={150} stroke="#64748B" style={{ fontSize: '10px' }} />
              <Tooltip formatter={(value) => [`${value} นาที`, 'เวลาที่ใช้']} />
              <Bar dataKey="value" diagnosis-id="wellness-bar" radius={[0,6,6,0]}>
                {wellnessStatsData.map(entry => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </ReBarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderPage6 = () => (
    <div className="space-y-6">
      <div className="border-b pb-3 flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h4 className="font-semibold text-lg">หน้า 6 : AI Reflection รายงานอัจฉริยะ</h4>
          <p className="text-xs text-sleep-blue-500">ตรวจจับแนวโน้มอารมณ์และให้คำปรึกษาจาก Gemini LLM</p>
        </div>
        <button
          onClick={fetchWeeklyReport}
          disabled={loadingReport}
          aria-label="ขอรายงาน AI ใหม่"
          className="bg-sleep-blue-900 hover:bg-sleep-blue-800 text-white text-xs font-semibold px-3 py-1.5 rounded-xl inline-flex items-center gap-1 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingReport ? 'animate-spin' : ''}`} />
          ขอรายงานใหม่
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-2xl border shadow-sm text-center">
          <h5 className="font-semibold text-xs mb-2">สัดส่วนอารมณ์ไดอารี่</h5>
          <div className="h-40 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={moodData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                  {moodData.map(entry => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} บันทึก`, 'จำนวน']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[10px] pt-2 border-t mt-2">
            {moodData.map(m => (
              <div key={m.name}>{m.name}</div>
            ))}
          </div>
        </div>

        <div className="bg-sleep-gold-50 border border-sleep-gold-300 p-5 rounded-3xl col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h5 className="font-semibold text-sm flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-sleep-gold-500" />
              COZMOS WEEKLY AI REPORT
            </h5>
            <span className="text-[10px] bg-sleep-blue-900 text-white px-2 py-0.5 rounded">อัจฉริยะ</span>
          </div>

          {loadingReport ? (
            <div className="py-10 text-center">
              <Compass className="w-8 h-8 animate-spin mx-auto text-sleep-blue-900" />
              <p className="text-xs mt-2">กำลังประมวลผลรายงานประจำสัปดาห์...</p>
            </div>
          ) : reportError ? (
            <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-500 rounded-xl flex gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{reportError}</span>
            </div>
          ) : (
            <div className="text-xs text-sleep-blue-950 leading-relaxed max-h-[200px] overflow-y-auto whitespace-pre-wrap space-y-2">
              {aiReport || 'ยังไม่มีรายงาน กดปุ่ม "ขอรายงานใหม่" เพื่อสร้างรายงานจากข้อมูลล่าสุด'}
            </div>
          )}
          <div className="text-[9px] text-sleep-blue-600 italic">
            *รายงานอิงจากข้อมูลการนอน ความเครียด และไดอารี่ของสมาชิกรหัส {activePatientId}
          </div>
        </div>
      </div>
    </div>
  );

  // ---------- Main Render ----------
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

        {/* Page Navigation */}
        <div className="flex bg-sleep-blue-900 text-white rounded-2xl p-1 gap-1 flex-wrap shadow">
          {[1,2,3,4,5,6].map(page => (
            <button
              key={page}
              onClick={() => setActivePage(page)}
              aria-label={`ไปหน้า ${page}`}
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
