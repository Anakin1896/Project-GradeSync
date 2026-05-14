import React, { useState, useEffect } from 'react';
import { Archive, Search, Calendar, BookOpen, Layers, Loader2 } from 'lucide-react';

const DataHistory = () => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('All');
  const [filterPeriod, setFilterPeriod] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('https://gradesync-api-rx7d.onrender.com/api/grading/data-history/', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });
        const data = await response.json();
        if (data.records) setRecords(data.records);
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const uniqueYears = ['All', ...new Set(records.map(r => r.school_year))];
  const uniquePeriods = ['All', ...new Set(records.map(r => r.period))];
  const uniquePrograms = ['All', ...new Set(records.map(r => r.program))];

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          record.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = filterYear === 'All' || record.school_year === filterYear;
    const matchesPeriod = filterPeriod === 'All' || record.period === filterPeriod;
    const matchesProgram = filterProgram === 'All' || record.program === filterProgram;
    return matchesSearch && matchesYear && matchesPeriod && matchesProgram;
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-500"><Loader2 className="animate-spin mr-2" /> Loading archives...</div>;

  return (
    <div className="max-w-6xl animate-in fade-in duration-300 relative pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-[#1A1C29] flex items-center gap-3">
          <Archive className="text-amber-500" size={32} /> Data History
        </h1>
        <p className="text-gray-500 mt-1">Browse and filter your archived classes from previous school terms.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 min-w-62.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" placeholder="Search subject or code..." 
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm font-semibold text-gray-600">
              <Calendar size={14} className="text-gray-400" />
              <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer">
                {uniqueYears.map(y => <option key={y} value={y}>{y === 'All' ? 'All Years' : y}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm font-semibold text-gray-600">
              <Layers size={14} className="text-gray-400" />
              <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer">
                {uniquePeriods.map(p => <option key={p} value={p}>{p === 'All' ? 'All Periods' : p}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm font-semibold text-gray-600">
              <BookOpen size={14} className="text-gray-400" />
              <select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer">
                {uniquePrograms.map(p => <option key={p} value={p}>{p === 'All' ? 'All Programs' : p}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase font-bold tracking-wider">
                <th className="p-4 pl-6">Subject</th>
                <th className="p-4">Program & Section</th>
                <th className="p-4">School Year</th>
                <th className="p-4">Period</th>
                <th className="p-4 pr-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRecords.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500 text-sm font-medium">No archived records found matching filters.</td></tr>
              ) : (
                filteredRecords.map(record => (
                  <tr 
                    key={record.id} 
                    onClick={() => {
                      localStorage.setItem('jumpToClassId', record.id);
                      window.dispatchEvent(new CustomEvent('changeTab', { detail: 'Grades' }));
                    }}
                    className="hover:bg-amber-50 transition-colors cursor-pointer group"
                  >
                    <td className="p-4 pl-6">
                      <div className="font-bold text-[#1A1C29] group-hover:text-amber-600">{record.code}</div>
                      <div className="text-xs font-semibold text-gray-500">{record.subject}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-gray-700">{record.section}</div>
                      <div className="text-xs text-gray-500">{record.program}</div>
                    </td>
                    <td className="p-4 text-sm font-bold text-gray-600">{record.school_year}</td>
                    <td className="p-4 text-sm font-bold text-gray-600">{record.period}</td>
                    <td className="p-4 pr-6 text-right">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200 group-hover:bg-amber-100 group-hover:text-amber-700 group-hover:border-amber-200 transition-all">
                        View Grades ➔
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataHistory;