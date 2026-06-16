/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Assessment } from '../types';
import { ClipboardCheck, Sparkles, Check, ChevronRight, Activity, Moon, Sun, AlertTriangle, ArrowLeft, Volume2, VolumeX } from 'lucide-react';
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
  { text: "การหลับยาก (Sleep Onset Latency)", options: ["< 15 นาที (0)", "16-30 นาที (1)", "31-45 นาที (2)", "46-60 นาที (3)", "> 60 นาที (4)"], values: [0, 1, 2, 3, 4] },
  { text: "การตื่นกลางดึก (WASO)", options: ["ไม่ตื่น / หลับต่อทันที (0)", "< 15 นาที (1)", "15-30 นาที (2)", "30-45 นาที (3)", "> 45 นาที (4)"], values: [0, 1, 2, 3, 4] },
  { text: "การตื่นเช้ามืด", options: ["ไม่เลย (0)", "เล็กน้อย (1)", "ปานกลาง (2)", "รุนแรง (3)", "รุนแรงมาก (4)"], values: [0, 1, 2, 3, 4] },
  { text: "ความพึงพอใจต่อการนอน", options: ["พอใจมาก (0)", "พอใจ (1)", "ปานกลาง (2)", "ไม่ค่อยพอใจ (3)", "ไม่พอใจเลย (4)"], values: [0, 1, 2, 3, 4] },
  { text: "การรบกวนการใช้ชีวิต", options: ["ไม่รบกวน (0)", "เล็กน้อย (1)", "ปานกลาง (2)", "มาก (3)", "รบกวนมากที่สุด (4)"], values: [0, 1, 2, 3, 4] },
  { text: "ความกังวลเรื่องการนอน", options: ["ไม่กังวล (0)", "เล็กน้อย (1)", "ปานกลาง (2)", "มาก (3)", "กังวลมากที่สุด (4)"], values: [0, 1, 2, 3, 4] },
  { text: "คนรอบข้างสังเกตเห็นปัญหาการนอน", options: ["ไม่เห็น (0)", "เห็นเล็กน้อย (1)", "เห็นปานกลาง (2)", "เห็นมาก (3)", "เห็นชัดเจนมากที่สุด (4)"], values: [0, 1, 2, 3, 4] }
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

  // Speech tracking and playback
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isSpeakingEval, setIsSpeakingEval] = useState<boolean>(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const activeUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const splitTextIntoSentences = useCallback((text: string): string[] => {
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
  }, []);

  const handleToggleSpeech = useCallback(() => {
    if (!synthRef.current) return;

    if (isSpeaking) {
      synthRef.current.cancel();
      if (synthRef.current.paused) {
        synthRef.current.resume();
      }
      setIsSpeaking(false);
      activeUtterancesRef.current = [];
    } else {
      if (isSpeakingEval) {
        synthRef.current.cancel();
        if (synthRef.current.paused) {
          synthRef.current.resume();
        }
        setIsSpeakingEval(false);
      }

      // Cleanup text markup to speak cleanly
      const cleanText = aiAdvice
        .replace(/[#*`_~]/g, '')
        .replace(/-- /g, '')
        .replace(/- /g, '')
        .replace(/⚠️/g, 'ข้อควรระวังสำคัญ')
        .replace(/✨/g, '')
        .replace(/:/g, ' ');

      const chunks = splitTextIntoSentences(cleanText);
      const utterances: SpeechSynthesisUtterance[] = [];

      setIsSpeaking(true);

      chunks.forEach((chunk, index) => {
        const u = new SpeechSynthesisUtterance(chunk);
        u.lang = 'th-TH';
        u.rate = 1.0;

        const voices = synthRef.current?.getVoices() || [];
        const thVoice = voices.find(v => v.lang.includes('th') || v.lang === 'th-TH');
        if (thVoice) {
          u.voice = thVoice;
        }

        if (index === chunks.length - 1) {
          u.onend = () => {
            setIsSpeaking(false);
            activeUtterancesRef.current = [];
          };
        }
        u.onerror = (e) => {
          console.error("Speech error:", e);
          setIsSpeaking(false);
          activeUtterancesRef.current = [];
        };
        utterances.push(u);
      });

      activeUtterancesRef.current = utterances;

      if (synthRef.current.paused) {
        synthRef.current.resume();
      }

      utterances.forEach(u => synthRef.current?.speak(u));
    }
  }, [aiAdvice, isSpeaking, isSpeakingEval, splitTextIntoSentences]);

  const handleToggleSpeechEval = useCallback(() => {
    if (!synthRef.current) return;

    if (isSpeakingEval) {
      synthRef.current.cancel();
      if (synthRef.current.paused) {
        synthRef.current.resume();
      }
      setIsSpeakingEval(false);
      activeUtterancesRef.current = [];
    } else {
      if (isSpeaking) {
        synthRef.current.cancel();
        if (synthRef.current.paused) {
          synthRef.current.resume();
        }
        setIsSpeaking(false);
      }

      // Compile clean Thai spoken text for the clinical evaluation results
      let evalText = "บทประเมินพฤติกรรมรายข้อสำหรับใช้วิเคราะห์และรักษาความปลอดภัยในการนอนที่บ้านมีดังนี้ค่ะ ";

      // ISI Analysis
      evalText += "หมวดดัชนีและพฤติกรรมท้าทายภาวะนอนไม่หลับ ไอเอสไอ ";
      let hasIsiIssue = false;
      if (isiAnswers[0] >= 2) {
        evalText += "ข้อที่หนึ่ง มีภาวะกล่อมตัวเองยากร่วมนอนช้า เกิดจากสภาวะจิตใจตื่นตัวพยายามบังคับสมองให้นอน แนะนำกฎบำบัด ซีบีทีไอ เรื่องการควบคุมสิ่งเร้า หากเริ่มล้มตัวนอน ยี่สิบนาที แล้วยังไม่หลับ ห้ามฝืนนอนดิ้นเด็ดขาด ให้ก้าวออกจากเตียงนั่งเก้าอี้แสงสลัว อ่านหนังสือจนง่วงย้อยค่อยกลับมานอนใหม่ค่ะ ";
        hasIsiIssue = true;
      }
      if (isiAnswers[1] >= 2) {
        evalText += "ข้อที่สอง มีปัญหาตื่นสะดุ้งกลางคืนรบกวน ตื่นแล้วหลับต่อยาก มักเกี่ยวเนื่องกับอุณหภูมิแกนตัวพุ่งสูงหรือความเครียดค้าง แนะนำงดเครื่องดื่มทุกประเภท สองชั่วโมงครึ่งก่อนนอน งดสิ่งเร้าเร่งด่วน และรักษาห้องนอนที่ยี่สิบสี่ถึงยี่สิบห้าองศาเซลเซียสเพื่อคงสมาธิร่างกายช่วงนอนหลับลึกค่ะ ";
        hasIsiIssue = true;
      }
      if (isiAnswers[2] >= 2) {
        evalText += "ข้อที่สาม ตื่นเช้าผิดปกติพลางนาฬิกาชีวิตหดสั้น ข้อควรระวังคือห้ามมองหาหรือจับมือถือมาปัดเช็กทันทีหลังจากตื่น เพราะแสงสีฟ้าล่อใจจะประเมินสัญญาณตื่นให้สมองและยุติการหลับทันที แนะนำปล่อยความรู้สึกหลวมๆ ในห้องมืดสลัวค่ะ ";
        hasIsiIssue = true;
      }
      if (isiAnswers[5] >= 2) {
        evalText += "ข้อที่สี่ มีความคิดหมุนวนกังวลเรื่องการนอนสูง จิตใต้สำนึกระแวง ส่งผลให้สมองหลั่งฮอร์โมนตื่นเตลิด แนะนำบำบัดด้วย เบรนดัมพ์ จดระบายทุกความกังวลใส่กระดาษ หนึ่งชั่วโมงครึ่งก่อนนอน เพื่อให้สมองเคลียร์ช่องทางสื่อสารเสร็จสิ้นค่ะ ";
        hasIsiIssue = true;
      }
      if (!hasIsiIssue) {
        evalText += "โดยรวมสัญญาณด้านสรีระกระตุ้นการนอนไม่หลับสมดุลดีเลิศเป็นธรรมชาติดีมากค่ะ ";
      }

      // ESS Analysis
      evalText += "หมวดพฤติกรรมความง่วงกลางวันสะสม อีเอสเอส ";
      if (essAnswers.some(v => v >= 2)) {
        evalText += "พบคะแนนง่วงเฉียบพลันช่วงกลางวันปานกลางถึงสูงในบางกิจกรรม บ่งชี้ว่าคุณภาพการนอนหลับลึกโบยบินหายไป ทำให้สมองไม่ได้รับการกำจัดกรดสารเคมีอย่างเพียงพอก่อนลืมตา แนะนำงดงีบหลับกลางวันที่ยาวเกินยี่สิบห้านาทีในช่วงบ่าย เพื่อไม่ให้ดึงพลังหลับลึกของคืนถัดไปลดลงค่ะ ";
      } else {
        evalText += "การตื่นสมาธิความโปร่งใสกลางวันปกติสมบูรณ์ดีเยี่ยมค่ะ ";
      }

      // STOP-BANG Analysis
      evalText += "หมวดโครงสร้างสอดรับความเสี่ยงหายใจขัดข้อง สต็อปแบง ";
      let hasStopBangIssue = false;
      if (stopBangAnswers[0] === 1) {
        evalText += "มีอาการนอนกรนส่งเสียงสะเทือนรบกวน เกิดจากสรีระกล้ามเนื้อคอคลายตกอุดลมหายใจเป็นช่วงๆ แนะนำฝืนฝึกนอนตะแคงข้างตัว กอดหมอนข้างทรงสปริงแข็ง เพื่อเหนี่ยวแนวหลอดลมให้เบาสบายสม่ำเสมอค่ะ ";
        hasStopBangIssue = true;
      }
      if (stopBangAnswers[2] === 1) {
        evalText += "มีผู้พบเจอสะดุ้งตัวสลึมตื่นสำลักอากาศกลางดึก เป็นสัญญาณบอกเหตุ of ภาวะหยุดหายใจที่อันตรายสูงสุดสะสม แนะนำรีบติดต่อศูนย์โรคการนอนหลับเพื่อตรวจคัดกรอง สลีปเทสต์ หรือติดต่อแพทย์เฉพาะทาง อย่าละเลยเด็ดขาดค่ะ ";
        hasStopBangIssue = true;
      }
      if (stopBangAnswers[3] === 1) {
        evalText += "มีภาวะความดันโลหิตสูงรุมเร้าประจำตัว โรคหลอดเลือดคุมยากสัมพันธ์กับการบีบคาร์บอนไดออกไซด์ขาดอากาศเวลากระดูกล้มตัวกรนสลบ ควรพกพาเครื่องวัดความดันคอยมอนิเตอร์หลังลืมตาทุกเช้าค่ะ ";
        hasStopBangIssue = true;
      }
      if (stopBangAnswers[6] === 1) {
        evalText += "ขนาดรอบลำคอพังพานใหญ่เกินเกณฑ์เฉลี่ย มีโอกาสท่ออากาศเปิดแคบได้เร็วกว่าคนปกติ แนะนำหนุนไหล่สะโพกสูงสิบห้าถึงสามสิบองศาขณะเอนหัวนอนเพื่อหนีแนวโน้มหลอดลมหุบปิดพับค่ะ ";
        hasStopBangIssue = true;
      }
      if (!hasStopBangIssue) {
        evalText += "สภาพแนวทางลมหายใจหลอดลมสะดวกโยธินปลอดโปร่งปลอดภัยค่ะ ";
      }

      const chunks = splitTextIntoSentences(evalText);
      const utterances: SpeechSynthesisUtterance[] = [];

      setIsSpeakingEval(true);

      chunks.forEach((chunk, index) => {
        const u = new SpeechSynthesisUtterance(chunk);
        u.lang = 'th-TH';
        u.rate = 1.05;

        const voices = synthRef.current?.getVoices() || [];
        const thVoice = voices.find(v => v.lang.includes('th') || v.lang === 'th-TH');
        if (thVoice) {
          u.voice = thVoice;
        }

        if (index === chunks.length - 1) {
          u.onend = () => {
            setIsSpeakingEval(false);
            activeUtterancesRef.current = [];
          };
        }
        u.onerror = (e) => {
          console.error("Speech eval error:", e);
          setIsSpeakingEval(false);
          activeUtterancesRef.current = [];
        };
        utterances.push(u);
      });

      activeUtterancesRef.current = utterances;

      if (synthRef.current.paused) {
        synthRef.current.resume();
      }

      utterances.forEach(u => synthRef.current?.speak(u));
    }
  }, [isiAnswers, essAnswers, stopBangAnswers, isSpeaking, isSpeakingEval, splitTextIntoSentences]);

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
    if (score <= 21) return { text: "ปัญหอนอนไม่หลับระดับความรุนแรงปานกลาง (Clinical insomnia - moderate)", color: "text-orange-700 bg-orange-50 border-orange-200", bg: "bg-orange-50" };
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
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
    try {
      const resp = await fetch('/api/gemini/analyze-screening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          isi: totalIsi,
          ess: totalEss,
          stopBang: totalStopBang,
          riskLevel: overallRisk,
          isiAnswers,
          essAnswers,
          stopBangAnswers
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
  }, [patientId, totalIsi, totalEss, totalStopBang, overallRisk, isiAnswers, essAnswers, stopBangAnswers]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handleSubmit = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
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
  }, [patientId, totalIsi, totalEss, totalStopBang, overallRisk, isiAnswers, essAnswers, stopBangAnswers, onSaveAssessment]);

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
    <div className="space-y-6 animate-fade-in">
      {/* Header และแถบเมนูประเมิน */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-sleep-blue-50 text-sleep-blue-900 transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-6 h-6" />
              <span className="text-sm font-semibold text-sleep-blue-900 hidden sm:inline">ย้อนกลับ</span>
            </button>
          )}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-sleep-blue-900 flex items-center gap-2">
              <ClipboardCheck className="w-7 h-7 text-sleep-gold-500" />
              แบบประเมินสุขภาพการนอนเชิงลึก (Clinical Sleep Screening)
            </h2>
            <p className="text-sm text-sleep-blue-600">วิเคราะห์ภาวะนอนไม่หลับ ความง่วงเวลากลางวัน และภาวะหยุดหายใจขณะหลับ (OSA)</p>
          </div>
        </div>
        {existingAssessment && (
          <button
            onClick={handleLoadExisting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sleep-blue-50 hover:bg-sleep-blue-100 text-sleep-blue-900 border border-sleep-blue-200 rounded-xl text-xs font-semibold transition"
          >
            <Activity className="w-4 h-4 text-sleep-gold-500 animate-pulse" />
            มีประวัติของวันนี้ ({existingAssessment.date}) แล้ว
          </button>
        )}
      </div>

      {/* เลือกแท็บการประเมินย่อย */}
      <div className="flex border-b border-sleep-blue-100 gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => { setActiveSubTab('isi'); setIsiIndex(0); }}
          className={`px-4 py-2.5 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'isi'
              ? 'border-sleep-gold-500 text-sleep-blue-900'
              : 'border-transparent text-sleep-blue-400 hover:text-sleep-blue-900'
          }`}
        >
          <Moon className="w-4 h-4" />
          1. ดัชนีความรุนแรงการนอนไม่หลับ (ISI)
          <span className="text-xs bg-sleep-blue-50 px-2 py-0.5 rounded-full font-mono">
            {isiAnswers.filter((v, i) => i <= isiIndex).length}/7
          </span>
        </button>
        <button
          onClick={() => { setActiveSubTab('ess'); setEssIndex(0); }}
          className={`px-4 py-2.5 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'ess'
              ? 'border-sleep-gold-500 text-sleep-blue-900'
              : 'border-transparent text-sleep-blue-400 hover:text-sleep-blue-900'
          }`}
        >
          <Sun className="w-4 h-4" />
          2. ความง่วงระหว่างวัน (ESS)
          <span className="text-xs bg-sleep-blue-50 px-2 py-0.5 rounded-full font-mono">
            {essAnswers.filter((v, i) => i <= essIndex).length}/8
          </span>
        </button>
        <button
          onClick={() => { setActiveSubTab('stopbang'); setStopBangIndex(0); }}
          className={`px-4 py-2.5 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'stopbang'
              ? 'border-sleep-gold-500 text-sleep-blue-900'
              : 'border-transparent text-sleep-blue-400 hover:text-sleep-blue-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          3. ความเสี่ยงการหยุดหายใจ (STOP-BANG)
          <span className="text-xs bg-sleep-blue-50 px-2 py-0.5 rounded-full font-mono">
            {stopBangAnswers.filter((v, i) => i <= stopBangIndex).length}/8
          </span>
        </button>
      </div>

      {/* พื้นที่ทำแบบสอบถามทีละข้อ */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-sleep-blue-100 min-h-[300px] flex flex-col justify-between font-medium">
        <AnimatePresence mode="wait">
          {activeSubTab === 'isi' && (
            <motion.div
              key={`isi-${isiIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-4"
            >
              <div className="text-xs font-semibold text-sleep-gold-500 uppercase tracking-wider">
                แบบประเมิน ISI • ข้อที่ {isiIndex + 1} จาก 7
              </div>
              <h3 className="text-lg font-bold text-sleep-blue-900 leading-snug">
                {ISI_QUESTIONS[isiIndex].text}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mt-4">
                {ISI_QUESTIONS[isiIndex].options.map((opt, valIndex) => {
                  const val = ISI_QUESTIONS[isiIndex].values[valIndex];
                  const isSelected = isiAnswers[isiIndex] === val;
                  return (
                    <button
                      key={valIndex}
                      onClick={() => handleIsiChange(isiIndex, val)}
                      className={`p-4 rounded-2xl text-center font-medium border-2 transition text-sm flex flex-col items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'border-sleep-gold-500 bg-sleep-cream text-sleep-blue-950 font-bold shadow-xs'
                          : 'border-gray-100 hover:border-sleep-blue-200 text-sleep-blue-500 bg-white'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${
                        isSelected ? 'bg-sleep-gold-500 border-sleep-gold-600 text-white font-bold' : 'border-gray-200'
                      }`}>
                        {val}
                      </span>
                      <span>{opt.split(' (')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeSubTab === 'ess' && (
            <motion.div
              key={`ess-${essIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-4"
            >
              <div className="text-xs font-semibold text-sleep-gold-500 uppercase tracking-wider">
                แบบประเมิน ESS (ประเมินตามโอกาสสุ่มงีบวูบในกิจกรรมสัปดาห์ปัจจุบัน) • ข้อที่ {essIndex + 1} จาก 8
              </div>
              <h3 className="text-lg font-bold text-sleep-blue-900 leading-snug">
                สถานการณ์: {ESS_QUESTIONS[essIndex]}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4">
                {[
                  { text: "ไม่มีโอกาสที่จะงีบหลับเลย (0)", val: 0 },
                  { text: "มีโอกาสรินๆ งีบน้อย (1)", val: 1 },
                  { text: "มีโอกาสปานกลางที่จะงีบ (2)", val: 2 },
                  { text: "มีโอกาสสูงมากที่จะสลบวูบ (3)", val: 3 }
                ].map((opt) => {
                  const isSelected = essAnswers[essIndex] === opt.val;
                  return (
                    <button
                      key={opt.val}
                      onClick={() => handleEssChange(essIndex, opt.val)}
                      className={`p-4 rounded-2xl text-center font-medium border-2 transition text-sm flex flex-col items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'border-sleep-gold-500 bg-sleep-cream text-sleep-blue-950 font-bold shadow-xs'
                          : 'border-gray-100 hover:border-sleep-blue-200 text-sleep-blue-500 bg-white'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${
                        isSelected ? 'bg-sleep-gold-500 border-sleep-gold-600 text-white font-bold' : 'border-gray-200'
                      }`}>
                        {opt.val}
                      </span>
                      <span>{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeSubTab === 'stopbang' && (
            <motion.div
              key={`stopbang-${stopBangIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-4"
            >
              <div className="text-xs font-semibold text-sleep-gold-500 uppercase tracking-wider">
                แบบคัดกรอง STOP-BANG • ข้อที่ {stopBangIndex + 1} จาก 8
              </div>
              <h3 className="text-lg font-bold text-sleep-blue-900 leading-snug">
                {STOPBANG_QUESTIONS[stopBangIndex]}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 max-w-md">
                <button
                  onClick={() => handleStopBangChange(stopBangIndex, 1)}
                  className={`p-4 rounded-2xl text-center font-bold border-2 transition text-sm flex items-center justify-center gap-2 ${
                    stopBangAnswers[stopBangIndex] === 1
                      ? 'border-sleep-gold-500 bg-sleep-cream text-sleep-blue-950 shadow-xs'
                      : 'border-gray-100 hover:border-sleep-blue-200 text-sleep-blue-500 bg-white'
                  }`}
                >
                  <Check className="w-4 h-4 text-green-600" />
                  ใช่ (Yes) - ได้คะแนน 1 คะแนน
                </button>
                <button
                  onClick={() => handleStopBangChange(stopBangIndex, 0)}
                  className={`p-4 rounded-2xl text-center font-bold border-2 transition text-sm flex items-center justify-center gap-2 ${
                    stopBangAnswers[stopBangIndex] === 0
                      ? 'border-sleep-gold-500 bg-sleep-cream text-sleep-blue-950 shadow-xs'
                      : 'border-gray-100 hover:border-sleep-blue-200 text-sleep-blue-500 bg-white'
                  }`}
                >
                  ไม่มี / ไม่ใช่ (No) - 0 คะแนน
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ปุ่มเลื่อนข้อด้านล่างฟอร์มคำถาม */}
        <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-6">
          <button
            onClick={clickBack}
            className="px-4 py-2 rounded-xl border border-sleep-blue-200 text-sleep-blue-900 hover:bg-sleep-blue-50 transition font-semibold text-sm"
          >
            ← ย้อนกลับ
          </button>
          <div>
            {activeSubTab !== 'stopbang' && (
              <button
                onClick={clickNext}
                className="px-4 py-2 rounded-xl bg-sleep-blue-900 text-white font-semibold text-sm hover:bg-sleep-blue-950 transition"
              >
                ข้าม / ถัดไป →
              </button>
            )}
            {activeSubTab === 'stopbang' && stopBangIndex === 7 && (
              <span className="text-green-600 font-bold text-sm bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 flex items-center gap-1">
                <Check className="w-4 h-4" /> ตอบแบบทดสอบครบถ้วน
              </span>
            )}
          </div>
        </div>
      </div>

      {/* สรุปผลและปุ่มบันทึก */}
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

      {/* บทประเมินพฤติกรรมแยกรายข้ออย่างละเอียดสำหรับใช้ทางบ้าน */}
      <div className="bg-white rounded-3xl p-6 shadow border border-sleep-blue-100/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-gray-50 pb-3">
          <div>
            <h4 className="font-semibold text-lg text-sleep-blue-900 flex items-center gap-2">
              <Moon className="w-5 h-5 text-sleep-gold-500" />
              บทประเมินพฤติกรรมรายข้อสำหรับบ้าน (Tailored Clinical Evaluation)
            </h4>
            <p className="text-[10px] text-amber-600 mt-1 font-normal leading-normal">
              ℹ️ หากเสียงเงียบใน iPhone/iPad กรุณาเปิดสวิตช์เปิดเสียง (Ring switch) ด้านข้างเครื่อง และเปิดเสียงมีเดียขึ้นด้วยนะคะ
            </p>
          </div>
          <button
            onClick={handleToggleSpeechEval}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold analytics-btn transition shadow-sm select-none ${
              isSpeakingEval
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-sleep-blue-900 text-white hover:bg-sleep-blue-950'
            }`}
          >
            {isSpeakingEval ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                หยุดอ่านออกเสียงพฤติกรรม
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                ให้ AI อ่านวิเคราะห์ให้ฟัง
              </>
            )}
          </button>
        </div>

        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 text-sm text-sleep-blue-950">
          <p className="text-xs text-gray-500 mb-2 font-medium">✨ คอร์สแก้ไขและเหตุผลทางวิทยาศาสตร์การนอนแยกรายข้อตามคำตอบของคุณ:</p>
          
          {/* ISI Review */}
          <div className="space-y-3">
            <h5 className="font-medium text-sleep-gold-600 border-l-2 border-sleep-gold-400 pl-2">ดัชนีและพฤติกรรมท้าทาย (ISI)</h5>
            {isiAnswers[0] >= 2 ? (
              <div className="p-3 bg-red-50/50 rounded-xl border border-red-100 flex gap-2">
                <span className="text-lg">🕒</span>
                <div>
                  <p className="font-semibold text-red-800">มีภาวะกล่อมตัวเองยากร่วมนอนช้า (SOL &gt; 15-30 นาที)</p>
                  <p className="text-xs text-red-700/90 mt-0.5">เกิดจากสภาวะจิตใจตื่นตัวพยายามบังคับสมองให้นอน แนะนำกฎบำบัด CBT-I คุมสิ่งเร้า (Stimulus Control): หากเริ่มล้มตัวนอน 20 นาทีแล้วยังไม่หลับ ห้ามฝืนนอนดิ้นเด็ดขาด ให้ระเห็จออกจากเตียงนั่งเก้าอี้แสงสลัว อ่านหนังสือจนง่วงย้อยค่อยกลับมานอนใหม่</p>
                </div>
              </div>
            ) : null}
            {isiAnswers[1] >= 2 ? (
              <div className="p-3 bg-red-50/50 rounded-xl border border-red-100 flex gap-2">
                <span className="text-lg">⚡</span>
                <div>
                  <p className="font-semibold text-red-800">มีปัญหาตื่นสะดุ้งกลางคืนรบกวน (ตื่นแล้วหลับต่อยาก)</p>
                  <p className="text-xs text-red-700/90 mt-0.5">มักเกี่ยวเนื่องกับอุณหภูมิแกนตัวพุ่งสูงหรือความเครียดค้าง แนะนำงดเครื่องดื่มทุกประเภท 2.5 ชั่วโมงก่อนนอน งดสิ่งเร้าเร่งด่วน และรักษาห้องนอนที่ 24-25°C เพื่อคงสมาธิร่างกายช่วงนอนหลับลึก</p>
                </div>
              </div>
            ) : null}
            {isiAnswers[2] >= 2 ? (
              <div className="p-3 bg-red-50/50 rounded-xl border border-red-100 flex gap-2">
                <span className="text-lg">🌅</span>
                <div>
                  <p className="font-semibold text-red-800">ตื่นเช้าผิดปกติพลางนาฬิกาชีวิตหดสั้น</p>
                  <p className="text-xs text-red-700/90 mt-0.5">ห้ามมองหาหรือจับมือถือมาปัดเช็กทันทีหลังจากตื่น เพราะแสงสีฟ้าล่อใจจะประเมินสัญญาณตื่นให้สมองและยุติหลับทันที แนะนำปล่อยความรู้สึกหลวมๆ ในห้องมืดสลัว</p>
                </div>
              </div>
            ) : null}
            {isiAnswers[5] >= 2 ? (
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 flex gap-2">
                <span className="text-lg">🧠</span>
                <div>
                  <p className="font-semibold text-amber-800">มีความคิดหมุนวนกังวลเรื่องการนอนสูง</p>
                  <p className="text-xs text-amber-700/90 mt-0.5">จิตใต้สำนึกระแวง ส่งผลให้สมองหลั่งฮอร์โมนตื่นเตลิด แนะนำบำบัดด้วย Brain Dump (จดระบายทุกความกังวลใส่กระดาษ) 1.5 ชั่วโมงก่อนนอน เพื่อให้สมองเคลียร์ช่องทางสื่อสารเสร็จสิ้น</p>
                </div>
              </div>
            ) : null}
            {isiAnswers[0] < 2 && isiAnswers[1] < 2 && isiAnswers[2] < 2 && isiAnswers[5] < 2 ? (
              <p className="text-xs text-green-600 pl-2">✓ สัญญาณด้านสรีระกระตุ้นการนอนไม่หลับสมดุลดีเลิศ</p>
            ) : null}
          </div>

          {/* ESS Review */}
          <div className="space-y-3 pt-2">
            <h5 className="font-medium text-sleep-blue-600 border-l-2 border-sleep-blue-400 pl-2">พฤติกรรมความง่วงกลางวันสะสม (ESS)</h5>
            {essAnswers.some(v => v >= 2) ? (
              <div className="p-3 bg-sleep-blue-50/40 rounded-xl border border-sleep-blue-100 flex gap-2">
                <span className="text-lg">🥱</span>
                <div>
                  <p className="font-semibold text-sleep-blue-800">พบคะแนนง่วงเฉียบพลันช่วงกลางวันปานกลาง-สูงในบางกิจกรรม</p>
                  <p className="text-xs text-sleep-blue-700 mt-0.5">บ่งชี้ว่าคุณภาพการนอนหลับลึกโบยบินหายไป (Sleep Quality Loss) ทำให้สมองไม่ได้รับการกำจัดกรดสารเคมีอย่างเพียงพอก่อนลืมตา แนะนำงดงีบหลับกลางวันที่ยาวเกิน 25 นาทีในช่วงบ่าย เพื่อไม่ให้ดึงพลังหลับลึกของคืนถัดไปลดลง</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-green-600 pl-2">✓ การตื่นสมาธิความโปร่งใสกลางวันปกติสมบูรณ์</p>
            )}
          </div>

          {/* STOP-BANG Review */}
          <div className="space-y-3 pt-2">
            <h5 className="font-medium text-red-600 border-l-2 border-red-400 pl-2">โครงสร้างสอดรับความเสี่ยงหายใจขัดข้อง (STOP-BANG)</h5>
            {stopBangAnswers[0] === 1 ? (
              <div className="p-3 bg-red-50/50 rounded-xl border border-red-100 flex gap-2">
                <span className="text-lg">📢</span>
                <div>
                  <p className="font-semibold text-red-800">มีอาการนอนกรนส่งเสียงสะเทือนรบกวน</p>
                  <p className="text-xs text-red-700/90 mt-0.5">เกิดจากสรีระกล้ามเนื้อคอคลายตกอุดลมหายใจเป็นช่วงๆ แนะนำฝืนฝึกนอนตะแคงข้างตัว (กอดหมอนข้างทรงสปริงแข็ง) เพื่อเหนี่ยวแนวหลอดลมให้เบาสบายสม่ำเสมอ</p>
                </div>
              </div>
            ) : null}
            {stopBangAnswers[2] === 1 ? (
              <div className="p-3 bg-red-100/50 rounded-xl border border-red-200 flex gap-2">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="font-semibold text-red-950">มีผู้พบเจอสะดุ้งตัวสลึมตื่นสำลักอากาศกลางดึก</p>
                  <p className="text-xs text-red-800 mt-0.5">เป็นสัญญาณบอกเหตุของภาวะหยุดหายใจที่อันตรายสูงสุดสะสม แนะนำรีบติดต่อศูนย์โรคการนอนหลับเพื่อตรวจคัดกรอง Sleep Test หรือติดต่อแพทย์เฉพาะทาง อย่าละเลยเด็ดขาด</p>
                </div>
              </div>
            ) : null}
            {stopBangAnswers[3] === 1 ? (
              <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-100 flex gap-2">
                <span className="text-lg">🛑</span>
                <div>
                  <p className="font-semibold text-amber-800">มีภาวะความดันโลหิตสูงรุมเร้าประจำตัว</p>
                  <p className="text-xs text-amber-700/90 mt-0.5">โรคหลอดเลือดคุมยากสัมพันธ์กับการบีบคาร์บอนฯ มะรุมมะตุ้มขาดอากาศเวลากระดูกล้มตัวกรนสลบ ควรพกพาเครื่องวัดความดันคอยมอนิเตอร์หลังลืมตาทุกเช้า</p>
                </div>
              </div>
            ) : null}
            {stopBangAnswers[6] === 1 ? (
              <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-100 flex gap-2">
                <span className="text-lg">🧣</span>
                <div>
                  <p className="font-semibold text-amber-800">ขนาดรอบลำคอพังพานใหญ่เกินเกณฑ์เฉลี่ย</p>
                  <p className="text-xs text-amber-700/90 mt-0.5">มีโอกาสท่ออากาศเปิดแคบได้เร็วกว่าคนปกติ แนะนำหนุนไหล่สะโพกสูง 15-30 องศาขณะเอนหัวนอนเพื่อหนีแนวโน้มหลอดลมหุบปิดพับ</p>
                </div>
              </div>
            ) : null}
            {stopBangAnswers[0] !== 1 && stopBangAnswers[2] !== 1 && stopBangAnswers[3] !== 1 && stopBangAnswers[6] !== 1 ? (
              <p className="text-xs text-green-600 pl-2">✓ สภาพแนวทางลมหายใจหลอดลมสะดวกโยธินปลอดโปร่ง</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow border">
        <div className="flex justify-between items-center bg-white">
          <div className="flex gap-2 items-center"><Sparkles className="text-sleep-gold-500 w-5 h-5"/> <span className="font-bold text-sleep-blue-900 text-base">Cozmos Sleep AI Analyst</span></div>
          <button 
            onClick={fetchAiAdvice} 
            disabled={loadingAdvice} 
            className="bg-sleep-gold-500 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-sleep-gold-400 leading-none h-[38px] flex items-center justify-center text-sleep-blue-950 transition"
          >
            {loadingAdvice ? 'กำลังวิเคราะห์ด้วย AI...' : 'วิเคราะห์ด้วย AI'}
          </button>
        </div>
        {aiAdvice && (
          <div className="mt-4 p-4 bg-sleep-blue-50/80 rounded-xl border border-sleep-blue-100 md:p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-sleep-blue-100/50 p-3 rounded-xl border border-sleep-blue-100/80 gap-2 mb-4">
              <div className="flex flex-col">
                <span className="text-xs text-sleep-blue-900 font-medium flex items-center gap-1.5 leading-normal">
                  <Sparkles className="w-3.5 h-3.5 text-sleep-gold-500 animate-pulse flex-shrink-0" />
                  มีเสียงโค้ช AI คอสมอสคอยอ่านภาษาไทยวิจัยเรื่องการนอนให้คุณฟัง:
                </span>
                <span className="text-[10px] text-amber-600 mt-1 font-normal leading-normal">
                  ℹ️ ผู้ใช้ iPhone/iPad: หากไม่ได้ยินเสียง กรุณากดปุ่มเปิดเสียงด้านข้างเครื่อง (ปิดโหมดสั่น/ดึงแถบปิดเสียงขึ้น) และเพิ่มเสียงมีเดียด้วยนะคะ
                </span>
              </div>
              <button
                onClick={handleToggleSpeech}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm select-none ${
                  isSpeaking
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-sleep-blue-900 text-white hover:bg-sleep-blue-950'
                }`}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    หยุดอ่านออกเสียง
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    ให้ AI อ่านให้ฟัง
                  </>
                )}
              </button>
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-sleep-blue-950 font-normal">{aiAdvice}</div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center bg-sleep-cream/10 p-4 rounded-2xl border border-sleep-blue-50/80 gap-4">
        <div className="text-xs text-gray-500 flex items-center gap-2 max-w-xl"><AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0"/> การประเมินเบื้องต้นตามแบบสกรีนนิ่งระดับวิจัยวิชาการทางคลินิก ไม่สามารถทดแทนการสั่งการหรือวินิจฉัยจากแพทย์โรคการนอนหลับเฉพาะทางโดยตรง</div>
        <div className="flex gap-4 items-center justify-end w-full sm:w-auto">
          {saveStatus && <span className="text-green-600 text-xs font-semibold animate-pulse shrink-0">{saveStatus}</span>}
          <button 
            onClick={handleSubmit} 
            className="bg-sleep-blue-900 hover:bg-sleep-blue-950 text-white px-6 py-2.5 rounded-xl font-bold transition text-sm flex items-center gap-1.5 shadow-sm active:scale-95 select-none shrink-0"
          >
            บันทึกผลประเมิน
          </button>
        </div>
      </div>
    </div>
  );
}
