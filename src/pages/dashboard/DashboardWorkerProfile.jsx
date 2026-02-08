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

export default function DashboardWorkerProfile() {
  const { workerId } = useParams();
  const { user } = useAuth();
  const [worker, setWorker] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [completedListings, setCompletedListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editSkills, setEditSkills] = useState("");
  const [editCerts, setEditCerts] = useState("");
  const [editAreas, setEditAreas] = useState("");
  const [editInsurance, setEditInsurance] = useState("");

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

        {/* Service Areas & Insurance */}
        <div className="card border border-gray-200 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-gray-400">
            <MapPin className="h-4 w-4" />
            Service Areas
          </h2>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Service Areas (comma-separated states)
                </label>
                <input
                  value={editAreas}
                  onChange={(e) => setEditAreas(e.target.value)}
                  className="input-field"
                  placeholder="TX, CA, FL"
                />
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
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {(worker.service_areas || []).map((area) => (
                  <span
                    key={area}
                    className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                  >
                    {area}
                  </span>
                ))}
                {(!worker.service_areas ||
                  worker.service_areas.length === 0) && (
                  <span className="text-xs text-gray-400">None listed</span>
                )}
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
