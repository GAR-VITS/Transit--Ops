import { Menu, LogOut, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import useAuth from "../../hooks/useAuth";
import NotificationDropdown from "../common/NotificationDropdown";

export default function TopHeader({ onMenuClick }) {
  const { user, logout } = useAuth();

  const [isDark, setIsDark] = useState(() => {
    return localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [isDark]);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-surface-200 flex items-center justify-between px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-surface-700 hover:bg-surface-100 transition"
      >
        <Menu size={20} />
      </button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-lg text-surface-700 hover:bg-surface-100 transition"
          title="Toggle Theme"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <NotificationDropdown />

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-100 text-sm">
          <span className="font-medium">{user?.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 font-semibold">
            {user?.role}
          </span>
        </div>

        <button
          onClick={logout}
          className="p-2 rounded-lg text-surface-700 hover:bg-red-50 hover:text-red-600 transition"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
