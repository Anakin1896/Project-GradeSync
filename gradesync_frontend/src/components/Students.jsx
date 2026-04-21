import React, { useState, useEffect } from 'react';
import { Search, Users, Loader2, UserPlus, X, Save, ArrowLeft, Database, Trash2, BookOpen, GraduationCap, AlertTriangle } from 'lucide-react';

const Students = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [rosterFilterProgram, setRosterFilterProgram] = useState('');
  const [rosterFilterYear, setRosterFilterYear] = useState('');
  const [rosterFilterSection, setRosterFilterSection] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState('selection'); 
  const [eduType, setEduType] = useState(''); 
  
  const [isSaving, setIsSaving] = useState(false);
  const [unenrollModalData, setUnenrollModalData] = useState(null);
  const [isUnenrolling, setIsUnenrolling] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    student_number: '', first_name: '', last_name: '', sex: 'F', email: '', 
    program: '', current_year_level: 1, section: '', subject: '' 
  });

  const [availableStudents, setAvailableStudents] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [programs, setPrograms] = useState([]); 
  const [isFetchingGlobal, setIsFetchingGlobal] = useState(false);
  const [searchExisting, setSearchExisting] = useState('');

  const [filterProgram, setFilterProgram] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  });

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 3500);
  };

  const fetchStudents = () => {
    fetch('http://127.0.0.1:8000/api/grading/enrollments/', { method: 'GET', headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => { setEnrollments(data); setIsLoading(false); })
      .catch(err => { console.error("Failed to fetch:", err); setIsLoading(false); });
  };

  const fetchSubjectsAndPrograms = () => {
    fetch('http://127.0.0.1:8000/api/grading/available-subjects/', { method: 'GET', headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => { 
        setAvailableSubjects(data);
        if (data.length > 0) setFormData(prev => ({ ...prev, subject: data[0].code }));
      })
      .catch(err => console.error("Failed to fetch subjects:", err));

    fetch('http://127.0.0.1:8000/api/core/programs/', { method: 'GET', headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        setPrograms(data);
        if (data.length > 0) setFormData(prev => ({ ...prev, program: data[0].code }));
      })
      .catch(err => console.error("Failed to fetch programs:", err));
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetchStudents();
      fetchSubjectsAndPrograms(); 
    }
  }, []);

  const fetchGlobalStudents = () => {
    setIsFetchingGlobal(true);
    setModalStep('existing');
    fetch('http://127.0.0.1:8000/api/grading/available-students/', { method: 'GET', headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => { setAvailableStudents(data); setIsFetchingGlobal(false); })
      .catch(err => { console.error("Failed to fetch global:", err); setIsFetchingGlobal(false); });
  };

  const handleEnroll = async (studentData) => {
    setIsSaving(true);
    setErrorMessage('');
    try {
      const response = await fetch('http://127.0.0.1:8000/api/grading/quick-enroll/', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(studentData)
      });
      if (response.ok) {
        closeModal();
        fetchStudents();
      } else {
        showError("Failed to enroll student. Please check your inputs.");
      }
    } catch (error) {
      console.error("Error saving:", error);
      showError("Network error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmUnenroll = async () => {
    if (!unenrollModalData) return;
    setIsUnenrolling(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/grading/enrollments/${unenrollModalData.id}/`, {
        method: 'DELETE', headers: getAuthHeaders()
      });
      if (response.ok) {
        setEnrollments(prev => prev.filter(e => e.enrollment_id !== unenrollModalData.id));
        setUnenrollModalData(null);
      }
    } catch (err) { console.error("Error deleting:", err); } 
    finally { setIsUnenrolling(false); }
  };

  const handleNewStudentSubmit = (e) => {
    e.preventDefault();
    if (!formData.section) {
        showError("Please type or select a Section/Block in the header above.");
        return;
    }
    handleEnroll(formData);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalStep('selection');
    setEduType('');
    setErrorMessage(''); 
    setFormData(prev => ({ 
        ...prev, student_number: '', first_name: '', last_name: '', sex: 'F', email: '', 
        program: programs.length > 0 ? programs[0].code : '', current_year_level: 1, section: '' 
    }));
    setSearchExisting(''); setFilterProgram(''); setFilterYear('');
  };

  const handleBackNavigation = () => {
    setErrorMessage(''); 
    if (modalStep === 'existing' || modalStep === 'new_edu') setModalStep('selection');
    else if (modalStep === 'new_year') setModalStep('new_edu');
    else if (modalStep === 'new_form') setModalStep('new_year');
  };

  const filteredRoster = enrollments.filter(e => {
    if (!e.student) return false; 
    const fullName = `${e.student.first_name} ${e.student.last_name}`.toLowerCase();
    const studentNum = (e.student.student_number || '').toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || studentNum.includes(searchTerm.toLowerCase());
    const programCode = e.student?.program?.code || '';
    const matchesProgram = rosterFilterProgram === '' || programCode === rosterFilterProgram;
    const yearLevel = String(e.student?.current_year_level || '');
    const matchesYear = rosterFilterYear === '' || yearLevel === rosterFilterYear;
    const rawSectionName = e.class_field?.section?.name || '';
    
    let sectionName = rawSectionName;
    if (programCode && !rawSectionName.includes(programCode)) sectionName = `${programCode} ${rawSectionName}`;
    const matchesSection = rosterFilterSection === '' || sectionName.includes(rosterFilterSection);
    return matchesSearch && matchesProgram && matchesYear && matchesSection;
  });

  const filteredGlobal = availableStudents.filter(s => {
    const matchesSearch = `${s.first_name} ${s.last_name} ${s.student_number}`.toLowerCase().includes(searchExisting.toLowerCase());
    const matchesProgram = filterProgram === '' || s.program === filterProgram;
    const matchesYear = filterYear === '' || String(s.current_year_level) === String(filterYear);
    return matchesSearch && matchesProgram && matchesYear;
  });

  const uniqueSections = Array.from(new Set(enrollments.map(e => e.class_field?.section?.name).filter(Boolean)));

  return (
    <div className="max-w-6xl animate-in fade-in duration-300 relative">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1A1C29]">My Students</h1>
          <p className="text-gray-500 mt-1">Manage and view your class rosters</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center space-x-2 bg-amber-400 hover:bg-amber-500 text-[#1A1C29] px-5 py-2.5 rounded-lg font-bold transition-colors shadow-sm text-sm">
          <UserPlus size={18} /><span>Add Student</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-t-2xl border border-gray-100 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search roster..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400" />
          </div>
          <select value={rosterFilterProgram} onChange={(e) => setRosterFilterProgram(e.target.value)} className="w-32 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-amber-400">
            <option value="">All Programs</option>
            {programs.map(p => <option key={p.code} value={p.code}>{p.code}</option>)}
          </select>
          <select value={rosterFilterYear} onChange={(e) => setRosterFilterYear(e.target.value)} className="w-32 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-amber-400">
            <option value="">All Years</option>
            {Array.from({length: 12}, (_, i) => i + 1).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={rosterFilterSection} onChange={(e) => setRosterFilterSection(e.target.value)} className="w-32 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-amber-400">
            <option value="">All Blocks</option>
            {uniqueSections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
          </select>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500 font-medium bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 shrink-0">
          <Users size={16} className="text-amber-500" /><span>Total: {filteredRoster.length}</span>
        </div>
      </div>

      <div className="bg-white border-x border-b border-gray-100 rounded-b-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-xs font-bold text-gray-500 tracking-wider">STUDENT NO.</th>
                <th className="p-4 text-xs font-bold text-gray-500 tracking-wider">NAME</th>
                <th className="p-4 text-xs font-bold text-gray-500 tracking-wider">SUBJECT & SECTION</th>
                <th className="p-4 text-xs font-bold text-gray-500 tracking-wider">STATUS</th>
                <th className="p-4 text-xs font-bold text-gray-500 tracking-wider text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500"><Loader2 className="animate-spin mx-auto mb-2" size={24} />Loading...</td></tr>
              ) : filteredRoster.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500 font-medium">No students found matching your filters.</td></tr>
              ) : (
                filteredRoster.map((e) => {
                  const subjectCode = e.class_field?.subject?.code || 'N/A';
                  let sectionName = e.class_field?.section?.name || 'N/A';
                  const programCode = e.student?.program?.code || ''; 
                  if (programCode && !sectionName.includes(programCode)) sectionName = `${programCode} ${sectionName}`;

                  return (
                    <tr key={e.enrollment_id} className="hover:bg-gray-50/50 group">
                      <td className="p-4 font-semibold text-[#1A1C29] text-sm">{e.student.student_number}</td>
                      <td className="p-4"><div className="font-bold text-[#1A1C29]">{e.student.last_name}, {e.student.first_name}</div></td>
                      <td className="p-4">
                        <div className="text-sm font-semibold text-[#1A1C29]">{subjectCode}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{sectionName}</div>
                      </td>
                      <td className="p-4"><span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Enrolled</span></td>
                      <td className="p-4 text-right">
                        <button onClick={() => setUnenrollModalData({ id: e.enrollment_id, name: `${e.student.first_name} ${e.student.last_name}` })} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {unenrollModalData && (
        <div className="fixed inset-0 bg-[#1A1C29]/60 backdrop-blur-sm flex items-center justify-center z-70 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
              <h3 className="text-xl font-serif font-bold text-[#1A1C29] mb-2">Unenroll Student?</h3>
              <p className="text-sm text-gray-500 mb-6">Are you sure you want to remove <span className="font-bold text-[#1A1C29]">{unenrollModalData.name}</span> from your class?</p>
              <div className="flex gap-3">
                <button onClick={() => setUnenrollModalData(null)} disabled={isUnenrolling} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50">Cancel</button>
                <button onClick={confirmUnenroll} disabled={isUnenrolling} className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white transition-colors shadow-sm">
                  {isUnenrolling ? <Loader2 size={16} className="animate-spin" /> : <span>Yes, Unenroll</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1A1C29]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">

          {errorMessage && (
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-100 animate-in slide-in-from-top-4 fade-in duration-300">
              <div className="bg-red-50 border border-red-200 shadow-xl rounded-xl px-5 py-3 flex items-center gap-3">
                <AlertTriangle size={20} className="text-red-500 shrink-0" />
                <span className="text-sm font-bold text-red-700">{errorMessage}</span>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                {modalStep !== 'selection' && (
                  <button onClick={handleBackNavigation} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"><ArrowLeft size={18} /></button>
                )}
                <h2 className="text-xl font-serif font-bold text-[#1A1C29]">
                  {modalStep === 'selection' ? 'Add Student' : 
                   modalStep === 'existing' ? 'Enroll Existing Student' : 
                   modalStep === 'new_edu' ? 'Select Education Level' :
                   modalStep === 'new_year' ? 'Select Year Level' :
                   'Student Details'}
                </h2>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 hover:bg-gray-100 p-1.5 rounded-lg"><X size={20} /></button>
            </div>

            {modalStep !== 'selection' && (
              <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex flex-wrap items-center gap-4 shrink-0 shadow-inner">
                <span className="text-sm font-bold text-amber-900 uppercase tracking-wider">Enrolling into:</span>
                
                <select 
                  name="subject" 
                  value={formData.subject} 
                  onChange={(e) => setFormData({...formData, subject: e.target.value})} 
                  className="bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm font-bold text-[#1A1C29] focus:outline-none focus:border-amber-400 shadow-sm cursor-pointer min-w-50 truncate"
                >
                  {availableSubjects.length === 0 ? (
                    <option value="">Loading subjects...</option>
                  ) : (
                    availableSubjects.map(sub => (
                      <option key={sub.code} value={sub.code}>
                        {sub.code} - {sub.title}
                      </option>
                    ))
                  )}
                </select>

                <input 
                  list="section-suggestions"
                  name="section" 
                  value={formData.section} 
                  onChange={(e) => setFormData({...formData, section: e.target.value})} 
                  placeholder="e.g. Block A, Sec 1"
                  className="bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm font-bold text-[#1A1C29] focus:outline-none focus:border-amber-400 shadow-sm cursor-text min-w-32"
                />
                <datalist id="section-suggestions">
                    {uniqueSections.map(sec => <option key={sec} value={sec} />)}
                </datalist>
              </div>
            )}

            <div className="overflow-y-auto">
              
              {modalStep === 'selection' && (
                <div className="p-8 grid grid-cols-2 gap-6 bg-gray-50 min-h-75 content-center">
                  <button onClick={fetchGlobalStudents} className="flex flex-col items-center justify-center p-8 bg-white border-2 border-gray-100 rounded-2xl hover:border-amber-400 hover:shadow-md transition-all group">
                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Database size={28} className="text-amber-500" /></div>
                    <h3 className="text-lg font-bold text-[#1A1C29]">Existing Student</h3>
                    <p className="text-sm text-gray-500 text-center mt-2">Search and enroll from the global database</p>
                  </button>
                  <button onClick={() => setModalStep('new_edu')} className="flex flex-col items-center justify-center p-8 bg-white border-2 border-gray-100 rounded-2xl hover:border-amber-400 hover:shadow-md transition-all group">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><UserPlus size={28} className="text-blue-500" /></div>
                    <h3 className="text-lg font-bold text-[#1A1C29]">New Student</h3>
                    <p className="text-sm text-gray-500 text-center mt-2">Create a brand new profile and enroll them</p>
                  </button>
                </div>
              )}

              {modalStep === 'existing' && (
                <div className="flex flex-col h-100">
                  <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-3 shrink-0">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input type="text" placeholder="Search name or ID..." value={searchExisting} onChange={(e) => setSearchExisting(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-amber-400 focus:outline-none" />
                    </div>
                    <select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)} className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-amber-400 focus:outline-none">
                      <option value="">All Programs</option>
                      {programs.map(p => <option key={p.code} value={p.code}>{p.code}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 bg-gray-50/50">
                    {isFetchingGlobal ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500"><Loader2 className="animate-spin mb-2" size={24} /><p className="text-sm font-medium">Searching database...</p></div>
                    ) : filteredGlobal.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-500 text-sm font-medium">No students match your search.</div>
                    ) : (
                      <div className="space-y-2">
                        {filteredGlobal.map(student => (
                          <div key={student.student_number} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
                            <div>
                              <p className="font-bold text-[#1A1C29]">{student.last_name}, {student.first_name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">ID: {student.student_number} • {student.program} • Year {student.current_year_level}</p>
                            </div>

                            <button onClick={() => {
                                if(!formData.section) { showError("Please type or select a Section/Block in the header above."); return;}
                                handleEnroll({ ...student, subject: formData.subject, section: formData.section })
                            }} disabled={isSaving} className="px-4 py-1.5 bg-amber-100 hover:bg-amber-400 text-amber-900 font-bold text-sm rounded-lg transition-colors flex items-center gap-2">
                              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Enroll
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {modalStep === 'new_edu' && (
                <div className="p-8 grid grid-cols-2 gap-6 bg-gray-50 min-h-75 content-center">
                  <button onClick={() => { setEduType('K-12'); setModalStep('new_year'); }} className="flex flex-col items-center justify-center p-8 bg-white border-2 border-gray-100 rounded-2xl hover:border-emerald-400 hover:shadow-md transition-all group">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><BookOpen size={28} className="text-emerald-500" /></div>
                    <h3 className="text-lg font-bold text-[#1A1C29]">K-12 Student</h3>
                    <p className="text-sm text-gray-500 text-center mt-2">Grade 1 through Grade 12</p>
                  </button>
                  <button onClick={() => { setEduType('College'); setModalStep('new_year'); }} className="flex flex-col items-center justify-center p-8 bg-white border-2 border-gray-100 rounded-2xl hover:border-blue-400 hover:shadow-md transition-all group">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><GraduationCap size={28} className="text-blue-500" /></div>
                    <h3 className="text-lg font-bold text-[#1A1C29]">College Student</h3>
                    <p className="text-sm text-gray-500 text-center mt-2">Undergraduate Degree Programs</p>
                  </button>
                </div>
              )}

              {modalStep === 'new_year' && (
                <div className="p-8 bg-gray-50 min-h-75 flex flex-col items-center justify-center">
                  <h3 className="text-lg font-bold text-[#1A1C29] mb-6">Select {eduType === 'K-12' ? 'Grade' : 'Year'} Level</h3>
                  <div className={`grid gap-4 ${eduType === 'K-12' ? 'grid-cols-4' : 'grid-cols-2'} w-full max-w-lg`}>
                    {eduType === 'K-12' 
                      ? Array.from({length: 12}, (_, i) => i + 1).map(y => (
                          <button key={y} onClick={() => { setFormData({...formData, current_year_level: y}); setModalStep('new_form'); }} className="p-4 bg-white border border-gray-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 font-bold text-[#1A1C29] transition-colors">Grade {y}</button>
                        ))
                      : [1, 2, 3, 4].map(y => (
                          <button key={y} onClick={() => { setFormData({...formData, current_year_level: y}); setModalStep('new_form'); }} className="p-4 bg-white border border-gray-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 font-bold text-[#1A1C29] transition-colors">{y}{y===1?'st':y===2?'nd':y===3?'rd':'th'} Year</button>
                        ))
                    }
                  </div>
                </div>
              )}

              {modalStep === 'new_form' && (
                <form onSubmit={handleNewStudentSubmit}>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">STUDENT NUMBER *</label>
                        <input type="text" name="student_number" required value={formData.student_number} onChange={(e) => setFormData({...formData, student_number: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-amber-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">EMAIL ADDRESS</label>
                        <input type="email" name="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-amber-400" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">FIRST NAME *</label>
                        <input type="text" name="first_name" required value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-amber-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">LAST NAME *</label>
                        <input type="text" name="last_name" required value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-amber-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pb-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">SEX</label>
                        <select name="sex" value={formData.sex} onChange={(e) => setFormData({...formData, sex: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-amber-400">
                          <option value="M">Male</option><option value="F">Female</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">ASSIGNED PROGRAM</label>
                        <select name="program" value={formData.program} onChange={(e) => setFormData({...formData, program: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-amber-400">
                          {programs.length === 0 ? (
                             <option value="">No programs available</option>
                          ) : (
                             programs.map(p => <option key={p.code} value={p.code}>{p.code} - {p.name}</option>)
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1.5 rounded border border-gray-200">
                        Level: {eduType === 'K-12' ? 'Grade' : 'Year'} {formData.current_year_level}
                    </span>
                    <button type="submit" disabled={isSaving} className="flex items-center space-x-2 px-5 py-2 rounded-lg text-sm font-bold bg-amber-400 hover:bg-amber-500 disabled:bg-amber-200 text-[#1A1C29] transition-colors shadow-sm">
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      <span>Create & Enroll</span>
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default Students;