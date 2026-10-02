import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { 
  Bell, 
  Check, 
  MapPin, 
  Wrench, 
  FileText, 
  Fuel, 
  AlertTriangle,
  Shield,
  CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

type Notification = {
  id: string;
  type: string;
  message: string;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: string;
};

const iconMap: Record<string, React.ReactNode> = {
  TRIP_DISPATCHED: <MapPin size={16} className="text-blue-500" />,
  TRIP_COMPLETED: <CheckCircle2 size={16} className="text-green-500" />,
  VEHICLE_MAINTENANCE: <Wrench size={16} className="text-orange-500" />,
  LICENSE_EXPIRING: <FileText size={16} className="text-yellow-500" />,
  LICENSE_EXPIRED: <FileText size={16} className="text-red-500" />,
  FUEL_LOGGED: <Fuel size={16} className="text-purple-500" />,
  DRIVER_SUSPENDED: <AlertTriangle size={16} className="text-red-500" />,
  ROLE_ASSIGNED: <Shield size={16} className="text-primary-500" />,
};

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchUnreadCount = async () => {
    try {
      const { data } = await api.get("/notifications/unread-count");
      setUnreadCount(data.count);
    } catch (err) {
      console.error("Failed to fetch unread count", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/mark-all-read");
      setUnreadCount(0);
      setNotifications(n => n.map(x => ({ ...x, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all read", err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await api.patch(`/notifications/${notification.id}/read`);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(n => n.map(x => x.id === notification.id ? { ...x, isRead: true } : x));
      } catch (err) {
        console.error("Failed to mark read", err);
      }
    }

    setIsOpen(false);
    
    if (notification.relatedEntityId) {
      switch (notification.type) {
        case "TRIP_DISPATCHED":
        case "TRIP_COMPLETED":
          navigate("/trips");
          break;
        case "VEHICLE_MAINTENANCE":
          navigate("/maintenance");
          break;
        case "FUEL_LOGGED":
          navigate("/fuel-expenses");
          break;
        case "DRIVER_SUSPENDED":
          navigate("/drivers");
          break;
        default:
          break;
      }
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-navy-800 dark:hover:text-white"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-navy-800 rounded-xl shadow-xl border border-slate-200 dark:border-navy-700 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-navy-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium flex items-center gap-1"
              >
                <Check size={14} />
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                No notifications yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-navy-700">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-navy-700/50 transition ${!notification.isRead ? 'bg-teal-50/50 dark:bg-teal-900/10' : ''}`}
                  >
                    <div className="mt-0.5 p-2 rounded-full bg-white dark:bg-navy-800 shadow-sm border border-slate-100 dark:border-navy-700 flex-shrink-0">
                      {iconMap[notification.type] || <Bell size={16} className="text-slate-500 dark:text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.isRead ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
