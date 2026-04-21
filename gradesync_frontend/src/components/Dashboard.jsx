import React, { useState, useEffect } from 'react';
import { Plus, Users, BookOpen, Calendar as CalendarIcon, Loader2, ArrowRight, X, Save, Clock, MapPin, Edit3, Trash2, ChevronLeft, Layers, CalendarDays } from 'lucide-react';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    subject: '', title: '', section: 'Block A', room: '', time: '', days: [], grading_template_id: '' 
  });

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectStudents, setSubjectStudents] = useState([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);

  const [events, setEvents] = useState([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [newEventText, setNewEventText] = useState('');
  const [newEventDate, setNewEventDate] = useState('');

  const availableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  });

  const fetchData = () => {
    setIsLoading(true);

    fetch('http://127.0.0.1:8000/api/grading/dashboard/', { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => { setDashboardData(data); setIsLoading(false); })
      .catch(err => { console.error(err); setIsLoading(false); });

    fetch('http://127.0.0.1:8000/api/grading/available-subjects/', { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => setAvailableSubjects(data))
      .catch(err => console.error(err));

    fetch('http://127.0.0.1:8000/api/grading/grading-templates/', { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => setAvailableTemplates(data))
      .catch(err => console.error(err));

    fetchEvents();
  };

  const fetchEvents = () => {
    fetch('http://127.0.0.1:8000/api/grading/events/', { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(err => console.error("Failed to fetch events", err));
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEventText || !newEventDate) return;
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/grading/events/', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text: newEventText, date: newEventDate })
      });
      if (response.ok) {
        setNewEventText('');
        setNewEventDate('');
        fetchEvents();
        setIsEventModalOpen(false);
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteEvent = async (id) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/grading/events/${id}/`, {
        method: 'DELETE', headers: getAuthHeaders()
      });
      if (response.ok) fetchEvents();
    } catch (err) { console.error(err); }
  };

  const handleDayToggle = (day) => {
    setFormData(prev => {
      const currentDays = prev.days;
      if (currentDays.includes(day)) return { ...prev, days: currentDays.filter(d => d !== day) };
      else return { ...prev, days: [...currentDays, day] };
    });
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ subject: '', title: '', section: 'Block A', room: '', time: '', days: [], grading_template_id: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (cls) => {
    setEditingId(cls.id);
    const dayArray = cls.days && cls.days !== 'TBA' ? cls.days.split(', ') : [];
    const templateId = cls.grading_template ? cls.grading_template.id : (cls.grading_template_id || '');
    setFormData({
      subject: cls.subject, title: cls.title, section: cls.section, room: cls.room !== 'TBA' ? cls.room : '', 
      time: cls.time !== 'TBA' ? cls.time : '', days: dayArray, grading_template_id: templateId
    });
    setIsModalOpen(true);
  };

  const handleDeleteClass = async (id) => {
    if (!window.confirm("Are you sure you want to delete this class schedule?")) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/grading/schedule/${id}/`, { method: 'DELETE', headers: getAuthHeaders() });
      if (res.ok) fetchData();
    } catch (err) { console.error(err); }
  };

  const handleSaveClass = async (e) => {
    e.preventDefault();
    if (formData.days.length === 0) {
      alert("Please select at least one day for this class.");
      return;
    }

    setIsSaving(true);
    const url = editingId ? `http://127.0.0.1:8000/api/grading/schedule/${editingId}/` : 'http://127.0.0.1:8000/api/grading/dashboard/';
    const method = editingId ? 'PUT' : 'POST';

    const payload = { ...formData };
    if (!payload.grading_template_id) payload.grading_template_id = null;

    try {
      const response = await fetch(url, { method: method, headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if (response.ok) {
        setIsModalOpen(false);
        fetchData(); 
      } else alert("Failed to save class.");
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  const handleSubjectClick = (cls) => {
    setSelectedSubject(cls);
    setIsLoadingRoster(true);
    fetch('http://127.0.0.1:8000/api/grading/enrollments/', { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        const enrolled = data.filter(e => e.class_field && e.class_field.class_id === cls.id);
        setSubjectStudents(enrolled);
        setIsLoadingRoster(false);
      })
      .catch(err => { console.error(err); setIsLoadingRoster(false); });
  };

  const getSubjectColor = (subjectName) => {
    const colors = [
      'bg-purple-100 text-purple-800', 'bg-amber-100 text-amber-800',
      'bg-emerald-100 text-emerald-800', 'bg-blue-100 text-blue-800', 'bg-rose-100 text-rose-800'
    ];
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const renderCalendar = () => {
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const todayNumber = currentDate.getDate();
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    
    const calendarGrid = [];
    let currentWeek = [];

    for (let i = 0; i < firstDayOfMonth; i++) currentWeek.push('');

    for (let i = 1; i <= daysInMonth; i++) {
      currentWeek.push(i);
      if (currentWeek.length === 7) {
        calendarGrid.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push('');
      calendarGrid.push(currentWeek);
    }

    const hasEvent = (dayNum) => {
      if (!dayNum) return false;
      const cellDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      return events.some(e => e.date === cellDateStr);
    };

    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-full">
        <h3 className="text-lg font-serif font-bold text-[#1A1C29] mb-4">{monthNames[currentMonth]} {currentYear}</h3>
        <div className="grid grid-cols-7 gap-y-4 text-center">
          {days.map(d => <div key={d} className="text-[11px] font-bold text-gray-400">{d}</div>)}
          
          {calendarGrid.flat().map((dateNum, i) => (
            <div key={i} className={`text-sm font-semibold flex flex-col items-center justify-center h-8 w-8 mx-auto rounded-full relative
              ${dateNum === todayNumber ? 'bg-amber-400 text-[#1A1C29] shadow-sm' : 'text-gray-600'}`}>
              <span className="z-10">{dateNum}</span>
              {hasEvent(dateNum) && <span className="absolute bottom-1 w-1 h-1 bg-purple-500 rounded-full z-20"></span>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading || !dashboardData || !dashboardData.classes) {
  return <div className="flex h-full items-center justify-center text-gray-400"><Loader2 className="animate-spin" size={40} /></div>;
}

  const { stats, classes, teacher_name, today_date } = dashboardData;
  
  const scheduledClasses = classes.filter(c => c.time && c.time !== 'TBA' && c.days && c.days !== 'TBA');
  const unscheduledClasses = classes.filter(c => !c.time || c.time === 'TBA' || !c.days || c.days === 'TBA');
  
  const parseTimeForSort = (timeStr) => {
    if (!timeStr || timeStr === 'TBA') return 999999;
    const firstTime = timeStr.split('-')[0].trim();
    const match = firstTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 999999;
    
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  };

  const uniqueTimes = [...new Set(scheduledClasses.map(c => c.time))].sort((a, b) => parseTimeForSort(a) - parseTimeForSort(b));

  const filteredSubjects = availableSubjects.filter(sub => 
    sub.code.toLowerCase().includes(formData.subject.toLowerCase()) || 
    sub.title.toLowerCase().includes(formData.subject.toLowerCase())
  );

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaysClasses = scheduledClasses
    .filter(cls => cls.days.includes(todayName))
    .sort((a, b) => parseTimeForSort(a.time) - parseTimeForSort(b.time));

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const nextClass = todaysClasses.find(cls => parseTimeForSort(cls.time) > currentMinutes);
  const nextClassText = nextClass ? nextClass.time.split('-')[0].trim() : '--:--';

  return (
    <div className="max-w-6xl animate-in fade-in duration-300 relative pb-10">
      
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-[#1A1C29]">Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">Welcome back, {teacher_name} — {today_date}</p>
      </div>

      <div className="flex space-x-8 border-b border-gray-200 mb-8">
        {['Overview', 'Schedule', 'Subjects'].map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setSelectedSubject(null); }} className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === tab ? 'text-[#1A1C29]' : 'text-gray-400 hover:text-gray-600'}`}>
            {tab}
            {activeTab === tab && <div className="absolute -bottom-px left-0 w-full h-0.5 bg-amber-400 rounded-t-md"></div>}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-t-4 border-t-amber-400 relative">
              <Layers className="text-amber-400 mb-4" size={24} />
              <h2 className="text-3xl font-bold text-[#1A1C29] mb-1">{stats.total_classes}</h2>
              <p className="text-sm font-bold text-[#1A1C29]">Subjects Handled</p>
              <p className="text-xs text-gray-400 mt-1">{todaysClasses.length} active today</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-t-4 border-t-emerald-400 relative">
              <Users className="text-emerald-500 mb-4" size={24} />
              <h2 className="text-3xl font-bold text-[#1A1C29] mb-1">{stats.total_students}</h2>
              <p className="text-sm font-bold text-[#1A1C29]">Total Students</p>
              <p className="text-xs text-gray-400 mt-1">Across all sections</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-t-4 border-t-blue-400 relative">
              <CalendarIcon className="text-blue-400 mb-4" size={24} />
              <h2 className="text-3xl font-bold text-[#1A1C29] mb-1">{todaysClasses.length}</h2>
              <p className="text-sm font-bold text-[#1A1C29]">Classes Today</p>
              <p className="text-xs text-gray-400 mt-1">Next: {nextClassText}</p>
            </div>
            <div onClick={() => setIsEventModalOpen(true)} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-t-4 border-t-purple-400 relative cursor-pointer hover:shadow-md transition-shadow group">
              <CalendarDays className="text-purple-400 mb-4" size={24} />
              <h2 className="text-3xl font-bold text-[#1A1C29] mb-1">{events.length}</h2>
              <p className="text-sm font-bold text-[#1A1C29]">Upcoming Events</p>
              <div className="text-xs text-gray-400 mt-1 group-hover:text-purple-500 transition-colors flex items-center gap-1">
                {events.length > 0 ? <span className="truncate">Next: {new Date(events[0].date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', timeZone: 'UTC'})}</span> : <span>Click to add event</span>}
                <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"/>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-87.5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-serif font-bold text-[#1A1C29]">Today's Classes</h3>
                <button onClick={() => setActiveTab('Schedule')} className="text-amber-500 text-sm font-bold flex items-center gap-1 hover:text-amber-600 transition-colors">
                  View Schedule <ArrowRight size={16} />
                </button>
              </div>
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">
                {todaysClasses.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-400 italic font-medium text-sm">No classes scheduled for today.</div>
                ) : (
                  todaysClasses.map(cls => (
                    <div key={cls.id} className="flex items-center p-4 rounded-xl border border-gray-100 hover:shadow-sm hover:border-gray-200 transition-all bg-gray-50/30">
                      <div className="w-24 shrink-0 text-sm font-bold text-gray-600">{cls.time.split('-')[0].trim()}</div>
                      <div className={`w-1 h-10 rounded-full mx-4 ${getSubjectColor(cls.subject).split(' ')[0]}`}></div>
                      <div className="flex-1">
                        <p className="text-base font-bold text-[#1A1C29]">{cls.subject} — {cls.title}</p>
                        <p className="text-xs font-semibold text-gray-500 mt-0.5">{cls.section}</p>
                      </div>
                      <div className="text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">{cls.room}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="col-span-1">{renderCalendar()}</div>
          </div>
        </div>
      )}

      {activeTab === 'Schedule' && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-50">
            <h2 className="text-xl font-serif font-bold text-[#1A1C29]">Weekly Schedule</h2>
            <button onClick={openAddModal} className="flex items-center space-x-2 bg-amber-400 hover:bg-amber-500 text-[#1A1C29] px-4 py-2 rounded-lg font-bold transition-colors shadow-sm text-sm">
              <Plus size={16} /><span>Add Class</span>
            </button>
          </div>

          <div className="overflow-x-auto pb-4 p-4">
            <table className="w-full text-left border-collapse min-w-250">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-24">TIME</th>
                  {availableDays.map(day => (
                    <th key={day} className="p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-1/7">{day.substring(0,3)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {uniqueTimes.length === 0 && unscheduledClasses.length === 0 ? (
                  <tr><td colSpan="8" className="p-16 text-center text-gray-400 italic font-medium">No classes scheduled.</td></tr>
                ) : (
                  uniqueTimes.map((time, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                      <td className="p-4 font-semibold text-gray-500 text-[11px] whitespace-nowrap align-top pt-6 border-r border-gray-50/50">{time}</td>
                      {availableDays.map(day => {
                        const cls = scheduledClasses.find(c => c.time === time && c.days.includes(day));
                        return (
                          <td key={day} className="p-2 align-top border-r border-gray-50/50">
                            {cls ? (
                              <div className={`p-2 rounded-lg ${getSubjectColor(cls.subject)} relative group animate-in zoom-in-95 duration-200 shadow-sm border border-black/5`}>
                                <p className="font-bold text-[11px] leading-tight mb-0.5 truncate">{cls.subject}</p>
                                <p className="text-[9px] font-semibold opacity-80 leading-tight truncate">{cls.section}</p>
                                <p className="text-[9px] font-semibold opacity-80 mt-0.5 truncate">{cls.room}</p>
                                <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] rounded-lg flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => openEditModal(cls)} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit3 size={14}/></button>
                                  <button onClick={() => handleDeleteClass(cls.id)} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={14}/></button>
                                </div>
                              </div>
                            ) : (
                              <div className="pt-2 pl-2"><span className="text-gray-200 font-bold text-xs">—</span></div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
                {unscheduledClasses.length > 0 && (
                  <tr className="bg-gray-50/50 border-t-2 border-dashed border-gray-200">
                    <td className="p-4 font-bold text-amber-500 text-[11px] whitespace-nowrap align-top pt-6 border-r border-gray-100">TBA /<br/>UNSCHEDULED</td>
                    <td colSpan="7" className="p-4">
                      <div className="flex flex-wrap gap-3">
                        {unscheduledClasses.map(cls => (
                          <div key={cls.id} className={`p-3 rounded-lg ${getSubjectColor(cls.subject)} relative group animate-in zoom-in-95 duration-200 shadow-sm border border-black/5 min-w-30`}>
                            <p className="font-bold text-xs leading-tight mb-0.5">{cls.subject}</p>
                            <p className="text-[10px] font-semibold opacity-80 leading-tight">{cls.section}</p>
                            <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] rounded-lg flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditModal(cls)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit3 size={14}/></button>
                              <button onClick={() => handleDeleteClass(cls.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14}/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Subjects' && !selectedSubject && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-serif font-bold text-[#1A1C29]">My Subjects & Blocks</h2>
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">Total: {classes.length}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {classes.length === 0 ? (
              <p className="text-gray-400 italic col-span-full text-center py-8">No subjects assigned yet.</p>
            ) : (
              classes.map((cls, idx) => {
                const gradients = ['bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100', 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100', 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100', 'bg-gradient-to-br from-purple-50 to-fuchsia-50 border-purple-100', 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-100'];
                return (
                  <div key={cls.id} onClick={() => handleSubjectClick(cls)} className={`p-6 rounded-2xl border hover:shadow-lg transition-all cursor-pointer group hover:-translate-y-1 ${gradients[idx % gradients.length]}`}>
                    <div className="w-10 h-10 bg-white/60 rounded-full flex items-center justify-center mb-4 text-[#1A1C29]"><BookOpen size={20} /></div>
                    <h3 className="font-bold text-lg text-[#1A1C29] group-hover:text-amber-600 transition-colors">{cls.subject}</h3>
                    <p className="text-xs font-semibold text-gray-600/80 mt-1 line-clamp-2">{cls.title}</p>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="inline-block px-3 py-1.5 bg-white shadow-sm rounded-lg text-xs font-bold text-[#1A1C29]">{cls.section}</span>
                      <span className="text-xs font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">View Roster <ArrowRight size={14}/></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'Subjects' && selectedSubject && (
        <div className="animate-in slide-in-from-right-8 duration-300">
          <button onClick={() => setSelectedSubject(null)} className="flex items-center space-x-2 text-gray-500 hover:text-amber-600 font-bold mb-6 transition-colors"><ChevronLeft size={20} /><span>Back to Subjects</span></button>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-amber-50/30 flex justify-between items-end">
              <div>
                <span className="inline-block px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded mb-2 tracking-wider">ROSTER VIEW</span>
                <h2 className="text-2xl font-serif font-bold text-[#1A1C29]">{selectedSubject.subject} — {selectedSubject.title}</h2>
                <p className="text-sm font-semibold text-gray-500 mt-1">{selectedSubject.section} • Room {selectedSubject.room}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Enrolled</p>
                <p className="text-3xl font-bold text-[#1A1C29]">{subjectStudents.length}</p>
              </div>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider">STUDENT ID</th>
                  <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider">FULL NAME</th>
                  <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider">PROGRAM & YEAR</th>
                  <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoadingRoster ? (
                  <tr><td colSpan="4" className="p-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" size={32} /></td></tr>
                ) : subjectStudents.length === 0 ? (
                  <tr><td colSpan="4" className="p-12 text-center text-gray-500 font-medium">No students enrolled.</td></tr>
                ) : (
                  subjectStudents.map(e => (
                    <tr key={e.enrollment_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-bold text-gray-500 text-sm">{e.student.student_number}</td>
                      <td className="p-4 font-bold text-[#1A1C29]">{e.student.last_name}, {e.student.first_name}</td>
                      <td className="p-4 text-sm font-semibold text-gray-600">{e.student?.program?.code || 'N/A'} • Year {e.student.current_year_level}</td>
                      <td className="p-4 text-right"><span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Enrolled</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1A1C29]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-serif font-bold text-[#1A1C29]">{editingId ? 'Edit Class Schedule' : 'Schedule New Class'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveClass}>
              <div className="p-6 space-y-5">

                <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl mb-2">
                  <label className="block text-xs font-bold text-amber-700 tracking-wider mb-2">GRADING TEMPLATE (RULES)</label>
                  <select 
                    value={formData.grading_template_id} 
                    onChange={(e) => setFormData({...formData, grading_template_id: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-amber-200 rounded-lg text-sm font-semibold focus:border-amber-400 focus:outline-none text-[#1A1C29] cursor-pointer"
                  >
                    <option value="">-- Standard Direct Average --</option>
                    {availableTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} (Base {t.transmutation_base})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-amber-600/80 mt-1 font-semibold">Select how grades will be computed for this specific class.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">SUBJECT CODE *</label>
                    <input type="text" required autoComplete="off" value={formData.subject} onChange={(e) => {setFormData({...formData, subject: e.target.value}); setShowSuggestions(true);}} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="Type to search..." className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:border-amber-400 focus:outline-none" />
                    {showSuggestions && formData.subject && filteredSubjects.length > 0 && (
                      <ul className="absolute z-50 w-[250%] left-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl">
                        {filteredSubjects.map(sub => (
                          <li key={sub.code} onClick={() => {setFormData({...formData, subject: sub.code, title: sub.title}); setShowSuggestions(false);}} className="px-4 py-2 hover:bg-amber-50 cursor-pointer text-sm border-b border-gray-50 last:border-0">
                            <span className="font-bold text-[#1A1C29]">{sub.code}</span><span className="text-gray-500 ml-2">— {sub.title}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">BLOCK / SECTION *</label>
                    <input type="text" required value={formData.section} onChange={(e) => setFormData({...formData, section: e.target.value})} placeholder="e.g. STEM-A" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:border-amber-400 focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">DESCRIPTIVE TITLE</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="e.g. General Biology 2" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:border-amber-400 focus:outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">TIME</label>
                    <div className="relative">
                      <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} placeholder="7:30-8:30" className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:border-amber-400 focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">ROOM</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" value={formData.room} onChange={(e) => setFormData({...formData, room: e.target.value})} placeholder="e.g. Rm201" className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:border-amber-400 focus:outline-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 tracking-wider mb-2">DAYS OF THE WEEK</label>
                  <div className="flex flex-wrap gap-2">
                    {availableDays.map(day => {
                      const isSelected = formData.days.includes(day);
                      return (
                        <button key={day} type="button" onClick={() => handleDayToggle(day)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors border ${isSelected ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                          {day.substring(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-lg text-sm font-bold text-gray-500 hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" disabled={isSaving} className="flex items-center space-x-2 px-5 py-2 rounded-lg text-sm font-bold bg-amber-400 hover:bg-amber-500 disabled:bg-amber-200 text-[#1A1C29] transition-colors shadow-sm">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{editingId ? 'Save Changes' : 'Create Class'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEventModalOpen && (
        <div className="fixed inset-0 bg-[#1A1C29]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#1A1C29]">Upcoming Events</h2>
                  <p className="text-xs text-gray-500 font-medium">Manage reminders & dates</p>
                </div>
              </div>
              <button onClick={() => setIsEventModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6 max-h-64 overflow-y-auto bg-white">
                {events.length === 0 ? (
                    <div className="text-center text-gray-400 italic text-sm py-8 border-2 border-dashed border-gray-100 rounded-xl">
                      No upcoming events.<br/>Add one below!
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {events.map(ev => (
                            <li key={ev.id} className="flex justify-between items-center bg-gray-50 p-3.5 rounded-xl border border-gray-100 hover:border-purple-200 transition-colors group">
                                <div>
                                    <p className="text-sm font-bold text-[#1A1C29]">{ev.text}</p>
                                    <p className="text-xs font-semibold text-purple-500 mt-0.5">
                                      {new Date(ev.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                                    </p>
                                </div>
                                <button onClick={() => handleDeleteEvent(ev.id)} className="text-gray-300 hover:text-red-500 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 bg-white shadow-sm border border-gray-200"><Trash2 size={14}/></button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <form onSubmit={handleAddEvent} className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col gap-4">
                <input 
                  type="text" required value={newEventText} onChange={(e) => setNewEventText(e.target.value)} 
                  placeholder="e.g. Faculty Meeting, Midterm Exams..." 
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:border-purple-400 focus:outline-none shadow-sm" 
                />
                <div className="flex gap-3">
                    <input 
                      type="date" required value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} 
                      className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:border-purple-400 focus:outline-none shadow-sm text-gray-600" 
                    />
                    <button type="submit" className="flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-purple-500 hover:bg-purple-600 text-white transition-colors shadow-sm">
                        <Plus size={16} /> <span>Add Event</span>
                    </button>
                </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;