/**
 * Portal Credits -- Buyer (homeowner/business) dashboard for tax credit purchases
 *
 * Allows buyers to:
 *   - Browse marketplace (link out)
 *   - View active offers they've made
 *   - Track purchased credits and transfer status
 *   - Download transfer documents
 */
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getCreditTransactions } from "../../services/taxCreditService";
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
  DollarSign,
  ShieldCheck,
  Clock,
  ArrowRight,
  CheckCircle2,
  FileText,
  ExternalLink,
  RefreshCw,
  Star,
  TrendingDown,
  AlertTriangle,
  Package,
} from "lucide-react";

const VERIFICATION_LABELS = {
  1: { label: "Bronze", color: "text-amber-700 bg-amber-100" },
  2: { label: "Silver", color: "text-gray-600 bg-gray-100" },
  3: { label: "Gold", color: "text-yellow-700 bg-yellow-100" },
  4: { label: "Platinum", color: "text-indigo-700 bg-indigo-100" },
};

export default function PortalCredits() {
  const { user } = useAuth();

  const [offers, setOffers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalPurchased: 0,
    activeOffers: 0,
    pendingTransfers: 0,
    totalSaved: 0,
  });

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);

    try {
      // Load listings where user has made offers
      const listingsQuery = query(
        collection(db, "tax_credit_listings"),
        where("offerBuyerIds", "array-contains", user.uid),
        orderBy("createdAt", "desc"),
        limit(50),
      );
      const listingsSnap = await getDocs(listingsQuery);
      const offerData = listingsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setOffers(offerData);

      // Load transactions where user is buyer
      const txResult = await getCreditTransactions({
        buyerId: user.uid,
        limit: 50,
      });
      setTransactions(txResult.transactions || []);

      // Compute stats
      const completedTx = (txResult.transactions || []).filter(
        (t) => t.transfer?.status === "completed",
      );
      const totalPurchased = completedTx.reduce(
        (sum, t) => sum + (t.creditAmount || 0),
        0,
      );
      const totalSaved = completedTx.reduce(
        (sum, t) =>
          sum + ((t.creditAmount || 0) - (t.payment?.fromBuyer?.amount || 0)),
        0,
      );

      const activeOffers = offerData.reduce(
        (sum, l) =>
          sum +
          (l.offers || []).filter(
            (o) => o.buyerId === user.uid && o.status === "pending",
          ).length,
        0,
      );
      const pendingTransfers = (txResult.transactions || []).filter(
        (t) =>
          t.transfer?.status === "initiated" ||
          t.transfer?.status === "in_escrow",
      ).length;

      setStats({ totalPurchased, activeOffers, pendingTransfers, totalSaved });
    } catch (err) {
      console.error("Failed to load portal credits data:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
            Purchase transferable clean energy tax credits at a discount
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/marketplace/credits"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Browse Marketplace
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={loadData}
            className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card-padded">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <DollarSign className="h-4 w-4 text-green-500" />
            Credits Purchased
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            ${stats.totalPurchased.toLocaleString()}
          </p>
        </div>
        <div className="card-padded">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingDown className="h-4 w-4 text-emerald-500" />
            Total Savings
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            ${stats.totalSaved.toLocaleString()}
          </p>
        </div>
        <div className="card-padded">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Active Offers
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {stats.activeOffers}
          </p>
        </div>
        <div className="card-padded">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4 text-blue-500" />
            Pending Transfers
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {stats.pendingTransfers}
          </p>
        </div>
      </div>

      {/* Active Offers */}
      {offers.length > 0 && (
        <div className="card">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Offers</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Credits you've made offers on
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Credit
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Your Offer
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Verification
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {offers.map((listing) => {
                  const myOffers = (listing.offers || []).filter(
                    (o) => o.buyerId === user.uid,
                  );
                  const latestOffer = myOffers[myOffers.length - 1];
                  const verLevel = listing.verificationLevel?.level || 1;
                  const verConfig =
                    VERIFICATION_LABELS[verLevel] || VERIFICATION_LABELS[1];
                  return (
                    <tr key={listing.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          {listing.listing?.creditType?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        ${(listing.listing?.creditAmount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        ${(latestOffer?.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${verConfig.color}`}
                        >
                          <Star className="h-3 w-3 fill-current" />
                          {verConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            latestOffer?.status === "accepted"
                              ? "bg-green-100 text-green-700"
                              : latestOffer?.status === "pending"
                                ? "bg-amber-100 text-amber-700"
                                : latestOffer?.status === "countered"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {latestOffer?.status || "unknown"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/marketplace/credits/${listing.id}`}
                          className="text-emerald-600 hover:underline"
                        >
                          View <ArrowRight className="inline h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Completed Purchases / Transfer Tracking */}
      {transactions.length > 0 ? (
        <div className="card">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Purchased Credits
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Track transfer status and download documents
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Credit Value
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    You Paid
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Savings
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Transfer Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Documents
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((tx) => {
                  const paid = tx.payment?.fromBuyer?.amount || 0;
                  const creditVal = tx.creditAmount || 0;
                  const savings = creditVal - paid;
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        ${creditVal.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">${paid.toLocaleString()}</td>
                      <td className="px-4 py-3 font-medium text-emerald-600">
                        ${savings.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            tx.transfer?.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : tx.transfer?.status === "initiated"
                                ? "bg-blue-100 text-blue-700"
                                : tx.transfer?.status === "in_escrow"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {tx.transfer?.status?.replace(/_/g, " ") || "unknown"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {tx.transfer?.status === "completed" &&
                        tx.documents?.transferElection ? (
                          <a
                            href={tx.documents.transferElection}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Form 3800
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        offers.length === 0 && (
          <div className="card">
            <div className="p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No credits yet
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Browse the marketplace to find transferable tax credits at a
                discount.
              </p>
              <Link
                to="/marketplace/credits"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Browse Marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )
      )}

      {/* How it Works */}
      <div className="card">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            How Credit Transfers Work
          </h2>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-4">
          <div className="text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              1
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">Browse</p>
            <p className="mt-1 text-xs text-gray-500">
              Find verified credits in the marketplace
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              2
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">Offer</p>
            <p className="mt-1 text-xs text-gray-500">
              Make an offer below face value
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              3
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">Escrow</p>
            <p className="mt-1 text-xs text-gray-500">
              Funds held securely until transfer
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              4
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">Claim</p>
            <p className="mt-1 text-xs text-gray-500">
              IRS transfer election filed, credit is yours
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
