import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Loader2, CalendarDays, CheckCircle2, AlertCircle, Plus, ChevronLeft } from 'lucide-react';

const Attendance = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [isTakingAttendance, setIsTakingAttendance] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [summaryData, setSummaryData] = useState({ dates: [], students: [] });
  const [dailyRoster, setDailyRoster] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  });

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/grading/dashboard/', { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.classes) {
          const teacherClasses = data.classes.map(cls => ({
            id: cls.id.toString(),
            name: `${cls.subject} — ${cls.section}`
          }));
          
          setClasses(teacherClasses);
          if (teacherClasses.length > 0) setSelectedClassId(teacherClasses[0].id);
        }
      })
      .catch(err => console.error("Failed to load classes:", err));
  }, []);

  const fetchSummary = () => {
    if (!selectedClassId) return;
    setIsLoading(true);
    fetch(`http://127.0.0.1:8000/api/grading/class-attendance-summary/${selectedClassId}/`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => { setSummaryData(data); setIsLoading(false); })
      .catch(err => { console.error("Failed to fetch summary:", err); setIsLoading(false); });
  };

  const fetchDaily = () => {
    if (!selectedClassId || !selectedDate) return;
    setIsLoading(true);
    fetch(`http://127.0.0.1:8000/api/grading/class-attendance/${selectedClassId}/?date=${selectedDate}`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => { 
        const dataWithStatus = data.map(student => ({ ...student, saveStatus: 'idle' }));
        setDailyRoster(dataWithStatus); 
        setIsLoading(false); 
      })
      .catch(err => { console.error("Failed to fetch daily:", err); setIsLoading(false); });
  };

  useEffect(() => {
    if (isTakingAttendance) fetchDaily();
    else fetchSummary();
  }, [selectedClassId, isTakingAttendance, selectedDate]);

  const handleStatusChange = (enrollmentId, newStatus) => {
    setDailyRoster(prev => prev.map(s => s.enrollment_id === enrollmentId ? { ...s, status: newStatus, saveStatus: 'saving' } : s));

    fetch(`http://127.0.0.1:8000/api/grading/class-attendance/${selectedClassId}/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ enrollment_id: enrollmentId, date: selectedDate, status: newStatus })
    })
    .then(res => {
      if (res.ok) {
        setDailyRoster(prev => prev.map(s => s.enrollment_id === enrollmentId ? { ...s, saveStatus: 'saved' } : s));
        setTimeout(() => setDailyRoster(current => current.map(s => s.enrollment_id === enrollmentId ? { ...s, saveStatus: 'idle' } : s)), 2000);
      } else throw new Error("Failed");
    })
    .catch(() => setDailyRoster(prev => prev.map(s => s.enrollment_id === enrollmentId ? { ...s, saveStatus: 'error' } : s)));
  };

  const formatHeaderDate = (dateStr) => {
    const d = new Date(dateStr);
    const month = d.toLocaleString('default', { month: 'short' }).toUpperCase();
    return `${month} ${d.getDate()}`;
  };

  if (isTakingAttendance) {
    const presentCount = dailyRoster.filter(s => s.status === 'Present').length;
    const lateCount = dailyRoster.filter(s => s.status === 'Late').length;
    const absentCount = dailyRoster.filter(s => s.status === 'Absent').length;

    return (
      <div className="max-w-6xl animate-in fade-in slide-in-from-bottom-8 duration-300 relative pb-10">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setIsTakingAttendance(false)} className="flex items-center space-x-2 text-gray-500 hover:text-amber-600 font-bold transition-colors">
            <ChevronLeft size={20} /><span>Back to Summary</span>
          </button>
          <div className="flex items-center space-x-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
            <div className="bg-amber-50 p-1.5 rounded-lg text-amber-600"><CalendarDays size={18} /></div>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent border-none text-sm font-bold text-[#1A1C29] focus:outline-none cursor-pointer px-2" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-t-2xl border border-gray-100 flex items-center justify-between shadow-sm">
          <h2 className="text-xl font-serif font-bold text-[#1A1C29]">Daily Roster</h2>
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Present: {presentCount}</span>
            <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">Late: {lateCount}</span>
            <span className="px-3 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-100">Absent: {absentCount}</span>
          </div>
        </div>

        <div className="bg-white border-x border-b border-gray-100 rounded-b-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider">STUDENT NAME</th>
                <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider text-center">MARK ATTENDANCE</th>
                <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider w-24 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan="3" className="p-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" size={32} /></td></tr>
              ) : dailyRoster.map(student => (
                <tr key={student.enrollment_id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-[#1A1C29]">{student.last_name}, {student.first_name}</div>
                    <div className="text-xs text-gray-400 font-medium">{student.student_number}</div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="inline-flex rounded-lg shadow-sm p-1 bg-gray-50 border border-gray-200 gap-1">
                      <button onClick={() => handleStatusChange(student.enrollment_id, 'Present')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${student.status === 'Present' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50'}`}>Present</button>
                      <button onClick={() => handleStatusChange(student.enrollment_id, 'Late')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${student.status === 'Late' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-500 hover:text-amber-600 hover:bg-amber-50'}`}>Late</button>
                      <button onClick={() => handleStatusChange(student.enrollment_id, 'Absent')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${student.status === 'Absent' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}`}>Absent</button>
                      <button onClick={() => handleStatusChange(student.enrollment_id, 'Excused')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${student.status === 'Excused' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`}>Excused</button>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center items-center h-full">
                      {student.saveStatus === 'saving' && <Loader2 size={18} className="animate-spin text-amber-500" />}
                      {student.saveStatus === 'saved' && <CheckCircle2 size={18} className="text-emerald-500 animate-in zoom-in" />}
                      {student.saveStatus === 'error' && <AlertCircle size={18} className="text-red-500" title="Failed to save" />}
                      {student.saveStatus === 'idle' && <span className="w-4.5"></span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const filteredSummary = summaryData.students.filter(student => {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const studentNum = (student.student_number || '').toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || studentNum.includes(searchTerm.toLowerCase());
  });

  let totalPresent = 0; let totalLate = 0; let totalAbsent = 0; let totalExcused = 0;
  summaryData.students.forEach(s => {
    Object.values(s.attendance).forEach(status => {
      if (status === 'Present') totalPresent++;
      if (status === 'Late') totalLate++;
      if (status === 'Absent') totalAbsent++;
      if (status === 'Excused') totalExcused++;
    });
  });

  return (
    <div className="max-w-6xl animate-in fade-in duration-300 relative pb-10">

      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1A1C29]">Attendance</h1>
          <p className="text-gray-500 mt-1">Track and manage student attendance</p>
        </div>
        <button onClick={() => setIsTakingAttendance(true)} className="flex items-center space-x-2 bg-amber-400 hover:bg-amber-500 text-[#1A1C29] px-5 py-2.5 rounded-lg font-bold transition-colors shadow-sm text-sm">
          <Plus size={18} /><span>Take Attendance</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-t-2xl border border-gray-100 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center space-x-3 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
            <div className="bg-white p-1.5 rounded shadow-sm text-amber-500"><BookOpen size={18} /></div>
            <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="bg-transparent border-none text-sm font-bold text-[#1A1C29] focus:ring-0 cursor-pointer pr-8 py-1 focus:outline-none">
              {classes.length === 0 ? <option value="">No classes available</option> : classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="relative w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search student..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400" />
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Present: {totalPresent}</span>
          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">Late: {totalLate}</span>
          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-100">Absent: {totalAbsent}</span>
        </div>
      </div>

      <div className="bg-white px-6 py-3 border-x border-gray-100 flex items-center gap-6 text-xs font-bold text-gray-500">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500"></div>Present</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-500"></div>Absent</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-500"></div>Late</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-500"></div>Excused</div>
      </div>

      <div className="bg-white border border-gray-100 rounded-b-2xl overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider sticky left-0 bg-gray-50 z-10 border-r border-gray-100">STUDENT</th>

              {summaryData.dates.map(date => (
                <th key={date} className="p-4 text-[11px] font-bold text-gray-400 tracking-wider text-center border-r border-gray-100/50">
                  {formatHeaderDate(date)}
                </th>
              ))}
              
              <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider text-center">PRESENT</th>
              <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider text-center">ABSENT</th>
              <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider text-center">RATE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={summaryData.dates.length + 4} className="p-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" size={32} /></td></tr>
            ) : filteredSummary.length === 0 ? (
              <tr><td colSpan={summaryData.dates.length + 4} className="p-12 text-center text-gray-500 font-medium">No records found.</td></tr>
            ) : (
              filteredSummary.map(student => {

                let p = 0; let a = 0;
                Object.values(student.attendance).forEach(val => {
                  if (val === 'Present' || val === 'Late') p++;
                  if (val === 'Absent') a++;
                });
                
                const totalDays = summaryData.dates.length;
                const rate = totalDays > 0 ? Math.round((p / totalDays) * 100) : 0;

                let rateColor = "bg-emerald-100 text-emerald-700";
                if (rate < 85) rateColor = "bg-amber-100 text-amber-700";
                if (rate < 75) rateColor = "bg-red-100 text-red-700";

                return (
                  <tr key={student.enrollment_id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="p-4 sticky left-0 bg-white border-r border-gray-100 z-10">
                      <div className="font-bold text-[#1A1C29] whitespace-nowrap">{student.last_name}, {student.first_name}</div>
                    </td>

                    {summaryData.dates.map(date => {
                      const status = student.attendance[date];
                      let marker = <span className="text-gray-300">-</span>;
                      if (status === 'Present') marker = <span className="text-emerald-500 font-bold">P</span>;
                      if (status === 'Absent') marker = <span className="text-red-500 font-bold">A</span>;
                      if (status === 'Late') marker = <span className="text-amber-500 font-bold">L</span>;
                      if (status === 'Excused') marker = <span className="text-blue-500 font-bold">E</span>;
                      
                      return (
                        <td key={date} className="p-4 text-center border-r border-gray-100/50">
                          {marker}
                        </td>
                      );
                    })}
                    
                    <td className="p-4 text-center font-bold text-gray-600">{p}</td>
                    <td className="p-4 text-center font-bold text-red-500">{a}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${rateColor}`}>
                        {rate}%
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default Attendance;