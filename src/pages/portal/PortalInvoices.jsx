import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db, collection, query, where, getDocs } from "../../services/firebase";
import {
  ExternalLink,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import DataTable from "../../components/ui/DataTable";
import FilterBar from "../../components/ui/FilterBar";

const STATUS_CONFIG = {
  paid: {
    label: "Paid",
    className: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  sent: {
    label: "Sent",
    className: "bg-blue-100 text-blue-700",
    icon: FileText,
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-100 text-red-700",
    icon: AlertCircle,
  },
  draft: {
    label: "Draft",
    className: "bg-gray-100 text-gray-600",
    icon: Clock,
  },
};

function formatCurrency(amount) {
  if (!amount && amount !== 0) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateVal) {
  if (!dateVal) return "--";
  const d =
    typeof dateVal === "string"
      ? new Date(dateVal)
      : dateVal?.toDate
        ? dateVal.toDate()
        : new Date(dateVal);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PortalInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    if (!user?.email) return;
    const loadInvoices = async () => {
      try {
        const q = query(
          collection(db, "invoices"),
          where("email", "==", user.email),
        );
        const snap = await getDocs(q);
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const dateA = a.createdAt?.toMillis?.() || 0;
            const dateB = b.createdAt?.toMillis?.() || 0;
            return dateB - dateA;
          });
        setInvoices(data);
      } catch (err) {
        console.error("Failed to load invoices:", err);
      } finally {
        setLoading(false);
      }
    };
    loadInvoices();
  }, [user]);

  const totalPaid = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const totalOutstanding = invoices
    .filter((inv) => ["sent", "overdue"].includes(inv.status))
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);

  // Filter definitions — dynamically extracted from loaded data
  const filterDefs = useMemo(() => {
    const statuses = [
      ...new Set(invoices.map((inv) => inv.status).filter(Boolean)),
    ].sort();
    return [
      {
        key: "status",
        label: "Status",
        options: statuses.map((s) => ({
          value: s,
          label:
            STATUS_CONFIG[s]?.label || s.charAt(0).toUpperCase() + s.slice(1),
        })),
      },
    ];
  }, [invoices]);

  // Filtered invoices
  const filtered = useMemo(() => {
    let result = invoices;
    if (filters.status) {
      result = result.filter((inv) => inv.status === filters.status);
    }
    return result;
  }, [invoices, filters]);

  // DataTable columns
  const columns = useMemo(
    () => [
      {
        key: "description",
        label: "Description",
        sortable: true,
        render: (val, row) => (
          <div>
            <p className="text-sm font-medium text-gray-900">
              {val || "Solar Invoice"}
            </p>
            <p className="text-xs text-gray-500">#{row.id.slice(0, 8)}</p>
          </div>
        ),
      },
      {
        key: "amount",
        label: "Amount",
        sortable: true,
        render: (val) => (
          <span className="text-sm font-medium text-gray-900">
            {formatCurrency(val)}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (val) => {
          const statusCfg = STATUS_CONFIG[val] || STATUS_CONFIG.draft;
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.className}`}
            >
              {statusCfg.label}
            </span>
          );
        },
      },
      {
        key: "dueDate",
        label: "Due Date",
        sortable: true,
        render: (val) => (
          <span className="text-sm text-gray-500">{formatDate(val)}</span>
        ),
      },
      {
        key: "paymentUrl",
        label: "Action",
        sortable: false,
        render: (val, row) =>
          ["sent", "overdue"].includes(row.status) && val ? (
            <a
              href={val}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              Pay Now
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-xs text-gray-400">--</span>
          ),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-40 rounded bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-24 rounded-xl bg-gray-100" />
          <div className="h-24 rounded-xl bg-gray-100" />
        </div>
        <div className="h-64 rounded-xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="mt-1 text-sm text-gray-500">
          View and manage your payment history
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(totalPaid)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Outstanding</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(totalOutstanding)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filterDefs}
        activeFilters={filters}
        onChange={setFilters}
      />

      {/* Invoice Table */}
      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage="No invoices found."
      />
    </div>
  );
}
