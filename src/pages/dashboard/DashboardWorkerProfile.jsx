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

        // Load active tasks (assigned marketplace listings)
        try {
          const activeQ = query(
            collection(db, "marketplace_listings"),
            where("winning_bid.bidderId", "==", data.user_id),
            where("status", "==", "assigned"),
            limit(20),
          );
          const activeSnap = await getDocs(activeQ);
          setActiveTasks(
            activeSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          );
        } catch (activeErr) {
          console.error("Failed to load active tasks:", activeErr);
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
                {worker.zip && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">
                      ZIP {worker.zip}
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

      {/* Reliability Score */}
      <div className="card border border-gray-200 p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-gray-400">
          <Gauge className="h-4 w-4" />
          Reliability Score
        </h2>
        {(() => {
          const score = worker.reliability_score ?? null;
          if (score == null) {
            return (
              <p className="text-sm text-gray-400">No reliability data yet</p>
            );
          }
          const color =
            score > 80
              ? "bg-emerald-500"
              : score >= 50
                ? "bg-amber-500"
                : "bg-red-500";
          const textColor =
            score > 80
              ? "text-emerald-700"
              : score >= 50
                ? "text-amber-700"
                : "text-red-700";
          const label =
            score > 80
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
                  {score}
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
              Strike History
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
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        {formatDate(strike.date)}
                      </p>
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
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-gray-400">
          <ListChecks className="h-4 w-4" />
          Active Tasks ({activeTasks.length}
          {worker.max_concurrent_tasks &&
            ` / ${worker.max_concurrent_tasks} max`}
          )
        </h2>
        {activeTasks.length === 0 ? (
          <p className="text-sm text-gray-400">No active tasks</p>
        ) : (
          <div className="space-y-2">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3"
              >
                <div>
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {task.service_type?.replace(/_/g, " ") || "N/A"}
                  </span>
                  <p className="mt-1 text-sm text-gray-700 line-clamp-1">
                    {task.requirements}
                  </p>
                  {task.project_context?.state && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      {task.project_context.state}
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-gray-500">
                  {task.deadline && <p>Due {formatDate(task.deadline)}</p>}
                  {task.winning_bid?.price && (
                    <p className="font-medium text-gray-700">
                      ${task.winning_bid.price.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
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
