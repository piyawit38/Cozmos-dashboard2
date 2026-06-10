// Introduction.tsx (เฉพาะส่วน Hero และปรับ padding/margin)

return (
  <div className="space-y-6 md:space-y-8">   {/* ลด space-y บนมือถือ */}
    {/* Hero Welcome - ปรับ padding และ font size */}
    <div className="bg-gradient-to-br from-sleep-blue-900 via-sleep-blue-800 to-sleep-blue-700 text-white rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-sleep-gold-400/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
      <div className="relative max-w-3xl space-y-3 md:space-y-4">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 md:gap-2 bg-sleep-gold-500/20 border border-sleep-gold-400/30 px-2.5 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-medium text-sleep-gold-400">
          <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="hidden sm:inline">ระบบดูแลและเฝ้าระวังภาวะหยุดหายใจขณะหลับและสุขภาพการนอนประจำบ้าน</span>
          <span className="sm:hidden">OSA & Sleep Care</span>  {/* ข้อความสั้นลงบนมือถือ */}
        </div>

        {/* แสดงชื่อครอบครัว (ไม่มีปุ่มแก้ไข) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight">
            {familyName}
          </h1>
          <p className="text-xs md:text-sm text-sleep-blue-100 max-w-xl">
            ผสานสุขวิทยาการนอน ศิลปะ และปัญญาประดิษฐ์ เพื่อสร้างความเข้าใจการนอนและยกระดับคุณภาพชีวิต
          </p>
        </div>
      </div>
    </div>

    {/* 5 โมดูล - ปรับ grid บนมือถือ */}
    <div>
      <h2 className="text-lg md:text-xl font-medium text-sleep-blue-900 mb-3 md:mb-4 flex items-center gap-2">
        <Layers className="w-5 h-5 text-sleep-gold-500" />
        5 โมดูลหลักสุขภาพการนอนในบ้าน
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {[
          { step: 1, title: 'คัดกรองความเสี่ยงการนอน', desc: 'ISI, ESS, STOP-BANG' },
          { step: 2, title: 'บันทึกพฤติกรรมรายวัน', desc: 'เวลาหลับ, ความเครียด, คาเฟอีน' },
          { step: 3, title: 'กิจกรรมช่วยผ่อนคลาย', desc: 'หายใจ 4-7-8, เสียงบำบัด' },
          { step: 4, title: 'จดสติและถอดเสียงด้วย AI', desc: 'วิเคราะห์อารมณ์' },
          { step: 5, title: 'วิเคราะห์สถิติมุมมองรวม', desc: 'Dashboard & รายงาน' }
        ].map(m => (
          <div key={m.step} className="bg-white p-4 md:p-5 rounded-xl md:rounded-2xl border border-sleep-blue-100 shadow-sm">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-sleep-gold-100 text-sleep-gold-500 rounded-lg md:rounded-xl flex items-center justify-center font-bold text-base md:text-lg mb-2">{m.step}</div>
            <h3 className="font-semibold text-sleep-blue-900 text-sm md:text-base">{m.title}</h3>
            <p className="text-[11px] md:text-xs text-sleep-blue-600">{m.desc}</p>
          </div>
        ))}
      </div>
    </div>

    {/* ส่วนสมาชิกในครอบครัว - ปรับการ์ดและปุ่ม */}
    <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 border border-sleep-blue-100 shadow-sm space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-lg md:text-xl font-medium flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-sleep-gold-400" /> 
          สมาชิกใน{familyName}
        </h2>
        {!isCreating && (
          <button onClick={() => setIsCreating(true)} className="bg-sleep-gold-500 hover:bg-sleep-gold-400 text-sleep-blue-950 font-medium px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-sm flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> เพิ่มสมาชิก
          </button>
        )}
      </div>

      {/* ฟอร์มเพิ่มสมาชิก - ปรับ padding และ margin */}
      {isCreating && (
        <motion.form onSubmit={handleCreate} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-5 bg-sleep-gold-50 rounded-xl md:rounded-2xl space-y-4">
          <h3 className="font-semibold text-sm md:text-base">ลงทะเบียนสมาชิกใหม่</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {/* ... ฟิลด์ต่างๆ (ไม่ต้องปรับมาก) */}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setIsCreating(false); resetForm(); }} className="border px-3 py-1.5 md:px-4 rounded-lg text-sm">ยกเลิก</button>
            <button type="submit" className="bg-sleep-blue-900 text-white px-3 py-1.5 md:px-4 rounded-lg text-sm">บันทึก</button>
          </div>
        </motion.form>
      )}

      {/* รายชื่อสมาชิก - ปรับการ์ดให้เล็กลง */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {users.map(user => {
          const isActive = user.patientId === activePatientId;
          return (
            <div key={user.patientId} onClick={() => onSelectPatient(user.patientId)} className={`cursor-pointer p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition ${isActive ? 'border-sleep-gold-500 bg-sleep-gold-50/50' : 'border-sleep-blue-100 hover:bg-sleep-blue-50/20'}`}>
              <div className="flex justify-between items-start">
                <span className="text-[10px] md:text-xs text-sleep-blue-500 font-mono">{user.patientId}</span>
                {isActive && <span className="bg-sleep-gold-500 text-sleep-blue-950 text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full">กำลังใช้งาน</span>}
              </div>
              <div className="mt-1 md:mt-2">
                <h4 className="font-semibold text-sm md:text-base">{getUserDisplayName(user)}</h4>
                <p className="text-[10px] md:text-xs">เพศ {user.gender} • อายุ {user.age} ปี</p>
                <p className="text-[10px] md:text-xs">BMI {user.bmi} • {user.chronicDiseases}</p>
              </div>
              {/* ... ปุ่มลบ */}
            </div>
          );
        })}
      </div>

      {/* สรุปผู้ใช้ที่เลือก - ปรับ padding */}
      {selectedUser && (
        <div className="bg-sleep-blue-50/50 rounded-xl md:rounded-2xl p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <p className="text-sm font-semibold">{getUserDisplayName(selectedUser)} • {selectedUser.gender} • {selectedUser.age} ปี</p>
            <p className="text-xs">น้ำหนัก {selectedUser.weight} กก. • ส่วนสูง {selectedUser.height} ซม.</p>
          </div>
          <div className="text-center">
            <span className="text-xs text-sleep-blue-500">BMI</span>
            <strong className={`block text-base md:text-lg ${selectedUser.bmi >= 25 ? 'text-red-500' : 'text-sleep-blue-900'}`}>{selectedUser.bmi}</strong>
          </div>
        </div>
      )}
    </div>
  </div>
);
