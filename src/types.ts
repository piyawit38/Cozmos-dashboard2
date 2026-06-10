/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  patientId: string;
  fullName?: string;        // ชื่อ-นามสกุลของสมาชิก (optional)
  age: number;
  gender: 'ชาย' | 'หญิง' | 'อื่นๆ' | '';
  birthDate: string;
  weight: number; // kg
  height: number; // cm
  bmi: number;
  chronicDiseases: string;
}

export interface SleepDiary {
  patientId: string;
  date: string; // YYYY-MM-DD
  bedTime: string; // HH:MM
  wakeTime: string; // HH:MM
  sleepDuration: number; // hours
  sleepEfficiency: number; // % (computed: 100 * sleepDuration / (time in bed))
  awakenings: number; // times
}

export interface DailyFactors {
  patientId: string;
  date: string; // YYYY-MM-DD
  stressScore: number; // 0-10
  caffeine: number; // cups or mg (e.g. cups of coffee)
  exercise: number; // minutes
  screenTime: number; // hours
  napDuration: number; // minutes
}

export interface Assessment {
  patientId: string;
  date: string; // YYYY-MM-DD
  isi: number; // Insomnia Severity Index (0-28)
  ess: number; // Epworth Sleepiness Scale (0-24)
  stopBang: number; // STOP-BANG Score (0-8)
  riskLevel: 'ต่ำ' | 'ปานกลาง' | 'สูง' | string;
}

export interface WellnessUsage {
  patientId: string;
  date: string; // YYYY-MM-DD
  zodiacType: 'ไฟ' | 'ดิน' | 'ลม' | 'น้ำ' | '';
  whiteNoise: number; // minutes
  rainSound: number; // minutes
  oceanSound: number; // minutes
  forestSound: number; // minutes
   khandiSound: number;
  breathingSession: number; // times
  brainDump: number; // times
}

export interface Journal {
  patientId: string;
  date: string; // YYYY-MM-DD
  mood: 'Positive' | 'Neutral' | 'Sad' | 'Stress';
  journalText: string;
  voiceJournal: boolean; // whether voice was used
  aiInsight: string;
}

export interface DatabaseState {
  users: User[];
  sleepDiary: SleepDiary[];
  dailyFactors: DailyFactors[];
  assessments: Assessment[];
  wellnessUsage: WellnessUsage[];
  journals: Journal[];
}