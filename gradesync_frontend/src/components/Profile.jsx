import React, { useState, useEffect } from 'react';
import { Edit2, Loader2, X, Save } from 'lucide-react';

const Profile = () => {
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({});

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}` 
  });

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      setError("Please log in to view your profile.");
      setIsLoading(false);
      return;
    }

    fetch('http://127.0.0.1:8000/api/accounts/profile/', {
      method: 'GET',
      headers: getAuthHeaders(),
    })
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(data => {
        setProfileData(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch profile:", err);
        setError("Failed to load profile data. Your session may have expired.");
        setIsLoading(false);
      });
  }, []);

  const handleEditClick = () => {
    setEditForm({
      title_prefix: profileData.title_prefix || '',
      first_name: profileData.first_name || '',
      middle_initial: profileData.middle_initial || '',
      last_name: profileData.last_name || '',
      email: profileData.email || '',
    });
    setIsEditing(true);
  };

  const handleChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/accounts/profile/', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        const updatedData = await response.json();
        setProfileData(updatedData);
        setIsEditing(false);   
        
        window.dispatchEvent(new Event('profileUpdated'));

      } else {
        alert("Failed to update profile. Please check your inputs.");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Network error. Could not save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader2 className="animate-spin mr-2" /> Loading profile...
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400 font-medium bg-red-50/50 rounded-xl border border-red-100 max-w-4xl">
        {error}
      </div>
    );
  }

  const prefix = profileData.title_prefix ? `${profileData.title_prefix} ` : '';
  const mi = profileData.middle_initial ? `${profileData.middle_initial} ` : '';
  const fullName = `${prefix}${profileData.first_name} ${mi}${profileData.last_name}`;
  const initial = profileData.first_name ? profileData.first_name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="max-w-4xl animate-in fade-in duration-300 relative">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-[#1A1C29]">My Profile</h1>
        <p className="text-gray-500 mt-1">Your account information</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-8">

        <div className="flex items-start gap-6 mb-10 border-b border-gray-50 pb-8">
          <div className="w-24 h-24 rounded-full bg-[#1A1C29] flex items-center justify-center border-4 border-amber-400 shrink-0 shadow-sm">
            <span className="text-4xl font-serif font-bold text-amber-400">{initial}</span>
          </div>
          
          <div className="pt-2">
            <h2 className="text-2xl font-serif font-bold text-[#1A1C29]">{fullName}</h2>
            <p className="text-sm font-medium text-gray-500 mt-1">
              {profileData.department || 'No Department'} · {profileData.position_title || profileData.role}
            </p>
            <p className="text-sm font-medium text-amber-500 mt-1">
              {profileData.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-[#FCFBF8] p-5 rounded-xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 tracking-wider mb-1">EMPLOYEE NO.</p>
            <p className="font-bold text-[#1A1C29] text-lg">{profileData.employee_id || 'N/A'}</p>
          </div>

          <div className="bg-[#FCFBF8] p-5 rounded-xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 tracking-wider mb-1">DEPARTMENT</p>
            <p className="font-bold text-[#1A1C29] text-lg">{profileData.department || 'N/A'}</p>
          </div>

          <div className="bg-[#FCFBF8] p-5 rounded-xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 tracking-wider mb-1">SCHOOL</p>
            <p className="font-bold text-[#1A1C29] text-lg">{profileData.school_name || 'N/A'}</p>
          </div>

          <div className="bg-[#FCFBF8] p-5 rounded-xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 tracking-wider mb-1">SUBJECTS HANDLED</p>
            <p className="font-bold text-[#1A1C29] text-lg">
              {profileData.subjects_handled !== undefined ? profileData.subjects_handled : 0}
            </p> 
          </div>
        </div>

        <button 
          onClick={handleEditClick}
          className="flex items-center space-x-2 bg-amber-400 hover:bg-amber-500 text-[#1A1C29] px-6 py-2.5 rounded-lg font-bold transition-colors shadow-sm text-sm"
        >
          <Edit2 size={16} />
          <span>Edit Profile</span>
        </button>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-[#1A1C29]/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-serif font-bold text-[#1A1C29]">Edit Profile</h2>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">PREFIX</label>
                  <select 
                    name="title_prefix"
                    value={editForm.title_prefix}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-[#1A1C29] focus:outline-none focus:border-amber-400"
                  >
                    <option value="">None</option>
                    <option value="Mr.">Mr.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Dr.">Dr.</option>
                  </select>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">FIRST NAME</label>
                  <input 
                    type="text" 
                    name="first_name"
                    value={editForm.first_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-[#1A1C29] focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">M.I.</label>
                  <input 
                    type="text" 
                    name="middle_initial"
                    value={editForm.middle_initial}
                    onChange={handleChange}
                    maxLength="2"
                    placeholder="e.g. B."
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-[#1A1C29] focus:outline-none focus:border-amber-400"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">LAST NAME</label>
                  <input 
                    type="text" 
                    name="last_name"
                    value={editForm.last_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-[#1A1C29] focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 tracking-wider mb-1.5">EMAIL ADDRESS</label>
                <input 
                  type="email" 
                  name="email"
                  value={editForm.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-[#1A1C29] focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 mt-2">
                <p className="text-xs text-amber-800 font-medium">
                  Note: To change your Employee ID, Department, or Position Title, please contact your school administrator.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-5 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex items-center space-x-2 px-5 py-2 rounded-lg text-sm font-bold bg-amber-400 hover:bg-amber-500 disabled:bg-amber-200 text-[#1A1C29] transition-colors shadow-sm"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;