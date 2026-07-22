import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  Wrench,
  Fuel,
  BarChart3,
  Shield,
  X,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/vehicles", icon: Truck, label: "Vehicles", roles: ["ADMIN", "MANAGER", "DRIVER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"] },
  { to: "/drivers", icon: Users, label: "Drivers", roles: ["ADMIN", "MANAGER", "DRIVER", "SAFETY_OFFICER"] },
  { to: "/trips", icon: Route, label: "Trips", roles: ["ADMIN", "MANAGER", "DRIVER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"] },
  { to: "/maintenance", icon: Wrench, label: "Maintenance", roles: ["ADMIN", "MANAGER", "DRIVER", "FINANCIAL_ANALYST"] },
  { to: "/fuel-expenses", icon: Fuel, label: "Fuel & Expenses", roles: ["ADMIN", "MANAGER", "DRIVER", "FINANCIAL_ANALYST"] },
  { to: "/reports", icon: BarChart3, label: "Reports", roles: ["ADMIN", "MANAGER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"] },
  { to: "/users", icon: Shield, label: "User Management", roles: ["ADMIN"] },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();

  const filteredItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64
          bg-surface-900 text-white
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-surface-700">
          <img src="/logo.jpeg" alt="Logo" className="h-10 w-10 rounded-xl object-cover bg-white" />
          <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent ml-2">
            TransitOps
          </span>
          <button onClick={onClose} className="lg:hidden text-surface-200 hover:text-white ml-auto">
            <X size={20} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="mt-6 px-3 space-y-1">
          {filteredItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary-600 text-white shadow-lg shadow-primary-600/30"
                    : "text-surface-200 hover:bg-surface-800 hover:text-white"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User badge */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-surface-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">
              {user?.name?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-surface-200 truncate">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
