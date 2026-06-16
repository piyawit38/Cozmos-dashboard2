/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import {GoogleGenAI, Type} from '@google/genai';
import {createServer as createViteServer} from 'vite';
import dotenv from 'dotenv';
import { DatabaseState, User, SleepDiary, DailyFactors, Assessment, WellnessUsage, Journal } from './src/types.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Successfully initialized Gemini Client.");
  } else {
    console.log("GEMINI_API_KEY not supplied. Gemini calls will simulate responses.");
  }
} catch (error) {
  console.error("Error setting up Gemini Client:", error);
}

const DB_FILE_PATH = path.join(process.cwd(), 'sleep_data_store.json');

// Prepopulate data with realistic clinical logs for 3 patient personas to ensure beautiful dashboards
const INITIAL_DATABASE: DatabaseState = {
  users: [
    {
      patientId: "CZ-1001",
      age: 28,
      gender: "ชาย",
      birthDate: "1998-05-15",
      weight: 85,
      height: 175,
      bmi: 27.8, // Overweight
      chronicDiseases: "ภูมิแพ้อากาศ"
    },
    {
      patientId: "CZ-1002",
      age: 63,
      gender: "หญิง",
      birthDate: "1963-11-20",
      weight: 54,
      height: 158,
      bmi: 21.6, // Normal
      chronicDiseases: "ความดันโลหิตสูง"
    },
    {
      patientId: "CZ-1003",
      age: 35,
      gender: "ชาย",
      birthDate: "1991-02-10",
      weight: 68,
      height: 172,
      bmi: 23.0, // Normal
      chronicDiseases: "ไม่มี"
    }
  ],
  sleepDiary: [
    // CZ-1001: 5 days of sleep logs
    { patientId: "CZ-1001", date: "2026-06-05", bedTime: "23:45", wakeTime: "06:30", sleepDuration: 6.0, sleepEfficiency: 85.0, awakenings: 2 },
    { patientId: "CZ-1001", date: "2026-06-06", bedTime: "00:15", wakeTime: "06:00", sleepDuration: 5.2, sleepEfficiency: 79.0, awakenings: 3 },
    { patientId: "CZ-1001", date: "2026-06-07", bedTime: "01:30", wakeTime: "07:00", sleepDuration: 5.0, sleepEfficiency: 75.0, awakenings: 4 },
    { patientId: "CZ-1001", date: "2026-06-08", bedTime: "23:50", wakeTime: "06:30", sleepDuration: 6.2, sleepEfficiency: 87.0, awakenings: 1 },
    { patientId: "CZ-1001", date: "2026-06-09", bedTime: "01:10", wakeTime: "06:45", sleepDuration: 5.1, sleepEfficiency: 78.0, awakenings: 3 },

    // CZ-1002: 5 days of sleep logs
    { patientId: "CZ-1002", date: "2026-06-05", bedTime: "22:00", wakeTime: "05:15", sleepDuration: 6.5, sleepEfficiency: 88.0, awakenings: 2 },
    { patientId: "CZ-1002", date: "2026-06-06", bedTime: "22:30", wakeTime: "05:00", sleepDuration: 6.0, sleepEfficiency: 84.0, awakenings: 3 },
    { patientId: "CZ-1002", date: "2026-06-07", bedTime: "23:15", wakeTime: "06:00", sleepDuration: 6.2, sleepEfficiency: 81.0, awakenings: 4 },
    { patientId: "CZ-1002", date: "2026-06-08", bedTime: "21:45", wakeTime: "05:30", sleepDuration: 7.2, sleepEfficiency: 91.0, awakenings: 1 },
    { patientId: "CZ-1002", date: "2026-06-09", bedTime: "22:15", wakeTime: "05:00", sleepDuration: 6.1, sleepEfficiency: 85.0, awakenings: 3 },

    // CZ-1003: 5 days of sleep logs
    { patientId: "CZ-1003", date: "2026-06-05", bedTime: "23:00", wakeTime: "07:00", sleepDuration: 7.5, sleepEfficiency: 93.0, awakenings: 1 },
    { patientId: "CZ-1003", date: "2026-06-06", bedTime: "23:30", wakeTime: "07:30", sleepDuration: 7.2, sleepEfficiency: 90.0, awakenings: 1 },
    { patientId: "CZ-1003", date: "2026-06-07", bedTime: "22:30", wakeTime: "06:30", sleepDuration: 7.5, sleepEfficiency: 94.0, awakenings: 0 },
    { patientId: "CZ-1003", date: "2026-06-08", bedTime: "22:45", wakeTime: "06:45", sleepDuration: 7.5, sleepEfficiency: 94.0, awakenings: 0 },
    { patientId: "CZ-1003", date: "2026-06-09", bedTime: "23:15", wakeTime: "07:00", sleepDuration: 7.2, sleepEfficiency: 91.0, awakenings: 2 }
  ],
  dailyFactors: [
    // CZ-1001
    { patientId: "CZ-1001", date: "2026-06-05", stressScore: 7, caffeine: 3, exercise: 0, screenTime: 4.5, napDuration: 0 },
    { patientId: "CZ-1001", date: "2026-06-06", stressScore: 8, caffeine: 4, exercise: 0, screenTime: 5.0, napDuration: 30 },
    { patientId: "CZ-1001", date: "2026-06-07", stressScore: 9, caffeine: 3, exercise: 0, screenTime: 6.0, napDuration: 20 },
    { patientId: "CZ-1001", date: "2026-06-08", stressScore: 5, caffeine: 2, exercise: 30, screenTime: 2.5, napDuration: 0 },
    { patientId: "CZ-1001", date: "2026-06-09", stressScore: 8, caffeine: 4, exercise: 0, screenTime: 4.8, napDuration: 40 },

    // CZ-1002
    { patientId: "CZ-1002", date: "2026-06-05", stressScore: 4, caffeine: 1, exercise: 20, screenTime: 1.5, napDuration: 15 },
    { patientId: "CZ-1002", date: "2026-06-06", stressScore: 5, caffeine: 2, exercise: 15, screenTime: 2.0, napDuration: 20 },
    { patientId: "CZ-1002", date: "2026-06-07", stressScore: 6, caffeine: 2, exercise: 0, screenTime: 3.5, napDuration: 45 },
    { patientId: "CZ-1002", date: "2026-06-08", stressScore: 2, caffeine: 1, exercise: 30, screenTime: 1.0, napDuration: 0 },
    { patientId: "CZ-1002", date: "2026-06-09", stressScore: 5, caffeine: 3, exercise: 10, screenTime: 2.2, napDuration: 30 },

    // CZ-1003
    { patientId: "CZ-1003", date: "2026-06-05", stressScore: 3, caffeine: 1, exercise: 45, screenTime: 2.0, napDuration: 0 },
    { patientId: "CZ-1003", date: "2026-06-06", stressScore: 4, caffeine: 2, exercise: 50, screenTime: 1.8, napDuration: 0 },
    { patientId: "CZ-1003", date: "2026-06-07", stressScore: 2, caffeine: 1, exercise: 60, screenTime: 1.5, napDuration: 0 },
    { patientId: "CZ-1003", date: "2026-06-08", stressScore: 3, caffeine: 1, exercise: 40, screenTime: 2.0, napDuration: 0 },
    { patientId: "CZ-1003", date: "2026-06-09", stressScore: 4, caffeine: 1, exercise: 30, screenTime: 2.5, napDuration: 0 }
  ],
  assessments: [
    { patientId: "CZ-1001", date: "2026-06-05", isi: 16, ess: 13, stopBang: 4, riskLevel: "ปานกลาง" },
    { patientId: "CZ-1002", date: "2026-06-05", isi: 19, ess: 8, stopBang: 2, riskLevel: "เล็กน้อย" },
    { patientId: "CZ-1003", date: "2026-06-05", isi: 6, ess: 5, stopBang: 1, riskLevel: "ปกติ" }
  ],
  wellnessUsage: [
    // CZ-1001
    { patientId: "CZ-1001", date: "2026-06-05", zodiacType: "ไฟ", whiteNoise: 0, rainSound: 0, oceanSound: 0, forestSound: 0, breathingSession: 1, brainDump: 1 },
    { patientId: "CZ-1001", date: "2026-06-06", zodiacType: "ไฟ", whiteNoise: 15, rainSound: 0, oceanSound: 0, forestSound: 0, breathingSession: 0, brainDump: 1 },
    { patientId: "CZ-1001", date: "2026-06-07", zodiacType: "ไฟ", whiteNoise: 20, rainSound: 0, oceanSound: 5, forestSound: 0, breathingSession: 2, brainDump: 1 },
    { patientId: "CZ-1001", date: "2026-06-08", zodiacType: "ไฟ", whiteNoise: 0, rainSound: 0, oceanSound: 0, forestSound: 0, breathingSession: 1, brainDump: 0 },
    { patientId: "CZ-1001", date: "2026-06-09", zodiacType: "ไฟ", whiteNoise: 10, rainSound: 0, oceanSound: 0, forestSound: 0, breathingSession: 1, brainDump: 1 },

    // CZ-1002
    { patientId: "CZ-1002", date: "2026-06-05", zodiacType: "ดิน", whiteNoise: 30, rainSound: 0, oceanSound: 0, forestSound: 0, breathingSession: 1, brainDump: 0 },
    { patientId: "CZ-1002", date: "2026-06-06", zodiacType: "ดิน", whiteNoise: 45, rainSound: 0, oceanSound: 0, forestSound: 0, breathingSession: 0, brainDump: 0 },
    { patientId: "CZ-1002", date: "2026-06-07", zodiacType: "ดิน", whiteNoise: 30, rainSound: 0, oceanSound: 0, forestSound: 0, breathingSession: 1, brainDump: 1 },
    { patientId: "CZ-1002", date: "2026-06-08", zodiacType: "ดิน", whiteNoise: 20, rainSound: 0, oceanSound: 0, forestSound: 0, breathingSession: 0, brainDump: 0 },
    { patientId: "CZ-1002", date: "2026-06-09", zodiacType: "ดิน", whiteNoise: 40, rainSound: 0, oceanSound: 0, forestSound: 0, breathingSession: 1, brainDump: 0 },

    // CZ-1003
    { patientId: "CZ-1003", date: "2026-06-05", zodiacType: "น้ำ", whiteNoise: 0, rainSound: 10, oceanSound: 15, forestSound: 0, breathingSession: 0, brainDump: 0 },
    { patientId: "CZ-1003", date: "2026-06-06", zodiacType: "น้ำ", whiteNoise: 0, rainSound: 20, oceanSound: 20, forestSound: 10, breathingSession: 1, brainDump: 0 },
    { patientId: "CZ-1003", date: "2026-06-07", zodiacType: "น้ำ", whiteNoise: 0, rainSound: 0, oceanSound: 10, forestSound: 0, breathingSession: 0, brainDump: 0 },
    { patientId: "CZ-1003", date: "2026-06-08", zodiacType: "น้ำ", whiteNoise: 0, rainSound: 10, oceanSound: 10, forestSound: 0, breathingSession: 1, brainDump: 0 },
    { patientId: "CZ-1003", date: "2026-06-09", zodiacType: "น้ำ", whiteNoise: 0, rainSound: 15, oceanSound: 15, forestSound: 0, breathingSession: 0, brainDump: 0 }
  ],
  journals: [
    // CZ-1001
    { patientId: "CZ-1001", date: "2026-06-05", mood: "Stress", journalText: "วันนี้เครียดเรื่องงานมาก สมองไม่ยอมหยุดคิด พยายามข่มตานอนแล้วก็ตื่นบ่อย", voiceJournal: false, aiInsight: "จากการวิเคราะห์ความเครียดสูงสัมพันธ์กับการจดจ่อความคิด แนะนำให้ระบายความคิด Brain Dump ก่อนนอน" },
    { patientId: "CZ-1001", date: "2026-06-06", mood: "Stress", journalText: "ทำงานด่วนถึงดึก ดื่มกาแฟตอนทุ่มนึง นอนไม่หลับเลย หลับได้แปปเดียวตื่นอีก", voiceJournal: true, aiInsight: "การดื่มคาเฟอีนหลังบ่ายสองส่งผลต่อระยะเวลาและการเข้าสู่ช่วงหลับลึกอย่างเห็นได้ชัด" },
    { patientId: "CZ-1001", date: "2026-06-07", mood: "Sad", journalText: "รู้สึกเหนื่อยล้าสะสมจากหลายวันที่นอนน้อย สุขภาพเริ่มแย่ลง มีตื่นกลางดึกบ่อยมาก", voiceJournal: false, aiInsight: "สภาวะอารมณ์ดิ่งอาจเชื่อมโยงกับการอดนอนสะสม หลีกเลี่ยงการดูหน้าจอสมาร์ทโฟนก่อนนอน" },
    { patientId: "CZ-1001", date: "2026-06-08", mood: "Neutral", journalText: "หลังจากไปเตะบอลและลดการจับมือถือ รู้สึกนอนได้ลึกขึ้น ตื่นน้อยลงนิดนึง ดีกว่าวันก่อนๆ", voiceJournal: false, aiInsight: "การออกกำลังกายช่วยผ่อนคลายกล้ามเนื้อและลดความเครียดสะสมได้อย่างยอดเยี่ยม" },
    { patientId: "CZ-1001", date: "2026-06-09", mood: "Stress", journalText: "นอนไม่หลับอีกแล้ว เครียดเรื่องประชุมสัปดาห์หน้า เล่นทวิตเตอร์ในที่มืดนานเกินไป", voiceJournal: true, aiInsight: "Screen time ในที่มืดลดการผลิตสารเมลาโทนิน แนะนำให้งดใช้อุปกรณ์ก่อนนอน 1 ชั่วโมง" },

    // CZ-1002
    { patientId: "CZ-1002", date: "2026-06-05", mood: "Sad", journalText: "ตื่นมาตอนตีสองเพราะปวดฉี่และเริ่มใจสั่น นอนต่อยาวลำบาก รู้สึกอึดอัด", voiceJournal: false, aiInsight: "กลุ่มอายุสูงวัยมักพบการตื่นกลางดึกได้บ่อย พยายามลดของเหลวก่อนเข้านอน 2 ชั่วโมง" },
    { patientId: "CZ-1002", date: "2026-06-06", mood: "Neutral", journalText: "ดื่มชาช่วงบ่ายไปสองแก้ว นอนหลับยากขึ้นนิดหน่อย แต่พอลืมตามาก็สว่างแล้ว", voiceJournal: true, aiInsight: "ชาและเครื่องดื่มคาเฟอีนกระตุ้นประสาททำให้สมองสูงวัยตระหนักถึงสัญญาณรบกวนง่ายขึ้น" },
    { patientId: "CZ-1002", date: "2026-06-07", mood: "Neutral", journalText: "วันนี้ทำบุญช่วงเช้า อารมณ์แจ่มใสดี แต่มีงีบช่วงบ่ายไปเกือบชั่วโมง ตกกลางคืนเลยนอนไม่ค่อยหลับ", voiceJournal: false, aiInsight: "การงีบหลับกลางวันที่นานเกิน 30 นาทีจะรบกวน Sleep Drive หรือความง่วงในช่วงเวลากลางคืน" },
    { patientId: "CZ-1002", date: "2026-06-08", mood: "Positive", journalText: "ได้คุยกับหลานๆ นอนหลับฝันดี อุ่นใจ สบายใจขึ้นมาก ไม่ค่อยตื่นกลางดึกเลย", voiceJournal: true, aiInsight: "ความรู้สึกผ่อนคลายและอุ่นใจมีผลเชิงบวกโดยตรงต่อระบบประสาทพาราซิมพาเธติกทำให้การนอนเสถียร" },
    { patientId: "CZ-1002", date: "2026-06-09", mood: "Neutral", journalText: "รู้สึกปวดไหล่นิดหน่อยตอนนอน นอนพลิกตัวบ่อย มีเสียงรบกวนจากภายนอกค่อนข้างบ่อย", voiceJournal: false, aiInsight: "สภาวะปวดเมื่อยทางกายกระตุ้นการรับรู้เสียงรบกวน แนะนำให้เปิด White Noise เพื่อบดบังเสียงรบกวนดีขึ้น" },

    // CZ-1003
    { patientId: "CZ-1003", date: "2026-06-05", mood: "Positive", journalText: "วันนี้ซ้อมวิ่งมินิมาราธอนล้าพอดี นอนหลับรวดเดียวถึงเช้า รู้สึกสดชื่นมากๆ", voiceJournal: false, aiInsight: "การออกกำลังกายที่เหมาะสมเพิ่มอัตราส่วนการหลับลึกและเพิ่มประสิทธิภาพการฟื้นฟูของสมอง" }
  ],
  vitalSigns: []
};

// Ensure database file is initialized
const loadDatabase = (): DatabaseState => {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && !parsed.vitalSigns) {
        parsed.vitalSigns = [];
      }
      return parsed;
    }
  } catch (error) {
    console.error("Error loading database file, using fallback:", error);
  }
  return INITIAL_DATABASE;
};

const saveDatabase = (state: DatabaseState) => {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error("Error saving database file:", error);
  }
};

let databaseStore = loadDatabase();
saveDatabase(databaseStore);

// Get whole store or discrete portions
app.get('/api/store', (req, res) => {
  res.json(databaseStore);
});

// Update standard sheets
app.post('/api/store/update', (req, res) => {
  try {
    const { key, value } = req.body;
    if (key in databaseStore) {
      (databaseStore as any)[key] = value;
      saveDatabase(databaseStore);
      res.json({ success: true, message: `Updated database key: ${key}` });
    } else {
      res.status(400).json({ error: `Invalid storage key: ${key}` });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sync entire database store from client (Local Storage master)
app.post('/api/store/sync-full', (req, res) => {
  try {
    const fullState = req.body as DatabaseState;
    if (fullState && Array.isArray(fullState.users)) {
      databaseStore = fullState;
      saveDatabase(databaseStore);
      res.json({ success: true, message: "Synchronized entire database state successfully" });
    } else {
      res.status(400).json({ error: "Invalid state payload structure" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create/Update user
app.post('/api/store/user', (req, res) => {
  try {
    const user: User = req.body;
    const existingIndex = databaseStore.users.findIndex(u => u.patientId === user.patientId);
    if (existingIndex !== -1) {
      databaseStore.users[existingIndex] = user;
    } else {
      databaseStore.users.push(user);
    }
    saveDatabase(databaseStore);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user and associated data
app.delete('/api/store/user/:patientId', (req, res) => {
  try {
    const { patientId } = req.params;
    databaseStore.users = databaseStore.users.filter(u => u.patientId !== patientId);
    databaseStore.sleepDiary = databaseStore.sleepDiary.filter(d => d.patientId !== patientId);
    databaseStore.dailyFactors = databaseStore.dailyFactors.filter(f => f.patientId !== patientId);
    databaseStore.assessments = databaseStore.assessments.filter(a => a.patientId !== patientId);
    databaseStore.wellnessUsage = databaseStore.wellnessUsage.filter(w => w.patientId !== patientId);
    databaseStore.journals = databaseStore.journals.filter(j => j.patientId !== patientId);
    if (databaseStore.vitalSigns) {
      databaseStore.vitalSigns = databaseStore.vitalSigns.filter(v => v.patientId !== patientId);
    }
    saveDatabase(databaseStore);
    res.json({ success: true, message: `Deleted user and assoc data: ${patientId}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Log sleep diary & factors together
app.post('/api/store/log-daily', (req, res) => {
  try {
    const { diary, factors, wellness, journal, vital } = req.body;
    
    // Add or update sleep diary
    if (diary) {
      const idx = databaseStore.sleepDiary.findIndex(d => d.patientId === diary.patientId && d.date === diary.date);
      if (idx !== -1) databaseStore.sleepDiary[idx] = diary;
      else databaseStore.sleepDiary.push(diary);
    }

    // Add or update daily factors
    if (factors) {
      const idx = databaseStore.dailyFactors.findIndex(f => f.patientId === factors.patientId && f.date === factors.date);
      if (idx !== -1) databaseStore.dailyFactors[idx] = factors;
      else databaseStore.dailyFactors.push(factors);
    }

    // Add or update assessment
    if (req.body.assessment) {
      const ass = req.body.assessment;
      const idx = databaseStore.assessments.findIndex(a => a.patientId === ass.patientId && a.date === ass.date);
      if (idx !== -1) databaseStore.assessments[idx] = ass;
      else databaseStore.assessments.push(ass);
    }

    // Add or update wellness usage
    if (wellness) {
      const idx = databaseStore.wellnessUsage.findIndex(w => w.patientId === wellness.patientId && w.date === wellness.date);
      if (idx !== -1) databaseStore.wellnessUsage[idx] = wellness;
      else databaseStore.wellnessUsage.push(wellness);
    }

    // Add or update journals
    if (journal) {
      const idx = databaseStore.journals.findIndex(j => j.patientId === journal.patientId && j.date === journal.date);
      if (idx !== -1) databaseStore.journals[idx] = journal;
      else databaseStore.journals.push(journal);
    }

    // Add or update vital signs
    if (vital) {
      if (!databaseStore.vitalSigns) {
        databaseStore.vitalSigns = [];
      }
      const idx = databaseStore.vitalSigns.findIndex(v => v.patientId === vital.patientId && v.date === vital.date);
      if (idx !== -1) databaseStore.vitalSigns[idx] = vital;
      else databaseStore.vitalSigns.push(vital);
    }

    saveDatabase(databaseStore);
    res.json({ success: true, state: databaseStore });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Gemini AI Mood Analysis and Insight generation
app.post('/api/gemini/analyze-journal', async (req, res) => {
  const { journalText, dailyFactorsText } = req.body;
  
  if (!journalText) {
    return res.status(400).json({ error: "No journal context provided" });
  }

  // Fallback dynamic generator if API client isn't active
  const runFallbackSimulation = () => {
    const textLower = journalText.toLowerCase();
    let mood: 'Positive' | 'Neutral' | 'Sad' | 'Stress' = 'Neutral';
    let aiInsight = 'จากการสัมภาษณ์อารมณ์ของคุณอยู่ในเกณฑ์ดี ควรรักษาสุขอนามัยที่ดีต่อไป';

    if (textLower.includes('เครียด') || textLower.includes('กังวล') || textLower.includes('งาน') || textLower.includes('หลับยาก') || textLower.includes('stress') || textLower.includes('worry')) {
      mood = 'Stress';
      aiInsight = 'อารมณ์สัญจรไปอยู่ที่ความตึงเครียด แนะนำการฝึกหายใจ Box Breathing 4-4-4-4 เพื่อปรับระดับความนิ่งของอัตราการเต้นของใจก่อนนอน ร่วมกับการระบายความคิด Brain Dump ครับ';
    } else if (textLower.includes('เศร้า') || textLower.includes('ท้อ') || textLower.includes('เหนื่อย') || textLower.includes('แย่') || textLower.includes('sad') || textLower.includes('depressed')) {
      mood = 'Sad';
      aiInsight = 'พบความรู้สึกหม่นหมองและความรู้สึกเหนื่อยล้าสะสม การนอนไม่หลับสะสมอาจรบกวนสารเคมีแห่งความสุขในสมอง ลองปรับเวลาฟังเสียงโอบอุ้มของธรรมชาติฝนตกหรือคลื่นทะเล และรักษาเวลาเข้านอนให้มั่นคง';
    } else if (textLower.includes('ดี') || textLower.includes('สดชื่น') || textLower.includes('สุข') || textLower.includes('ออกกำลัง') || textLower.includes('happy') || textLower.includes('good')) {
      mood = 'Positive';
      aiInsight = 'ยอดเยี่ยมเลยครับ! การนอนหลับที่เชื่อมโยงกับสภาวะอารมณ์บวกและความสุขจะช่วยฟื้นฟูร่างกายได้ดีขึ้น การออกกำลังกายสม่ำเสมอเป็นตัวเร่งให้การนอนหลับมีเสถียรภาพและเปี่ยมพลัง';
    } else {
      mood = 'Neutral';
      aiInsight = 'สภาวะอารมณ์ปกติและสมดุล เพื่อการนอนที่มีรสนิยมล้ำลึก แนะนำให้นอนในห้องมืดที่เย็นสบาย (ประมาณ 25 องศาเซลเซียส) และหลีกเลี่ยงแสงสีฟ้าจากสกรีนก่อนนอนอย่างน้อย 30 นาที';
    }

    if (dailyFactorsText) {
      aiInsight += ` (วิเคราะห์เปรียบเทียบปัจจัยพฤติกรรม: ${dailyFactorsText})`;
    }

    return { mood, aiInsight };
  };

  if (!ai) {
    console.log("Gemini client not initialized, running simulated local analysis.");
    return res.json(runFallbackSimulation());
  }

  try {
    const prompt = `ช่วยวิเคราะห์อารมณ์และให้ความเห็นเชิงลึกเกี่ยวกับการนอน (Sleep Insight) เป็นภาษาไทยอย่างสว่างอบอุ่นและเข้าใจง่าย (โทนเป็นกันเอง ไม่เป็นราชการหรือวิชาการจนเกินไป) จากบันทึกไดอารี่การนอนดังต่อไปนี้:
บันทึกผู้ใช้: "${journalText}"
${dailyFactorsText ? `ข้อมูลเสริมวิถีชีวิต: ${dailyFactorsText}` : ''}

ความต้องการผลลัพธ์เป็น JSON เท่านั้นที่มีโครงสร้างตรงนี้:
{
  "mood": "หนึ่งในสี่คำนี้เท่านั้น: Positive, Neutral, Sad, Stress",
  "aiInsight": "ความเห็นเชิงลึกและการแนะนำช่วยเหลือสั้นๆ อบอุ่น 2-3 ประโยคในภาษาไทย"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mood: {
              type: Type.STRING,
              description: "The identified mood: Positive, Neutral, Sad, or Stress"
            },
            aiInsight: {
              type: Type.STRING,
              description: "A kind, warm, helpful Thai sentence summarizing sleep guidance"
            }
          },
          required: ["mood", "aiInsight"]
        }
      }
    });

    let cleanedText = (response.text || '{}').trim();
    if (cleanedText.includes('```json')) {
      cleanedText = cleanedText.split('```json')[1].split('```')[0].trim();
    } else if (cleanedText.includes('```')) {
      cleanedText = cleanedText.split('```')[1].split('```')[0].trim();
    }

    const parsedData = JSON.parse(cleanedText);
    console.log("Gemini API parsed analysis output:", parsedData);
    res.json({
      mood: parsedData.mood || 'Neutral',
      aiInsight: parsedData.aiInsight || 'จากการประเมินเบื้องต้น แนะนำให้จัดสิ่งแวดล้อมที่เงียบสงบ หลีกเลี่ยงหน้าจอ 1 ชั่วโมงก่อนนอน และฝึกควบคุมลมหายใจสม่ำเสมอ'
    });
  } catch (err: any) {
    console.error("Gemini runtime error, executing fallback simulation.", err);
    res.json(runFallbackSimulation());
  }
});

// Gemini AI Sleep Screening Advisor
app.post('/api/gemini/analyze-screening', async (req, res) => {
  const { patientId, isi, ess, stopBang, riskLevel, isiAnswers, essAnswers, stopBangAnswers } = req.body;

  const formatIsiDetail = () => {
    if (!isiAnswers || !isiAnswers.length) return "ไม่มีข้อมูลคำตอบแยกรายข้อ";
    const questions = [
      "การหลับยาก (Sleep Onset Latency)",
      "การตื่นกลางดึก (WASO)",
      "การตื่นเช้ามืด (Early Morning Awakening)",
      "ความพึงพอใจต่อการนอนหลับโดยรวม",
      "การรบกวนประสิทธิภาพการใช้ชีวิตกลางวัน",
      "ความวิตกกังวลสะสมในสภาวะการนอนหลับ",
      "คนรอบข้างสังเกตเห็นปัญหาในการนอน"
    ];
    return isiAnswers.map((val: number, i: number) => {
      const scaleText = ["ไม่มีปัญหา (0)", "ระดับเล็กน้อย (1)", "ระดับปานกลาง (2)", "ระดับรุนแรง (3)", "ระดับรุนแรงมากที่สุด (4)"];
      return `- ${questions[i]}: ${scaleText[val] || val}`;
    }).join("\n");
  };

  const formatEssDetail = () => {
    if (!essAnswers || !essAnswers.length) return "ไม่มีข้อมูลคำตอบแยกรายข้อ";
    const questions = [
      "นั่งอ่านหนังสือเงียบๆ ในห้องส่วนตัว",
      "นั่งดูโทรทัศน์ หรือภาพยนตร์ยาวๆ",
      "นั่งเฉยๆ ในสถานที่สาธารณะ (เช่น ห้องประชุม)",
      "นั่งโดยสารในรถยนต์ นั่งเฉยๆ เป็นเวลา 1 ชั่วโมง",
      "นอนราบเพื่อพักผ่อนในเวลากลางวัน หรือบ่าย",
      "นั่งพูดคุยสนทนากับเพื่อนหรือครอบครัว",
      "นั่งอยู่อย่างเงียบสงบหลังจากรับประทานอาหารกลางวัน (ไม่มีแอลกอฮอล์)",
      "นั่งอยู่ในรถยนต์ขณะที่จราจรติดขัดหรือหยุดรอสัญญาณไฟ"
    ];
    return essAnswers.map((val: number, i: number) => {
      const scaleText = ["ไม่มีโอกาสง่วง (0)", "โอกาสง่วงเล็กน้อย (1)", "โอกาสง่วงปานกลาง (2)", "โอกาสง่วงสูงมาก (3)"];
      return `- สถานการณ์ [${questions[i]}]: ${scaleText[val] || val}`;
    }).join("\n");
  };

  const formatStopBangDetail = () => {
    if (!stopBangAnswers || !stopBangAnswers.length) return "ไม่มีข้อมูลคำตอบแยกรายข้อ";
    const questions = [
      "นอนกรนเสียงดังกระแทก (Snoring)",
      "รู้สึกหมดพลัง เหนื่อยล้าสะสม หรือร่วงง่วงระหว่างวันบ่อยๆ (Tired)",
      "มีผู้สังเกตเห็นว่าหยุดหายใจ หรือสะดุ้งเฮือกกลางดึก (Observed apnea)",
      "มีภาวะความดันโลหิตสูง หรือต้องกินยาควบคุมอยู่ (Pressure)",
      "ดัชนีมวลกาย BMI เกิน 35 (BMI)",
      "อายุ 50 ปีบริบูรณ์ขึ้นไป (Age)",
      "รอบลำคอใหญ่ (ชายรอบคอ >= 43 ซม., หญิง >= 40 ซม.) (Neck)",
      "เพศสรีระชาย (Gender)"
    ];
    return stopBangAnswers.map((val: number, i: number) => {
      return `- ${questions[i]}: ${val === 1 ? 'ใช่ (มีสัญญานเสี่ยง)' : 'ไม่ใช่'}`;
    }).join("\n");
  };

  const runFallbackSimulation = () => {
    let advice = `### 🩺 บทสรุปผลการประเมินและการแนะแนวเฉพาะข้อสำหรับคุณ (${patientId})\n\n`;
    advice += `#### 1. คะแนนสุทธิรวม\n`;
    advice += `* **ดัชนีอาการนอนไม่หลับ (ISI):** **${isi}** คะแนน (${isi <= 7 ? 'ปกติ' : isi <= 14 ? 'เริ่มต้นรบกวนบางคืน' : isi <= 21 ? 'ระดับปานกลาง' : 'รุนแรงสูง'})\n`;
    advice += `* **ความง่วงกลางวันสะสม (ESS):** **${ess}** คะแนน (${ess <= 9 ? 'ปกติ' : 'ง่วงนอนในระดับล่อแหลม เสี่ยงหนี้การนอนลึก'})\n`;
    advice += `* **ความเสี่ยงกายภาพหยุดหายใจ (STOP-BANG):** **${stopBang}** คะแนน (ระเบียบความเสี่ยงภาพรวม: **${riskLevel}**)\n\n`;

    advice += `#### 2. ผลการประเมินคำตอบแต่ละข้อและแนวทางแก้ไข (Tailored Item Evaluation)\n`;

    // ISI items
    if (isiAnswers && isiAnswers.length) {
      advice += `##### [ชุดภาวะตื่นตัวและการนอนไม่หลับ (ISI Analysis)]\n`;
      let flaggedIsi = false;
      if (isiAnswers[0] >= 2) {
        advice += `* **ปัญหากล่อมตัวเองหลากเข้านอนช้า (หลับยาก):** คุณมีอาการหลับยากสะสม แนะนำให้บังคับใช้กฎ **CBT-I Stimulus Control** หากล้มตัว 20 นาทียังไม่นอน ให้รีบก้าวออกจากเตียงทันทีเพื่อปรับสมดุลสมองไม่ให้ดื้อยาธรรมชาติ\n`;
        flaggedIsi = true;
      }
      if (isiAnswers[1] >= 2) {
        advice += `* **อาการตื่นสว่างสะดุ้งถี่กลางคืน:** คุณมีปัญหาการนอนไม่ต่อเนื่อง แนะนำให้คุมเสถียรภาพอุณหภูมิห้องนอนที่ 24-25 องศาเซลเซียส งดของเหลวก่อนนอน 2.5 ชั่วโมง และลดอุณหภูมิแกนกายด้วยอาบน้ำอุ่นก่อนนอน 90 นาที\n`;
        flaggedIsi = true;
      }
      if (isiAnswers[2] >= 2) {
        advice += `* **การสะดุ้งเฮือกตื่นเช้ามืดก่อนเวลาเดิม:** อาจสัมพันธ์กับนาฬิกาชีวิตเหวี่ยง แนะนำให้หลีกเลี่ยงการเปิดสกรีนมือถือเช็กเมลหรือแชทเด็ดขาดเมื่อลืมตา ให้รอผ่อนคลายในห้องมืดจนตะวันฉายแสงธรรมชาติเพื่อให้ระดับเมลาโทนินหมุนเวียนปกติ\n`;
        flaggedIsi = true;
      }
      if (isiAnswers[5] >= 2) {
        advice += `* **สภาวะจิตใจคิดกังวลฟุ้งซ่านรบกวนก่อนนอน:** แนะนำบำบัดด้วยการเขียน **Brain Dump** (สมุดบันทึกสลัดอารมณ์เปลือยใจระบายความกังวล) 15 นาทีก่อนนอน ผสานเสียงคลื่น Zodiac เพื่อตัดสัญญาณรบกวนคอร์เท็กซ์\n`;
        flaggedIsi = true;
      }
      if (!flaggedIsi) {
        advice += `* สภาพจิตใจและแรงต้านการหลับในชุดคัดกรอง ISI อยู่ในเกณฑ์ดีและสมดุลไม่มีแรงรั้งพฤติกรรมบกพร่องที่ต้องแก้เร่งด่วน\n`;
      }
    }

    // ESS items
    if (essAnswers && essAnswers.length) {
      advice += `\n##### [ชุดความง่วงงีบสะสมกลางวัน (Daytime Sleepiness Analysis)]\n`;
      let flaggedEss = false;
      const essTriggers = [];
      if (essAnswers[1] >= 2) essTriggers.push("ดูทีวี/ซีรีส์ยาวๆ");
      if (essAnswers[3] >= 2) essTriggers.push("นั่งโดยสารรถยนต์ 1 ชั่วโมง");
      if (essAnswers[4] >= 2) essTriggers.push("นอนราบพักช่วงกลางวัน");
      if (essAnswers[6] >= 2) essTriggers.push("นั่งคุยเงียบๆ หลังอาหารกลางวัน");

      if (essTriggers.length > 0) {
        advice += `* **ความเสี่ยงงีบหลับหล่นร่วงง่ายในสถานการณ์:** คุณพบคลิปง่วงในขณะ **${essTriggers.join(" และ ")}** บ่งชี้ว่าระยะหลับลึกกลางคืน (Slow-wave sleep) ถูกบั่นทอนทำให้สมองขาดการดีท็อกซ์ของเสีย ส่งผลให้สมองเรียกร้องการชดเชยระหว่างวัน แนะนำให้งดงีบหลับกลางวันที่ยาวเกิน 25 นาทีเด็ดขาดเพื่อปกป้องแรงขับนอนหลัก (Sleep Drive) คืนนี้ครับ\n`;
        flaggedEss = true;
      }
      if (!flaggedEss) {
        advice += `* คุณควบคุมระดับความสว่างใสและพลังงานกลางวันได้ดี สมองไม่มีการสะสมกรดอะดีโนซีน (Adenosine) ในสัดส่วนที่เป็นอันตราย\n`;
      }
    }

    // STOP-BANG items
    if (stopBangAnswers && stopBangAnswers.length) {
      advice += `\n##### [ชุดดัชนีโครงสร้างและลมหายใจเสี่ยงหยุดหายใจ (Airway Comfort & STOP-BANG Analysis)]\n`;
      let flaggedStopBang = false;
      if (stopBangAnswers[0] === 1) {
        advice += `* ⚠️ **อาการนอนกรนเสียงกระแทกดังทลาย:** มีความเสี่ยงช่องทางเดินหายใจส่วนบนยุบตัวหย่อนคล้อยขณะหลับกล้ามเนื้อคลายตัว **วิธีพฤติกรรมแก้ไข:** ควรปรับมาฝึก **"นอนตะแคงข้าง"** โดยกอดหมอนข้างทรงแน่น หรือใช้หมอนรองคอปรับระนาบ เพื่อกันเนื้อโคนลิ้นไหลย้อนตกไปอุดหลอดลม\n`;
        flaggedStopBang = true;
      }
      if (stopBangAnswers[2] === 1) {
        advice += `* ⚠️ **อาการมีคนพบลักษณะสะดุ้งตื่นสำลักขาดลมหายใจ:** สัญญาณเตือนสะท้อนเตือนภาวะอุดกั้นหลอดลมวิกฤต **คำแนะนำทางการแพทย์:** เรื่องนี้สำคัญสูงสุด ควรติดต่อโรงพยาบาลเพื่อส่งตรวจทำโปรแกรมตรวจสภาพสมดุลการหายใจ (Polysomnography / Sleep Test) และเลี่ยงแอลกอฮอล์มื้อดึกโดยเด็ดขาดเพราะจะคลายตัวกล้ามเนื้อมารัดกุมทางเดินลมหายใจหนักขึ้น\n`;
        flaggedStopBang = true;
      }
      if (stopBangAnswers[3] === 1) {
        advice += `* ⚠️ **ภาวะความดันโลหิตสูงและทานยาบำรุง:** สัมพันธ์โดยตรงกับการกระตุ้นสารเคมีความเครียดในหลอดเลือดเมื่อร่างกายขาดออกซิเจนกลางคืนเป็นช่วงๆ ควรตรวจเช็กค่าความดันสม่ำเสมอช่วงหลังตื่นนอนทันที\n`;
        flaggedStopBang = true;
      }
      if (stopBangAnswers[6] === 1) {
        advice += `* **รอบลำคอที่อวบใหญ่กว่าเกณฑ์ปกติ:** เนื้อเยื่อรอบรอบคอกระตุ้นแรงกดท่อลมเพิ่มขึ้น วิธีลดความเสี่ยงคือการคุมน้ำหนักและนอนเตียงปรับองศาหัวสูงขึ้นเล็กน้อย\n`;
        flaggedStopBang = true;
      }
      if (!flaggedStopBang) {
        advice += `* สภาพทางเดินลมหายใจและโครงสร้างภายนอกไม่มีความเด่นชัดของภาวะหยุดหายใจ ปลอดภัยดีในระดับใช้ชีวิตทั่วไป\n`;
      }
    }

    advice += `\n#### 3. สรุปโปรแกรมบำบัด Cozmos Sleep Sync สำหรับใช้ในบ้าน\n`;
    advice += `- **สารอาหารกระตุ้นการผ่อนคลายบำบัด:** เสริมด้วยถั่วอัลมอนด์ กล้วยหอม หรือนมอุ่นที่มีทริปโตเฟนธรรมชาติ และงดอาหารมื้อใหญ่ทับซ้อนก่อนเวลานอนอย่างน้อย 3 ชั่วโมง\n`;
    advice += `- **อุณหภูมิและทิศทางลมในห้องนอน:** คุมอุณหภูมิให้อยู่ที่ 24-25 องศา และตั้งทิศทางลมพัดไหลเวียนไม่พัดโดนจมูกหรือศีรษะคนไข้โดยตรงเพื่อคลายเกร็งประสาทสัมผัสซิมพาเธติก\n`;
    advice += `- **เสียงบำบัดความถี่คงที่:** เปิดเสียง White Noise หรือ Rain Sound ต่อเนื่องนาน 45 นาทีด้วยลำโพงในระดับเสียงสลัวต่ำกว่า 40 เดซิเบลเพื่อกลบเกลื่อนเสียงรบกวนสะดุ้งตื่นในบ้านครับ`;

    return advice;
  };

  if (!ai) {
    console.log("No Gemini key. Returning simulated screening evaluation.");
    return res.json({ advice: runFallbackSimulation() });
  }

  try {
    const user = databaseStore.users.find(u => u.patientId === patientId);
    const prompt = `คุณคือโค้ชผู้เชี่ยวชาญการนอนหลับส่วนบุคคลระดับครอบครัวประจำบ้าน (Warm Personal Family Sleep Coach) 
สมาชิกในบ้าน เพศ ${user?.gender || 'ไม่ระบุ'} อายุ ${user?.age || 'ไม่ระบุ'} ปี ค่าน้ำหนักตัว ${user?.weight || 'ไม่ระบุ'} กก. ส่วนสูง ${user?.height || 'ไม่ระบุ'} ซม. มีผลการประเมินคัดกรองการนอนดังนี้:
- ดัชนีภาวะนอนไม่หลับ (ISI): ${isi}/28 คะแนน
- ระดับง่วงนอนสะสมกลางวัน (ESS): ${ess}/24 คะแนน
- ความเสี่ยงต่อภาวะหยุดหายใจขณะหลับ (STOP-BANG): ${stopBang}/8 คะแนน
- ระดับความเสี่ยงภาพรวม: ${riskLevel}

รายละเอียดการตอบคำถามแต่ละข้อของผู้ใช้มีดังนี้:
[รายงานผลคำตอบแยกรายข้อของผู้ใช้]
* แบบประเมินภาวะนอนไม่หลับ (INSOMNIA SEVERITY INDEX - ISI):
${formatIsiDetail()}

* แบบประเมินความง่วงนอนกลางวัน (EPWORTH SLEEPINESS SCALE - ESS):
${formatEssDetail()}

* แบบประเมินโครงสร้างทางเดินลมหายใจที่บกพร่อง (STOP-BANG):
${formatStopBangDetail()}

ช่วยวิเคราะห์ผลและประเมินแบบประเมินและ "ผลคำตอบแต่ละข้อและแนวทางแก้ไข (Tailored Item Evaluation)" เหล่านี้อย่างละเอียด ถี่ถ้วน ลึกซึ้ง และอบอุ่นเป็นกันเองในแบบภาษาไทยที่อ่านง่ายมากสำหรับนำไปปฏิบัติดูแลกันในบ้าน
กรุณาเจาะลึกวิเคราะห์คำตอบรายข้อที่ผู้ใช้ทำคะแนนสูงหรือเลือกเป็น "ใช่" หรือตอบในระดับที่มีความรบกวน:
1. อธิบายเชิงสรีรวิทยาและพฤติกรรมบำบัดธรรมชาติ (CBT-I) ว่า ทำไมอาการในคำตอบข้อเหล่านั้นจึงเกิดขึ้น (เช่น กรนเสียงดังเกิดจากอะไร, ง่วงในรถยนต์บอกถึงสมาธิหรือคุณภาพส่วนลึกอย่างไร, กังวลก่อนนอนกระตุ้นสมองส่วนไหน)
2. บอกวิธีตอบรับ รับมือ และแก้ไขเชิงปรับพฤติกรรมในบ้าน (Lifestyle & Environmental change) ทีละจุดที่ตรงประเด็น เป๊ะๆ สอดรับกับผลตรวจรายข้อ
3. แนะนำสารอาหาร เครื่องดื่มก่อนนอนที่เหมาะสม และการจัดสภาพแวดล้อมที่นอน (เช่น อุณหภูมิ คลื่นเสียง ทิศทางลม ท่านอน) ที่ช่วยแก้ปัญหากลุ่มความเสี่ยงดังกล่าว

จัดเนื้อหาออกมาในรูปแบบหัวข้อที่อ่านง่าย สวยงาม มีสัญลักษณ์ไอคอนผ่อนคลายน่ารัก เพื่อให้อ่านเข้าใจได้ในครอบครัว`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ advice: response.text || runFallbackSimulation() });
  } catch (err) {
    console.error("Gemini screening analysis failed, fallback applied:", err);
    res.json({ advice: runFallbackSimulation() });
  }
});

// Gemini AI Weekly summary report
app.post('/api/gemini/generate-weekly-report', async (req, res) => {
  const { patientId } = req.body;
  
  if (!patientId) {
    return res.status(400).json({ error: "Patient ID is required" });
  }

  const diaries = databaseStore.sleepDiary.filter(d => d.patientId === patientId);
  const factors = databaseStore.dailyFactors.filter(f => f.patientId === patientId);
  const assessments = databaseStore.assessments.filter(a => a.patientId === patientId);
  const wellness = databaseStore.wellnessUsage.filter(w => w.patientId === patientId);
  const user = databaseStore.users.find(u => u.patientId === patientId);

  // Compile correlation summaries
  const promptData = {
    user,
    assessmentsCount: assessments.length,
    diariesCount: diaries.length,
    averageDuration: diaries.length ? diaries.reduce((acc, d) => acc + d.sleepDuration, 0) / diaries.length : 0,
    averageStress: factors.length ? factors.reduce((acc, d) => acc + d.stressScore, 0) / factors.length : 0,
    averageScreenTime: factors.length ? factors.reduce((acc, d) => acc + d.screenTime, 0) / factors.length : 0,
    averageCaffeine: factors.length ? factors.reduce((acc, d) => acc + d.caffeine, 0) / factors.length : 0,
    recentJournals: databaseStore.journals.filter(j => j.patientId === patientId).slice(-3)
  };

  const fallbackReport = () => {
    let text = `การประเมินสัปดาห์สำหรับสมาชิกครอบครัว ${user?.gender === 'หญิง' ? 'คุณแม่/หญิงสาว' : 'คุณชาย'} อายุ ${user?.age || 'ไม่ระบุ'} ปี:\n`;
    text += `• ชั่วโมงการนอนเฉลี่ยอยู่ที่ประมาณ ${promptData.averageDuration.toFixed(1)} ชั่วโมง อยู่ในเกณฑ์ปานกลาง\n`;
    if (promptData.averageStress > 6) {
      text += `• ตรวจพบว่าความเครียดสะสมเฉลี่ยสูง (${promptData.averageStress.toFixed(1)}/10) ส่งผลให้ตื่นกลางดึกบ่อยขึ้น แนะนำให้ทำกิจกรรมผ่อนคลายอย่าง Zodiac Sleep Sync ธาตุ${wellness[0]?.zodiacType || 'ไฟ'} และการเตปอดขยายลมหายใจ\n`;
    }
    if (promptData.averageScreenTime > 4.0) {
      text += `• สกรีนไทม์เฉลี่ยถึง ${promptData.averageScreenTime.toFixed(1)} ชั่วโมงต่อวัน มีนัยสัมพันธ์ทำให้ระยะเวลาการนอนสะท้อนว่าน้อยลงในวันที่มีเวลาหน้าจอเกิน 4 ชั่วโมง\n`;
    }
    text += `• แนะนำเพิ่มเติม: พยายามคุมปริมาณคาเฟอีนไม่ให้เกิน 2 แก้วต่อวัน และรักษาสมดุลความอบอุ่นในห้องนอนเพื่อลดการตื่นกลางดึกครับ`;
    return text;
  };

  if (!ai) {
    console.log("No Gemini key. Returning simulated weekly insight.");
    return res.json({ report: fallbackReport() });
  }

  try {
    const prompt = `คุณคือผู้เชี่ยวชาญด้านสุขอนามัยการนอนหลับ (Sleep Coach) สำหรับทุกคนในครอบครัวประจำบ้าน
สมาชิกในบ้านต้องการคำแนะนำสรุปความสัมพันธ์ของข้อมูลพฤติกรรมเพื่อปรับเปลี่ยนวิถีชีวิต อธิบายสั้นๆ อบอุ่น สุภาพ ไม่เป็นทางการ เป็นกันเองและไม่มีศัพท์วิชาการยากๆ
ข้อมูลของสมาชิกครอบครัวรหัส ${patientId}:
${JSON.stringify(promptData, null, 2)}

วิเคราะห์เชิงอิทธิพลและสุขภาพ (Correlation Analysis) ให้สมาชิกรายสัปดาห์ในประเด็น:
1. ความเครียด (Stress Score) ส่งผลถึงความขัดข้องในการนอนหลับหรือการระบายความคิดอย่างไรบ้าง
2. คาเฟอีนการบริโภคส่งผลต่อระยะเวลานอนในภาพรวมหรือไม่
3. สกรีนไทม์ส่งผลต่อประสิทธิภาพการหลับ (Sleep Efficiency)
กรุณาเขียนสรุปจุดสังเกต 3 ข้อหลักที่สมาชิกครอบครัวควรปรับปรุงเป็นภาษาไทยที่สุภาพอบอุ่น เข้าใจง่าย เหมาะกับการใช้ทุกวัย`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ report: response.text || fallbackReport() });
  } catch (err) {
    console.error("Gemini report generation failed, fallback applied:", err);
    res.json({ report: fallbackReport() });
  }
});

// Vite middleware for dev or regular static server for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log("Dev Mode: Mounted Vite middleware.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Production Mode: Serving static assets from " + distPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only run the server listening loop if we are not in a Vercel serverless function environment
if (!process.env.VERCEL) {
  startServer();
}

export default app;

