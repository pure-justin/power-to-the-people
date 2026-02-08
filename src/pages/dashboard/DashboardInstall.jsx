/**
 * DashboardInstall -- Mobile-optimized install checklist
 *
 * Phase-by-phase progress with photo upload, AI analysis status,
 * and sign-off workflow. Designed for field use on mobile devices.
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import {
  uploadInstallPhoto,
  getPhotosByProject,
  getInstallProgress,
  signOffPhase,
  requestPhotoReview,
  INSTALL_PHASES,
  PHASE_LABELS,
  PHASE_CHECKS,
} from "../../services/photoService";
import {
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Upload,
  Shield,
  Eye,
  MapPin,
  Image,
  RefreshCw,
  ClipboardCheck,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PHASE_STATUS_COLORS = {
  not_started: "bg-gray-100 text-gray-500",
  in_progress: "bg-amber-100 text-amber-700",
  passed: "bg-emerald-100 text-emerald-700",
  needs_rework: "bg-red-100 text-red-700",
  rework_complete: "bg-blue-100 text-blue-700",
};

const PHASE_STATUS_LABELS = {
  not_started: "Not Started",
  in_progress: "In Progress",
  passed: "Passed",
  needs_rework: "Needs Rework",
  rework_complete: "Rework Complete",
};

const ANALYSIS_ICONS = {
  pass: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  flag: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  fail: <XCircle className="h-4 w-4 text-red-500" />,
  analyzing: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
};

// ─── Photo Upload Button ──────────────────────────────────────────────────────

function PhotoUploadButton({ projectId, scheduleId, phase, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      // Get GPS if available
      let gps = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
            }),
          );
          gps = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch {
          // GPS not available — proceed without it
        }
      }

      // Convert to data URL for upload (in production, use Firebase Storage)
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });

      await uploadInstallPhoto(projectId, scheduleId, phase, {
        url: dataUrl,
        gps,
      });

      onUploaded();
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label
        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white ${
          uploading ? "bg-gray-400" : "bg-emerald-600 hover:bg-emerald-700"
        }`}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
        {uploading ? "Uploading..." : "Take Photo"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCapture}
          disabled={uploading}
          className="hidden"
        />
      </label>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── Photo Card ───────────────────────────────────────────────────────────────

function PhotoCard({ photo, projectId, onReviewRequested }) {
  const [requesting, setRequesting] = useState(false);
  const analysis = photo.ai_analysis || {};

  const handleRequestReview = async () => {
    setRequesting(true);
    try {
      await requestPhotoReview(projectId, photo.id);
      onReviewRequested();
    } catch (err) {
      console.error("Review request failed:", err);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3">
      {/* Photo thumbnail */}
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {photo.url ? (
          <img
            src={photo.url}
            alt="Install photo"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Image className="h-6 w-6 text-gray-300" />
          </div>
        )}
      </div>

      {/* Analysis details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {ANALYSIS_ICONS[analysis.status] || ANALYSIS_ICONS.analyzing}
          <span className="text-sm font-medium text-gray-900">
            {analysis.status === "analyzing"
              ? "Analyzing..."
              : analysis.status === "pass"
                ? "Passed"
                : analysis.status === "flag"
                  ? "Flagged"
                  : analysis.status === "fail"
                    ? "Failed"
                    : "Pending"}
          </span>
          {analysis.overall_score != null && (
            <span className="text-xs text-gray-400">
              Score: {analysis.overall_score}%
            </span>
          )}
        </div>

        {/* Check results */}
        {analysis.checks?.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {analysis.checks.map((check, i) => (
              <span
                key={i}
                className={`rounded px-1.5 py-0.5 text-[10px] ${
                  check.result === "pass"
                    ? "bg-emerald-50 text-emerald-700"
                    : check.result === "warning"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-700"
                }`}
              >
                {check.check_type?.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}

        {/* Blocking issues */}
        {analysis.blocking_issues?.length > 0 && (
          <div className="mt-1">
            {analysis.blocking_issues.map((issue, i) => (
              <p key={i} className="text-xs text-red-600">
                {issue}
              </p>
            ))}
          </div>
        )}

        {/* GPS tag */}
        {photo.gps && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
            <MapPin className="h-2.5 w-2.5" />
            {photo.gps.lat.toFixed(4)}, {photo.gps.lng.toFixed(4)}
          </div>
        )}
      </div>

      {/* Request review button for flagged/failed photos */}
      {(analysis.status === "flag" || analysis.status === "fail") && (
        <button
          onClick={handleRequestReview}
          disabled={requesting}
          className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="Request human review"
        >
          {requesting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
}

// ─── Phase Accordion ──────────────────────────────────────────────────────────

function PhaseSection({
  phase,
  phaseData,
  progressData,
  projectId,
  scheduleId,
  onDataChanged,
}) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [signingOff, setSigningOff] = useState(false);

  const status = progressData?.status || "not_started";
  const photos = phaseData?.photos || [];
  const checks = PHASE_CHECKS[phase] || [];
  const signOff = phaseData?.sign_off || {};

  const handleSignOff = async () => {
    setSigningOff(true);
    try {
      await signOffPhase(projectId, phase, user?.uid, "installer");
      onDataChanged();
    } catch (err) {
      console.error("Sign off failed:", err);
    } finally {
      setSigningOff(false);
    }
  };

  const passCount = photos.filter(
    (p) => p.ai_analysis?.status === "pass",
  ).length;
  const failCount = photos.filter(
    (p) => p.ai_analysis?.status === "fail",
  ).length;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Phase header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PHASE_STATUS_COLORS[status]}`}
          >
            {PHASE_STATUS_LABELS[status]}
          </span>
          <span className="text-sm font-medium text-gray-900">
            {PHASE_LABELS[phase]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {photos.length > 0 && (
            <span className="text-xs text-gray-400">
              {passCount}/{photos.length} pass
              {failCount > 0 && (
                <span className="ml-1 text-red-500">({failCount} fail)</span>
              )}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 p-4">
          {/* Required checks list */}
          <div className="mb-4">
            <h4 className="mb-2 text-xs font-semibold uppercase text-gray-400">
              Required Checks
            </h4>
            <div className="flex flex-wrap gap-1">
              {checks.map((check) => (
                <span
                  key={check}
                  className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                >
                  {check.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>

          {/* Photos list */}
          <div className="mb-4">
            <h4 className="mb-2 text-xs font-semibold uppercase text-gray-400">
              Photos ({photos.length})
            </h4>
            {photos.length === 0 ? (
              <p className="text-sm text-gray-400">
                No photos uploaded yet for this phase
              </p>
            ) : (
              <div className="space-y-2">
                {photos.map((photo) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    projectId={projectId}
                    onReviewRequested={onDataChanged}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Upload + Sign Off buttons */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <PhotoUploadButton
              projectId={projectId}
              scheduleId={scheduleId}
              phase={phase}
              onUploaded={onDataChanged}
            />

            {status !== "passed" && photos.length > 0 && failCount === 0 && (
              <button
                onClick={handleSignOff}
                disabled={signingOff}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {signingOff ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                Sign Off Phase
              </button>
            )}

            {status === "passed" && (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Phase Complete
              </span>
            )}
          </div>

          {/* Sign-off status */}
          {(signOff.installer_signed ||
            signOff.reviewer_signed ||
            signOff.customer_signed) && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
              <span
                className={`rounded px-2 py-0.5 text-xs ${signOff.installer_signed ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-400"}`}
              >
                Installer {signOff.installer_signed ? "Signed" : "Pending"}
              </span>
              <span
                className={`rounded px-2 py-0.5 text-xs ${signOff.reviewer_signed ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-400"}`}
              >
                Reviewer {signOff.reviewer_signed ? "Signed" : "Pending"}
              </span>
              <span
                className={`rounded px-2 py-0.5 text-xs ${signOff.customer_signed ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-400"}`}
              >
                Customer {signOff.customer_signed ? "Signed" : "Pending"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardInstall() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId") || "";
  const scheduleId = searchParams.get("scheduleId") || "";

  const [photos, setPhotos] = useState({});
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [photoResult, progressResult] = await Promise.all([
        getPhotosByProject(projectId),
        getInstallProgress(projectId),
      ]);
      setPhotos(photoResult.phases || {});
      setProgress(progressResult.progress || null);
    } catch (err) {
      setError(err.message || "Failed to load install data");
      console.error("Load install data error:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!projectId) {
    return (
      <div className="py-12 text-center">
        <ClipboardCheck className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">
          Select a project to view install progress
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Install Checklist
          </h1>
          <p className="text-sm text-gray-500">
            Project: {projectId.slice(0, 12)}...
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Overall progress bar */}
      {progress && (
        <div className="card border border-gray-200 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Overall Progress
            </span>
            <span className="text-sm font-bold text-emerald-600">
              {progress.percentComplete}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progress.percentComplete}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>
              {progress.completedPhases}/{progress.totalPhases} phases complete
            </span>
            {progress.overallScore > 0 && (
              <span>QC Score: {progress.overallScore}%</span>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Phase accordion list */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {INSTALL_PHASES.map((phase) => (
            <PhaseSection
              key={phase}
              phase={phase}
              phaseData={photos[phase]}
              progressData={progress?.phases?.[phase]}
              projectId={projectId}
              scheduleId={scheduleId}
              onDataChanged={loadData}
            />
          ))}
        </div>
      )}
    </div>
  );
}
