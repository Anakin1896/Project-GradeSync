import React, { useState, useEffect } from 'react';
import { 
  Save, Loader2, CheckCircle, AlertTriangle, 
  Settings as SettingsIcon, Plus, Trash2, AlertCircle, CheckCircle2, Calculator, Edit3, X
} from 'lucide-react';

const Settings = () => {

  const [settings, setSettings] = useState({
    notifications_enabled: true,
    active_school_year: '',
    grading_system: '75 (CHED)',
    language: 'English (PH)'
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState({ text: '', type: '' });

  const [templates, setTemplates] = useState([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateMessage, setTemplateMessage] = useState('');

  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [transmutationBase, setTransmutationBase] = useState(0);
  const [items, setItems] = useState([
    { name: 'Quarter 1', weight_percentage: 25 },
    { name: 'Quarter 2', weight_percentage: 25 },
    { name: 'Quarter 3', weight_percentage: 25 },
    { name: 'Quarter 4', weight_percentage: 25 }
  ]);

  const [isLoading, setIsLoading] = useState(true);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  });

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch('http://127.0.0.1:8000/api/accounts/settings/', { headers: getAuthHeaders() }).then(res => res.ok ? res.json() : {}),
      fetch('http://127.0.0.1:8000/api/grading/grading-templates/', { headers: getAuthHeaders() }).then(res => res.ok ? res.json() : [])
    ])
    .then(([settingsData, templatesData]) => {
      if (settingsData && Object.keys(settingsData).length > 0) setSettings(settingsData);
      setTemplates(templatesData);
      setIsLoading(false);
    })
    .catch(err => { console.error(err); setIsLoading(false); });
  }, []);

  const refreshTemplates = () => {
    fetch('http://127.0.0.1:8000/api/grading/grading-templates/', { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => setTemplates(data))
      .catch(err => console.error(err));
  };

  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSettingsMessage({ text: '', type: '' });

    try {
      const response = await fetch('http://127.0.0.1:8000/api/accounts/settings/', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setSettingsMessage({ text: 'Settings saved successfully!', type: 'success' });
        setTimeout(() => setSettingsMessage({ text: '', type: '' }), 3000); 

        window.dispatchEvent(new CustomEvent('schoolYearUpdated', { detail: settings.active_school_year }));
      } else {
        setSettingsMessage({ text: 'Failed to save settings.', type: 'error' });
      }
    } catch (error) {
      setSettingsMessage({ text: 'Network error occurred.', type: 'error' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const totalWeight = items.reduce((sum, item) => sum + Number(item.weight_percentage || 0), 0);
  const isWeightValid = totalWeight === 100;

  const handleAddItem = () => setItems([...items, { name: '', weight_percentage: 0 }]);
  const handleRemoveItem = (index) => setItems(items.filter((_, i) => i !== index));
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleEditClick = (template) => {
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    setTransmutationBase(template.transmutation_base);
    setItems(template.items.map(item => ({
        name: item.name, 
        weight_percentage: Number(item.weight_percentage)
    })));
  };

  const cancelEdit = () => {
    setEditingTemplateId(null);
    setTemplateName('');
    setTransmutationBase(0);
    setItems([{ name: 'Quarter 1', weight_percentage: 25 }, { name: 'Quarter 2', weight_percentage: 25 }]);
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!isWeightValid) return;
    if (!templateName.trim()) { alert("Please provide a template name."); return; }

    setIsSavingTemplate(true);
    
    const payload = {
      name: templateName,
      transmutation_base: Number(transmutationBase),
      items: items.map(item => ({
        name: item.name,
        weight_percentage: Number(item.weight_percentage)
      }))
    };

    const url = editingTemplateId 
      ? `http://127.0.0.1:8000/api/grading/grading-templates/${editingTemplateId}/` 
      : 'http://127.0.0.1:8000/api/grading/grading-templates/';
    const method = editingTemplateId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setTemplateMessage(editingTemplateId ? 'Template updated!' : 'Template created!');
        cancelEdit();
        refreshTemplates();
        setTimeout(() => setTemplateMessage(''), 3000);
      } else {
        alert("Failed to save template. Please check the network tab.");
      }
    } catch (err) {
      alert("Network error occurred.");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-500"><Loader2 className="animate-spin mr-2" /> Loading settings...</div>;

  return (
    <div className="max-w-6xl animate-in fade-in duration-300 relative pb-10">
      
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-[#1A1C29] flex items-center gap-3">
          <SettingsIcon className="text-amber-500" size={32} /> Settings
        </h1>
        <p className="text-gray-500 mt-1">Manage your app preferences and grading configurations</p>
      </div>

      <div className="space-y-10">
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-3xl">
          <div className="p-6 border-b border-gray-50 bg-gray-50/50">
            <h2 className="text-xl font-serif font-bold text-[#1A1C29]">App Preferences</h2>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div>
                <h3 className="font-bold text-[#1A1C29] text-sm">Notifications</h3>
                <p className="text-sm text-gray-500 mt-0.5">Grade deadlines, attendance reminders</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" name="notifications_enabled"
                  checked={settings.notifications_enabled} onChange={handleSettingsChange}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div className="mr-4">
                <h3 className="font-bold text-[#1A1C29] text-sm">School Year & Term</h3>
                <p className="text-sm text-gray-500 mt-0.5">Define your current active academic term</p>
              </div>

              <input 
                type="text"
                name="active_school_year" 
                value={settings.active_school_year} 
                onChange={handleSettingsChange}
                placeholder="e.g. S.Y. 2026-2027 · 1st Sem"
                className="flex-1 max-w-62.5 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-[#1A1C29] focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div>
                <h3 className="font-bold text-[#1A1C29] text-sm">Passing Threshold</h3>
                <p className="text-sm text-gray-500 mt-0.5">Visual indicator for passing grades</p>
              </div>
              <select 
                name="grading_system" value={settings.grading_system} onChange={handleSettingsChange}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-[#1A1C29] focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 cursor-pointer min-w-35"
              >
                <option value="75 (CHED)">75 (CHED)</option>
                <option value="75 (DepEd)">75 (DepEd)</option>
                <option value="75 (Standard)">75 (Standard)</option>
              </select>
            </div>

            {/* <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div>
                <h3 className="font-bold text-[#1A1C29] text-sm">Language</h3>
                <p className="text-sm text-gray-500 mt-0.5">Interface language</p>
              </div>
              <select 
                name="language" value={settings.language} onChange={handleSettingsChange}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-[#1A1C29] focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 cursor-pointer min-w-35"
              >
                <option value="English (PH)">English (PH)</option>
                <option value="Tagalog">Tagalog</option>
              </select>
            </div> */}

            <div className="pt-4 flex items-center gap-4">
              <button 
                onClick={handleSaveSettings} disabled={isSavingSettings}
                className="flex items-center space-x-2 bg-amber-400 hover:bg-amber-500 disabled:bg-amber-200 text-[#1A1C29] px-6 py-2.5 rounded-lg font-bold transition-colors shadow-sm"
              >
                {isSavingSettings ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>{isSavingSettings ? 'Saving...' : 'Save Preferences'}</span>
              </button>
              
              {settingsMessage.text && (
                <span className={`text-sm font-semibold flex items-center gap-1.5 animate-in fade-in ${settingsMessage.type === 'error' ? 'text-red-500' : 'text-emerald-500'}`}>
                  {settingsMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                  {settingsMessage.text}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2">
            <div className={`bg-white border ${editingTemplateId ? 'border-blue-300 shadow-blue-100/50' : 'border-gray-100'} rounded-2xl shadow-sm overflow-hidden transition-all duration-300`}>
              <div className={`p-6 border-b border-gray-50 ${editingTemplateId ? 'bg-blue-50/50' : 'bg-gray-50/50'} flex justify-between items-center`}>
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#1A1C29]">
                    {editingTemplateId ? 'Edit Grading Template' : 'Create Grading Template'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {editingTemplateId ? 'Modify the periods and weights for this rule.' : 'Define flexible grade computations for your classes.'}
                  </p>
                </div>
                {editingTemplateId && (
                  <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 bg-white border border-gray-200 p-2 rounded-lg shadow-sm">
                    <X size={18} />
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveTemplate}>
                <div className="p-6 space-y-6">
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 tracking-wider mb-2">TEMPLATE NAME *</label>
                      <input 
                        type="text" required value={templateName} onChange={(e) => setTemplateName(e.target.value)} 
                        placeholder="e.g. Standard K-12 Quarters" 
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:border-amber-400 focus:outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 tracking-wider mb-2">TRANSMUTATION BASE *</label>
                      <div className="relative">
                        <Calculator size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select 
                          value={transmutationBase} onChange={(e) => setTransmutationBase(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:border-amber-400 focus:outline-none appearance-none cursor-pointer"
                        >
                          <option value={0}>Base 0 (Straight Percentage)</option>
                          <option value={50}>Base 50 (Standard K-12)</option>
                          <option value={60}>Base 60 (College Standard)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 tracking-wider">PERIOD WEIGHTS</label>
                        <p className="text-[11px] text-gray-400 mt-0.5">Add periods and assign their percentage of the final grade.</p>
                      </div>
                      <button 
                        type="button" onClick={handleAddItem}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-xs rounded-lg transition-colors border border-gray-200"
                      >
                        <Plus size={14} /> <span>Add Period</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {items.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                          <input 
                            type="text" required value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                            placeholder="e.g. Midterms, Quarter 1" 
                            className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold focus:border-amber-400 focus:outline-none" 
                          />
                          <div className="relative w-32">
                            <input 
                              type="number" required min="1" max="100" value={item.weight_percentage} onChange={(e) => handleItemChange(index, 'weight_percentage', e.target.value)}
                              className="w-full pl-4 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-center focus:border-amber-400 focus:outline-none" 
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">%</span>
                          </div>
                          <button 
                            type="button" onClick={() => handleRemoveItem(index)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className={`mt-6 p-4 rounded-xl border flex items-center justify-between ${isWeightValid ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
                      <div className="flex items-center gap-2">
                        {isWeightValid ? <CheckCircle2 className="text-emerald-500" size={18} /> : <AlertCircle className="text-red-500" size={18} />}
                        <span className={`text-sm font-bold ${isWeightValid ? 'text-emerald-700' : 'text-red-700'}`}>
                          Total Weight Allocation
                        </span>
                      </div>
                      <span className={`text-xl font-black ${isWeightValid ? 'text-emerald-600' : 'text-red-600'}`}>
                        {totalWeight}%
                      </span>
                    </div>
                    {!isWeightValid && (
                      <p className="text-xs font-bold text-red-500 text-right mt-2">Weights must equal exactly 100%.</p>
                    )}

                  </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                  <div>
                    {templateMessage && <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5"><CheckCircle2 size={16}/> {templateMessage}</span>}
                  </div>
                  <button 
                    type="submit" disabled={isSavingTemplate || !isWeightValid} 
                    className={`flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold text-[#1A1C29] transition-colors shadow-sm ${editingTemplateId ? 'bg-blue-400 hover:bg-blue-500 disabled:bg-blue-200' : 'bg-amber-400 hover:bg-amber-500 disabled:bg-amber-200'}`}
                  >
                    {isSavingTemplate ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>{editingTemplateId ? 'Update Template' : 'Save Template'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
              <div className="p-6 border-b border-gray-50 bg-gray-50/50 shrink-0">
                <h2 className="text-lg font-serif font-bold text-[#1A1C29]">My Templates</h2>
              </div>
              
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {templates.length === 0 ? (
                  <div className="text-center p-6 border-2 border-dashed border-gray-100 rounded-xl">
                    <p className="text-sm font-medium text-gray-500">No templates created yet.</p>
                  </div>
                ) : (
                  templates.map(template => (
                    <div key={template.id} className={`p-4 border rounded-xl transition-all group bg-white ${editingTemplateId === template.id ? 'border-blue-400 shadow-md ring-2 ring-blue-100' : 'border-gray-100 hover:shadow-md hover:border-gray-200'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-[#1A1C29] text-sm">{template.name}</h3>
                          <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">Base: {template.transmutation_base}</p>
                        </div>
                        <button 
                          onClick={() => handleEditClick(template)}
                          className={`p-1.5 rounded-md transition-colors ${editingTemplateId === template.id ? 'bg-blue-50 text-blue-600' : 'text-gray-300 hover:text-blue-500 hover:bg-blue-50'}`}
                          title="Edit Template"
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                      
                      <div className="mt-4 space-y-1.5 border-t border-gray-50 pt-3">
                        {template.items && template.items.map(item => (
                          <div key={item.id} className="flex justify-between text-xs">
                            <span className="font-semibold text-gray-500">{item.name}</span>
                            <span className="font-bold text-gray-700">{item.weight_percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;