import React, { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle, AlertTriangle, Settings as SettingsIcon, Plus, Trash2, AlertCircle, CheckCircle2, Calculator, Edit3, X } from 'lucide-react';

const Settings = () => {
  const [settings, setSettings] = useState({ notifications_enabled: true, active_school_year: '', grading_system: '75 (CHED)', language: 'English (PH)' });
  const [initialSchoolYear, setInitialSchoolYear] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState({ text: '', type: '' });
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const getAuthHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` });

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch('http://127.0.0.1:8000/api/accounts/settings/', { headers: getAuthHeaders() }).then(res => res.ok ? res.json() : {}),
      fetch('http://127.0.0.1:8000/api/grading/grading-templates/', { headers: getAuthHeaders() }).then(res => res.ok ? res.json() : [])
    ])
    .then(([settingsData, templatesData]) => {
      if (settingsData && Object.keys(settingsData).length > 0) {
        setSettings(settingsData);
        setInitialSchoolYear(settingsData.active_school_year || '');
      }
      setTemplates(templatesData);
      setIsLoading(false);
    })
    .catch(err => { console.error(err); setIsLoading(false); });
  }, []);

  const performNormalSave = async () => {
    setIsSavingSettings(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/accounts/settings/', { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(settings) });
      if (response.ok) {
        setSettingsMessage({ text: 'Settings saved successfully!', type: 'success' });
        setTimeout(() => setSettingsMessage({ text: '', type: '' }), 3000); 
        window.dispatchEvent(new CustomEvent('schoolYearUpdated', { detail: settings.active_school_year }));
      }
    } catch (error) { setSettingsMessage({ text: 'Network error occurred.', type: 'error' }); }
    finally { setIsSavingSettings(false); }
  };

  const handleConfirmTransition = async () => {
    if (isSavingSettings) return;
    setIsTransitionModalOpen(false);
    setIsSavingSettings(true);
    
    try {
      const transitionRes = await fetch('http://127.0.0.1:8000/api/grading/transition-year/', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ new_year: settings.active_school_year })
      });

      if (transitionRes.ok) {
        setInitialSchoolYear(settings.active_school_year);
        await performNormalSave(); 
        setIsSuccessModalOpen(true);
      } else {
        const errData = await transitionRes.json();
        setSettingsMessage({ text: errData.error || 'Transition failed.', type: 'error' });
      }
    } catch (error) { setSettingsMessage({ text: 'Error during transition.', type: 'error' }); }
    finally { setIsSavingSettings(false); }
  };

  const handleSaveSettings = () => {
    if (settings.active_school_year !== initialSchoolYear) {
      setIsTransitionModalOpen(true);
    } else {
      performNormalSave();
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-500"><Loader2 className="animate-spin mr-2" /> Loading settings...</div>;

  return (
    <div className="max-w-6xl animate-in fade-in duration-300 relative pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-[#1A1C29] flex items-center gap-3">
          <SettingsIcon className="text-amber-500" size={32} /> Settings
        </h1>
        <p className="text-gray-500 mt-1">Manage app preferences and configurations</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-3xl mb-10">
        <div className="p-6 border-b border-gray-50 bg-gray-50/50">
          <h2 className="text-xl font-serif font-bold text-[#1A1C29]">App Preferences</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-50">
            <div className="mr-4">
              <h3 className="font-bold text-[#1A1C29] text-sm">School Year & Term</h3>
              <p className="text-sm text-gray-500 mt-0.5">Define your current active academic term</p>
            </div>
            <input 
              type="text" name="active_school_year" value={settings.active_school_year} 
              onChange={(e) => setSettings(prev => ({...prev, active_school_year: e.target.value}))}
              className="flex-1 max-w-62.5 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-amber-400"
            />
          </div>
          <div className="pt-4 flex items-center gap-4">
            <button 
              onClick={handleSaveSettings} disabled={isSavingSettings}
              className="flex items-center space-x-2 bg-amber-400 hover:bg-amber-500 disabled:bg-amber-200 text-[#1A1C29] px-6 py-2.5 rounded-lg font-bold transition-colors shadow-sm"
            >
              {isSavingSettings ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{isSavingSettings ? 'Saving...' : 'Save Preferences'}</span>
            </button>
            {settingsMessage.text && (
              <span className={`text-sm font-semibold flex items-center gap-1.5 ${settingsMessage.type === 'error' ? 'text-red-500' : 'text-emerald-500'}`}>
                {settingsMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                {settingsMessage.text}
              </span>
            )}
          </div>
        </div>
      </div>

      {isTransitionModalOpen && (
        <div className="fixed inset-0 bg-[#1A1C29]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-sm">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-2xl font-serif font-bold text-[#1A1C29] mb-3">Begin Transition?</h3>
              <p className="text-sm text-gray-600 mb-6 text-left bg-gray-50 p-4 rounded-xl">
                Changing to <b>"{settings.active_school_year}"</b> will lock old records and promote all students.
              </p>
              <div className="flex gap-3">
                <button onClick={() => { setIsTransitionModalOpen(false); setSettings(prev => ({...prev, active_school_year: initialSchoolYear})); }} className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-gray-500 border border-gray-200 hover:bg-gray-100 transition-colors">Cancel</button>
                <button onClick={handleConfirmTransition} disabled={isSavingSettings} className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-[#1A1C29] text-white hover:bg-black transition-colors shadow-lg">Confirm & Start</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSuccessModalOpen && (
        <div className="fixed inset-0 bg-[#1A1C29]/60 backdrop-blur-sm flex items-center justify-center z-100 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-sm">
                <CheckCircle size={40} />
              </div>
              <h3 className="text-2xl font-serif font-bold text-[#1A1C29] mb-3">Complete!</h3>
              <p className="text-sm text-gray-600 mb-6">Transition finished. Welcome to the new term!</p>
              <button onClick={() => setIsSuccessModalOpen(false)} className="w-full px-4 py-3 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">Awesome!</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;