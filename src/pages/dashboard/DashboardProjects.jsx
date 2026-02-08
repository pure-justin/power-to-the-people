import { useState, useEffect } from "react";
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
  FolderKanban,
  MapPin,
  Sun,
  Clock,
  ChevronRight,
  Hammer,
  ClipboardCheck,
  FileCheck,
  CalendarCheck,
  Wrench,
  Search as SearchIcon,
  Zap,
  CheckCircle2,
} from "lucide-react";

const PROJECT_STAGES = [
  {
    value: "qualified",
    label: "Qualified",
    color: "bg-emerald-100 text-emerald-700",
    icon: ClipboardCheck,
  },
  {
    value: "designed",
    label: "Designed",
    color: "bg-blue-100 text-blue-700",
    icon: FileCheck,
  },
  {
    value: "permitted",
    label: "Permitted",
    color: "bg-indigo-100 text-indigo-700",
    icon: FileCheck,
  },
  {
    value: "scheduled",
    label: "Scheduled",
    color: "bg-amber-100 text-amber-700",
    icon: CalendarCheck,
  },
  {
    value: "installing",
    label: "Installing",
    color: "bg-orange-100 text-orange-700",
    icon: Wrench,
  },
  {
    value: "inspecting",
    label: "Inspecting",
    color: "bg-cyan-100 text-cyan-700",
    icon: SearchIcon,
  },
  {
    value: "pto",
    label: "PTO",
    color: "bg-purple-100 text-purple-700",
    icon: Zap,
  },
  {
    value: "active",
    label: "Active",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
];

function ProjectCard({ project }) {
  const stage = PROJECT_STAGES.find((s) => s.value === project.status);
  const stageColor = stage?.color || "bg-gray-100 text-gray-700";
  const stageLabel = stage?.label || project.status || "Unknown";

  const updatedAt = project.updatedAt?.toDate
    ? project.updatedAt.toDate().toLocaleDateString()
    : project.updatedAt
      ? new Date(project.updatedAt).toLocaleDateString()
      : null;

  return (
    <div className="card-padded hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {project.customerName || project.name || "Untitled Project"}
          </h3>
          {project.address && (
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {project.address}
            </p>
          )}
        </div>
        <span
          className={`ml-2 shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${stageColor}`}
        >
          {stageLabel}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        {project.systemSize && (
          <span className="flex items-center gap-1">
            <Sun className="h-3 w-3" />
            {project.systemSize} kW
          </span>
        )}
        {updatedAt && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {updatedAt}
          </span>
        )}
      </div>
    </div>
  );
}

export default function DashboardProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded-lg bg-gray-100" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-5 w-32 rounded bg-gray-100" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2].map((j) => (
                <div key={j} className="h-28 rounded-xl bg-gray-100" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Group projects by status
  const grouped = {};
  for (const stage of PROJECT_STAGES) {
    const stageProjects = projects.filter((p) => p.status === stage.value);
    if (stageProjects.length > 0) {
      grouped[stage.value] = stageProjects;
    }
  }

  // Projects with unknown/missing status
  const knownStatuses = PROJECT_STAGES.map((s) => s.value);
  const otherProjects = projects.filter(
    (p) => !knownStatuses.includes(p.status),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <FolderKanban className="h-4 w-4" />
          {projects.length} total
        </div>
      </div>

      {/* Pipeline summary */}
      <div className="card-padded">
        <div className="flex flex-wrap gap-3">
          {PROJECT_STAGES.map((stage) => {
            const count = (grouped[stage.value] || []).length;
            return (
              <div
                key={stage.value}
                className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2"
              >
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${stage.color}`}
                >
                  {count}
                </span>
                <span className="text-xs text-gray-600">{stage.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grouped project cards */}
      {Object.keys(grouped).length === 0 && otherProjects.length === 0 ? (
        <div className="card-padded text-center">
          <FolderKanban className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            No projects assigned to you yet.
          </p>
        </div>
      ) : (
        <>
          {PROJECT_STAGES.map((stage) => {
            const stageProjects = grouped[stage.value];
            if (!stageProjects) return null;
            const StageIcon = stage.icon;
            return (
              <div key={stage.value}>
                <div className="mb-3 flex items-center gap-2">
                  <StageIcon className="h-4 w-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-700">
                    {stage.label}
                  </h2>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {stageProjects.length}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {stageProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              </div>
            );
          })}

          {otherProjects.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700">Other</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {otherProjects.length}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {otherProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
