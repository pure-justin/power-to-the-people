import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "../../services/firebase";
import {
  FolderKanban,
  MapPin,
  Sun,
  Clock,
  ChevronRight,
  ClipboardCheck,
  FileCheck,
  CalendarCheck,
  Wrench,
  Search as SearchIcon,
  Zap,
  CheckCircle2,
  AlertCircle,
  Filter,
  LayoutGrid,
  List,
  Pencil,
  Compass,
  HardHat,
  FileText,
  ShieldCheck,
  Activity,
} from "lucide-react";

const PIPELINE_STAGES = [
  {
    value: "lead",
    label: "Lead",
    color: "bg-gray-100 text-gray-600",
    dotColor: "bg-gray-400",
    icon: Compass,
  },
  {
    value: "qualified",
    label: "Qualified",
    color: "bg-emerald-100 text-emerald-700",
    dotColor: "bg-emerald-500",
    icon: ClipboardCheck,
  },
  {
    value: "proposal",
    label: "Proposal",
    color: "bg-teal-100 text-teal-700",
    dotColor: "bg-teal-500",
    icon: FileText,
  },
  {
    value: "sold",
    label: "Sold",
    color: "bg-green-100 text-green-700",
    dotColor: "bg-green-500",
    icon: CheckCircle2,
  },
  {
    value: "survey",
    label: "Survey",
    color: "bg-blue-100 text-blue-700",
    dotColor: "bg-blue-500",
    icon: SearchIcon,
  },
  {
    value: "design",
    label: "Design",
    color: "bg-sky-100 text-sky-700",
    dotColor: "bg-sky-500",
    icon: Pencil,
  },
  {
    value: "engineering",
    label: "Engineering",
    color: "bg-indigo-100 text-indigo-700",
    dotColor: "bg-indigo-500",
    icon: HardHat,
  },
  {
    value: "permit_submitted",
    label: "Permit Sent",
    color: "bg-violet-100 text-violet-700",
    dotColor: "bg-violet-500",
    icon: FileCheck,
  },
  {
    value: "permit_approved",
    label: "Permit OK",
    color: "bg-purple-100 text-purple-700",
    dotColor: "bg-purple-500",
    icon: ShieldCheck,
  },
  {
    value: "scheduled",
    label: "Scheduled",
    color: "bg-amber-100 text-amber-700",
    dotColor: "bg-amber-500",
    icon: CalendarCheck,
  },
  {
    value: "installing",
    label: "Installing",
    color: "bg-orange-100 text-orange-700",
    dotColor: "bg-orange-500",
    icon: Wrench,
  },
  {
    value: "inspection",
    label: "Inspection",
    color: "bg-cyan-100 text-cyan-700",
    dotColor: "bg-cyan-500",
    icon: SearchIcon,
  },
  {
    value: "pto_submitted",
    label: "PTO Sent",
    color: "bg-fuchsia-100 text-fuchsia-700",
    dotColor: "bg-fuchsia-500",
    icon: Zap,
  },
  {
    value: "pto_approved",
    label: "PTO OK",
    color: "bg-pink-100 text-pink-700",
    dotColor: "bg-pink-500",
    icon: Zap,
  },
  {
    value: "activated",
    label: "Activated",
    color: "bg-lime-100 text-lime-700",
    dotColor: "bg-lime-600",
    icon: Activity,
  },
  {
    value: "monitoring",
    label: "Monitoring",
    color: "bg-green-100 text-green-700",
    dotColor: "bg-green-600",
    icon: CheckCircle2,
  },
];

// Also support legacy status values by mapping them
const LEGACY_MAP = {
  designed: "design",
  permitted: "permit_approved",
  inspecting: "inspection",
  pto: "pto_submitted",
  active: "activated",
};

function normalizeStatus(status) {
  if (!status) return "lead";
  return LEGACY_MAP[status] || status;
}

function daysInStage(project) {
  const updated = project.updatedAt?.toDate
    ? project.updatedAt.toDate()
    : project.updatedAt
      ? new Date(project.updatedAt)
      : null;
  if (!updated) return null;
  return Math.floor((Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24));
}

function ProjectCard({ project, onClick }) {
  const status = normalizeStatus(project.status);
  const stage = PIPELINE_STAGES.find((s) => s.value === status);
  const stageColor = stage?.color || "bg-gray-100 text-gray-700";
  const stageLabel = stage?.label || project.status || "Unknown";
  const days = daysInStage(project);

  return (
    <div
      onClick={() => onClick(project.id)}
      className="rounded-xl border border-gray-200 bg-white p-3 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 truncate flex-1">
          {project.customerName || project.name || "Untitled"}
        </h3>
        <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
      </div>
      {project.address && (
        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 truncate">
          <MapPin className="h-3 w-3 shrink-0" />
          {project.address}
        </p>
      )}
      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
        {project.systemSize && (
          <span className="flex items-center gap-1">
            <Sun className="h-3 w-3" />
            {project.systemSize} kW
          </span>
        )}
        {days !== null && (
          <span
            className={`flex items-center gap-1 ${days > 14 ? "text-red-500" : ""}`}
          >
            <Clock className="h-3 w-3" />
            {days}d
          </span>
        )}
      </div>
      <div className="mt-2">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${stageColor}`}
        >
          {stageLabel}
        </span>
      </div>
    </div>
  );
}

export default function DashboardProjects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("pipeline"); // "pipeline" or "list"
  const [filterStage, setFilterStage] = useState("all");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const q = query(
          collection(db, "projects"),
          where("assignedTo", "==", user.uid),
          limit(500),
        );
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProjects(data);
      } catch (err) {
        console.error("Failed to load projects:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const normalizedProjects = useMemo(
    () => projects.map((p) => ({ ...p, _status: normalizeStatus(p.status) })),
    [projects],
  );

  const filtered = useMemo(
    () =>
      filterStage === "all"
        ? normalizedProjects
        : normalizedProjects.filter((p) => p._status === filterStage),
    [normalizedProjects, filterStage],
  );

  const grouped = useMemo(() => {
    const g = {};
    for (const stage of PIPELINE_STAGES) {
      g[stage.value] = filtered.filter((p) => p._status === stage.value);
    }
    return g;
  }, [filtered]);

  const stagesWithProjects = PIPELINE_STAGES.filter(
    (s) => grouped[s.value]?.length > 0,
  );

  const handleClick = (projectId) => {
    navigate(`/dashboard/projects/${projectId}`);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded-lg bg-gray-100" />
        <div className="h-16 rounded-xl bg-gray-100" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setView("pipeline")}
              className={`rounded-md p-1.5 ${view === "pipeline" ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`rounded-md p-1.5 ${view === "list" ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            <FolderKanban className="h-4 w-4" />
            {projects.length} total
          </span>
        </div>
      </div>

      {/* Pipeline progress bar */}
      <div className="card-padded overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {PIPELINE_STAGES.map((stage, i) => {
            const count = grouped[stage.value]?.length || 0;
            const isActive = filterStage === stage.value;
            return (
              <button
                key={stage.value}
                onClick={() => setFilterStage(isActive ? "all" : stage.value)}
                className={`flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 transition-colors min-w-[64px] ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : count > 0
                      ? "hover:bg-gray-100"
                      : "opacity-50 hover:opacity-75"
                }`}
              >
                <span
                  className={`text-lg font-bold ${isActive ? "text-white" : "text-gray-900"}`}
                >
                  {count}
                </span>
                <span
                  className={`text-[10px] leading-tight ${isActive ? "text-gray-300" : "text-gray-500"}`}
                >
                  {stage.label}
                </span>
                {i < PIPELINE_STAGES.length - 1 && <div className="hidden" />}
              </button>
            );
          })}
        </div>
        {filterStage !== "all" && (
          <div className="mt-2 flex items-center gap-2">
            <Filter className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-500">
              Filtering:{" "}
              {PIPELINE_STAGES.find((s) => s.value === filterStage)?.label}
            </span>
            <button
              onClick={() => setFilterStage("all")}
              className="text-xs text-emerald-600 hover:text-emerald-700"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="card-padded text-center py-12">
          <FolderKanban className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            {projects.length === 0
              ? "No projects assigned to you yet."
              : "No projects match this filter."}
          </p>
        </div>
      ) : view === "pipeline" ? (
        /* Pipeline / Kanban view */
        <div className="space-y-6">
          {stagesWithProjects.map((stage) => {
            const stageProjects = grouped[stage.value];
            const StageIcon = stage.icon;
            return (
              <div key={stage.value}>
                <div className="mb-3 flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${stage.dotColor}`} />
                  <StageIcon className="h-4 w-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-700">
                    {stage.label}
                  </h2>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {stageProjects.length}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {stageProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onClick={handleClick}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="card-padded divide-y divide-gray-100">
          {filtered.map((project) => {
            const stage = PIPELINE_STAGES.find(
              (s) => s.value === project._status,
            );
            const days = daysInStage(project);
            return (
              <div
                key={project.id}
                onClick={() => handleClick(project.id)}
                className="flex items-center gap-4 py-3 cursor-pointer hover:bg-gray-50 -mx-4 px-4 first:rounded-t-xl last:rounded-b-xl transition-colors"
              >
                <div
                  className={`h-2.5 w-2.5 rounded-full shrink-0 ${stage?.dotColor || "bg-gray-400"}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {project.customerName || project.name || "Untitled"}
                  </p>
                  {project.address && (
                    <p className="text-xs text-gray-500 truncate">
                      {project.address}
                    </p>
                  )}
                </div>
                {project.systemSize && (
                  <span className="text-xs text-gray-500 hidden sm:block">
                    {project.systemSize} kW
                  </span>
                )}
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${stage?.color || "bg-gray-100 text-gray-700"}`}
                >
                  {stage?.label || project.status}
                </span>
                {days !== null && (
                  <span
                    className={`text-xs tabular-nums ${days > 14 ? "text-red-500 font-medium" : "text-gray-400"}`}
                  >
                    {days}d
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
