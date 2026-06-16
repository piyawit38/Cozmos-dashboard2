/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Journal, DailyFactors } from '../types';
import { Mic, Brain, Sparkles, Send, Calendar, MessageSquare, AlertCircle, Compass, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AIReflectionProps {
  patientId: string;
  onSaveJournalRecord: (journal: Journal) => void;
  journalsList: Journal[];
  currentDailyFactors?: DailyFactors;
}

export default function AIReflection({
  patientId,
  onSaveJournalRecord,
  journalsList,
  currentDailyFactors
}: AIReflectionProps) {
  const [journalText, setJournalText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ mood: string; aiInsight: string } | null>(null);
  const [errorText, setErrorText] = useState('');
  const [usedVoice, setUsedVoice] = useState(false);

  const recognitionRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [reelRotation, setReelRotation] = useState(0);

  const activePatientJournals = journalsList.filter(j => j.patientId === patientId);

  // Check speech recognition service on mount
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'th-TH'; // Primary Thai language config

      rec.onstart = () => {
        setIsRecording(true);
        setErrorText('');
      };

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setUsedVoice(true);
          setJournalText((prev) => {
            const trimmedPrev = prev.trim();
            const trimmedFinal = finalTranscript.trim();
            if (trimmedPrev.endsWith(trimmedFinal)) return prev;
            return trimmedPrev ? `${trimmedPrev} ${trimmedFinal}` : trimmedFinal;
          });
        }

        if (interimTranscript) {
          setTranscript(interimTranscript);
        } else {
          setTranscript('');
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition Error:", e);
        if (e.error === 'not-allowed') {
          setErrorText('🎙️ ไม่สามารถเข้าถึงไมโครโฟนได้: กรุณาคลิกไอคอนแม่กุญแจ 🔒 ที่แถบพิมพ์ลิงก์เว็บด้านบน แล้วปรับสิทธิ์ "ไมโครโฟน (Microphone)" ให้เป็น "อนุญาต (Allow)" จากนั้นพิมพ์หรือบันทึกใหม่อีกครั้งครับ');
        } else if (e.error === 'no-speech') {
          console.warn("Speech Recognition Warning: no-speech detected.");
        } else {
          setErrorText(`🎙️ ข้อผิดพลาดไมโครโฟน (${e.error || 'กรุณาตรวจสอบการตั้งค่า'}): กรุณาลองตรวจสอบสิทธิ์หรือเปิดใช้งานเว็บบนเบราว์เซอร์ Google Chrome เพื่อผลลัพธ์ที่ดีที่สุด`);
        }
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
        setTranscript('');
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Voice recording simulation visual waves on Canvas
  useEffect(() => {
    if (!isRecording) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let frame = 0;

    const drawWaves = () => {
      frame++;
      // Rotate the music tape reels
      setReelRotation(prev => (prev + 2.5) % 360);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Draw standard voice waves
      ctx.strokeStyle = '#f1b32d';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      
      for (let i = 0; i < width; i++) {
        const amplitude = isRecording ? 12 + Math.random() * 15 : 1;
        const waveY = height / 2 + Math.sin(i * 0.08 + frame * 0.15) * amplitude * Math.sin(i * 0.01);
        if (i === 0) ctx.moveTo(i, waveY);
        else ctx.lineTo(i, waveY);
      }
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(drawWaves);
    };

    drawWaves();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isRecording]);

  const handleToggleRecord = () => {
    if (!speechSupported || !recognitionRef.current) {
      setErrorText('🎙️ ขออภัย อุปกรณ์หรือเว็บบนเบราว์เซอร์นี้ไม่รองรับการแปลเสียงพูดเป็นตัวอักษรไทย กรุณาใช้การพิมพ์ข้อความด้านล่างแทนนะครับ');
      return;
    }

    setErrorText('');
    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Failed to stop recognition:", e);
      }
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start recognition:", err);
        setErrorText('🎙️ ไม่สามารถเริ่มใช้งานไมโครโฟนได้ในขณะนี้ กรุณาเปิดสิทธิ์ไมโครโฟนของคุณก่อนทดลองใหม่อีกครั้ง');
      }
    }
  };

  const handleAnalyzeAndSave = async () => {
    if (!journalText.trim()) {
      setErrorText('กรุณากรอกหรือบันทึกเสียงไดอารี่ระบายความในใจก่อนกดส่งเพื่อวิเคราะห์นะครับ');
      return;
    }

    setErrorText('');
    setIsAnalyzing(true);
    setAnalysisResult(null);

    // Compile daily factors to provide context to Gemini
    let dailyFactorsText = '';
    if (currentDailyFactors) {
      dailyFactorsText = `ความเครียดระดับ ${currentDailyFactors.stressScore}/10, งดหน้าจอ: Screen Time ${currentDailyFactors.screenTime} ชม., ดื่มคาเฟอีน: ${currentDailyFactors.caffeine} แก้ว, ออกกำลังกาย: ${currentDailyFactors.exercise} นาที`;
    }

    try {
      const resp = await fetch('/api/gemini/analyze-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journalText,
          dailyFactorsText
        })
      });

      if (!resp.ok) {
        throw new Error(`เซิร์ฟเวอร์ส่งคืนรหัสข้อผิดพลาด HTTP ${resp.status}`);
      }

      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      const computedMood = data.mood || 'Neutral';
      const aiInsight = data.aiInsight || 'จากการบันทึกสุขนิสัยการนอน แนะนำให้ออกกำลังกายสม่ำเสมอเพื่อฟื้นฟูลมหายใจยามนอน';

      const today = new Date().toISOString().split('T')[0];
      const payload: Journal = {
        patientId,
        date: today,
        mood: computedMood,
        journalText,
        voiceJournal: usedVoice || isRecording,
        aiInsight
      };

      onSaveJournalRecord(payload);
      setAnalysisResult({ mood: computedMood, aiInsight });
      setJournalText('');
      setUsedVoice(false);
    } catch (err: any) {
      console.error(err);
      setErrorText(`เกิดข้อผิดพลาดในการเชื่อมต่อระบบประมวลผลอัจฉริยะ Gemini (สาเหตุ: ${err.message || 'การเชื่อมต่อเครือข่ายขัดข้อง'}) กรุณาทดลองใหม่อีกครั้งครับ`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getMoodBadge = (mood: string) => {
    const moods: { [key: string]: { label: string; bg: string; text: string; emoji: string } } = {
      'Positive': { label: 'มีความสุข / ผ่อนคลาย', bg: 'bg-green-100 border-green-200', text: 'text-green-700', emoji: '😊' },
      'Neutral': { label: 'ปกติ / ทั่วไป', bg: 'bg-indigo-150 border-indigo-200', text: 'text-indigo-700', emoji: '😐' },
      'Sad': { label: 'เหนื่อยล้า / ละเหี่ยใจ', bg: 'bg-blue-100 border-blue-200', text: 'text-blue-750', emoji: '😔' },
      'Stress': { label: 'ตึงเครียด / วิตกคิดวน', bg: 'bg-red-100 border-red-200', text: 'text-red-700', emoji: '😫' }
    };

    return moods[mood] || moods['Neutral'];
  };

  return (
    <div className="space-y-6" id="reflection-container">
      {/* Module Title */}
      <div>
        <h2 className="text-2xl md:text-3xl font-semibold text-sleep-blue-900 flex items-center gap-2">
          <Brain className="w-6 h-6 text-sleep-gold-500" />
          วิเคราะห์ตรวจวัดสภาพจิตใจและอารมณ์ด้วยปัญญาประดิษฐ์
        </h2>
      
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Interactive Tape Recorder & Write Box */}
        <div className="lg:col-span-7 bg-white border border-sleep-blue-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-sleep-blue-50">
            <h3 className="font-semibold text-sleep-blue-900 text-base flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-sleep-gold-500" />
              ระบายความคิด / บันทึกเสียงก่อนเข้านอน
            </h3>
            <span className="text-[11px] bg-sleep-gold-100 text-sleep-blue-950 font-semibold px-2 py-0.5 rounded-md">
              ประมวลผลระบบอัจฉริยะ AI
            </span>
          </div>

          {/* Analog Cassette Tape Player Visualization */}
          <div className="bg-sleep-blue-900 text-white rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between py-6 min-h-[160px] border border-sleep-blue-950 shadow">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-sans tracking-wider font-semibold text-sleep-gold-400">เครื่องบันทึกเสียงสะท้อนอารมณ์ Cozmos</span>
              <div className="flex gap-1.5 items-center">
                <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-sleep-blue-550'}`}></span>
                <span className="text-[10px] font-mono text-sleep-blue-300 font-light uppercase">{isRecording ? 'บันทึกเสียงสด...' : 'เตรียมพร้อม'}</span>
              </div>
            </div>

            {/* Simulated Tape Reel circles */}
            <div className="flex justify-center items-center gap-12 my-3">
              <div className="w-14 h-14 rounded-full border-4 border-dashed border-sleep-blue-500/40 flex items-center justify-center transition-transform duration-100 cursor-pointer" style={{ transform: `rotate(${reelRotation}deg)` }}>
                <div className="w-4 h-4 bg-sleep-gold-400 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-sleep-blue-950 rounded-full"></div>
                </div>
              </div>
              <div className="w-14 h-14 rounded-full border-4 border-dashed border-sleep-blue-500/40 flex items-center justify-center transition-transform duration-100 cursor-pointer" style={{ transform: `rotate(${reelRotation}deg)` }}>
                <div className="w-4 h-4 bg-sleep-gold-400 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-sleep-blue-950 rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Live speech voice wave canvas */}
            <canvas
              ref={canvasRef}
              className={`w-full h-8 opacity-80 ${isRecording ? 'block' : 'hidden'}`}
              width={400}
              height={32}
            />

            {isRecording && transcript && (
              <div className="my-2 py-1 px-2.5 bg-sleep-blue-950/60 rounded-xl border border-sleep-blue-800/80 text-[11px] text-sleep-gold-300 font-light text-center animate-pulse max-h-[50px] overflow-y-auto">
                🎙️ กำลังได้ยิน: <span className="text-white font-serif">"{transcript}"</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] text-sleep-blue-300 font-light truncate max-w-[200px]">
                {isRecording ? '🔊 กำลังบันทึกเสียงพูดสด... ถือไมโครโฟนให้อยู่ใกล้ตัว' : '💡 กดปุ่มไมค์เพื่อบันทึกและแปลงเสียงพูดแทนการพิมพ์ได้จริง'}
              </span>
              <button
                type="button"
                onClick={handleToggleRecord}
                className={`p-2.5 rounded-full flex items-center justify-center transition focus:outline-none shrink-0 ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-650 text-white shadow-md animate-pulse'
                    : 'bg-sleep-gold-500 hover:bg-sleep-gold-400 text-[#0B1026]'
                }`}
                id="btn-voice-journal"
              >
                {isRecording ? <Square className="w-4 h-4 fill-white text-white" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Type journal editor */}
          <div className="space-y-2">
            <label className="text-xs text-sleep-blue-700 font-semibold block">เขียนสรุปอาการของคุณ ความฝัน คู่อารมณ์สะสมวันนี้</label>
            <textarea
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              placeholder="พิมความสุขก้าวผ่านสะดุด ยิ้มรับ สบายอุ่นใจ ข่มอารมณ์ฟุ้งซ่าน บันทึกความฝัน สกรีนไทม์เยอะ..."
              className="w-full min-h-[140px] p-4 bg-sleep-cream border border-sleep-blue-100 rounded-2xl text-sleep-blue-950 placeholder-sleep-blue-400/50 text-sm focus:outline-none focus:border-sleep-gold-500 resize-none outline-none leading-relaxed"
            />
          </div>

          {errorText && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 p-3 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {errorText}
            </p>
          )}

          <div className="flex justify-between items-center pt-1">
            <span className="text-[11px] text-sleep-blue-600 font-light italic leading-none block">
              *ข้อมูลสุขภาพวันนี้: {currentDailyFactors ? '🟢 บันทึกแล้ว (สกรีนไทม์ หน้าจอบังคับแล้ว)' : '⚡ ยังไม่จัดข้อมูลพฤติกรรมวันนี้'}
            </span>
            <button
              onClick={handleAnalyzeAndSave}
              disabled={isAnalyzing || !journalText.trim()}
              className="bg-sleep-blue-900 hover:bg-sleep-blue-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition inline-flex items-center gap-1.5 shadow"
              id="btn-submit-journal"
            >
              {isAnalyzing ? (
                <>
                  <Compass className="w-4 h-4 animate-spin text-sleep-gold-400" />
                  กำลังล่องสมองประมวลผล...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-sleep-gold-400" />
                  ส่งข้อมูลวิเคราะห์สะท้อนอารมณ์
                </>
              )}
            </button>
          </div>

          {/* Active AI Reflection Response Display */}
          <AnimatePresence>
            {analysisResult && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="p-5 bg-sleep-gold-50 border border-sleep-gold-300 rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between border-b border-sleep-gold-300 pb-2">
                  <h4 className="font-semibold text-sleep-blue-900 text-sm flex items-center gap-1.5">
                    🔮 ผลวิเคราะห์สะสมสะท้อนจิต (Live Analysis)
                  </h4>
                  <div className={`px-2.5 py-0.5 border text-xs font-semibold rounded-full flex items-center gap-1 ${getMoodBadge(analysisResult.mood).bg} ${getMoodBadge(analysisResult.mood).text}`}>
                    <span>{getMoodBadge(analysisResult.mood).emoji}</span>
                    <span>{getMoodBadge(analysisResult.mood).label}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-sleep-blue-500 uppercase tracking-widest font-mono block">
                    Cozmos AI Sleep Care Insight:
                  </span>
                  <p className="text-sm font-light text-sleep-blue-950 leading-relaxed">
                    {analysisResult.aiInsight}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Saved Historic Log list Explorer */}
        <div className="lg:col-span-5 bg-white border border-sleep-blue-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-semibold text-sleep-blue-900 text-md flex items-center gap-1.5 pb-2 border-b border-sleep-blue-50">
              <Calendar className="w-4 h-4 text-sleep-gold-500" />
              ไดอารี่สะท้อนอารมณ์ย้อนหลัง ({activePatientJournals.length})
            </h3>

            {activePatientJournals.length === 0 ? (
              <div className="text-center py-10 bg-sleep-cream/40 rounded-2xl border border-dashed border-sleep-blue-100 text-xs text-sleep-blue-600 space-y-1">
                <MessageSquare className="w-8 h-8 text-sleep-blue-305 mx-auto opacity-70" />
                <p className="font-medium">ยังไม่มีข้อมูลบันทึกอารมณ์สำหรับสมาชิกคนนี้</p>
                <p className="font-light">ลองส่งบันทึกความในใจหรือความรู้สึกเป็นคนแรกของวันนี้นะครับ</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {activePatientJournals.slice().reverse().map((item, idx) => {
                  const badge = getMoodBadge(item.mood);
                  return (
                    <div key={idx} className="p-3 bg-sleep-cream/40 rounded-xl border border-sleep-blue-50 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-[10px] text-sleep-blue-500">
                        <span className="font-mono">{item.date}</span>
                        <div className={`px-2 py-0.5 rounded-full border flex items-center gap-0.5 ${badge.bg} ${badge.text}`}>
                          <span>{badge.emoji}</span>
                          <span>{badge.label.split(' / ')[0]}</span>
                        </div>
                      </div>
                      
                      <p className="text-sleep-blue-900 font-light font-serif leading-relaxed line-clamp-2 italic">
                        "{item.journalText}"
                      </p>

                      <div className="bg-white p-2 rounded-lg border border-sleep-blue-50">
                        <span className="text-[9px] font-bold text-sleep-gold-500 block">COZMOS AI INSIGHT:</span>
                        <p className="text-[10px] text-sleep-blue-600 leading-snug font-light line-clamp-3">
                          {item.aiInsight}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="text-right text-[10px] text-sleep-blue-500 font-light mt-4 pt-4 border-t border-sleep-blue-50">
            ระบบจัดเก็บสะกดคอลัมน์ Sheet 6 : Journal ในแฟ้มงานวิจัยโดยอัตโนมัติ
          </div>
        </div>
      </div>
    </div>
  );
}
