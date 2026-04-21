import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';

const NotificationBell = () => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/grading/notifications/', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    })
    .then(res => res.json())
    .then(data => setNotifications(data))
    .catch(err => console.error("Failed to fetch notifications:", err));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {

      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleBellClick = () => {
    setIsNotifOpen(!isNotifOpen);
    
    if (unreadCount > 0) {
      fetch('http://127.0.0.1:8000/api/grading/notifications/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      }).catch(err => console.error(err));
      
      setNotifications(notifications.map(n => ({...n, is_read: true})));
    }
  };

  return (

    <div className="relative" ref={dropdownRef}>

      <button 
        onClick={handleBellClick}
        className="relative p-2 text-amber-500 hover:bg-amber-50 rounded-full transition-colors focus:outline-none"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isNotifOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 origin-top-right duration-200">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-[#1A1C29]">Notifications</h3>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{notifications.length} recent</span>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500 font-medium">No recent notifications</div>
            ) : (
              notifications.map(notif => (
                <div key={notif.id} className={`p-4 border-b border-gray-50 transition-colors hover:bg-gray-50 ${notif.is_read ? 'bg-white' : 'bg-amber-50/20'}`}>
                  <p className={`text-sm ${notif.is_read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>{notif.message}</p>
                  <span className="text-[11px] text-gray-400 font-semibold mt-1.5 block">{notif.date}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;