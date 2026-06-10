/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WellnessUsage } from '../types';
import { 
  Sparkles, Wind, Volume2, VolumeX, Feather, Compass, Play, Square, RefreshCw, 
  AlertCircle, Clock, TimerOff, ArrowLeft, Flame, Sun, Droplet, CloudRain, Waves, Trees,
  Heart   // ใช้ Heart เป็น icon สำหรับเสียงขันธิเบต
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WellnessInterventionProps {
  patientId: string;
  onLogWellnessUsage: (wellness: WellnessUsage) => void;
  userZodiac?: 'ไฟ' | 'ดิน' | 'ลม' | 'น้ำ' | '';
  onBack?: () => void;
}

// มีแค่ 4 ธาตุ เหมือนเดิม
const ZODIAC_DATA = {
  'ไฟ': { element: 'ธาตุไฟ', signs: 'เมษ, สิงห์, ธนู', suggested: 'breathing', icon: Flame, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', desc: 'ผู้มีพลังและความคิดสร้างสรรค์สูง แต่มักรบกวนด้วยสมองที่ไม่ยอมตัดวงจร' },
  'ดิน': { element: 'ธาตุดิน', signs: 'พฤษภ, กันย์, มกร', suggested: 'soundscape', icon: Sun, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', desc: 'ผู้มีความรับผิดชอบสูง ตารางการนอนค่อนข้างมั่นคง แต่มักกังวลส่วนลึก' },
  'ลม': { element: 'ธาตุลม', signs: 'เมถุน, ตุลย์, กุมภ์', suggested: 'braindump', icon: Wind, bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', desc: 'ผู้ที่สมองติดฟุ้งซ่าน คิดเรื่องอนาคต ไอเดียพลุ่งพล่านใกล้เข้านอน' },
  'น้ำ': { element: 'ธาตุน้ำ', signs: 'กรกฎ, พิจิก, มีน', suggested: 'soundscape', icon: Droplet, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', desc: 'ผู้ใช้อารมณ์ความรู้สึกนำทาง ละเอียดอ่อน อิทธิพลรอบกายรบกวนจิตใจได้ง่าย' }
};

const BREATHING = {
  '478': { in: 4, hold: 7, out: 8, cyclesGoal: 4 },
  box: { in: 4, hold: 4, out: 4, holdAfter: 4, cyclesGoal: 4 }
};

export default function WellnessIntervention({ 
  patientId, onLogWellnessUsage, userZodiac = '', onBack 
}: WellnessInterventionProps) {
  const [activeSubsection, setActiveSubsection] = useState<'zodiac' | 'breathing' | 'soundscape' | 'braindump'>('zodiac');
  const [subsectionStack, setSubsectionStack] = useState<string[]>([]);
  const [selectedZodiac, setSelectedZodiac] = useState<'ไฟ' | 'ดิน' | 'ลม' | 'น้ำ' | ''>(userZodiac || 'ดิน');

  // Breathing states
  const [breathingType, setBreathingType] = useState<'478' | 'box'>('478');
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<string>('หายใจเข้า');
  const [breathingSecondsLeft, setBreathingSecondsLeft] = useState(0);
  const [breathingCyclesCompleted, setBreathingCyclesCompleted] = useState(0);
  const breathingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const breathingLoggedRef = useRef(false);

  // Soundscape states (5 เสียง รวม khandi)
  const [playingSounds, setPlayingSounds] = useState<Record<string, boolean>>({
    white: false, rain: false, ocean: false, forest: false, khandi: false
  });
  const [volumeLevels, setVolumeLevels] = useState<Record<string, number>>({
    white: 0.3, rain: 0.5, ocean: 0.5, forest: 0.4, khandi: 0.4
  });
  const [soundscapeLogged, setSoundscapeLogged] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundNodesRef = useRef<Record<string, { source: AudioNode | AudioNode[]; gain: GainNode; filter?: BiquadFilterNode; lfo?: OscillatorNode }>>({});
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [audioError, setAudioError] = useState<string | null>(null);

  // Sleep Timer states
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemainingSeconds, setSleepTimerRemainingSeconds] = useState<number | null>(null);
  const sleepTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fadeOutIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Brain Dump states
  const [brainDumpText, setBrainDumpText] = useState('');
  const [dumpReleased, setDumpReleased] = useState(false);
  const [releasing, setReleasing] = useState(false);

  // Navigation
  const goToSubsection = useCallback((sub: string) => {
    if (sub === activeSubsection) return;
    setSubsectionStack(prev => [...prev, activeSubsection]);
    setActiveSubsection(sub as any);
  }, [activeSubsection]);

  const goBackSubsection = useCallback(() => {
    if (subsectionStack.length === 0) return;
    const prev = subsectionStack[subsectionStack.length - 1];
    setSubsectionStack(prevStack => prevStack.slice(0, -1));
    setActiveSubsection(prev as any);
  }, [subsectionStack]);

  // Audio
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current;
    try {
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtor) throw new Error('เบราว์เซอร์ไม่รองรับ Web Audio API');
      const ctx = new AudioCtor();
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 64;
      analyserRef.current.connect(ctx.destination);
      audioCtxRef.current = ctx;
      setAudioError(null);
      return ctx;
    } catch (err) {
      setAudioError('ไม่สามารถเริ่มระบบเสียงบำบัดได้ กรุณาใช้เบราว์เซอร์ที่ทันสมัย');
      return null;
    }
  }, []);

  const createNoiseBuffer = useCallback((ctx: AudioContext) => {
    const bufferSize = ctx.sampleRate * 1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }, []);

  const startSound = useCallback((type: string) => {
    const ctx = initAudio();
    if (!ctx || soundNodesRef.current[type]) return;
    const gainNode = ctx.createGain();
    gainNode.gain.value = volumeLevels[type];
    let source: AudioNode | AudioNode[];

    if (type === 'white') {
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = createNoiseBuffer(ctx);
      noiseNode.loop = true;
      noiseNode.start();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      noiseNode.connect(filter);
      filter.connect(gainNode);
      source = noiseNode;
    } else if (type === 'rain') {
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = createNoiseBuffer(ctx);
      noiseSource.loop = true;
      noiseSource.start();
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 450;
      filter.Q.value = 0.5;
      noiseSource.connect(filter);
      filter.connect(gainNode);
      source = noiseSource;
    } else if (type === 'ocean') {
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = createNoiseBuffer(ctx);
      noiseSource.loop = true;
      noiseSource.start();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.08;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 250;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      noiseSource.connect(filter);
      filter.connect(gainNode);
      source = noiseSource;
    } else if (type === 'forest') {
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = createNoiseBuffer(ctx);
      noiseSource.loop = true;
      noiseSource.start();
      const filter = ctx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = 250;
      filter.Q.value = 5;
      const lfo = ctx.createOscillator();
      lfo.type = 'triangle';
      lfo.frequency.value = 0.15;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 100;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      noiseSource.connect(filter);
      filter.connect(gainNode);
      source = noiseSource;
    } else if (type === 'khandi') {
      // เสียงขันธิเบต: สังเคราะห์ด้วย oscillator ความถี่ 136.1 Hz และ 272.2 Hz
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = 136.1;
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 272.2;
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      gain1.gain.value = 0.7;
      gain2.gain.value = 0.3;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1000;
      osc1.connect(gain1);
      osc2.connect(gain2);
      gain1.connect(filter);
      gain2.connect(filter);
      filter.connect(gainNode);
      osc1.start();
      osc2.start();
      source = [osc1, osc2];
      soundNodesRef.current[type] = { source, gain: gainNode, filter };
      return;
    } else {
      return;
    }
    gainNode.connect(analyserRef.current!);
    soundNodesRef.current[type] = { source, gain: gainNode };
  }, [initAudio, createNoiseBuffer, volumeLevels]);

  const stopSound = useCallback((type: string) => {
    const node = soundNodesRef.current[type];
    if (!node) return;
    if (Array.isArray(node.source)) {
      node.source.forEach(src => { try { (src as OscillatorNode).stop(); } catch {} });
    } else {
      try { (node.source as AudioBufferSourceNode).stop(); } catch {}
    }
    if (node.lfo) try { node.lfo.stop(); } catch {}
    delete soundNodesRef.current[type];
  }, []);

  const toggleSound = useCallback((type: string) => {
    const isPlaying = playingSounds[type];
    if (!isPlaying) {
      startSound(type);
      if (!soundscapeLogged) {
        setSoundscapeLogged(true);
        const today = new Date().toISOString().split('T')[0];
        const log: any = {
          patientId, date: today, zodiacType: selectedZodiac,
          whiteNoise: 0, rainSound: 0, oceanSound: 0, forestSound: 0, khandiSound: 0,
          breathingSession: 0, brainDump: 0
        };
        if (type === 'white') log.whiteNoise = 1;
        else if (type === 'rain') log.rainSound = 1;
        else if (type === 'ocean') log.oceanSound = 1;
        else if (type === 'forest') log.forestSound = 1;
        else if (type === 'khandi') log.khandiSound = 1;
        onLogWellnessUsage(log as WellnessUsage);
      }
    } else {
      stopSound(type);
    }
    setPlayingSounds(prev => ({ ...prev, [type]: !isPlaying }));
  }, [playingSounds, startSound, stopSound, soundscapeLogged, patientId, selectedZodiac, onLogWellnessUsage]);

  const handleVolume = useCallback((type: string, val: number) => {
    setVolumeLevels(prev => ({ ...prev, [type]: val }));
    if (soundNodesRef.current[type]) {
      soundNodesRef.current[type].gain.gain.value = val;
    }
  }, []);

  // Sleep Timer (เหมือนเดิม)
  const clearSleepTimer = useCallback(() => {
    if (sleepTimerIntervalRef.current) clearInterval(sleepTimerIntervalRef.current);
    if (fadeOutIntervalRef.current) clearInterval(fadeOutIntervalRef.current);
    sleepTimerIntervalRef.current = null;
    fadeOutIntervalRef.current = null;
    setSleepTimerRemainingSeconds(null);
  }, []);

  const startSleepTimer = useCallback((minutes: number) => {
    clearSleepTimer();
    if (minutes <= 0) return;
    const endTime = Date.now() + minutes * 60 * 1000;
    setSleepTimerRemainingSeconds(minutes * 60);
    sleepTimerIntervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setSleepTimerRemainingSeconds(remaining);
      if (remaining <= 5 && remaining > 0 && !fadeOutIntervalRef.current) {
        fadeOutIntervalRef.current = setInterval(() => {
          const anyPlaying = Object.values(playingSounds).some(v => v === true);
          if (!anyPlaying) { clearSleepTimer(); return; }
          Object.keys(playingSounds).forEach(type => {
            if (playingSounds[type] && soundNodesRef.current[type]) {
              const newVol = Math.max(0, volumeLevels[type] - 0.02);
              handleVolume(type, newVol);
              if (newVol <= 0.01) toggleSound(type);
            }
          });
        }, 500);
      }
      if (remaining <= 0) {
        clearSleepTimer();
        Object.keys(playingSounds).forEach(type => { if (playingSounds[type]) toggleSound(type); });
        setSleepTimerMinutes(null);
      }
    }, 1000);
  }, [clearSleepTimer, playingSounds, volumeLevels, handleVolume, toggleSound]);

  const handleSetSleepTimer = useCallback((minutes: number | null) => {
    setSleepTimerMinutes(minutes);
    if (minutes === null || minutes === 0) clearSleepTimer();
    else {
      const anyPlaying = Object.values(playingSounds).some(v => v === true);
      if (anyPlaying) startSleepTimer(minutes);
    }
  }, [clearSleepTimer, playingSounds, startSleepTimer]);

  useEffect(() => {
    const anyPlaying = Object.values(playingSounds).some(v => v === true);
    if (anyPlaying && sleepTimerMinutes !== null && sleepTimerMinutes > 0 && !sleepTimerIntervalRef.current)
      startSleepTimer(sleepTimerMinutes);
    else if (!anyPlaying && sleepTimerIntervalRef.current) clearSleepTimer();
  }, [playingSounds, sleepTimerMinutes, startSleepTimer, clearSleepTimer]);

  // Canvas visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => {
      const container = canvas.parentElement;
      if (container) { canvas.width = container.clientWidth; canvas.height = 96; }
    };
    resize();
    window.addEventListener('resize', resize);
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      if (!analyserRef.current || !ctx) return;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const width = canvas.width, height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = '#f1b32d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const step = width / dataArray.length;
      for (let i = 0; i < dataArray.length; i++) {
        const x = i * step;
        const y = height/2 + (dataArray[i]/128)*(height/3);
        if (i===0) ctx.moveTo(x,y);
        else ctx.lineTo(x,y);
      }
      ctx.stroke();
    };
    draw();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
      observer.disconnect();
    };
  }, []);

  // Breathing (ย่อแล้ว เหมือนเดิม)
  const stopBreathing = useCallback(() => {
    if (breathingIntervalRef.current) clearInterval(breathingIntervalRef.current);
    setBreathingActive(false);
    setBreathingPhase('หายใจเข้า');
    breathingLoggedRef.current = false;
  }, []);

  const runBreathingPhase = useCallback((phase: string, duration: number) => {
    setBreathingPhase(phase);
    setBreathingSecondsLeft(duration);
    if (breathingIntervalRef.current) clearInterval(breathingIntervalRef.current);
    let remaining = duration;
    breathingIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setBreathingSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(breathingIntervalRef.current!);
        const type = breathingType;
        const config = BREATHING[type];
        if (phase === 'หายใจเข้า') runBreathingPhase('กั้นลมหายใจ', config.hold);
        else if (phase === 'กั้นลมหายใจ') runBreathingPhase('หายใจออก', config.out);
        else if (phase === 'หายใจออก') {
          if (type === 'box') runBreathingPhase('หยุดก่อนเริ่ม', (config as any).holdAfter);
          else {
            const newCycles = breathingCyclesCompleted + 1;
            setBreathingCyclesCompleted(newCycles);
            if (newCycles >= config.cyclesGoal) {
              stopBreathing();
              if (!breathingLoggedRef.current) {
                breathingLoggedRef.current = true;
                const today = new Date().toISOString().split('T')[0];
                onLogWellnessUsage({
                  patientId, date: today, zodiacType: selectedZodiac,
                  whiteNoise:0, rainSound:0, oceanSound:0, forestSound:0, khandiSound:0,
                  breathingSession:1, brainDump:0
                });
              }
            } else runBreathingPhase('หายใจเข้า', config.in);
          }
        } else if (phase === 'หยุดก่อนเริ่ม') {
          const newCycles = breathingCyclesCompleted + 1;
          setBreathingCyclesCompleted(newCycles);
          if (newCycles >= (BREATHING.box as any).cyclesGoal) {
            stopBreathing();
            if (!breathingLoggedRef.current) {
              breathingLoggedRef.current = true;
              onLogWellnessUsage({
                patientId, date: new Date().toISOString().split('T')[0], zodiacType: selectedZodiac,
                whiteNoise:0, rainSound:0, oceanSound:0, forestSound:0, khandiSound:0,
                breathingSession:1, brainDump:0
              });
            }
          } else runBreathingPhase('หายใจเข้า', (BREATHING.box as any).in);
        }
      }
    }, 1000);
  }, [breathingType, breathingCyclesCompleted, patientId, selectedZodiac, onLogWellnessUsage, stopBreathing]);

  const startBreathing = useCallback(() => {
    stopBreathing();
    setBreathingActive(true);
    setBreathingCyclesCompleted(0);
    breathingLoggedRef.current = false;
    const config = BREATHING[breathingType];
    runBreathingPhase('หายใจเข้า', config.in);
  }, [breathingType, runBreathingPhase, stopBreathing]);

  const handleBrainDump = useCallback(() => {
    if (!brainDumpText.trim()) return;
    setReleasing(true);
    setTimeout(() => {
      setReleasing(false);
      setDumpReleased(true);
      const today = new Date().toISOString().split('T')[0];
      onLogWellnessUsage({
        patientId, date: today, zodiacType: selectedZodiac,
        whiteNoise:0, rainSound:0, oceanSound:0, forestSound:0, khandiSound:0,
        breathingSession:0, brainDump:1
      });
      setBrainDumpText('');
    }, 3000);
  }, [brainDumpText, patientId, selectedZodiac, onLogWellnessUsage]);

  useEffect(() => {
    return () => {
      Object.values(soundNodesRef.current).forEach(node => {
        if (Array.isArray(node.source)) node.source.forEach(s => { try { (s as OscillatorNode).stop(); } catch {} });
        else try { (node.source as AudioBufferSourceNode).stop(); } catch {}
        if (node.lfo) try { node.lfo.stop(); } catch {}
      });
      soundNodesRef.current = {};
      if (audioCtxRef.current) audioCtxRef.current.close().catch(console.error);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (breathingIntervalRef.current) clearInterval(breathingIntervalRef.current);
      clearSleepTimer();
    };
  }, [clearSleepTimer]);

  // Render functions
  const renderZodiac = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><Compass className="w-8 h-8 text-sleep-gold-500" /><h3 className="text-lg font-semibold">Zodiac Sleep Sync — ค้นหาธาตุคลายเครียดธรรมชาติ</h3></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.keys(ZODIAC_DATA) as Array<keyof typeof ZODIAC_DATA>).map(key => {
          const data = ZODIAC_DATA[key];
          const Icon = data.icon;
          const isSelected = selectedZodiac === key;
          return (
            <button key={key} onClick={() => setSelectedZodiac(key)} className={`p-4 rounded-2xl text-left border-2 transition ${data.bg} ${isSelected ? 'border-sleep-gold-500 shadow-md' : 'border-sleep-blue-100 opacity-80'}`}>
              <Icon className="w-6 h-6 mb-2" /><div className="font-bold">{data.element}</div><div className="text-xs text-sleep-blue-600">{data.signs}</div>
            </button>
          );
        })}
      </div>
      {selectedZodiac && (
        <motion.div className="p-5 bg-sleep-gold-50 rounded-2xl space-y-3">
          <p className="text-sm">{ZODIAC_DATA[selectedZodiac].desc}</p>
          <button onClick={() => goToSubsection(ZODIAC_DATA[selectedZodiac].suggested)} className="bg-sleep-blue-900 text-white px-4 py-2 rounded-xl text-sm">ไปยังกิจกรรมแนะนำ</button>
        </motion.div>
      )}
    </div>
  );

  const renderBreathing = () => (
    <div className="space-y-6">
      <div className="flex justify-between flex-wrap gap-3">
        <h3 className="text-lg font-semibold"><Wind className="w-5 h-5 inline" /> บริหารลมหายใจ</h3>
        <div className="flex gap-2">
          <button onClick={()=>{stopBreathing(); setBreathingType('478');}} className={`px-3 py-1 rounded-lg text-sm ${breathingType==='478'?'bg-sleep-blue-900 text-white':'bg-sleep-cream'}`}>แบบ 4-7-8</button>
          <button onClick={()=>{stopBreathing(); setBreathingType('box');}} className={`px-3 py-1 rounded-lg text-sm ${breathingType==='box'?'bg-sleep-blue-900 text-white':'bg-sleep-cream'}`}>แบบ Box</button>
        </div>
      </div>
      <div className="flex flex-col items-center bg-sleep-cream rounded-3xl p-6">
        <div className="relative w-48 h-48">
          <div className={`absolute rounded-full bg-sleep-gold-200 transition-all duration-1000 ${breathingActive && breathingPhase==='หายใจเข้า' ? 'scale-150' : 'scale-100'}`} style={{width:'100%',height:'100%'}}/>
          <div className="bg-sleep-blue-900 text-white rounded-full w-36 h-36 flex flex-col items-center justify-center absolute top-6 left-6">
            <Wind className="w-6 h-6 text-sleep-gold-400"/><span className="text-sm mt-1">{breathingActive?breathingPhase:'พร้อม'}</span>
            {breathingActive && <span className="text-3xl font-bold">{breathingSecondsLeft}</span>}
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          {!breathingActive ? <button onClick={startBreathing} className="bg-sleep-gold-500 px-6 py-2 rounded-xl"><Play className="w-4 h-4 inline"/> เริ่ม</button> : <button onClick={stopBreathing} className="bg-red-500 text-white px-6 py-2 rounded-xl">หยุด</button>}
          <button onClick={()=>{stopBreathing(); setBreathingCyclesCompleted(0);}} className="border px-4 py-2 rounded-xl">รีเซ็ต</button>
        </div>
        <div className="mt-2 text-sm">รอบที่ทำ: {breathingCyclesCompleted} / {BREATHING[breathingType].cyclesGoal}</div>
      </div>
    </div>
  );

  const renderSoundscape = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div><h3 className="text-lg font-semibold">เสียงบำบัดสังเคราะห์</h3>{audioError && <div className="text-red-500 text-xs"><AlertCircle className="w-4 h-4 inline"/>{audioError}</div>}</div>
        <div className="flex items-center gap-2 bg-sleep-cream p-2 rounded-xl">
          <Clock className="w-4 h-4"/><span className="text-xs">ปิดเสียงอัตโนมัติ:</span>
          {[15,30,45,60].map(min=><button key={min} onClick={()=>handleSetSleepTimer(min)} className={`px-2 py-1 text-xs rounded-lg ${sleepTimerMinutes===min?'bg-sleep-gold-500':'bg-white border'}`}>{min}</button>)}
          <button onClick={()=>handleSetSleepTimer(null)} className={`px-2 py-1 text-xs rounded-lg ${sleepTimerMinutes===null?'bg-sleep-blue-900 text-white':'bg-white border'}`}>ปิด</button>
        </div>
      </div>
      {sleepTimerRemainingSeconds!==null && <div className="text-center text-sm bg-sleep-gold-50 p-2 rounded-xl">⏳ ปิดใน {Math.floor(sleepTimerRemainingSeconds/60)}:{sleepTimerRemainingSeconds%60}</div>}
      <canvas ref={canvasRef} className="w-full h-24 bg-sleep-blue-900 rounded-2xl"/>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {key:'white', label:'White Noise', icon:Volume2},
          {key:'rain', label:'ฝนตก', icon:CloudRain},
          {key:'ocean', label:'คลื่นทะเล', icon:Waves},
          {key:'forest', label:'ป่าไม้', icon: Trees},
          {key:'khandi', label:'ขันธิเบต (เสียงระฆังสมาธิ)', icon:Heart}
        ].map(s=>(
          <div key={s.key} className="flex items-center justify-between p-3 bg-sleep-cream rounded-xl">
            <div className="flex-1">
              <div className="flex items-center gap-2"><s.icon className="w-4 h-4"/> {s.label}</div>
              <input type="range" min="0" max="1" step="0.05" value={volumeLevels[s.key]} onChange={e=>handleVolume(s.key, parseFloat(e.target.value))} className="w-full mt-1"/>
            </div>
            <button onClick={()=>toggleSound(s.key)} className={`w-12 h-12 rounded-full flex items-center justify-center ${playingSounds[s.key] ? 'bg-sleep-gold-500' : 'bg-white border'}`}>
              {playingSounds[s.key] ? '⏸️' : '▶️'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBrainDump = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold"><Feather className="w-5 h-5 inline"/> ระบายความคิดก่อนนอน</h3>
      <AnimatePresence mode="wait">
        {!dumpReleased ? (
          <motion.div key="form" exit={{opacity:0,y:-20}} className="space-y-3">
            <textarea value={brainDumpText} onChange={e=>setBrainDumpText(e.target.value)} placeholder="เขียนทุกสิ่งที่กังวล..." className="w-full h-40 p-4 bg-sleep-gold-50 rounded-2xl" disabled={releasing}/>
            {releasing && <div className="text-center animate-pulse">กำลังปลดปล่อย...</div>}
            <div className="flex justify-end gap-2">
              <button onClick={()=>setBrainDumpText('')} disabled={releasing} className="border px-4 py-2 rounded-xl">ล้าง</button>
              <button onClick={handleBrainDump} disabled={releasing||!brainDumpText.trim()} className="bg-sleep-blue-900 text-white px-6 py-2 rounded-xl">ปลดปล่อย ✨</button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="result" className="text-center p-8 bg-sleep-gold-50 rounded-2xl">
            <Feather className="w-12 h-12 mx-auto mb-3"/><h4 className="text-xl font-semibold">จิตใจปลอดโปร่งแล้ว</h4>
            <button onClick={()=>setDumpReleased(false)} className="mt-4 text-sm underline">เขียนอีกครั้ง</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        {onBack && <button onClick={onBack} className="p-2 rounded-full hover:bg-sleep-blue-100"><ArrowLeft className="w-5 h-5"/></button>}
        {subsectionStack.length>0 && <button onClick={goBackSubsection} className="p-2 rounded-full hover:bg-sleep-blue-100 flex items-center gap-1 text-sm"><ArrowLeft className="w-4 h-4"/> ย้อนกลับ</button>}
        <h2 className="text-2xl font-semibold flex items-center gap-2"><Sparkles className="text-sleep-gold-500"/> กิจกรรมคลายเครียดก่อนนอน</h2>
      </div>
      <div className="flex gap-2 border-b pb-2 overflow-x-auto">
        <button onClick={()=>goToSubsection('zodiac')} className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${activeSubsection==='zodiac'?'bg-sleep-blue-900 text-white':'hover:bg-sleep-blue-50'}`}>🔮 ธาตุราศี</button>
        <button onClick={()=>goToSubsection('breathing')} className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${activeSubsection==='breathing'?'bg-sleep-blue-900 text-white':'hover:bg-sleep-blue-50'}`}>🌬️ ลมหายใจ</button>
        <button onClick={()=>goToSubsection('soundscape')} className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${activeSubsection==='soundscape'?'bg-sleep-blue-900 text-white':'hover:bg-sleep-blue-50'}`}>🎵 เสียงบำบัด</button>
        <button onClick={()=>goToSubsection('braindump')} className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${activeSubsection==='braindump'?'bg-sleep-blue-900 text-white':'hover:bg-sleep-blue-50'}`}>📝 ระบายความคิด</button>
      </div>
      <div className="bg-white rounded-3xl p-6 shadow-sm border">
        {activeSubsection === 'zodiac' && renderZodiac()}
        {activeSubsection === 'breathing' && renderBreathing()}
        {activeSubsection === 'soundscape' && renderSoundscape()}
        {activeSubsection === 'braindump' && renderBrainDump()}
      </div>
    </div>
  );
}