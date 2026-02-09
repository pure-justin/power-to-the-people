import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "../../services/firebase";
import {
  CheckCircle2,
  Circle,
  ArrowLeft,
  Sun,
  FileText,
  Calendar,
  MapPin,
  Wrench,
  ClipboardCheck,
  Plug,
  Zap,
  Shield,
  Ruler,
} from "lucide-react";

const MILESTONES = [
  {
    key: "qualified",
    label: "Qualified",
    icon: CheckCircle2,
    description: "Your home qualifies for solar",
  },
  {
    key: "designed",
    label: "System Designed",
    icon: Ruler,
    description: "Custom system design completed",
  },
  {
    key: "permitted",
    label: "Permitted",
    icon: FileText,
    description: "Building permits approved",
  },
  {
    key: "scheduled",
    label: "Scheduled",
    icon: Calendar,
    description: "Installation date confirmed",
  },
  {
    key: "installing",
    label: "Installing",
    icon: Wrench,
    description: "Solar panels being installed",
  },
  {
    key: "inspecting",
    label: "Inspection",
    icon: ClipboardCheck,
    description: "City and utility inspection",
  },
  {
    key: "pto",
    label: "Permission to Operate",
    icon: Plug,
    description: "Utility grants permission to operate",
  },
  {
    key: "active",
    label: "Active",
    icon: Zap,
    description: "System is generating power",
  },
];

export default function PortalProject() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // If no project ID in URL, find the user's project
  useEffect(() => {
    if (!id && user) {
      const fetchUserProject = async () => {
        try {
          const q = query(
            collection(db, "projects"),
            where("userId", "==", user.uid),
            limit(1),
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            navigate(`/portal/project/${snap.docs[0].id}`, { replace: true });
          } else {
            setLoading(false);
            setProject(null);
          }
        } catch (err) {
          console.error("Failed to find user project:", err);
          setLoading(false);
          setProject(null);
        }
      };
      fetchUserProject();
    }
  }, [id, user, navigate]);

  useEffect(() => {
    if (!id) return;
    const loadProject = async () => {
      try {
        const docRef = doc(db, "projects", id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setProject({ id: snap.id, ...snap.data() });
        } else {
          setError("Project not found");
        }
      } catch (err) {
        console.error("Failed to load project:", err);
        setError("Failed to load project details");
      } finally {
        setLoading(false);
      }
    };
    loadProject();
  }, [id]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-6 w-32 rounded bg-gray-200" />
        <div className="h-48 rounded-xl bg-gray-100" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-gray-200" />
                <div className="h-3 w-64 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <Shield className="mx-auto h-10 w-10 text-red-400" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900">{error}</h2>
        <Link
          to="/portal"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Portal
        </Link>
      </div>
    );
  }

  if (!loading && !project) {
    return (
      <div className="text-center py-16">
        <Sun className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          No Project Yet
        </h2>
        <p className="text-gray-500 mb-6">
          Start your solar journey to see your project details here.
        </p>
        <Link
          to="/get-started"
          className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          Get Started
        </Link>
      </div>
    );
  }

  const currentIdx = MILESTONES.findIndex((m) => m.key === project?.status);

  return (
    <div className="space-y-6">
      <Link
        to="/portal"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Portal
      </Link>

      {/* Project Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
            <Sun className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              {project?.address || "Solar Installation"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              {project?.systemSize && (
                <span className="flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  {project.systemSize} kW System
                </span>
              )}
              {project?.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {project.address}
                </span>
              )}
              {project?.installer && (
                <span className="flex items-center gap-1">
                  <Wrench className="h-4 w-4" />
                  {project.installer}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-6 text-lg font-semibold text-gray-900">
          Project Timeline
        </h2>
        <div className="relative">
          {MILESTONES.map((milestone, idx) => {
            const isComplete = currentIdx >= idx;
            const isCurrent = currentIdx === idx;
            const completedDate = project?.milestones?.[milestone.key];
            const MilestoneIcon = milestone.icon;

            return (
              <div
                key={milestone.key}
                className="relative flex gap-4 pb-8 last:pb-0"
              >
                {/* Vertical line */}
                {idx < MILESTONES.length - 1 && (
                  <div
                    className={`absolute left-5 top-10 h-full w-0.5 ${
                      isComplete && idx < currentIdx
                        ? "bg-emerald-400"
                        : "bg-gray-200"
                    }`}
                  />
                )}

                {/* Icon */}
                <div
                  className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                    isCurrent
                      ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                      : isComplete
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isComplete && !isCurrent ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <MilestoneIcon className="h-5 w-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-3">
                    <p
                      className={`font-medium ${
                        isCurrent
                          ? "text-emerald-700"
                          : isComplete
                            ? "text-gray-900"
                            : "text-gray-400"
                      }`}
                    >
                      {milestone.label}
                    </p>
                    {isCurrent && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {milestone.description}
                  </p>
                  {completedDate && (
                    <p className="mt-1 text-xs text-gray-400">
                      Completed:{" "}
                      {typeof completedDate === "string"
                        ? completedDate
                        : completedDate?.toDate
                          ? completedDate.toDate().toLocaleDateString()
                          : ""}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Documents Placeholder */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
        </div>
        <div className="px-6 py-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">
            Project documents will appear here once available.
          </p>
        </div>
      </div>
    </div>
  );
}
