import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  orderBy,
  getDocs,
} from "../../services/firebase";
import {
  FileText,
  DollarSign,
  CheckCircle,
  Calendar,
  Filter,
} from "lucide-react";
import DataTable from "../../components/ui/DataTable";
import FilterBar from "../../components/ui/FilterBar";

export default function AdminInvoices() {
  useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const ref = collection(db, "invoices");
      const snap = await getDocs(query(ref, orderBy("createdAt", "desc")));
      setInvoices(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error loading invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "N/A";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const statusBadge = (status) => {
    const s = (status || "").toLowerCase();
    const map = {
      paid: "bg-green-100 text-green-700",
      sent: "bg-blue-100 text-blue-700",
      pending: "bg-amber-100 text-amber-700",
      overdue: "bg-red-100 text-red-700",
      cancelled: "bg-gray-100 text-gray-500",
      draft: "bg-gray-100 text-gray-500",
      processing: "bg-cyan-100 text-cyan-700",
    };
    return map[s] || "bg-gray-100 text-gray-600";
  };

  const [filters, setFilters] = useState({});

  const outstanding = invoices
    .filter((i) => i.status !== "paid" && i.status !== "cancelled")
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const paidTotal = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  // Revenue by month — computed from real invoice data
  const revenueByMonth = useMemo(() => {
    const months = {};
    invoices.forEach((inv) => {
      if (inv.status !== "paid" && inv.status !== "processing") return;
      const ts = inv.paidAt || inv.createdAt;
      if (!ts) return;
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      if (!months[key]) months[key] = { key, label, total: 0, count: 0 };
      months[key].total += inv.amount || 0;
      months[key].count++;
    });
    return Object.values(months)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-6);
  }, [invoices]);

  const maxRevenue = Math.max(...revenueByMonth.map((m) => m.total), 1);

  // Filter definitions
  const filterDefs = useMemo(() => {
    const statuses = [
      ...new Set(invoices.map((i) => i.status).filter(Boolean)),
    ].sort();
    return [{ key: "status", label: "Status", options: statuses }];
  }, [invoices]);

  // Filtered invoices
  const filtered = useMemo(() => {
    let result = invoices;
    if (filters.status)
      result = result.filter((i) => i.status === filters.status);
    return result;
  }, [invoices, filters]);

  // DataTable columns
  const columns = useMemo(
    () => [
      {
        key: "customerName",
        label: "Customer",
        sortable: true,
        render: (val, row) => (
          <span className="font-semibold text-gray-900">
            {val || row.leadId || row.id}
          </span>
        ),
      },
      {
        key: "amount",
        label: "Amount",
        sortable: true,
        render: (val) => (
          <span className="font-bold text-gray-900">{formatCurrency(val)}</span>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (val) => (
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${statusBadge(val)}`}
          >
            {val || "draft"}
          </span>
        ),
      },
      {
        key: "dueDate",
        label: "Due Date",
        sortable: true,
        render: (val) => (
          <span className="text-gray-600">{formatDate(val)}</span>
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
    ],
    [],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Total Invoices
            </span>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <FileText size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900">
            {invoices.length}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Outstanding
            </span>
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-red-600">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900">
            {formatCurrency(outstanding)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Total Collected
            </span>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
              <CheckCircle size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900">
            {formatCurrency(paidTotal)}
          </p>
        </div>
      </div>

      {/* Revenue by Month — real data from invoices */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-purple-500" />
          Revenue by Month
        </h3>
        {revenueByMonth.length === 0 ? (
          <div className="h-32 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-400 text-sm">
              Revenue chart will appear once invoices are paid
            </p>
          </div>
        ) : (
          <div className="flex items-end gap-3 h-36">
            {revenueByMonth.map((m) => (
              <div
                key={m.key}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <span className="text-xs font-bold text-gray-700">
                  {formatCurrency(m.total)}
                </span>
                <div
                  className="w-full bg-purple-500 rounded-t-md transition-all"
                  style={{
                    height: `${Math.max((m.total / maxRevenue) * 100, 8)}%`,
                    minHeight: "8px",
                  }}
                />
                <span className="text-xs text-gray-500">{m.label}</span>
                <span className="text-[10px] text-gray-400">{m.count} inv</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter + Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">All Invoices</h3>
          <span className="text-sm text-gray-400">
            {filtered.length} results
          </span>
        </div>

        <FilterBar
          filters={filterDefs}
          activeFilters={filters}
          onChange={setFilters}
        />

        <div className="mt-4">
          <DataTable
            columns={columns}
            data={filtered}
            emptyMessage="No invoices found. Invoices will appear here when created via Mercury."
          />
        </div>
      </div>
    </div>
  );
}
