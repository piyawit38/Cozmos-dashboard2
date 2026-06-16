// src/components/VitalSignsTracker.tsx
import React, { useState, useMemo } from 'react';
import { VitalSign } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Heart, Droplet, TrendingUp, Save, Trash2 } from 'lucide-react';

interface VitalSignsTrackerProps {
  patientId: string;
  existingVitals: VitalSign[];
  onSave: (vital: VitalSign) => void;
}

export default function VitalSignsTracker({ patientId, existingVitals, onSave }: VitalSignsTrackerProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [systolic, setSystolic] = useState<number>(120);
  const [diastolic, setDiastolic] = useState<number>(80);
  const [bloodSugar, setBloodSugar] = useState<number>(100);
  const [cholesterol, setCholesterol] = useState<number>(180);
  const [triglyceride, setTriglyceride] = useState<number>(150);
  const [notes, setNotes] = useState('');

  const patientVitals = existingVitals.filter(v => v.patientId === patientId).sort((a,b) => a.date.localeCompare(b.date));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newVital: VitalSign = {
      patientId,
      date,
      systolic,
      diastolic,
      bloodSugar,
      cholesterol,
      triglyceride: triglyceride || undefined,
      notes: notes || undefined,
    };
    onSave(newVital);
    // Reset form (optional)
    setDate(new Date().toISOString().split('T')[0]);
    setSystolic(120);
    setDiastolic(80);
    setBloodSugar(100);
    setCholesterol(180);
    setTriglyceride(150);
    setNotes('');
  };

  // เตรียมข้อมูลสำหรับกราฟ (ใช้เฉพาะวันที่ที่มีข้อมูล)
  const chartData = patientVitals.map(v => ({
    date: v.date.slice(5), // DD-MM
    systolic: v.systolic,
    diastolic: v.diastolic,
    bloodSugar: v.bloodSugar,
    cholesterol: v.cholesterol,
  })).slice(-10); // แสดง 10 วันล่าสุด

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-semibold text-sleep-blue-900 flex items-center gap-2">
          <Activity className="w-6 h-6 text-sleep-gold-500" />
          บันทึกสุขภาพกาย (Vital Signs)
        </h2>
        <p className="text-sm text-sleep-blue-600">ความดันโลหิต ระดับน้ำตาล และไขมันในเลือด เพื่อการวิเคราะห์องค์รวม</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ฟอร์มบันทึก */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-sleep-blue-100">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Heart className="w-5 h-5 text-red-500" /> บันทึกวันนี้</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-sleep-blue-700 font-medium">วันที่</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded-xl p-2 text-sm" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs">ความดันบน (Systolic)</label>
                <input type="number" value={systolic} onChange={e => setSystolic(Number(e.target.value))} className="w-full border rounded-xl p-2" min="70" max="250" required />
              </div>
              <div>
                <label className="block text-xs">ความดันล่าง (Diastolic)</label>
                <input type="number" value={diastolic} onChange={e => setDiastolic(Number(e.target.value))} className="w-full border rounded-xl p-2" min="40" max="150" required />
              </div>
            </div>
            <div>
              <label className="block text-xs">น้ำตาลในเลือด (mg/dL)</label>
              <input type="number" value={bloodSugar} onChange={e => setBloodSugar(Number(e.target.value))} className="w-full border rounded-xl p-2" min="50" max="500" required />
            </div>
            <div>
              <label className="block text-xs">คอเลสเตอรอลรวม (mg/dL)</label>
              <input type="number" value={cholesterol} onChange={e => setCholesterol(Number(e.target.value))} className="w-full border rounded-xl p-2" min="100" max="500" required />
            </div>
            <div>
              <label className="block text-xs">ไตรกลีเซอไรด์ (mg/dL, optional)</label>
              <input type="number" value={triglyceride} onChange={e => setTriglyceride(Number(e.target.value))} className="w-full border rounded-xl p-2" min="50" max="800" />
            </div>
            <div>
              <label className="block text-xs">หมายเหตุ (เช่น ก่อน/หลังอาหาร)</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full border rounded-xl p-2" placeholder="เช่น หลังอาหาร 2 ชม." />
            </div>
            <button type="submit" className="w-full bg-sleep-gold-500 hover:bg-sleep-gold-400 text-sleep-blue-950 font-bold py-2 rounded-xl flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> บันทึก
            </button>
          </form>
        </div>

        {/* ประวัติและกราฟ */}
        <div className="lg:col-span-3 space-y-6">
          {/* กราฟแนวโน้ม */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-sleep-blue-100">
            <h3 className="font-semibold text-md mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-sleep-gold-500" /> แนวโน้ม 10 วันล่าสุด</h3>
            {chartData.length === 0 ? (
              <div className="text-center py-10 text-sleep-blue-400 text-sm">ยังไม่มีข้อมูล กรุณาบันทึกสุขภาพวันนี้</div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 15, right: 20, left: 20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" label={{ value: 'วันที่ (เดือน-วัน)', position: 'insideBottom', offset: -15, style: { fontSize: 10, fill: '#64748B', fontWeight: 'bold' } }} />
                    <YAxis yAxisId="left" domain={[50, 220]} label={{ value: 'ความดันโลหิต (mmHg)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#ef4444', fontWeight: 'bold' } }} />
                    <YAxis yAxisId="right" orientation="right" domain={[50, 420]} label={{ value: 'แล็บชีวเคมี (mg/dL)', angle: 90, position: 'insideRight', offset: 10, style: { fontSize: 10, fill: '#3b82f6', fontWeight: 'bold' } }} />
                    <Tooltip formatter={(value, name) => {
                      if (name === "ความดันบน" || name === "ความดันล่าง") return [`${value} mmHg`, name];
                      return [`${value} mg/dL`, name];
                    }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="systolic" stroke="#ef4444" name="ความดันบน" strokeWidth={2} />
                    <Line yAxisId="left" type="monotone" dataKey="diastolic" stroke="#f97316" name="ความดันล่าง" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="bloodSugar" stroke="#3b82f6" name="น้ำตาล" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="cholesterol" stroke="#10b981" name="คอเลสเตอรอล" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ตารางประวัติ */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-sleep-blue-100">
            <h3 className="font-semibold text-md mb-3 flex items-center gap-2"><Droplet className="w-5 h-5 text-cyan-600" /> ประวัติการบันทึก</h3>
            {patientVitals.length === 0 ? (
              <div className="text-center py-6 text-sleep-blue-400 text-sm">ยังไม่มีประวัติ</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-sleep-blue-50">
                    <tr>
                      <th className="p-2">วันที่</th>
                      <th>ความดัน</th>
                      <th>น้ำตาล</th>
                      <th>คอเลสเตอรอล</th>
                      <th>ไตรกลีเซอไรด์</th>
                      <th>หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientVitals.slice().reverse().map((v, idx) => (
                      <tr key={idx} className="border-b border-sleep-blue-50">
                        <td className="p-2 font-mono">{v.date}</td>
                        <td>{v.systolic}/{v.diastolic}</td>
                        <td>{v.bloodSugar}</td>
                        <td>{v.cholesterol}</td>
                        <td>{v.triglyceride || '-'}</td>
                        <td className="max-w-[150px] truncate">{v.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-[11px] text-sleep-blue-500 bg-sleep-cream p-3 rounded-xl">
        ⚠️ ข้อมูลนี้เป็นการบันทึกส่วนบุคคล ไม่ใช่การวินิจฉัยทางการแพทย์ กรุณาปรึกษาแพทย์เพื่อประเมินผล
      </div>
    </div>
  );
}
