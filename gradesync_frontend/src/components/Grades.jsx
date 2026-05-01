import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Edit3, FileSpreadsheet, Loader2, 
  X, Save, Calculator, AlertCircle, Settings, Plus } from 'lucide-react';

const Grades = () => {
  const [classes, setClasses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  const [manualFinal, setManualFinal] = useState('');
  const [manualRemarks, setManualRemarks] = useState('');

  const [isWeightsModalOpen, setIsWeightsModalOpen] = useState(false);
  const [components, setComponents] = useState([]);
  const [isSavingWeights, setIsSavingWeights] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState(null);
  const [selectedWeightPeriod, setSelectedWeightPeriod] = useState('');

  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [breakdownData, setBreakdownData] = useState([]);
  const [breakdownInfo, setBreakdownInfo] = useState({ student: null, period: null });
  const [isLoadingBreakdown, setIsLoadingBreakdown] = useState(false);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  });

  const fetchData = () => {
    setIsLoading(true);
    Promise.all([
      fetch('http://127.0.0.1:8000/api/grading/dashboard/', { headers: getAuthHeaders() }).then(res => res.json()),
      fetch('http://127.0.0.1:8000/api/grading/enrollments/', { headers: getAuthHeaders() }).then(res => res.json())
    ])
    .then(([dashData, enrollData]) => {
      if (dashData.classes) {
        setClasses(dashData.classes);
        if (dashData.classes.length > 0) setSelectedClassId(dashData.classes[0].id.toString());
      }
      setEnrollments(enrollData);
      setIsLoading(false);
    })
    .catch(err => {
      console.error("Failed to fetch gradebook data:", err);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) fetchData();
  }, []);

  const selectedClass = classes.find(c => c.id.toString() === selectedClassId);
  const template = selectedClass?.grading_template || null;
  const periods = template?.items || [];
  const hasTemplate = periods.length > 0;

  const getPeriodGrade = (enrollment, templateItem) => {
    if (!enrollment.period_grades) return null;
    const pg = enrollment.period_grades.find(g => 
      (g.period && g.period.period_id === templateItem.period) || 
      g.period === templateItem.period
    );
    return pg && pg.computed_grade ? parseFloat(pg.computed_grade).toFixed(1) : '--';
  };

  const openWeightsModal = () => {
    const initialPeriod = periods.length > 0 ? periods[0].period : '';
    setSelectedWeightPeriod(initialPeriod);
    
    if (initialPeriod) {
      fetch(`http://127.0.0.1:8000/api/grading/class-components/${selectedClassId}/?period_id=${initialPeriod}`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => { setComponents(data); setIsWeightsModalOpen(true); })
        .catch(err => console.error(err));
    } else {
      setIsWeightsModalOpen(true);
    }
  };

  const handleWeightPeriodChange = (e) => {
    const newPeriodId = e.target.value;
    setSelectedWeightPeriod(newPeriodId);
    
    fetch(`http://127.0.0.1:8000/api/grading/class-components/${selectedClassId}/?period_id=${newPeriodId}`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => setComponents(data))
      .catch(err => console.error(err));
  };

  const handleCopyWeights = async (sourcePeriodId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/grading/class-components/${selectedClassId}/?period_id=${sourcePeriodId}`, { 
        headers: getAuthHeaders() 
      });
      if (response.ok) {
        const sourceComponents = await response.json();
        const copiedComponents = sourceComponents.map(comp => ({
          id: null, 
          name: comp.name,
          weight_percentage: comp.weight_percentage
        }));
        setComponents(copiedComponents);
      } else {
        alert("Failed to fetch weights to copy.");
      }
    } catch (err) {
      console.error("Error copying weights:", err);
    }
  };

  const handleSaveWeights = async (e) => {
    e.preventDefault();
    const total = components.reduce((sum, c) => sum + Number(c.weight_percentage), 0);
    if (total !== 100) { alert("Weights must total exactly 100%."); return; }

    setIsSavingWeights(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/grading/class-components/${selectedClassId}/`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ period_id: selectedWeightPeriod, components }) 
      });
      if (response.ok) setIsWeightsModalOpen(false);
    } catch (err) { console.error(err); } finally { setIsSavingWeights(false); }
  };

  const openBreakdown = (enrollment, period) => {
    setBreakdownInfo({ student: enrollment.student, period: period });
    setIsBreakdownModalOpen(true);
    setIsLoadingBreakdown(true);

    fetch(`http://127.0.0.1:8000/api/grading/student-breakdown/${selectedClassId}/${enrollment.student.student_number}/${period.name}/`, { 
      headers: getAuthHeaders() 
    })
      .then(res => res.json())
      .then(data => { setBreakdownData(data); setIsLoadingBreakdown(false); })
      .catch(err => { console.error(err); setIsLoadingBreakdown(false); });
  };

  const calculateProjectedFinal = (enrollment) => {
    let finalScore = 0; let totalWeightApplied = 0; let hasGrades = false;
    periods.forEach(p => {
      const grade = getPeriodGrade(enrollment, p);
      if (grade !== '--') {
        finalScore += parseFloat(grade) * (parseFloat(p.weight_percentage) / 100);
        totalWeightApplied += parseFloat(p.weight_percentage);
        hasGrades = true;
      }
    });
    if (!hasGrades) return { grade: null, remarks: 'No Grade' };
    const projectedFinal = (finalScore / (totalWeightApplied / 100)).toFixed(2);
    let remarks = "Failed";
    if (projectedFinal >= 75) remarks = "Passed";
    else if (projectedFinal >= 70) remarks = "Conditional";
    return { grade: projectedFinal, remarks };
  };

  const openGradeModal = (enrollment) => {
    setSelectedEnrollment(enrollment);
    const projected = calculateProjectedFinal(enrollment);
    setManualFinal(enrollment.final_grade || projected.grade || '');
    setManualRemarks(enrollment.remarks || projected.remarks);
    setIsGradeModalOpen(true);
  };
  
  const closeGradeModal = () => { setIsGradeModalOpen(false); setSelectedEnrollment(null); };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    setIsSavingGrade(true);
    const payload = { final_grade: manualFinal || null, remarks: manualRemarks !== "No Grade" ? manualRemarks : null };
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/grading/enrollments/${selectedEnrollment.enrollment_id}/`, {
        method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(payload)
      });
      if (response.ok) {
        setEnrollments(prev => prev.map(enrollment => enrollment.enrollment_id === selectedEnrollment.enrollment_id ? { ...enrollment, ...payload } : enrollment));
        closeGradeModal();
      }
    } catch (err) { console.error(err); } finally { setIsSavingGrade(false); }
  };

  const currentClassStudents = enrollments.filter(e => {
    if (!e.student || !e.class_field) return false;
    const matchesClass = e.class_field.class_id.toString() === selectedClassId;
    const fullName = `${e.student.first_name} ${e.student.last_name}`.toLowerCase();
    const studentNum = (e.student.student_number || '').toLowerCase();
    return matchesClass && (fullName.includes(searchTerm.toLowerCase()) || studentNum.includes(searchTerm.toLowerCase()));
  });

  const handleExportGrades = () => {
    if (currentClassStudents.length === 0 || !hasTemplate) {
      alert("Cannot export. Make sure students are enrolled and a grading template is assigned.");
      return;
    }

    const headers = [
      "Student ID", "Last Name", "First Name", "Program", "Year Level", 
      ...periods.map(p => p.name),
      "Overall Final Grade", "Remarks"
    ];
    const csvRows = [headers.join(",")];

    currentClassStudents.forEach(e => {
      const student = e.student || {};
      const dynamicPeriodGrades = periods.map(p => getPeriodGrade(e, p));
      
      const row = [
        student.student_number || '',
        `"${student.last_name || ''}"`, 
        `"${student.first_name || ''}"`,
        student.program?.code || 'N/A',
        student.current_year_level || '',
        ...dynamicPeriodGrades,
        e.final_grade || '',
        e.remarks || ''
      ];
      csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const safeClassName = selectedClass ? `${selectedClass.subject}_${selectedClass.section}`.replace(/[^a-z0-9]/gi, '_') : 'Class';
    const filename = `Grades_${safeClassName}.csv`;

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl animate-in fade-in duration-300 relative pb-10">
      
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1A1C29]">Gradebook</h1>
          <p className="text-gray-500 mt-1">Manage and evaluate student performance</p>
        </div>

        <div className="flex gap-3">
          <button onClick={openWeightsModal} disabled={!hasTemplate} className="flex items-center space-x-2 bg-white border border-gray-200 hover:border-amber-500 hover:text-amber-600 disabled:opacity-50 text-gray-600 px-5 py-2.5 rounded-lg font-bold transition-all shadow-sm text-sm">
            <Settings size={18} /><span>Setup Weights</span>
          </button>
          <button onClick={handleExportGrades} disabled={!hasTemplate} className="flex items-center space-x-2 bg-white border border-gray-200 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 text-gray-600 px-5 py-2.5 rounded-lg font-bold transition-all shadow-sm text-sm">
            <FileSpreadsheet size={18} /><span>Export Grades</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-t-2xl border border-gray-100 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
          <div className="bg-white p-1.5 rounded shadow-sm text-amber-500"><BookOpen size={18} /></div>
          <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="bg-transparent border-none text-sm font-bold text-[#1A1C29] focus:ring-0 cursor-pointer pr-8 py-1 focus:outline-none">
            {classes.length === 0 ? <option value="">No classes available</option> : classes.map(cls => <option key={cls.id} value={cls.id}>{cls.subject} — {cls.section}</option>)}
          </select>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" placeholder="Search student..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400" />
        </div>
      </div>

      {!hasTemplate && !isLoading ? (
        <div className="bg-white border-x border-b border-gray-100 rounded-b-2xl p-16 flex flex-col items-center justify-center text-center">
          <AlertCircle className="text-amber-500 mb-4" size={48} />
          <h3 className="text-xl font-bold text-[#1A1C29]">No Grading Template Assigned</h3>
          <p className="text-gray-500 mt-2 max-w-md">To view the gradebook, this class needs a grading rule set. Go to the <b>Dashboard</b>, edit this class, and assign a Grading Template from the dropdown.</p>
        </div>
      ) : (
        <div className="bg-white border-x border-b border-gray-100 rounded-b-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-200">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-[11px] font-bold text-gray-500 tracking-wider border-r border-gray-100">STUDENT</th>
                  {periods.map((p, idx) => (
                    <th key={idx} className="p-4 text-[11px] font-bold text-gray-500 tracking-wider text-center border-r border-gray-100/50">
                      {p.name.toUpperCase()} <span className="text-[9px] block text-amber-600/70">{p.weight_percentage}%</span>
                    </th>
                  ))}
                  <th className="p-4 text-[11px] font-bold text-[#1A1C29] tracking-wider text-center bg-amber-50/30">FINAL GRADE</th>
                  <th className="p-4 text-[11px] font-bold text-gray-500 tracking-wider text-center">REMARKS</th>
                  <th className="p-4 text-[11px] font-bold text-gray-500 tracking-wider text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan={periods.length + 4} className="p-12 text-center text-gray-500"><Loader2 className="animate-spin mx-auto mb-2" size={28} />Loading gradebook...</td></tr>
                ) : currentClassStudents.length === 0 ? (
                  <tr><td colSpan={periods.length + 4} className="p-12 text-center text-gray-500 font-medium">No students enrolled in this class yet.</td></tr>
                ) : (
                  currentClassStudents.map((e) => {
                    
                    const hasAllPeriodGrades = periods.length > 0 && periods.every(p => getPeriodGrade(e, p) !== '--');
                    const hasSavedFinal = e.final_grade !== null && e.final_grade !== undefined;
                    
                    let displayFinalGrade = '--';
                    let displayRemarks = 'No Grade';
                    
                    if (hasSavedFinal) {
                      displayFinalGrade = Number(e.final_grade).toFixed(2);
                      displayRemarks = e.remarks || 'No Grade';
                    } else if (hasAllPeriodGrades) {
                      const projected = calculateProjectedFinal(e);
                      displayFinalGrade = projected.grade;
                      displayRemarks = projected.remarks;
                    }
                    
                    let remarkColor = "bg-gray-50 text-gray-500 border-gray-200";
                    if (displayRemarks === "Passed") remarkColor = "bg-emerald-50 text-emerald-600 border-emerald-200";
                    if (displayRemarks === "Failed") remarkColor = "bg-red-50 text-red-600 border-red-200";
                    if (displayRemarks === "Conditional") remarkColor = "bg-amber-50 text-amber-600 border-amber-200";

                    return (
                      <tr key={e.enrollment_id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 border-r border-gray-100">
                          <div className="font-bold text-[#1A1C29]">{e.student.last_name}, {e.student.first_name}</div>
                          <div className="text-[11px] font-semibold text-gray-400 mt-0.5">{e.student.student_number}</div>
                        </td>

                        {periods.map((p, idx) => (
                          <td key={idx} onClick={() => openBreakdown(e, p)} className="p-4 text-center font-bold text-blue-600 border-r border-gray-100/50 cursor-pointer hover:bg-blue-50 transition-colors group relative">
                            {getPeriodGrade(e, p)}
                            <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-400 rounded transition-colors pointer-events-none"></div>
                          </td>
                        ))}

                        <td className="p-4 text-center bg-amber-50/30">
                          <span className={`text-lg font-bold ${displayFinalGrade !== '--' ? 'text-[#1A1C29]' : 'text-gray-300'}`}>{displayFinalGrade}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold border ${remarkColor}`}>{displayRemarks}</span>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => openGradeModal(e)} className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-lg transition-colors border border-amber-200">
                            <Edit3 size={14} /><span>Finalize</span>
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
      )}

      {isWeightsModalOpen && (
        <div className="fixed inset-0 bg-[#1A1C29]/60 backdrop-blur-sm flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-serif font-bold text-[#1A1C29]">Component Weights</h2>
              <button onClick={() => setIsWeightsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleSaveWeights}>
              <div className="p-6 space-y-4">

                <div className="mb-4">
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Select Period</label>
                    {periods.length > 1 && (
                      <div className="flex items-center text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <span className="mr-1">Copy from:</span>
                        <select 
                          className="bg-transparent border-none p-0 outline-none cursor-pointer hover:text-amber-700"
                          onChange={(e) => {
                            if(e.target.value) handleCopyWeights(e.target.value);
                            e.target.value = ""; 
                          }}
                        >
                          <option value="">-- Select --</option>
                          {periods.filter(p => p.period.toString() !== selectedWeightPeriod.toString()).map(p => (
                            <option key={p.period} value={p.period}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <select 
                    value={selectedWeightPeriod} 
                    onChange={handleWeightPeriodChange}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5 font-bold"
                  >
                    {periods.map(p => (
                      <option key={p.period} value={p.period}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                {components.length === 0 && (
                  <p className="text-xs text-gray-500 text-center mb-4 italic">No categories yet. Click below to add your grading components (e.g. Quizzes, Attendance).</p>
                )}

                {components.map((c, i) => (
                  <div key={c.id || `new-${i}`} className="flex justify-between items-center gap-3">

                    <input 
                      type="text" 
                      value={c.name} 
                      placeholder="Category Name"
                      onChange={(e) => {
                        const newComps = [...components];
                        newComps[i].name = e.target.value;
                        setComponents(newComps);
                      }}
                      className="flex-1 text-sm font-bold text-gray-700 bg-transparent border-b border-dashed border-gray-300 focus:border-amber-400 focus:outline-none py-1"
                    />

                    <div className="relative w-24 shrink-0">
                      <input 
                        type="number" min="0" max="100" value={c.weight_percentage} 
                        onChange={(e) => {
                          const newComps = [...components];
                          newComps[i].weight_percentage = e.target.value;
                          setComponents(newComps);
                        }}
                        className="w-full text-right font-bold bg-white border border-gray-200 rounded-lg py-1.5 pr-8 pl-3 focus:outline-none focus:border-amber-400 text-[#1A1C29]" 
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">%</span>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => {
                        if (c.id) {
                          setComponentToDelete({ index: i, name: c.name || 'this category' });
                        } else {
                          setComponents(components.filter((_, index) => index !== i));
                        }
                      }}
                      className="text-red-400 hover:text-red-600 p-1 transition-colors"
                      title="Delete Category"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}

                <button 
                  type="button"
                  onClick={() => setComponents([...components, { id: null, name: '', weight_percentage: 0 }])}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 mt-2 px-2 py-1 rounded-md hover:bg-amber-50 transition-colors w-fit"
                >
                  <Plus size={14} /> Add Custom Category
                </button>

                <div className={`mt-4 p-3 rounded-lg border text-center ${components.reduce((sum, c) => sum + Number(c.weight_percentage), 0) === 100 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  <span className="text-xs font-bold uppercase tracking-wider block mb-1">Total Weight</span>
                  <span className="text-xl font-black">{components.reduce((sum, c) => sum + Number(c.weight_percentage), 0)}%</span>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button type="submit" disabled={isSavingWeights || components.length === 0} className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-sm font-bold bg-amber-400 hover:bg-amber-500 disabled:bg-amber-200 text-[#1A1C29] transition-colors shadow-sm">
                  {isSavingWeights ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}<span>Save Weights</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {componentToDelete && (
        <div className="fixed inset-0 bg-[#1A1C29]/60 backdrop-blur-sm flex items-center justify-center z-70 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#1A1C29] mb-2">Delete Category?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete <span className="font-bold text-[#1A1C29]">"{componentToDelete.name}"</span>? 
                This will permanently delete all activities and grades associated with it.
              </p>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setComponentToDelete(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 bg-white border border-gray-200 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setComponents(components.filter((_, index) => index !== componentToDelete.index));
                    setComponentToDelete(null);
                  }}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-colors shadow-sm"
                >
                  <span>Yes, Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isBreakdownModalOpen && breakdownInfo.student && (
        <div className="fixed inset-0 bg-[#1A1C29]/60 backdrop-blur-sm flex justify-end z-60">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
            <div className="p-6 border-b border-gray-100 bg-blue-50/50 flex justify-between items-start">
              <div>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider mb-2 inline-block">
                  {breakdownInfo.period.name} Breakdown
                </span>
                <h2 className="text-xl font-serif font-bold text-[#1A1C29]">{breakdownInfo.student.last_name}, {breakdownInfo.student.first_name}</h2>
                <p className="text-xs text-gray-500 font-medium mt-1">ID: {breakdownInfo.student.student_number}</p>
              </div>
              <button onClick={() => { setIsBreakdownModalOpen(false); fetchData(); }} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-lg border border-gray-200 shadow-sm"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              {isLoadingBreakdown ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400"><Loader2 className="animate-spin mb-4" size={32} /> Loading data...</div>
              ) : breakdownData.length === 0 ? (
                <div className="text-center text-gray-500 py-10 font-medium">No activities recorded for this period yet.</div>
              ) : (
                <div className="space-y-6">

                  {Array.from(new Set(breakdownData.map(d => d.type))).map(type => {
                    const items = breakdownData.filter(d => d.type === type);
                    const weight = items[0].component_weight;
                    
                    return (
                      <div key={type} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                          <h3 className="font-bold text-sm text-gray-700">{type}</h3>
                          <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{weight}% Weight</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {items.map(item => (
                            <div key={item.assessment_id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                              <span className="text-sm font-semibold text-[#1A1C29] truncate pr-4">{item.title}</span>
                              <div className="text-right shrink-0">
                                <span className={`text-sm font-black ${item.raw_score !== null ? 'text-blue-600' : 'text-gray-300'}`}>
                                  {item.raw_score !== null ? item.raw_score : '--'}
                                </span>
                                <span className="text-xs font-bold text-gray-400 mx-1">/</span>
                                <span className="text-xs font-bold text-gray-500">{item.perfect_score}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
              <p className="text-xs text-center text-gray-400 font-bold tracking-wider mb-2">PROJECTED PERIOD GRADE</p>
              <div className="text-4xl font-black text-center text-[#1A1C29]">
                {getPeriodGrade(enrollments.find(e => e.student.student_number === breakdownInfo.student.student_number), breakdownInfo.period)}
              </div>
              <p className="text-xs text-center text-gray-400 italic mt-3">To edit these scores, go to the Activities tab.</p>
            </div>

          </div>
        </div>
      )}

      {isGradeModalOpen && selectedEnrollment && (
        <div className="fixed inset-0 bg-[#1A1C29]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                  <Calculator size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-serif font-bold text-[#1A1C29]">Finalize Grade</h2>
                  <p className="text-xs text-gray-500 font-medium">{selectedEnrollment.student.last_name}, {selectedEnrollment.student.first_name}</p>
                </div>
              </div>
              <button onClick={closeGradeModal} className="text-gray-400 hover:text-gray-600 transition-colors bg-white hover:bg-gray-100 p-1.5 rounded-lg border border-gray-200 shadow-sm">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveGrade}>
              <div className="p-6">
                
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                  <h3 className="text-[10px] font-bold text-gray-500 tracking-wider mb-3 uppercase">Computed Period Grades</h3>
                  <div className="space-y-2">
                    {periods.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-gray-600">{p.name} <span className="text-xs text-gray-400 ml-1">({p.weight_percentage}%)</span></span>
                        <span className="font-bold text-[#1A1C29]">{getPeriodGrade(selectedEnrollment, p)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 text-center relative overflow-hidden mb-6">
                  <p className="text-xs font-bold text-amber-700/70 tracking-wider mb-3">OFFICIAL FINAL GRADE</p>
                  
                  <div className="flex justify-center items-center gap-4">
                    <div className="relative w-32">
                      <input 
                        type="number" step="0.01" min="0" max="100" 
                        value={manualFinal} onChange={(e) => setManualFinal(e.target.value)} 
                        className="w-full text-3xl font-black text-center bg-white border border-amber-200 rounded-lg py-2 focus:outline-none focus:border-amber-400 text-[#1A1C29]" 
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <select 
                      value={manualRemarks} 
                      onChange={(e) => setManualRemarks(e.target.value)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border focus:outline-none cursor-pointer bg-white"
                    >
                      <option value="Passed">PASSED</option>
                      <option value="Conditional">CONDITIONAL</option>
                      <option value="Failed">FAILED</option>
                      <option value="No Grade">NO GRADE YET</option>
                    </select>
                  </div>
                </div>

                <p className="text-xs text-center text-gray-400 italic font-medium">
                  The final grade is auto-calculated based on your template. You can manually adjust it here if needed before locking it in.
                </p>

              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button type="button" onClick={closeGradeModal} disabled={isSavingGrade} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 bg-white border border-gray-200 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSavingGrade} className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-400 hover:bg-amber-500 disabled:bg-amber-200 text-[#1A1C29] transition-colors shadow-sm">
                  {isSavingGrade ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>Lock Official Grade</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default Grades;