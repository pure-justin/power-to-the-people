import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
} from "../../services/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  ArrowLeft,
  Star,
  Briefcase,
  MapPin,
  Award,
  ShieldCheck,
  FileText,
  Clock,
  CheckCircle2,
  Edit3,
  Save,
  Loader2,
  AlertCircle,
  X,
  Target,
  Gauge,
  AlertTriangle,
  ListChecks,
  Settings,
  DollarSign,
  TrendingUp,
  Navigation,
  Calendar,
  Store,
  ArrowRight,
  Timer,
  BadgeCheck,
  Zap,
} from "lucide-react";

const functions = getFunctions(undefined, "us-central1");

function formatDate(ts) {
  if (!ts) return "N/A";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${
            n <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-gray-200"
          }`}
        />
      ))}
      <span className="ml-1 text-sm font-medium text-gray-700">
        {rating ? rating.toFixed(1) : "N/A"}
      </span>
    </div>
  );
}

// Common zip-to-city/state mappings (subset; the backend locationMatching.ts has the full 356-zip set)
const ZIP_LOOKUP = {
  78701: "Austin, TX",
  78702: "Austin, TX",
  78703: "Austin, TX",
  78704: "Austin, TX",
  78745: "Austin, TX",
  78748: "Austin, TX",
  78749: "Austin, TX",
  78750: "Austin, TX",
  78751: "Austin, TX",
  78753: "Austin, TX",
  78758: "Austin, TX",
  78759: "Austin, TX",
  75201: "Dallas, TX",
  75202: "Dallas, TX",
  75204: "Dallas, TX",
  75205: "Dallas, TX",
  75206: "Dallas, TX",
  75214: "Dallas, TX",
  77001: "Houston, TX",
  77002: "Houston, TX",
  77003: "Houston, TX",
  77004: "Houston, TX",
  77005: "Houston, TX",
  77006: "Houston, TX",
  78201: "San Antonio, TX",
  78202: "San Antonio, TX",
  78204: "San Antonio, TX",
  78205: "San Antonio, TX",
  78207: "San Antonio, TX",
  78209: "San Antonio, TX",
  76101: "Fort Worth, TX",
  76102: "Fort Worth, TX",
  76104: "Fort Worth, TX",
  73301: "Austin, TX",
  79901: "El Paso, TX",
  79902: "El Paso, TX",
  90001: "Los Angeles, CA",
  90002: "Los Angeles, CA",
  90012: "Los Angeles, CA",
  90210: "Beverly Hills, CA",
  94102: "San Francisco, CA",
  94103: "San Francisco, CA",
  92101: "San Diego, CA",
  95101: "San Jose, CA",
  85001: "Phoenix, AZ",
  85003: "Phoenix, AZ",
  85004: "Phoenix, AZ",
  85251: "Scottsdale, AZ",
  85281: "Tempe, AZ",
  33101: "Miami, FL",
  33109: "Miami Beach, FL",
  33130: "Miami, FL",
  32801: "Orlando, FL",
  33601: "Tampa, FL",
  30301: "Atlanta, GA",
  30303: "Atlanta, GA",
  30308: "Atlanta, GA",
  80201: "Denver, CO",
  80202: "Denver, CO",
  80204: "Denver, CO",
  89101: "Las Vegas, NV",
  89102: "Las Vegas, NV",
  27601: "Raleigh, NC",
  28201: "Charlotte, NC",
  37201: "Nashville, TN",
  37203: "Nashville, TN",
  29401: "Charleston, SC",
  29403: "Charleston, SC",
  10001: "New York, NY",
  10002: "New York, NY",
  10003: "New York, NY",
  60601: "Chicago, IL",
  60602: "Chicago, IL",
  60604: "Chicago, IL",
  98101: "Seattle, WA",
  98102: "Seattle, WA",
  97201: "Portland, OR",
  97202: "Portland, OR",
};

function lookupZipCityState(zip) {
  if (!zip || zip.length < 5) return "";
  return ZIP_LOOKUP[zip] || "";
}

function calcDistanceMiles(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const SERVICE_TYPE_LABELS = {
  cad_design: "CAD Design",
  engineering_stamp: "Engineering Stamp",
  permit_submission: "Permit Submission",
  site_survey: "Site Survey",
  hoa_approval: "HOA Approval",
  installation: "Installation",
  inspection: "Inspection",
  electrical: "Electrical",
  roofing: "Roofing",
  trenching: "Trenching",
  battery_install: "Battery Install",
  panel_upgrade: "Panel Upgrade",
  monitoring_setup: "Monitoring Setup",
  maintenance: "Maintenance",
  other: "Other",
};

export default function DashboardWorkerProfile() {
  const { workerId } = useParams();
  const { user } = useAuth();
  const [worker, setWorker] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [completedListings, setCompletedListings] = useState([]);
  const [activeTasks, setActiveTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // New data state
  const [matchedListings, setMatchedListings] = useState([]);
  const [earnings, setEarnings] = useState({
    total: 0,
    thisMonth: 0,
    avgJobValue: 0,
    recentPayments: [],
  });
  const [cityState, setCityState] = useState("");
  const [updatingServiceArea, setUpdatingServiceArea] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editSkills, setEditSkills] = useState("");
  const [editCerts, setEditCerts] = useState("");
  const [editAreas, setEditAreas] = useState("");
  const [editInsurance, setEditInsurance] = useState("");
  const [editZip, setEditZip] = useState("");
  const [editRadius, setEditRadius] = useState(50);
  const [editMaxConcurrent, setEditMaxConcurrent] = useState(3);

  useEffect(() => {
    const loadWorker = async () => {
      setLoading(true);
      try {
        const workerSnap = await getDoc(doc(db, "workers", workerId));
        if (!workerSnap.exists()) {
          setError("Worker not found");
          setLoading(false);
          return;
        }

        const data = { id: workerSnap.id, ...workerSnap.data() };
        setWorker(data);
        setEditName(data.name || "");
        setEditSkills((data.skills || []).join(", "));
        setEditCerts((data.certifications || []).join(", "));
        setEditAreas((data.service_areas || []).join(", "));
        setEditInsurance(data.insurance || "");
        setEditZip(data.zip || "");
        setEditRadius(data.service_radius || 50);
        setEditMaxConcurrent(data.max_concurrent_tasks || 3);

        // Load ratings
        const ratingsQ = query(
          collection(db, "marketplace_ratings"),
          where("worker_id", "==", workerId),
          orderBy("created_at", "desc"),
          limit(20),
        );
        const ratingsSnap = await getDocs(ratingsQ);
        setRatings(ratingsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // Load completed listings (where this worker won the bid)
        const listingsQ = query(
          collection(db, "marketplace_listings"),
          where("winning_bid.bidderId", "==", data.user_id),
          where("status", "==", "completed"),
          orderBy("completed_at", "desc"),
          limit(10),
        );
        const listingsSnap = await getDocs(listingsQ);
        setCompletedListings(
          listingsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        );

        // Lookup city/state from zip
        if (data.zip) {
          const resolved = lookupZipCityState(data.zip);
          setCityState(resolved);
        }

        // Load active tasks (assigned + in_progress marketplace listings)
        try {
          const assignedQ = query(
            collection(db, "marketplace_listings"),
            where("winning_bid.bidderId", "==", data.user_id),
            where("status", "==", "assigned"),
            limit(20),
          );
          const inProgressQ = query(
            collection(db, "marketplace_listings"),
            where("winning_bid.bidderId", "==", data.user_id),
            where("status", "==", "in_progress"),
            limit(20),
          );
          const [assignedSnap, inProgressSnap] = await Promise.all([
            getDocs(assignedQ),
            getDocs(inProgressQ),
          ]);
          const allActive = [
            ...assignedSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
            ...inProgressSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          ];
          setActiveTasks(allActive);
        } catch (activeErr) {
          console.error("Failed to load active tasks:", activeErr);
        }

        // Load matched listings (open listings in worker's service area)
        try {
          const matchQ = query(
            collection(db, "marketplace_listings"),
            where("status", "==", "open"),
            orderBy("posted_at", "desc"),
            limit(20),
          );
          const matchSnap = await getDocs(matchQ);
          let matched = matchSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));

          // Filter by worker's state-based service areas if available
          if (data.service_areas?.length > 0) {
            matched = matched.filter(
              (l) =>
                !l.project_context?.state ||
                data.service_areas.includes(l.project_context.state),
            );
          }

          // Filter by distance if worker has lat/lng
          if (data.lat && data.lng && data.service_radius) {
            matched = matched.filter((l) => {
              if (!l.project_context?.lat || !l.project_context?.lng)
                return true;
              const dist = calcDistanceMiles(
                data.lat,
                data.lng,
                l.project_context.lat,
                l.project_context.lng,
              );
              return dist <= data.service_radius;
            });
          }

          setMatchedListings(matched.slice(0, 5));
        } catch (matchErr) {
          console.error("Failed to load matched listings:", matchErr);
        }

        // Compute earnings from completed listings
        try {
          const allCompletedQ = query(
            collection(db, "marketplace_listings"),
            where("winning_bid.bidderId", "==", data.user_id),
            where("status", "==", "completed"),
            orderBy("completed_at", "desc"),
            limit(50),
          );
          const allCompletedSnap = await getDocs(allCompletedQ);
          const allCompleted = allCompletedSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));

          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

          let totalEarned = 0;
          let monthEarned = 0;
          const payments = [];

          allCompleted.forEach((listing) => {
            const price = listing.winning_bid?.price || 0;
            totalEarned += price;

            const completedDate = listing.completed_at?.toDate
              ? listing.completed_at.toDate()
              : listing.completed_at
                ? new Date(listing.completed_at)
                : null;

            if (completedDate && completedDate >= monthStart) {
              monthEarned += price;
            }

            if (payments.length < 5) {
              payments.push({
                id: listing.id,
                amount: price,
                service_type: listing.service_type,
                date: completedDate,
              });
            }
          });

          setEarnings({
            total: totalEarned,
            thisMonth: monthEarned,
            avgJobValue:
              allCompleted.length > 0 ? totalEarned / allCompleted.length : 0,
            recentPayments: payments,
          });
        } catch (earningsErr) {
          console.error("Failed to compute earnings:", earningsErr);
        }
      } catch (err) {
        console.error("Failed to load worker:", err);
        setError("Failed to load worker profile");
      } finally {
        setLoading(false);
      }
    };

    if (workerId) loadWorker();
  }, [workerId]);

  const isOwnProfile = worker && worker.user_id === user?.uid;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const registerFn = httpsCallable(functions, "registerWorker");
      await registerFn({
        name: editName,
        skills: editSkills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        certifications: editCerts
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        service_areas: editAreas
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        insurance: editInsurance || null,
        zip: editZip || null,
        service_radius: editRadius,
        max_concurrent_tasks: editMaxConcurrent,
      });

      // Reload
      const workerSnap = await getDoc(doc(db, "workers", workerId));
      setWorker({ id: workerSnap.id, ...workerSnap.data() });
      setEditing(false);
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateServiceArea = async () => {
    if (!isOwnProfile) return;
    setUpdatingServiceArea(true);
    setError(null);
    try {
      await updateDoc(doc(db, "workers", workerId), {
        zip: editZip || null,
        service_radius: editRadius,
      });
      // Reload worker
      const workerSnap = await getDoc(doc(db, "workers", workerId));
      const updatedData = { id: workerSnap.id, ...workerSnap.data() };
      setWorker(updatedData);
      if (updatedData.zip) {
        setCityState(lookupZipCityState(updatedData.zip));
      }
    } catch (err) {
      setError(err.message || "Failed to update service area");
    } finally {
      setUpdatingServiceArea(false);
    }
  };

  // Helper: days remaining until deadline
  function getDaysRemaining(deadline) {
    if (!deadline) return null;
    const end = deadline.toDate ? deadline.toDate() : new Date(deadline);
    const now = new Date();
    const diff = end - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // Helper: format currency
  function formatCurrency(val) {
    if (val == null) return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(val);
  }

  // Compute reliability stats
  const reliabilityStats = (() => {
    const completedJobs = worker?.completed_jobs || 0;
    const onTimeRate = worker?.on_time_rate ?? (completedJobs > 0 ? 95 : null);
    const score = worker?.reliability_score ?? null;
    const strikes = worker?.strikes?.history || [];
    const activeStrikes = strikes.filter((s) => s.status !== "resolved");
    const slaCompliant =
      score != null ? score >= 80 && activeStrikes.length === 0 : null;
    return { completedJobs, onTimeRate, score, strikes, slaCompliant };
  })();

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded-lg bg-gray-100" />
        <div className="h-40 rounded-lg bg-gray-100" />
        <div className="h-32 rounded-lg bg-gray-100" />
      </div>
    );
  }

  if (error && !worker) {
    return (
      <div className="py-12 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">{error}</p>
        <Link
          to="/dashboard/marketplace"
          className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/dashboard/marketplace"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Link>

      {/* Profile Header */}
      <div className="card border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            {editing ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input-field mb-2 text-lg font-bold"
              />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">
                {worker.name}
              </h1>
            )}
            <p className="text-sm text-gray-500">{worker.email}</p>

            <div className="mt-3 flex items-center gap-4">
              <StarRating rating={worker.ratings?.overall || 0} />
              <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                <Briefcase className="h-4 w-4" />
                {worker.completed_jobs || 0} completed jobs
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  worker.availability === "available"
                    ? "bg-emerald-100 text-emerald-700"
                    : worker.availability === "busy"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-500"
                }`}
              >
                {worker.availability || "Unknown"}
              </span>
            </div>
          </div>

          {isOwnProfile && (
            <div>
              {editing ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Profile
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Skills & Certifications */}
        <div className="card border border-gray-200 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-gray-400">
            <Award className="h-4 w-4" />
            Skills & Certifications
          </h2>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Skills (comma-separated)
                </label>
                <input
                  value={editSkills}
                  onChange={(e) => setEditSkills(e.target.value)}
                  className="input-field"
                  placeholder="cad_design, engineering, electrical"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Certifications (comma-separated)
                </label>
                <input
                  value={editCerts}
                  onChange={(e) => setEditCerts(e.target.value)}
                  className="input-field"
                  placeholder="NABCEP, Licensed Electrician"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <h3 className="mb-1 text-xs text-gray-500">Skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(worker.skills || []).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                    >
                      {skill.replace(/_/g, " ")}
                    </span>
                  ))}
                  {(!worker.skills || worker.skills.length === 0) && (
                    <span className="text-xs text-gray-400">None listed</span>
                  )}
                </div>
              </div>
              <div className="mb-3">
                <h3 className="mb-1 text-xs text-gray-500">Certifications</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(worker.certifications || []).map((cert) => (
                    <span
                      key={cert}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      {cert}
                    </span>
                  ))}
                  {(!worker.certifications ||
                    worker.certifications.length === 0) && (
                    <span className="text-xs text-gray-400">None listed</span>
                  )}
                </div>
              </div>
              {worker.licenses?.length > 0 && (
                <div>
                  <h3 className="mb-1 text-xs text-gray-500">Licenses</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {worker.licenses.map((lic) => (
                      <span
                        key={lic}
                        className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700"
                      >
                        {lic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Service Area & Settings */}
        <div className="card border border-gray-200 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-gray-400">
            <Target className="h-4 w-4" />
            Service Area & Settings
          </h2>

          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Zip Code
                  </label>
                  <input
                    value={editZip}
                    onChange={(e) => setEditZip(e.target.value)}
                    className="input-field"
                    placeholder="78701"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center justify-between text-xs text-gray-500">
                    <span>Service Radius</span>
                    <span className="font-medium text-gray-700">
                      {editRadius} mi
                    </span>
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={editRadius}
                    onChange={(e) =>
                      setEditRadius(parseInt(e.target.value, 10))
                    }
                    className="w-full accent-emerald-600"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Additional Service Areas (comma-separated states)
                </label>
                <input
                  value={editAreas}
                  onChange={(e) => setEditAreas(e.target.value)}
                  className="input-field"
                  placeholder="TX, CA, FL"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Max Concurrent Tasks
                  </label>
                  <select
                    value={editMaxConcurrent}
                    onChange={(e) =>
                      setEditMaxConcurrent(parseInt(e.target.value, 10))
                    }
                    className="input-field"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} task{n !== 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Insurance Info
                  </label>
                  <input
                    value={editInsurance}
                    onChange={(e) => setEditInsurance(e.target.value)}
                    className="input-field"
                    placeholder="$1M general liability"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {/* Visual service area display */}
                {worker.zip && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">
                        Serving {cityState || `ZIP ${worker.zip}`}
                        {worker.service_radius
                          ? ` + ${worker.service_radius} mile radius`
                          : ""}
                      </span>
                    </div>
                  </div>
                )}
                {worker.zip && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">
                      ZIP {worker.zip}
                      {cityState && (
                        <span className="ml-1 text-gray-500">
                          ({cityState})
                        </span>
                      )}
                      {worker.service_radius &&
                        ` -- ${worker.service_radius} mile radius`}
                    </span>
                  </div>
                )}
                {(worker.service_areas || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {worker.service_areas.map((area) => (
                      <span
                        key={area}
                        className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                )}
                {!worker.zip &&
                  (!worker.service_areas ||
                    worker.service_areas.length === 0) && (
                    <span className="text-xs text-gray-400">
                      No service area set
                    </span>
                  )}
              </div>

              {/* Inline service area update (own profile only) */}
              {isOwnProfile && !editing && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <h3 className="mb-2 text-xs font-medium text-gray-500">
                    Quick Update Service Area
                  </h3>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="w-28">
                      <label className="mb-0.5 block text-[10px] text-gray-500">
                        Zip Code
                      </label>
                      <input
                        value={editZip}
                        onChange={(e) => {
                          setEditZip(e.target.value);
                          setCityState(lookupZipCityState(e.target.value));
                        }}
                        className="input-field text-sm"
                        placeholder="78701"
                        maxLength={5}
                      />
                    </div>
                    <div className="flex-1 min-w-[140px] max-w-[200px]">
                      <label className="mb-0.5 flex items-center justify-between text-[10px] text-gray-500">
                        <span>Radius</span>
                        <span className="font-medium text-gray-700">
                          {editRadius} mi
                        </span>
                      </label>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={editRadius}
                        onChange={(e) =>
                          setEditRadius(parseInt(e.target.value, 10))
                        }
                        className="w-full accent-emerald-600"
                      />
                    </div>
                    <button
                      onClick={handleUpdateServiceArea}
                      disabled={updatingServiceArea}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {updatingServiceArea ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <MapPin className="h-3 w-3" />
                      )}
                      Update Service Area
                    </button>
                  </div>
                  {editZip && lookupZipCityState(editZip) && (
                    <p className="mt-1.5 text-[10px] text-emerald-600">
                      {lookupZipCityState(editZip)}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Settings className="h-3.5 w-3.5 text-gray-400" />
                  <span>
                    Max {worker.max_concurrent_tasks || 3} concurrent tasks
                  </span>
                </div>
              </div>
              {worker.insurance && (
                <div className="mt-3">
                  <h3 className="mb-1 text-xs text-gray-500">Insurance</h3>
                  <p className="text-sm text-gray-700">{worker.insurance}</p>
                </div>
              )}
              {worker.background_check && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Background Check Verified
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Reliability Dashboard */}
      <div className="card border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase text-gray-400">
            <Gauge className="h-4 w-4" />
            Reliability Dashboard
          </h2>
          {reliabilityStats.slaCompliant != null && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                reliabilityStats.slaCompliant
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              <BadgeCheck className="h-3 w-3" />
              {reliabilityStats.slaCompliant
                ? "SLA Compliant"
                : "SLA Non-Compliant"}
            </span>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
            <p className="text-xl font-bold text-gray-900">
              {reliabilityStats.score ?? "--"}
            </p>
            <p className="text-[10px] text-gray-500">Reliability Score</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
            <p className="text-xl font-bold text-gray-900">
              {reliabilityStats.completedJobs}
            </p>
            <p className="text-[10px] text-gray-500">Jobs Completed</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
            <p className="text-xl font-bold text-gray-900">
              {reliabilityStats.onTimeRate != null
                ? `${reliabilityStats.onTimeRate}%`
                : "--"}
            </p>
            <p className="text-[10px] text-gray-500">On-Time Rate</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
            <p className="text-xl font-bold text-gray-900">
              {reliabilityStats.strikes.length}
            </p>
            <p className="text-[10px] text-gray-500">Total Strikes</p>
          </div>
        </div>

        {/* Score Bar */}
        {(() => {
          const score = reliabilityStats.score;
          if (score == null) {
            return (
              <p className="text-sm text-gray-400">No reliability data yet</p>
            );
          }
          const color =
            score >= 80
              ? "bg-emerald-500"
              : score >= 50
                ? "bg-amber-500"
                : "bg-red-500";
          const textColor =
            score >= 80
              ? "text-emerald-700"
              : score >= 50
                ? "text-amber-700"
                : "text-red-700";
          const label =
            score >= 80
              ? "Excellent"
              : score >= 50
                ? "Fair"
                : "Needs Improvement";
          return (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-sm font-medium ${textColor}`}>
                  {label}
                </span>
                <span className={`text-lg font-bold ${textColor}`}>
                  {score}/100
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-200">
                <div
                  className={`h-3 rounded-full ${color} transition-all`}
                  style={{ width: `${Math.min(score, 100)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>
          );
        })()}

        {/* Strike History */}
        {worker.strikes?.history?.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Strike History ({worker.strikes.history.length})
            </h3>
            <div className="space-y-2">
              {worker.strikes.history.map((strike, i) => {
                const severityColors = {
                  minor: "bg-amber-100 text-amber-700",
                  major: "bg-orange-100 text-orange-700",
                  critical: "bg-red-100 text-red-700",
                };
                return (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2"
                  >
                    <span
                      className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${severityColors[strike.severity] || "bg-gray-100 text-gray-600"}`}
                    >
                      {strike.severity || "unknown"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700">
                        {strike.reason || "No reason provided"}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className="text-[10px] text-gray-400">
                          {formatDate(strike.date)}
                        </p>
                        {strike.project_id && (
                          <p className="text-[10px] text-gray-400">
                            Project: {strike.project_id}
                          </p>
                        )}
                        {strike.status && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              strike.status === "resolved"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {strike.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Active Tasks */}
      <div className="card border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase text-gray-400">
            <ListChecks className="h-4 w-4" />
            Active Tasks ({activeTasks.length}
            {worker.max_concurrent_tasks &&
              ` / ${worker.max_concurrent_tasks} max`}
            )
          </h2>
          {activeTasks.length >= (worker.max_concurrent_tasks || 3) && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              At Capacity
            </span>
          )}
        </div>
        {activeTasks.length === 0 ? (
          <p className="text-sm text-gray-400">No active tasks</p>
        ) : (
          <div className="space-y-2">
            {activeTasks.map((task) => {
              const daysLeft = getDaysRemaining(task.deadline);
              const isUrgent = daysLeft != null && daysLeft <= 2;
              const isOverdue = daysLeft != null && daysLeft < 0;
              return (
                <div
                  key={task.id}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                    isOverdue
                      ? "border-red-200 bg-red-50/50"
                      : isUrgent
                        ? "border-amber-200 bg-amber-50/50"
                        : "border-blue-100 bg-blue-50/50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {SERVICE_TYPE_LABELS[task.service_type] ||
                          task.service_type?.replace(/_/g, " ") ||
                          "N/A"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          task.status === "in_progress"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {task.status === "in_progress"
                          ? "In Progress"
                          : "Assigned"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700 line-clamp-1">
                      {task.requirements}
                    </p>
                    <div className="mt-0.5 flex items-center gap-3">
                      {task.project_context?.state && (
                        <p className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="h-3 w-3" />
                          {task.project_context.state}
                          {task.project_context?.zip &&
                            ` ${task.project_context.zip}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col items-end gap-1 shrink-0">
                    {task.deadline && (
                      <p className="text-xs text-gray-500">
                        Due {formatDate(task.deadline)}
                      </p>
                    )}
                    {daysLeft != null && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isOverdue
                            ? "bg-red-100 text-red-700"
                            : isUrgent
                              ? "bg-amber-100 text-amber-700 animate-pulse"
                              : daysLeft <= 5
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        <Timer className="h-3 w-3" />
                        {isOverdue
                          ? `${Math.abs(daysLeft)}d overdue`
                          : `${daysLeft}d remaining`}
                      </span>
                    )}
                    {task.winning_bid?.price && (
                      <p className="font-medium text-xs text-gray-700">
                        {formatCurrency(task.winning_bid.price)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Earnings Summary */}
      <div className="card border border-gray-200 p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-gray-400">
          <DollarSign className="h-4 w-4" />
          Earnings Summary
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
            <p className="text-xl font-bold text-emerald-700">
              {formatCurrency(earnings.total)}
            </p>
            <p className="text-[10px] text-emerald-600">Total Earned</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
            <p className="text-xl font-bold text-blue-700">
              {formatCurrency(earnings.thisMonth)}
            </p>
            <p className="text-[10px] text-blue-600">This Month</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
            <p className="text-xl font-bold text-gray-700">
              {formatCurrency(earnings.avgJobValue)}
            </p>
            <p className="text-[10px] text-gray-500">Avg Job Value</p>
          </div>
        </div>

        {/* Recent Payments */}
        {earnings.recentPayments.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400">
              Recent Payments
            </h3>
            <div className="space-y-1.5">
              {earnings.recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span className="text-xs text-gray-700">
                      {SERVICE_TYPE_LABELS[payment.service_type] ||
                        payment.service_type?.replace(/_/g, " ") ||
                        "Job"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {payment.date
                        ? payment.date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : "N/A"}
                    </span>
                    <span className="text-xs font-medium text-emerald-700">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {earnings.total === 0 && earnings.recentPayments.length === 0 && (
          <p className="text-sm text-gray-400">No earnings recorded yet</p>
        )}
      </div>

      {/* Matched Listings Preview */}
      <div className="card border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase text-gray-400">
            <Store className="h-4 w-4" />
            Nearby Open Listings
          </h2>
          <Link
            to="/dashboard/marketplace"
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            View All
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {matchedListings.length === 0 ? (
          <p className="text-sm text-gray-400">
            No matching open listings in your service area
          </p>
        ) : (
          <div className="space-y-2">
            {matchedListings.map((listing) => (
              <Link
                key={listing.id}
                to="/dashboard/marketplace"
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-100"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {SERVICE_TYPE_LABELS[listing.service_type] ||
                        listing.service_type?.replace(/_/g, " ") ||
                        "N/A"}
                    </span>
                    {listing.project_context?.state && (
                      <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                        <MapPin className="h-2.5 w-2.5" />
                        {listing.project_context.state}
                        {listing.project_context?.zip &&
                          ` ${listing.project_context.zip}`}
                      </span>
                    )}
                  </div>
                  {listing.requirements && (
                    <p className="mt-1 text-xs text-gray-600 line-clamp-1">
                      {listing.requirements}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex flex-col items-end gap-0.5 shrink-0">
                  {listing.budget && (
                    <span className="text-xs font-medium text-gray-700">
                      {formatCurrency(listing.budget.min)} -{" "}
                      {formatCurrency(listing.budget.max)}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400">
                    {formatDate(listing.posted_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Completed Jobs / Portfolio */}
      <div className="card border border-gray-200 p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-gray-400">
          <Briefcase className="h-4 w-4" />
          Recent Completed Jobs
        </h2>

        {completedListings.length === 0 ? (
          <p className="text-sm text-gray-400">No completed jobs yet</p>
        ) : (
          <div className="space-y-2">
            {completedListings.map((listing) => (
              <div
                key={listing.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
              >
                <div>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    {listing.service_type?.replace(/_/g, " ") || "N/A"}
                  </span>
                  <p className="mt-1 text-sm text-gray-700 line-clamp-1">
                    {listing.requirements}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>Completed {formatDate(listing.completed_at)}</p>
                  {listing.winning_bid?.price && (
                    <p className="font-medium text-gray-700">
                      ${listing.winning_bid.price.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="card border border-gray-200 p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-gray-400">
          <Star className="h-4 w-4" />
          Reviews ({ratings.length})
        </h2>

        {ratings.length === 0 ? (
          <p className="text-sm text-gray-400">No reviews yet</p>
        ) : (
          <div className="space-y-3">
            {ratings.map((rating) => (
              <div
                key={rating.id}
                className="border-b border-gray-100 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  <StarRating rating={rating.score} />
                  <span className="text-xs text-gray-400">
                    {formatDate(rating.created_at)}
                  </span>
                </div>
                {rating.review && (
                  <p className="mt-1 text-sm text-gray-600">{rating.review}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
