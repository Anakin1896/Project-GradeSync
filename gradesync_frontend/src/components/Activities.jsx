import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Loader2, X, Save, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';

const Activities = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '', type: 'Quiz', period: '', perfect_score: 100, date: ''
  });

  const [gradingActivity, setGradingActivity] = useState(null);
  const [rosterScores, setRosterScores] = useState([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  });

  const selectedClass = classes.find(c => c.id.toString() === selectedClassId);
  const templatePeriods = selectedClass?.grading_template?.items || [];
  const transmutationBase = selectedClass?.grading_template ? Number(selectedClass.grading_template.transmutation_base) : 60;
  const multiplier = 100 - transmutationBase;

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/grading/dashboard/', { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.classes) {
          const teacherClasses = data.classes.map(cls => ({
            id: cls.id.toString(),
            name: `${cls.subject} — ${cls.section}`,
            grading_template: cls.grading_template
          }));
          
          setClasses(teacherClasses);
          if (teacherClasses.length > 0) setSelectedClassId(teacherClasses[0].id);
        }
      })
      .catch(err => console.error("Failed to load classes:", err));
  }, []);

  const fetchActivities = () => {
    if (!selectedClassId) return;
    setIsLoading(true);
    fetch(`http://127.0.0.1:8000/api/grading/class-activities/${selectedClassId}/`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => { setActivities(data); setIsLoading(false); })
      .catch(err => { console.error(err); setIsLoading(false); });
  };

  useEffect(() => {
    if (!gradingActivity) {
      fetchActivities(); 
    }
  }, [selectedClassId, gradingActivity]);

  const handleAddActivity = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/grading/class-activities/${selectedClassId}/`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(formData)
      });
      if (response.ok) {
        setIsModalOpen(false);
        setFormData({ title: '', type: 'Quiz', period: templatePeriods.length > 0 ? templatePeriods[0].name : '', perfect_score: 100, date: '' });
        fetchActivities(); 
      }
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  const calculateWeightedScore = (rawScore, perfectScore) => {
    if (rawScore === '' || rawScore === null || isNaN(rawScore)) return '--';
    const numRaw = parseFloat(rawScore);
    const numPerf = parseFloat(perfectScore);
    
    if (numPerf <= 0) return '--';

    let transmuted = (numRaw / numPerf) * multiplier + transmutationBase;
    transmuted = Math.max(transmutationBase, Math.min(100, transmuted));
    
    return transmuted.toFixed(2) + '%';
  };

  const openGradingPanel = (activity) => {
    setGradingActivity(activity);
    setIsLoadingRoster(true);
    
    fetch(`http://127.0.0.1:8000/api/grading/activity-scores/${activity.id}/`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        const rosterWithStatus = data.map(s => ({ ...s, saveStatus: 'idle' }));
        setRosterScores(rosterWithStatus);
        setIsLoadingRoster(false);
      })
      .catch(err => { console.error(err); setIsLoadingRoster(false); });
  };

  const handleScoreChange = (studentNumber, newValue) => {
    setRosterScores(prev => prev.map(s => 
      s.student_number === studentNumber ? { ...s, raw_score: newValue, saveStatus: 'saving' } : s
    ));

    fetch(`http://127.0.0.1:8000/api/grading/activity-scores/${gradingActivity.id}/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ student_number: studentNumber, raw_score: newValue })
    })
    .then(res => {
      if (res.ok) {
        setRosterScores(prev => prev.map(s => 
          s.student_number === studentNumber ? { ...s, saveStatus: 'saved' } : s
        ));
        setTimeout(() => {
          setRosterScores(current => current.map(s => 
            s.student_number === studentNumber ? { ...s, saveStatus: 'idle' } : s
          ));
        }, 2000);
      } else {
        throw new Error("Failed");
      }
    })
    .catch(() => {
      setRosterScores(prev => prev.map(s => 
        s.student_number === studentNumber ? { ...s, saveStatus: 'error' } : s
      ));
    });
  };

  if (gradingActivity) {
    return (
      <div className="max-w-6xl animate-in fade-in slide-in-from-bottom-8 duration-300 relative pb-10">

        <button 
          onClick={() => setGradingActivity(null)}
          className="flex items-center space-x-2 text-gray-500 hover:text-amber-600 font-bold mb-6 transition-colors"
        >
          <ChevronLeft size={20} />
          <span>Back to Activities</span>
        </button>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-8 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 uppercase tracking-wider">
                {gradingActivity.type}
              </span>
              <span className="text-sm font-bold text-gray-400">{gradingActivity.period}</span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#1A1C29]">{gradingActivity.title}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-400 tracking-wider mb-1">PERFECT SCORE</p>
            <p className="text-3xl font-bold text-amber-500">{gradingActivity.perfect_score}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider w-1/3">STUDENT NAME</th>
                <th className="p-4 text-[11px] font-bold text-amber-600 tracking-wider text-right bg-amber-50/50">RAW SCORE</th>
                <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider text-center">TRANSMUTED SCORE (Base-{transmutationBase})</th>
                <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider w-24 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoadingRoster ? (
                <tr><td colSpan="4" className="p-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" size={32} /></td></tr>
              ) : rosterScores.length === 0 ? (
                <tr><td colSpan="4" className="p-12 text-center text-gray-500 font-medium">No students enrolled in this class yet.</td></tr>
              ) : (
                rosterScores.map(student => {
                  const weighted = calculateWeightedScore(student.raw_score, gradingActivity.perfect_score);
                  
                  return (
                    <tr key={student.student_number} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="p-4">
                        <div className="font-bold text-[#1A1C29]">{student.last_name}, {student.first_name}</div>
                        <div className="text-xs text-gray-400 font-medium">{student.student_number}</div>
                      </td>

                      <td className="p-4 bg-amber-50/30 group-hover:bg-amber-50/60 transition-colors">
                        <div className="flex justify-end">
                          <input 
                            type="number" 
                            step="0.1"
                            min="0"
                            max={gradingActivity.perfect_score}
                            value={student.raw_score}
                            onChange={(e) => {
                              setRosterScores(prev => prev.map(s => 
                                s.student_number === student.student_number ? { ...s, raw_score: e.target.value } : s
                              ));
                            }}
                            onBlur={(e) => handleScoreChange(student.student_number, e.target.value)}
                            className="w-24 px-3 py-2 text-right bg-white border border-gray-200 rounded-lg font-bold text-[#1A1C29] focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 shadow-sm"
                            placeholder="--"
                          />
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <span className={`text-lg font-bold ${weighted === '--' ? 'text-gray-300' : 'text-[#1A1C29]'}`}>
                          {weighted}
                        </span>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const filteredActivities = activities.filter(a => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Quizzes' && a.type === 'Quiz') return true;
    if (activeTab === 'Exams' && a.type === 'Exam') return true;
    if (activeTab === 'Activities' && (a.type === 'Activity' || a.type === 'Project' || a.type === 'Recitation' || a.type === 'Attendance')) return true;
    return false;
  });
  
  const groupedActivities = filteredActivities.reduce((acc, current) => {
    if (!acc[current.period]) acc[current.period] = [];
    acc[current.period].push(current);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl animate-in fade-in duration-300 relative pb-10">
      
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1A1C29]">Activities</h1>
          <p className="text-gray-500 mt-1">Manage quizzes, exams, and class activities</p>
        </div>
        <button 
          onClick={() => {
            setFormData({
              title: '', 
              type: 'Quiz', 
              period: templatePeriods.length > 0 ? templatePeriods[0].name : '', 
              perfect_score: 100, 
              date: ''
            });
            setIsModalOpen(true);
          }} 
          className="flex items-center space-x-2 bg-amber-400 hover:bg-amber-500 text-[#1A1C29] px-5 py-2.5 rounded-lg font-bold transition-colors shadow-sm text-sm"
        >
          <Plus size={18} /><span>Add Activity</span>
        </button>
      </div>

      <div className="flex items-center space-x-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm w-fit mb-8">
        <div className="bg-amber-50 p-1.5 rounded-lg text-amber-600"><BookOpen size={18} /></div>
        <select 
          value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}
          className="bg-transparent border-none text-sm font-bold text-[#1A1C29] focus:ring-0 cursor-pointer pr-8 py-1 focus:outline-none"
        >
          {classes.length === 0 ? <option value="">No classes available</option> : classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="flex space-x-2 mb-8">
        {['All', 'Quizzes', 'Activities', 'Exams'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${activeTab === tab ? 'bg-amber-400 text-[#1A1C29] shadow-sm' : 'text-gray-500 hover:bg-gray-100 bg-white border border-gray-200'}`}>
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12 text-gray-400"><Loader2 className="animate-spin" size={32} /></div>
      ) : Object.keys(groupedActivities).length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-500 font-medium text-lg">No activities found for this tab.</p>
        </div>
      ) : (
        Object.entries(groupedActivities).map(([period, items]) => (
          <div key={period} className="mb-8">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 pl-2">{period}</h3>
            
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider w-1/3">TITLE</th>
                    <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider">TYPE</th>
                    <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider">DATE</th>
                    <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider text-center">PERFECT SCORE</th>
                    <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider text-center">CLASS AVG</th>
                    <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider text-center">HIGHEST</th>
                    <th className="p-4 text-[11px] font-bold text-gray-400 tracking-wider text-center">LOWEST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(item => {
                    let badgeColor = "bg-gray-50 text-gray-600";
                    if (item.type === 'Quiz') badgeColor = "bg-blue-50 text-blue-600 font-bold";
                    if (item.type === 'Activity') badgeColor = "bg-emerald-50 text-emerald-600 font-bold";
                    if (item.type === 'Exam') badgeColor = "bg-purple-50 text-purple-600 font-bold";
                    if (item.type === 'Project') badgeColor = "bg-orange-50 text-orange-600 font-bold"; 
                    if (item.type === 'Recitation' || item.type === 'Attendance') badgeColor = "bg-pink-50 text-pink-600 font-bold"; 

                    return (
                      <tr key={item.id} onClick={() => openGradingPanel(item)} className="hover:bg-amber-50/30 transition-colors cursor-pointer group">
                        <td className="p-4 font-bold text-[#1A1C29] text-sm group-hover:text-amber-600 transition-colors flex items-center gap-2">
                          {item.title}
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-[11px] ${badgeColor}`}>{item.type}</span>
                        </td>
                        <td className="p-4 text-sm text-gray-500 font-medium">{item.date}</td>
                        <td className="p-4 text-center text-sm font-semibold text-gray-400">{item.perfect_score}</td>
                        <td className="p-4 text-center font-bold text-[#1A1C29]">{item.class_avg}</td>
                        <td className="p-4 text-center font-bold text-emerald-500">{item.highest}</td>
                        <td className="p-4 text-center font-bold text-red-400">{item.lowest}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1A1C29]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-serif font-bold text-[#1A1C29]">New Activity</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddActivity}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">TITLE *</label>
                  <input type="text" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="e.g. Quiz 1" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:border-amber-400 focus:outline-none" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">TYPE</label>
                    <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:border-amber-400 focus:outline-none">
                      <option value="Quiz">Quiz</option>
                      <option value="Activity">Activity</option>
                      <option value="Exam">Exam</option>
                      <option value="Project">Project</option>
                      <option value="Recitation">Recitation</option>
                      <option value="Attendance">Attendance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">GRADING PERIOD</label>
                    <select 
                      value={formData.period} 
                      onChange={(e) => setFormData({...formData, period: e.target.value})} 
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:border-amber-400 focus:outline-none"
                    >
                      {templatePeriods.length === 0 ? (
                        <option value="">No Template Assigned</option>
                      ) : (
                        templatePeriods.map((p, index) => (
                          <option key={index} value={p.name}>{p.name}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">PERFECT SCORE</label>
                    <input type="number" required min="1" value={formData.perfect_score} onChange={(e) => setFormData({...formData, perfect_score: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:border-amber-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">DATE GIVEN</label>
                    <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:border-amber-400 focus:outline-none" />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-lg text-sm font-bold text-gray-500 hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" disabled={isSaving} className="flex items-center space-x-2 px-5 py-2 rounded-lg text-sm font-bold bg-amber-400 hover:bg-amber-500 text-[#1A1C29] transition-colors shadow-sm">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} <span>Create Activity</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Activities;