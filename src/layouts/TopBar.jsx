import { useAuth } from "../contexts/AuthContext";
import { Menu, Bell, LogOut, User } from "lucide-react";

export default function TopBar({ onMenuClick }) {
  const { user, profile, role, logout } = useAuth();

  const displayName =
    profile?.displayName || user?.displayName || user?.email || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleBadge = {
    admin: "bg-purple-100 text-purple-700",
    installer: "bg-emerald-100 text-emerald-700",
    sales: "bg-blue-100 text-blue-700",
    customer: "bg-gray-100 text-gray-700",
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notifications */}
      <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
        <Bell className="h-5 w-5" />
      </button>

      {/* User menu */}
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-gray-700">{displayName}</p>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${roleBadge[role] || roleBadge.customer}`}
          >
            {role || "customer"}
          </span>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-sm font-medium text-white">
          {initials || <User className="h-4 w-4" />}
        </div>

        <button
          onClick={logout}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
