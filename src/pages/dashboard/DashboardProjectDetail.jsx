import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from "../../services/firebase";
import {
  ArrowLeft,
  MapPin,
  Sun,
  Clock,
  User,
  CheckCircle2,
  Circle,
  FileText,
  Package,
  ShieldCheck,
  ClipboardList,
  Calendar,
  ChevronRight,
  AlertCircle,
  Loader2,
} from "lucide-react";

const PIPELINE_STAGES = [
  { value: "lead", label: "Lead", phase: "Acquisition" },
  { value: "qualified", label: "Qualified", phase: "Acquisition" },
  { value: "proposal", label: "Proposal", phase: "Sales" },
  { value: "sold", label: "Sold", phase: "Sales" },
  { value: "survey", label: "Survey", phase: "Pre-Construction" },
  { value: "design", label: "Design", phase: "Pre-Construction" },
  { value: "engineering", label: "Engineering", phase: "Pre-Construction" },
  {
    value: "permit_submitted",
    label: "Permit Submitted",
    phase: "Pre-Construction",
  },
  {
    value: "permit_approved",
    label: "Permit Approved",
    phase: "Pre-Construction",
  },
  { value: "scheduled", label: "Scheduled", phase: "Construction" },
  { value: "installing", label: "Installing", phase: "Construction" },
  { value: "inspection", label: "Inspection", phase: "Construction" },
  { value: "pto_submitted", label: "PTO Submitted", phase: "Activation" },
  { value: "pto_approved", label: "PTO Approved", phase: "Activation" },
  { value: "activated", label: "Activated", phase: "Activation" },
  { value: "monitoring", label: "Monitoring", phase: "Activation" },
];

const TASK_TYPE_LABELS = {
  site_survey: "Site Survey",
  cad_design: "CAD Design",
  engineering_stamp: "Engineering Stamp",
  permit_submission: "Permit Submission",
  hoa_approval: "HOA Approval",
  equipment_order: "Equipment Order",
  installation: "Installation",
  inspection: "Inspection",
  pto_submission: "PTO Submission",
};

const TASK_STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-700",
  assigned: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function formatDate(val) {
  if (!val) return null;
  const d = val.toDate ? val.toDate() : new Date(val);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card-padded">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function DashboardProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !projectId) return;

    const load = async () => {
      try {
        // Load project
        const projectSnap = await getDoc(doc(db, "projects", projectId));
        if (!projectSnap.exists()) {
          setError("Project not found");
          setLoading(false);
          return;
        }
        setProject({ id: projectSnap.id, ...projectSnap.data() });

        // Load tasks subcollection
        const tasksSnap = await getDocs(
          collection(db, "projects", projectId, "tasks"),
        );
        const taskData = tasksSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setTasks(taskData);
      } catch (err) {
        console.error("Failed to load project:", err);
        setError("Failed to load project");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/dashboard/projects")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </button>
        <div className="card-padded text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-300" />
          <p className="mt-3 text-sm text-gray-500">
            {error || "Project not found"}
          </p>
        </div>
      </div>
    );
  }

  const currentStatus = project.status || "lead";
  const currentStageIndex = PIPELINE_STAGES.findIndex(
    (s) => s.value === currentStatus,
  );
  const timeline = project.pipeline?.timeline || [];

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <button
        onClick={() => navigate("/dashboard/projects")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </button>

      {/* Header */}
      <div className="card-padded">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {project.customerName || project.name || "Untitled Project"}
            </h1>
            {project.address && (
              <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="h-4 w-4" />
                {project.address}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {project.systemSize && (
              <span className="flex items-center gap-1">
                <Sun className="h-4 w-4" />
                {project.systemSize} kW
              </span>
            )}
            {project.createdAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(project.createdAt)}
              </span>
            )}
          </div>
        </div>

        {/* Pipeline progress */}
        <div className="mt-6 overflow-x-auto">
          <div className="flex items-center gap-0.5 min-w-max">
            {PIPELINE_STAGES.map((stage, i) => {
              const isPast = i < currentStageIndex;
              const isCurrent = i === currentStageIndex;
              return (
                <div key={stage.value} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                        isCurrent
                          ? "bg-emerald-500 text-white"
                          : isPast
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {isPast ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span>{i + 1}</span>
                      )}
                    </div>
                    <span
                      className={`mt-1 text-[9px] leading-tight max-w-[56px] text-center ${
                        isCurrent
                          ? "font-semibold text-emerald-700"
                          : isPast
                            ? "text-emerald-600"
                            : "text-gray-400"
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div
                      className={`mx-0.5 h-0.5 w-4 ${
                        isPast ? "bg-emerald-300" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Timeline */}
        <Section title="Timeline" icon={Clock}>
          {timeline.length === 0 ? (
            <p className="text-sm text-gray-400">No timeline entries yet.</p>
          ) : (
            <div className="relative space-y-0">
              {timeline
                .slice()
                .reverse()
                .map((entry, i) => (
                  <div key={i} className="flex gap-3 pb-4 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-3 w-3 rounded-full ${i === 0 ? "bg-emerald-500" : "bg-gray-300"}`}
                      />
                      {i < timeline.length - 1 && (
                        <div className="h-full w-px bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 -mt-0.5">
                      <p className="text-sm font-medium text-gray-900">
                        {entry.from}{" "}
                        <ChevronRight className="inline h-3 w-3 text-gray-400" />{" "}
                        {entry.to}
                      </p>
                      {entry.notes && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {entry.notes}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-gray-400">
                        {formatDate(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Section>

        {/* Tasks */}
        <Section title="Tasks" icon={ClipboardList}>
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-400">No tasks created yet.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 p-3"
                >
                  {task.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-300 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {TASK_TYPE_LABELS[task.type] || task.type}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {task.description}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TASK_STATUS_STYLES[task.status] || "bg-gray-100 text-gray-600"}`}
                  >
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Equipment */}
        <Section title="Equipment" icon={Package}>
          {project.equipment ? (
            <div className="space-y-2">
              {project.equipment.panels && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Panels</span>
                  <span className="font-medium text-gray-900">
                    {project.equipment.panels}
                  </span>
                </div>
              )}
              {project.equipment.inverter && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Inverter</span>
                  <span className="font-medium text-gray-900">
                    {project.equipment.inverter}
                  </span>
                </div>
              )}
              {project.equipment.battery && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Battery</span>
                  <span className="font-medium text-gray-900">
                    {project.equipment.battery}
                  </span>
                </div>
              )}
              {project.equipment.mounting && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Mounting</span>
                  <span className="font-medium text-gray-900">
                    {project.equipment.mounting}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No equipment selected yet.</p>
          )}
        </Section>

        {/* Documents */}
        <Section title="Documents" icon={FileText}>
          {project.documents && project.documents.length > 0 ? (
            <div className="space-y-2">
              {project.documents.map((docItem, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 p-3"
                >
                  <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {docItem.name || docItem.type || "Document"}
                    </p>
                    {docItem.uploadedAt && (
                      <p className="text-xs text-gray-400">
                        {formatDate(docItem.uploadedAt)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No documents uploaded yet.</p>
          )}
        </Section>

        {/* Assignments */}
        <Section title="Assignments" icon={User}>
          {project.assignedTo || project.installer ? (
            <div className="space-y-2">
              {project.assignedTo && (
                <div className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                  <User className="h-4 w-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Assigned To</p>
                    <p className="text-sm font-medium text-gray-900">
                      {project.assignedToName || project.assignedTo}
                    </p>
                  </div>
                </div>
              )}
              {project.installer && (
                <div className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                  <User className="h-4 w-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Installer</p>
                    <p className="text-sm font-medium text-gray-900">
                      {project.installerName || project.installer}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No assignments yet.</p>
          )}
        </Section>

        {/* Compliance */}
        <Section title="Compliance" icon={ShieldCheck}>
          {project.compliance ? (
            <div className="space-y-2">
              <ComplianceRow
                label="FEOC Compliant"
                value={project.compliance.feoc_compliant}
              />
              <ComplianceRow
                label="Domestic Content"
                value={project.compliance.domestic_content_compliant}
              />
              <ComplianceRow
                label="Tariff Safe"
                value={project.compliance.tariff_safe}
              />
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              No compliance data available.
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}

function ComplianceRow({ label, value }) {
  const isTrue = value === true;
  const isFalse = value === false;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      {isTrue ? (
        <span className="flex items-center gap-1 text-green-600 font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Yes
        </span>
      ) : isFalse ? (
        <span className="flex items-center gap-1 text-red-500 font-medium">
          <AlertCircle className="h-4 w-4" />
          No
        </span>
      ) : (
        <span className="text-gray-400">Unknown</span>
      )}
    </div>
  );
}
