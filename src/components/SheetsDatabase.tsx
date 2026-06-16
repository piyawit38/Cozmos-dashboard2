/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  DatabaseState, User, SleepDiary, DailyFactors, Assessment,
  WellnessUsage, Journal
} from '../types';
import {
  Table, Search, Download, Database, Check, Layers, FileSpreadsheet,
  Plus, HelpCircle, Sparkles, Edit, Trash2, X, Save
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart as ReBarChart, Bar, LineChart as ReLineChart,
  Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell,
  PieChart as RePieChart, Pie
} from 'recharts';

interface SheetsDatabaseProps {
  database: DatabaseState;
  onUpdateDatabase: (updatedDb: DatabaseState) => void;
}

type SheetKey = 'users' | 'sleepDiary' | 'dailyFactors' | 'assessments' | 'wellnessUsage' | 'journals';

// ---------- Helper: get patient name ----------
const getPatientName = (users: User[], patientId: string): string => {
  const user = users.find(u => u.patientId === patientId);
  if (!user) return patientId;
  if (user.patientId === 'CZ-1001') return 'คุณวินัย';
  if (user.patientId === 'CZ-1002') return 'คุณป้ามะลิ';
  if (user.patientId === 'CZ-1003') return 'คุณสมชาย';
  return user.patientId;
};

// ---------- Schema & validation helpers ----------
interface FieldSchema {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date';
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
}

const sheetSchemas: Record<SheetKey, FieldSchema[]> = {
  users: [
    { name: 'patientId', label: 'Patient ID', type: 'text', required: true },
    { name: 'age', label: 'อายุ (ปี)', type: 'number', required: true, min: 0, max: 120 },
    { name: 'gender', label: 'เพศ', type: 'select', options: ['ชาย', 'หญิง', 'ไม่ระบุ'], required: true },
    { name: 'birthDate', label: 'วันเกิด', type: 'date', required: true },
    { name: 'bmi', label: 'ดัชนี BMI', type: 'number', required: true, min: 10, max: 50 },
    { name: 'chronicDiseases', label: 'โรคประจำตัว', type: 'text' }
  ],
  sleepDiary: [
    { name: 'patientId', label: 'Patient ID', type: 'select', options: ['CZ-1001', 'CZ-1002', 'CZ-1003'], required: true },
    { name: 'date', label: 'วันที่', type: 'date', required: true },
    { name: 'bedTime', label: 'เข้านอน (HH:MM)', type: 'text', required: true },
    { name: 'wakeTime', label: 'ตื่นนอน (HH:MM)', type: 'text', required: true },
    { name: 'sleepDuration', label: 'ระยะหลับ (ชั่วโมง)', type: 'number', required: true, min: 0, max: 24 },
    { name: 'sleepEfficiency', label: 'ประสิทธิภาพ (%)', type: 'number', required: true, min: 0, max: 100 }
  ],
  dailyFactors: [
    { name: 'patientId', label: 'Patient ID', type: 'select', options: ['CZ-1001', 'CZ-1002', 'CZ-1003'], required: true },
    { name: 'date', label: 'วันที่', type: 'date', required: true },
    { name: 'stressScore', label: 'ความเครียด (0-10)', type: 'number', required: true, min: 0, max: 10 },
    { name: 'caffeine', label: 'คาเฟอีน (แก้ว)', type: 'number', required: true, min: 0 },
    { name: 'exercise', label: 'ออกกำลังกาย (นาที)', type: 'number', required: true, min: 0 },
    { name: 'screenTime', label: 'สกรีนไทม์ (ชม.)', type: 'number', required: true, min: 0 },
    { name: 'napDuration', label: 'งีบหลับ (นาที)', type: 'number', required: true, min: 0 }
  ],
  assessments: [
    { name: 'patientId', label: 'Patient ID', type: 'select', options: ['CZ-1001', 'CZ-1002', 'CZ-1003'], required: true },
    { name: 'date', label: 'วันที่คัดกรอง', type: 'date', required: true },
    { name: 'isi', label: 'ISI คะแนน', type: 'number', required: true, min: 0, max: 28 },
    { name: 'ess', label: 'ESS คะแนน', type: 'number', required: true, min: 0, max: 24 },
    { name: 'stopBang', label: 'STOP-BANG (ข้อ)', type: 'number', required: true, min: 0, max: 8 },
    { name: 'riskLevel', label: 'ระดับความเสี่ยง', type: 'select', options: ['ต่ำ', 'ปานกลาง', 'สูง'], required: true }
  ],
  wellnessUsage: [
    { name: 'patientId', label: 'Patient ID', type: 'select', options: ['CZ-1001', 'CZ-1002', 'CZ-1003'], required: true },
    { name: 'date', label: 'วันที่', type: 'date', required: true },
    { name: 'zodiacType', label: 'ธาตุนิมิต', type: 'text' },
    { name: 'whiteNoise', label: 'White Noise (นาที)', type: 'number', required: true, min: 0 },
    { name: 'rainSound', label: 'สายฝน (นาที)', type: 'number', required: true, min: 0 },
    { name: 'oceanSound', label: 'คลื่นทะเล (นาที)', type: 'number', required: true, min: 0 },
    { name: 'breathingSession', label: 'ฝึกหายใจ (ครั้ง)', type: 'number', required: true, min: 0 }
  ],
  journals: [
    { name: 'patientId', label: 'Patient ID', type: 'select', options: ['CZ-1001', 'CZ-1002', 'CZ-1003'], required: true },
    { name: 'date', label: 'วันที่', type: 'date', required: true },
    { name: 'mood', label: 'อารมณ์', type: 'select', options: ['Positive', 'Neutral', 'Sad', 'Stress'], required: true },
    { name: 'journalText', label: 'ข้อความบันทึก', type: 'text', required: true },
    { name: 'voiceJournal', label: 'บันทึกเสียง', type: 'select', options: ['TRUE', 'FALSE'], required: true },
    { name: 'aiInsight', label: 'AI Insight', type: 'text' }
  ]
};

const getEmptyRow = (sheet: SheetKey): any => {
  const schema = sheetSchemas[sheet];
  const empty: any = {};
  schema.forEach(field => {
    if (field.type === 'select' && field.options) empty[field.name] = field.options[0];
    else if (field.type === 'number') empty[field.name] = 0;
    else if (field.type === 'date') empty[field.name] = new Date().toISOString().slice(0, 10);
    else empty[field.name] = '';
  });
  return empty;
};

const validateRow = (sheet: SheetKey, data: any): Record<string, string> => {
  const errors: Record<string, string> = {};
  const schema = sheetSchemas[sheet];
  for (const field of schema) {
    const value = data[field.name];
    if (field.required && (value === undefined || value === '' || value === null)) {
      errors[field.name] = 'กรุณากรอกข้อมูล';
    }
    if (field.type === 'number' && value !== undefined && value !== '') {
      const num = Number(value);
      if (isNaN(num)) errors[field.name] = 'ต้องเป็นตัวเลข';
      else if (field.min !== undefined && num < field.min) errors[field.name] = `ต้องไม่น้อยกว่า ${field.min}`;
      else if (field.max !== undefined && num > field.max) errors[field.name] = `ต้องไม่เกิน ${field.max}`;
    }
  }
  return errors;
};

export default function SheetsDatabase({ database, onUpdateDatabase }: SheetsDatabaseProps) {
  const [activeSheet, setActiveSheet] = useState<SheetKey>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [exportMessage, setExportMessage] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ---------- Memoized data ----------
  const patientNameMap = useMemo(() => {
    const map = new Map<string, string>();
    database.users.forEach(u => {
      let name = u.patientId;
      if (u.patientId === 'CZ-1001') name = 'คุณวินัย';
      else if (u.patientId === 'CZ-1002') name = 'คุณป้ามะลิ';
      else if (u.patientId === 'CZ-1003') name = 'คุณสมชาย';
      else name = u.patientId;
      map.set(u.patientId, name);
    });
    return map;
  }, [database.users]);

  const getDisplayName = (patientId: string) => patientNameMap.get(patientId) || patientId;

  const getSheetData = (): any[] => {
    switch (activeSheet) {
      case 'users': return database.users;
      case 'sleepDiary': return database.sleepDiary;
      case 'dailyFactors': return database.dailyFactors;
      case 'assessments': return database.assessments;
      case 'wellnessUsage': return database.wellnessUsage;
      case 'journals': return database.journals;
      default: return [];
    }
  };

  const filteredData = useMemo(() => {
    const data = getSheetData();
    const query = searchQuery.toLowerCase();
    if (!query) return data;
    return data.filter(row =>
      Object.values(row).some(val =>
        String(val).toLowerCase().includes(query)
      )
    );
  }, [activeSheet, database, searchQuery]);

  // ---------- Chart data helpers ----------
  const getChartDataBySheet = (): any[] => {
    switch (activeSheet) {
      case 'users':
        return database.users.map(u => ({ name: getDisplayName(u.patientId), 'ดัชนี BMI': u.bmi }));
      case 'sleepDiary':
        return [...database.sleepDiary].sort((a,b) => a.date.localeCompare(b.date)).map(d => ({
          label: `${getDisplayName(d.patientId)} (${d.date.slice(5)})`,
          'ชั่วโมงนอน': d.sleepDuration,
          'ประสิทธิภาพ (%)': d.sleepEfficiency
        }));
      case 'dailyFactors':
        return [...database.dailyFactors].sort((a,b) => a.date.localeCompare(b.date)).map(f => ({
          label: `${getDisplayName(f.patientId)} (${f.date.slice(5)})`,
          'ความเครียด (0-10)': f.stressScore,
          'หน้าจอ (ชม.)': f.screenTime,
          'งีบ (นาที)': f.napDuration
        }));
      case 'assessments':
        return database.assessments.map(a => ({
          name: getDisplayName(a.patientId),
          'ดัชนีหลับยาก (ISI)': a.isi,
          'อาการง่วงกลางวัน (ESS)': a.ess,
          'ความเสี่ยงหยุดหายใจ (STOP-BANG)': a.stopBang
        }));
      case 'wellnessUsage':
        return [...database.wellnessUsage].sort((a,b) => a.date.localeCompare(b.date)).map(w => ({
          label: `${getDisplayName(w.patientId)} (${w.date.slice(5)})`,
          'สมาธิ/หายใจ (นาที)': w.breathingSession * 5,
          'เสียงฝน': w.rainSound,
          'คลื่นทะเล': w.oceanSound,
          'ไวท์นอยส์': w.whiteNoise
        }));
      case 'journals':
        const counts = { Positive: 0, Neutral: 0, Sad: 0, Stress: 0 };
        database.journals.forEach(j => {
          if (j.mood === 'Positive') counts.Positive++;
          else if (j.mood === 'Neutral') counts.Neutral++;
          else if (j.mood === 'Sad') counts.Sad++;
          else if (j.mood === 'Stress') counts.Stress++;
          else counts.Neutral++;
        });
        return [
          { name: 'Positive 😊', value: counts.Positive, fill: '#4ade80' },
          { name: 'Neutral 😐', value: counts.Neutral, fill: '#94a3b8' },
          { name: 'Sad 😔', value: counts.Sad, fill: '#3b82f6' },
          { name: 'Stress 😫', value: counts.Stress, fill: '#f87171' }
        ].filter(d => d.value > 0);
      default: return [];
    }
  };

  const getChartTitle = () => {
    switch (activeSheet) {
      case 'users': return '📊 กราฟวิเคราะห์ดัชนีมวลกาย (BMI) ของสมาชิกกลุ่มเป้าหมาย';
      case 'sleepDiary': return '📊 กราฟสืบค้นชั่วโมงการนอนและอัตราประสิทธิภาพการนอนหลับสะสม';
      case 'dailyFactors': return '📊 กราฟแนวโน้มความสัมพันธ์ของความเครียด สกรีนไทม์ และการงีบหลับ';
      case 'assessments': return '📊 กราฟแท่งจำแนกลักษณะคะแนนคัดกรองโรค (ISI, ESS และ STOP-BANG)';
      case 'wellnessUsage': return '📊 กราฟวิเคราะห์สัดส่วนเวลาที่ใช้กับเสียงผ่อนคลายและสมาธิบำบัด';
      case 'journals': return '📊 แผนภูมิสัดส่วนแนวโน้มอารมณ์ความรู้สึกจากหน้าบันทึกสุขภาพจิต';
      default: return '📊 ภาพรวมสถิติเชิงปริมาณ';
    }
  };

  const renderChartBySheet = () => {
    const chartData = getChartDataBySheet();
    if (chartData.length === 0) {
      return <div className="text-center text-sleep-blue-400">ไม่มีข้อมูลสำหรับแสดงกราฟ</div>;
    }

    if (activeSheet === 'users') {
      return (
        <ReBarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" style={{ fontSize: 10 }} label={{ value: 'รายชื่อสมาชิกในโปรไฟล์', position: 'insideBottom', offset: -15, style: { fontSize: 10, fill: '#64748B', fontWeight: 'bold' } }} />
          <YAxis domain={[0, 40]} style={{ fontSize: 10 }} label={{ value: 'ดัชนีมวลกาย BMI (kg/m²)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#64748B', fontWeight: 'bold' } }} />
          <Tooltip formatter={(value) => [`${value} kg/m²`, 'ดัชนี BMI']} />
          <Bar dataKey="ดัชนี BMI" fill="#1e293b" radius={[6,6,0,0]}>
            {chartData.map((entry: any, idx) => (
              <Cell key={idx} fill={entry['ดัชนี BMI'] >= 25 ? '#ef4444' : '#f59e0b'} />
            ))}
          </Bar>
        </ReBarChart>
      );
    }
    if (activeSheet === 'sleepDiary') {
      return (
        <ReLineChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 8 }} label={{ value: 'ชื่อสมาชิกประจำวันเป้าหมาย', position: 'insideBottom', offset: -15, style: { fontSize: 10, fill: '#64748B', fontWeight: 'bold' } }} />
          <YAxis yAxisId="left" domain={[0,12]} style={{ fontSize: 10 }} label={{ value: 'เวลาหลับ (ชั่วโมง)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#10b981', fontWeight: 'bold' } }} />
          <YAxis yAxisId="right" orientation="right" domain={[0,100]} style={{ fontSize: 10 }} label={{ value: 'ประสิทธิภาพการนอน (%)', angle: 90, position: 'insideRight', offset: 15, style: { fontSize: 10, fill: '#3b82f6', fontWeight: 'bold' } }} />
          <Tooltip formatter={(value, name) => {
            if (name === "ชั่วโมงนอน") return [`${value} ชั่วโมง`, name];
            return [`${value}%`, name];
          }} />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
          <Line yAxisId="left" type="monotone" name="ชั่วโมงนอน" dataKey="ชั่วโมงนอน" stroke="#10b981" strokeWidth={3} />
          <Line yAxisId="right" type="monotone" name="ประสิทธิภาพ (%)" dataKey="ประสิทธิภาพ (%)" stroke="#3b82f6" />
        </ReLineChart>
      );
    }
    if (activeSheet === 'dailyFactors') {
      return (
        <ReLineChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 8 }} label={{ value: 'ชื่อสมาชิกและวันประเมิน', position: 'insideBottom', offset: -15, style: { fontSize: 10, fill: '#64748B', fontWeight: 'bold' } }} />
          <YAxis yAxisId="left" domain={[0,10]} style={{ fontSize: 10 }} label={{ value: 'ความเครียด / สกรีนไทม์ (ระดับ/ชม.)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#ef4444', fontWeight: 'bold' } }} />
          <YAxis yAxisId="right" orientation="right" domain={[0,120]} style={{ fontSize: 10 }} label={{ value: 'ระยะงีบหลับกลางวัน (นาที)', angle: 90, position: 'insideRight', offset: 15, style: { fontSize: 10, fill: '#8b5cf6', fontWeight: 'bold' } }} />
          <Tooltip formatter={(value, name) => {
            if (name === "ความเครียด (0-10)") return [`${value} / 10 คะแนน`, "ระดับความเครียด"];
            if (name === "หน้าจอ (ชม.)") return [`${value} ชั่วโมง`, "ความถี่สกรีนไทม์"];
            return [`${value} นาที`, "เวลางีบหลับ"];
          }} />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
          <Line yAxisId="left" type="monotone" name="ความเครียด" dataKey="ความเครียด (0-10)" stroke="#ef4444" />
          <Line yAxisId="left" type="monotone" name="หน้าจอ (ชม.)" dataKey="หน้าจอ (ชม.)" stroke="#f59e0b" />
          <Line yAxisId="right" type="monotone" name="งีบ (นาที)" dataKey="งีบ (นาที)" stroke="#8b5cf6" strokeDasharray="5 5" />
        </ReLineChart>
      );
    }
    if (activeSheet === 'assessments') {
      return (
        <ReBarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" style={{ fontSize: 10 }} label={{ value: 'รายชื่อสมาชิกครอบครัว', position: 'insideBottom', offset: -15, style: { fontSize: 10, fill: '#64748B', fontWeight: 'bold' } }} />
          <YAxis domain={[0,30]} style={{ fontSize: 10 }} label={{ value: 'ระดับคะแนนรวมที่ประเมินได้', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#64748B', fontWeight: 'bold' } }} />
          <Tooltip formatter={(value, name) => [`${value} คะแนน`, name]} />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
          <Bar dataKey="ดัชนีหลับยาก (ISI)" fill="#f59e0b" name="คะแนน ISI (0-28)" />
          <Bar dataKey="อาการง่วงกลางวัน (ESS)" fill="#3b82f6" name="คะแนน ESS (0-24)" />
          <Bar dataKey="ความเสี่ยงหยุดหายใจ (STOP-BANG)" fill="#ef4444" name="คะแนน STOP-BANG (0-8)" />
        </ReBarChart>
      );
    }
    if (activeSheet === 'wellnessUsage') {
      return (
        <ReBarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 8 }} label={{ value: 'ชื่อสมาชิกและวันทำกิจกรรม', position: 'insideBottom', offset: -15, style: { fontSize: 10, fill: '#64748B', fontWeight: 'bold' } }} />
          <YAxis style={{ fontSize: 10 }} label={{ value: 'ระยะเวลาบำบัดรวม (นาที)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#64748B', fontWeight: 'bold' } }} />
          <Tooltip formatter={(value, name) => [`${value} นาที`, name]} />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
          <Bar dataKey="สมาธิ/หายใจ (นาที)" stackId="a" fill="#3b82f6" name="ฝึกสมาธิ/หายใจ" />
          <Bar dataKey="เสียงฝน" stackId="a" fill="#10b981" name="คลื่นเสียงฝน" />
          <Bar dataKey="คลื่นทะเล" stackId="a" fill="#ec4899" name="คลื่นเสียงทะเล" />
          <Bar dataKey="ไวท์นอยส์" stackId="a" fill="#f59e0b" name="เสียงส้ม/ขาว (White Noise)" />
        </ReBarChart>
      );
    }
    if (activeSheet === 'journals') {
      return (
        <RePieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" label={(entry) => `${entry.name}: ${entry.value} ครั้ง`}>
            {chartData.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} ครั้ง`, 'ความถี่สภาวะอารมณ์']} />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
        </RePieChart>
      );
    }
    return null;
  };

  // ---------- CRUD Operations ----------
  const handleAdd = () => {
    setEditingIndex(null);
    setFormData(getEmptyRow(activeSheet));
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (index: number) => {
    const data = getSheetData();
    setEditingIndex(index);
    setFormData({ ...data[index] });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = (index: number) => {
    if (window.confirm('คุณต้องการลบข้อมูลนี้ใช่หรือไม่?')) {
      const currentData = getSheetData();
      const newData = [...currentData];
      newData.splice(index, 1);
      const updatedDb = { ...database };
      switch (activeSheet) {
        case 'users': updatedDb.users = newData as User[]; break;
        case 'sleepDiary': updatedDb.sleepDiary = newData as SleepDiary[]; break;
        case 'dailyFactors': updatedDb.dailyFactors = newData as DailyFactors[]; break;
        case 'assessments': updatedDb.assessments = newData as Assessment[]; break;
        case 'wellnessUsage': updatedDb.wellnessUsage = newData as WellnessUsage[]; break;
        case 'journals': updatedDb.journals = newData as Journal[]; break;
      }
      onUpdateDatabase(updatedDb);
    }
  };

  const handleSave = () => {
    const errors = validateRow(activeSheet, formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    // Convert voiceJournal string 'TRUE'/'FALSE' to boolean for journals
    let saveData = { ...formData };
    if (activeSheet === 'journals' && 'voiceJournal' in saveData) {
      saveData.voiceJournal = saveData.voiceJournal === 'TRUE';
    }
    const currentData = getSheetData();
    let newData = [...currentData];
    if (editingIndex !== null) {
      newData[editingIndex] = saveData;
    } else {
      newData.push(saveData);
    }
    const updatedDb = { ...database };
    switch (activeSheet) {
      case 'users': updatedDb.users = newData as User[]; break;
      case 'sleepDiary': updatedDb.sleepDiary = newData as SleepDiary[]; break;
      case 'dailyFactors': updatedDb.dailyFactors = newData as DailyFactors[]; break;
      case 'assessments': updatedDb.assessments = newData as Assessment[]; break;
      case 'wellnessUsage': updatedDb.wellnessUsage = newData as WellnessUsage[]; break;
      case 'journals': updatedDb.journals = newData as Journal[]; break;
    }
    onUpdateDatabase(updatedDb);
    setIsModalOpen(false);
  };

  // ---------- CSV Export ----------
  const triggerCsvDownload = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    const sheetKey = activeSheet;
    const filename = `Cozmos_Database_${sheetKey}_${new Date().toISOString().slice(0,10)}.csv`;

    const schema = sheetSchemas[sheetKey];
    headers = schema.map(f => f.label);
    const data = getSheetData();
    rows = data.map(row => schema.map(field => row[field.name] ?? ''));

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportMessage(`ส่งออกไฟล์ ${filename} เรียบร้อยแล้ว!`);
    setTimeout(() => setExportMessage(''), 5000);
  };

  // ---------- Render Table Headers & Rows (dynamic) ----------
  const renderTableHeaders = () => {
    const schema = sheetSchemas[activeSheet];
    return schema.map(field => <th key={field.name} className="p-3">{field.label}</th>);
  };

  const renderTableRows = () => {
    if (filteredData.length === 0) {
      return (
        <tr>
          <td colSpan={sheetSchemas[activeSheet].length + 1} className="p-8 text-center text-sleep-blue-400">
            ไม่พบข้อมูล • <button onClick={handleAdd} className="text-sleep-gold-500 underline">เพิ่มข้อมูลแรก</button>
          </td>
        </tr>
      );
    }
    const schema = sheetSchemas[activeSheet];
    return filteredData.map((row, idx) => (
      <tr key={idx} className="hover:bg-sleep-cream/40 transition">
        {schema.map(field => {
          let val = row[field.name];
          if (field.name === 'patientId') val = getDisplayName(val);
          if (field.name === 'voiceJournal') val = val ? 'TRUE 🎙️' : 'FALSE ✍️';
          return <td key={field.name} className="p-3 truncate max-w-[180px]">{val}</td>;
        })}
        <td className="p-3 whitespace-nowrap">
          <button onClick={() => handleEdit(idx)} aria-label="แก้ไข" className="text-sleep-blue-500 hover:text-sleep-gold-500 mr-2">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(idx)} aria-label="ลบ" className="text-red-400 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </button>
        </td>
      </tr>
    ));
  };

  return (
    <div className="space-y-6" id="sheets-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-sleep-blue-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-sleep-gold-500" />
            คลังจัดเก็บข้อมูลครอบครัว (Google Sheets Database)
          </h2>
          <p className="text-sm text-sleep-blue-600">ดูตาราง เพิ่ม/แก้ไข/ลบ และส่งออกข้อมูลเพื่อเฝ้าระวังสุขอนามัยการนอน</p>
        </div>
        <div className="flex gap-2">
          <button onClick={triggerCsvDownload} aria-label="ส่งออก CSV" className="bg-sleep-gold-500 hover:bg-sleep-gold-400 text-[#0B1026] text-xs font-bold px-4 py-2.5 rounded-xl transition inline-flex items-center gap-1.5 shadow">
            <Download className="w-4 h-4" /> ส่งออก CSV
          </button>
        </div>
      </div>

      {exportMessage && <p className="text-xs text-green-700 bg-green-50 p-3 rounded-xl">{exportMessage}</p>}

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-sleep-blue-100 gap-1 overflow-x-auto">
        {(['users','sleepDiary','dailyFactors','assessments','wellnessUsage','journals'] as SheetKey[]).map(sheet => (
          <button key={sheet} onClick={() => setActiveSheet(sheet)} aria-label={`切换到 ${sheet}`}
            className={`px-4 py-3 rounded-xl transition whitespace-nowrap text-sm font-semibold ${activeSheet === sheet ? 'bg-sleep-blue-900 text-white shadow' : 'text-sleep-blue-700 hover:bg-sleep-blue-50'}`}>
            {sheet === 'users' && '📄 สมาชิก'}
            {sheet === 'sleepDiary' && '📄 บันทึกนอน'}
            {sheet === 'dailyFactors' && '📄 พฤติกรรม'}
            {sheet === 'assessments' && '📄 คัดกรองโรค'}
            {sheet === 'wellnessUsage' && '📄 สมาธิบำบัด'}
            {sheet === 'journals' && '📄 ไดอารี่'}
          </button>
        ))}
      </div>

      {/* Graph Section */}
      <div className="bg-white border border-sleep-blue-100 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-sleep-gold-500" />
          <h3 className="text-sm font-semibold text-sleep-blue-900">{getChartTitle()}</h3>
        </div>
        <div className="h-64 w-full bg-sleep-cream/40 rounded-2xl p-4 border border-sleep-blue-100">
          <ResponsiveContainer width="100%" height="100%">
            {renderChartBySheet()}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-sleep-blue-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between gap-4 border-b pb-4">
          <div>
            <h4 className="font-semibold text-sm">ตารางข้อมูล: {activeSheet}</h4>
            <p className="text-xs text-sleep-blue-500">คลิก ✏️ แก้ไข หรือ 🗑️ ลบ — กด + เพื่อเพิ่มแถวใหม่</p>
          </div>
          <div className="flex gap-2">
            <div className="relative max-w-xs w-full">
              <input type="text" placeholder="ค้นหา..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-sleep-cream border rounded-xl p-2.5 pl-9 text-xs" />
              <Search className="w-3.5 h-3.5 absolute left-3 top-3.5 text-sleep-blue-500" />
            </div>
            <button onClick={handleAdd} aria-label="เพิ่มข้อมูล" className="bg-sleep-blue-900 text-white px-4 py-2 rounded-xl text-xs flex items-center gap-1">
              <Plus className="w-4 h-4" /> เพิ่มข้อมูล
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-sleep-blue-100">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-sleep-blue-900 text-white text-[10px] uppercase">
              <tr>
                {renderTableHeaders()}
                <th className="p-3">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sleep-blue-50 bg-white">
              {renderTableRows()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">{editingIndex !== null ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูล'}</h3>
              <button onClick={() => setIsModalOpen(false)} aria-label="ปิด"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {sheetSchemas[activeSheet].map(field => (
                <div key={field.name}>
                  <label className="block text-xs font-semibold mb-1">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                  {field.type === 'select' && field.options ? (
                    <select value={formData[field.name] || ''} onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                      className="w-full border rounded-xl p-2 text-xs">
                      {field.options.map(opt => <option key={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      value={formData[field.name] ?? ''} onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                      className="w-full border rounded-xl p-2 text-xs" />
                  )}
                  {formErrors[field.name] && <p className="text-red-500 text-[10px]">{formErrors[field.name]}</p>}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-xl text-xs">ยกเลิก</button>
              <button onClick={handleSave} className="px-4 py-2 bg-sleep-blue-900 text-white rounded-xl text-xs flex items-center gap-1"><Save className="w-3 h-3" /> บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
