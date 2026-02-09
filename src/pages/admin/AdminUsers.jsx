import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "../../services/firebase";
import { Users, Shield, UserPlus, X } from "lucide-react";
import DataTable from "../../components/ui/DataTable";
import FilterBar from "../../components/ui/FilterBar";

const ROLES = ["admin", "installer", "sales", "customer"];

export default function AdminUsers() {
  useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const ref = collection(db, "users");
      const snap = await getDocs(ref);
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (u) => {
    setEditingUser(u);
    setSelectedRole(u.role || "customer");
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, "users", editingUser.id), {
        role: selectedRole,
        updatedAt: serverTimestamp(),
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id ? { ...u, role: selectedRole } : u,
        ),
      );
      setEditingUser(null);
    } catch (err) {
      console.error("Error updating role:", err);
    }
  };

  const roleBadge = (role) => {
    const map = {
      admin: "bg-red-100 text-red-700",
      installer: "bg-blue-100 text-blue-700",
      sales: "bg-amber-100 text-amber-700",
      customer: "bg-gray-100 text-gray-600",
    };
    return map[role] || "bg-gray-100 text-gray-600";
  };

  const formatDate = (ts) => {
    if (!ts) return "N/A";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString();
  };

  const [filters, setFilters] = useState({});

  const filterDefs = useMemo(() => {
    const roles = [...new Set(users.map((u) => u.role).filter(Boolean))].sort();
    return [{ key: "role", label: "Role", options: roles }];
  }, [users]);

  const filtered = useMemo(() => {
    let result = users;
    if (filters.role) result = result.filter((u) => u.role === filters.role);
    return result;
  }, [users, filters]);

  const columns = useMemo(
    () => [
      {
        key: "displayName",
        label: "Name",
        sortable: true,
        render: (val, row) => (
          <span className="font-semibold text-gray-900">
            {val || row.name || "N/A"}
          </span>
        ),
      },
      {
        key: "email",
        label: "Email",
        sortable: true,
        render: (val) => <span className="text-gray-600">{val || "N/A"}</span>,
      },
      {
        key: "role",
        label: "Role",
        sortable: true,
        render: (val) => (
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${roleBadge(val)}`}
          >
            {val || "customer"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (val) => (
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-semibold ${val === "inactive" ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"}`}
          >
            {val || "active"}
          </span>
        ),
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: true,
        render: (val) => (
          <span className="text-gray-400">{formatDate(val)}</span>
        ),
      },
      {
        key: "id",
        label: "Actions",
        render: (val, row) => (
          <button
            onClick={() => handleEditRole(row)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Shield size={12} />
            Edit Role
          </button>
        ),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-6" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded mb-3" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {users.length} Users
          </h3>
          <p className="text-sm text-gray-500">
            Manage user accounts and roles
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <FilterBar
          filters={filterDefs}
          activeFilters={filters}
          onChange={setFilters}
        />

        <div className="mt-4">
          <DataTable
            columns={columns}
            data={filtered}
            emptyMessage="No users found."
          />
        </div>
      </div>

      {/* Role Editor Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                Edit User Role
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">User</p>
              <p className="font-semibold text-gray-900">
                {editingUser.displayName || editingUser.email}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
