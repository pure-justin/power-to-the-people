/**
 * Dashboard Credits -- Seller (installer) dashboard for tax credit management
 *
 * Allows installers to:
 *   - List credits from completed projects
 *   - View active listings and offer notifications
 *   - Track transaction history
 *   - See analytics (avg sale price, time to sell, revenue)
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "../../services/firebase";
import {
  auditProjectCredits,
  getAuditsByProject,
  getCreditTransactions,
} from "../../services/taxCreditService";
import {
  DollarSign,
  TrendingUp,
  Clock,
  ShieldCheck,
  Plus,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Star,
  FileText,
  RefreshCw,
} from "lucide-react";
import DataTable from "../../components/ui/DataTable";
import FilterBar from "../../components/ui/FilterBar";

export default function DashboardCredits() {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(null); // projectId being audited

  // Listings loaded from Firestore directly (seller's own)
  const [listings, setListings] = useState([]);

  // Stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeListing: 0,
    pendingOffers: 0,
    avgDiscount: 0,
  });

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);

    try {
      // Load user's projects that are complete/installed
      const projectsQuery = query(
        collection(db, "projects"),
        where("installerId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(50),
      );
      const projectSnap = await getDocs(projectsQuery);
      const projectData = projectSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setProjects(projectData);

      // Load user's credit listings
      const listingsQuery = query(
        collection(db, "tax_credit_listings"),
        where("sellerId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(50),
      );
      const listingsSnap = await getDocs(listingsQuery);
      const listingData = listingsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setListings(listingData);

      // Load transactions
      const txResult = await getCreditTransactions({
        sellerId: user.uid,
        limit: 50,
      });
      setTransactions(txResult.transactions || []);

      // Compute stats
      const completedTx = (txResult.transactions || []).filter(
        (t) => t.transfer?.status === "completed",
      );
      const totalRevenue = completedTx.reduce(
        (sum, t) => sum + (t.payment?.toSeller?.amount || 0),
        0,
      );
      const avgDiscount =
        completedTx.length > 0
          ? Math.round(
              (completedTx.reduce((sum, t) => sum + (t.discountRate || 0), 0) /
                completedTx.length) *
                100,
            ) / 100
          : 0;

      const activeListing = listingData.filter(
        (l) => l.status === "active" || l.status === "under_offer",
      ).length;
      const pendingOffers = listingData.reduce(
        (sum, l) =>
          sum + (l.offers || []).filter((o) => o.status === "pending").length,
        0,
      );

      setStats({ totalRevenue, activeListing, pendingOffers, avgDiscount });
    } catch (err) {
      console.error("Failed to load dashboard credits data:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAuditProject = async (projectId) => {
    setAuditing(projectId);
    try {
      await auditProjectCredits(projectId);
      await loadData();
    } catch (err) {
      console.error("Failed to audit project:", err);
    } finally {
      setAuditing(null);
    }
  };

  // --- Listings filters, filtered data, and columns ---
  const [listingFilters, setListingFilters] = useState({});

  const listingFilterDefs = useMemo(() => {
    const statuses = [
      ...new Set(listings.map((l) => l.status).filter(Boolean)),
    ].sort();
    const creditTypes = [
      ...new Set(listings.map((l) => l.listing?.creditType).filter(Boolean)),
    ].sort();
    return [
      {
        key: "status",
        label: "Status",
        options: statuses.map((s) => ({
          value: s,
          label: s.replace(/_/g, " "),
        })),
      },
      {
        key: "creditType",
        label: "Credit Type",
        options: creditTypes.map((t) => ({
          value: t,
          label: t.replace(/_/g, " "),
        })),
      },
    ];
  }, [listings]);

  const filteredListings = useMemo(() => {
    let result = listings;
    if (listingFilters.status) {
      result = result.filter((l) => l.status === listingFilters.status);
    }
    if (listingFilters.creditType) {
      result = result.filter(
        (l) => l.listing?.creditType === listingFilters.creditType,
      );
    }
    return result;
  }, [listings, listingFilters]);

  const listingColumns = useMemo(
    () => [
      {
        key: "creditType",
        label: "Credit",
        sortable: true,
        render: (_val, row) => (
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            {row.listing?.creditType?.replace(/_/g, " ")}
          </span>
        ),
      },
      {
        key: "creditAmount",
        label: "Amount",
        sortable: true,
        render: (_val, row) => (
          <span className="font-medium">
            ${(row.listing?.creditAmount || 0).toLocaleString()}
          </span>
        ),
      },
      {
        key: "askingPrice",
        label: "Asking",
        sortable: true,
        render: (_val, row) =>
          `$${(row.listing?.askingPrice || 0).toLocaleString()}`,
      },
      {
        key: "discountRate",
        label: "Discount",
        sortable: true,
        render: (_val, row) => (
          <span className="text-emerald-600">
            {row.listing?.discountRate || 0}%
          </span>
        ),
      },
      {
        key: "offers",
        label: "Offers",
        sortable: false,
        render: (_val, row) => {
          const pendingCount = (row.offers || []).filter(
            (o) => o.status === "pending",
          ).length;
          return pendingCount > 0 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {pendingCount} pending
            </span>
          ) : (
            <span className="text-gray-400">None</span>
          );
        },
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (val) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              val === "active"
                ? "bg-green-100 text-green-700"
                : val === "under_offer"
                  ? "bg-blue-100 text-blue-700"
                  : val === "sold"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-gray-600"
            }`}
          >
            {val?.replace(/_/g, " ")}
          </span>
        ),
      },
      {
        key: "actions",
        label: "",
        sortable: false,
        render: (_val, row) => (
          <Link
            to={`/marketplace/credits/${row.id}`}
            className="text-emerald-600 hover:underline"
          >
            View <ArrowRight className="inline h-3 w-3" />
          </Link>
        ),
      },
    ],
    [],
  );

  // --- Transaction filters, filtered data, and columns ---
  const [txFilters, setTxFilters] = useState({});

  const txFilterDefs = useMemo(() => {
    const statuses = [
      ...new Set(transactions.map((t) => t.transfer?.status).filter(Boolean)),
    ].sort();
    return [
      {
        key: "transferStatus",
        label: "Status",
        options: statuses.map((s) => ({ value: s, label: s })),
      },
    ];
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (txFilters.transferStatus) {
      result = result.filter(
        (t) => t.transfer?.status === txFilters.transferStatus,
      );
    }
    return result;
  }, [transactions, txFilters]);

  const transactionColumns = useMemo(
    () => [
      {
        key: "creditAmount",
        label: "Credit",
        sortable: true,
        render: (val) => (
          <span className="font-medium">${(val || 0).toLocaleString()}</span>
        ),
      },
      {
        key: "salePrice",
        label: "Sale Price",
        sortable: true,
        render: (val) => `$${(val || 0).toLocaleString()}`,
      },
      {
        key: "platformFee",
        label: "Platform Fee",
        sortable: true,
        render: (val) => (
          <span className="text-red-600">-${(val || 0).toLocaleString()}</span>
        ),
      },
      {
        key: "netToSeller",
        label: "Net to You",
        sortable: true,
        render: (_val, row) => (
          <span className="font-medium text-green-600">
            ${(row.payment?.toSeller?.amount || 0).toLocaleString()}
          </span>
        ),
      },
      {
        key: "transferStatus",
        label: "Status",
        sortable: true,
        render: (_val, row) => {
          const status = row.transfer?.status;
          return (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                status === "completed"
                  ? "bg-green-100 text-green-700"
                  : status === "initiated"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
              }`}
            >
              {status || "unknown"}
            </span>
          );
        },
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 rounded-lg bg-gray-100" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax Credits</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage transferable credits under IRA Section 6418
          </p>
        </div>
        <button
          onClick={loadData}
          className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card-padded">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <DollarSign className="h-4 w-4 text-green-500" />
            Total Revenue
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            ${stats.totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="card-padded">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Active Listings
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {stats.activeListing}
          </p>
        </div>
        <div className="card-padded">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Pending Offers
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {stats.pendingOffers}
          </p>
        </div>
        <div className="card-padded">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            Avg Discount
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {stats.avgDiscount}%
          </p>
        </div>
      </div>

      {/* Active Listings */}
      {listings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Your Listings</h2>
          <FilterBar
            filters={listingFilterDefs}
            activeFilters={listingFilters}
            onChange={setListingFilters}
          />
          <DataTable
            columns={listingColumns}
            data={filteredListings}
            emptyMessage="No listings match current filters"
          />
        </div>
      )}

      {/* Projects eligible for credit listing */}
      <div className="card">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Projects -- List a Credit
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Audit completed projects to list their tax credits for sale
          </p>
        </div>
        {projects.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No projects found. Complete a solar installation to list credits.
          </div>
        ) : (
          <div className="divide-y">
            {projects.slice(0, 10).map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {project.customerName || project.address || project.id}
                  </p>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                    <span>
                      {project.systemSizeKw || project.system_size_kw || "?"} kW
                    </span>
                    <span>{project.state || project.address?.state || ""}</span>
                    <span>{project.status || ""}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleAuditProject(project.id)}
                  disabled={auditing === project.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {auditing === project.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  Audit Credits
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction History */}
      {transactions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Transaction History
          </h2>
          <FilterBar
            filters={txFilterDefs}
            activeFilters={txFilters}
            onChange={setTxFilters}
          />
          <DataTable
            columns={transactionColumns}
            data={filteredTransactions}
            emptyMessage="No transactions match current filters"
          />
        </div>
      )}
    </div>
  );
}
