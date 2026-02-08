/**
 * DashboardSurvey - Installer/Professional Site Survey Form
 *
 * Professional-grade survey form for installers and field techs. Unlike the
 * customer wizard (PortalSurvey), this is a single-page compact form since
 * installers know what data they need and prefer speed over guidance.
 *
 * Additional fields beyond customer survey:
 * - Multiple roof plane measurements (add/remove planes with pitch/azimuth)
 * - Exact TSRF measurement
 * - Bus bar rating and service voltage
 * - Attic access assessment
 * - Mounting surface condition assessment
 *
 * Data flows into the same site_surveys Firestore collection and AI review
 * pipeline as customer surveys.
 */

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  createSurvey,
  updateSurvey,
  submitSurvey,
  getSurvey,
  getSurveysByProject,
  addSurveyPhoto,
} from "../../services/surveyService";
import AddressAutocomplete from "../../components/AddressAutocomplete";
import {
  MapPin,
  Home,
  Zap,
  TreePine,
  Receipt,
  Send,
  Save,
  Plus,
  Trash2,
  Upload,
  Camera,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Ruler,
  Eye,
  Image,
} from "lucide-react";

/** Roof type options (same as customer survey for consistency) */
const ROOF_TYPES = [
  { value: "composite_shingle", label: "Composite Shingle" },
  { value: "tile", label: "Tile (Clay/Concrete)" },
  { value: "metal", label: "Metal Standing Seam" },
  { value: "metal_corrugated", label: "Metal Corrugated" },
  { value: "flat", label: "Flat/Low-slope (TPO/EPDM)" },
  { value: "slate", label: "Slate" },
  { value: "wood_shake", label: "Wood Shake" },
  { value: "other", label: "Other" },
];

/** Roof condition options */
const ROOF_CONDITIONS = ["excellent", "good", "fair", "poor"];

/** Photo type categories for the installer survey */
const PHOTO_CATEGORIES = [
  { type: "roof_overview", label: "Roof Overview", required: true },
  { type: "electrical_panel", label: "Electrical Panel", required: true },
  { type: "meter", label: "Meter", required: true },
  { type: "obstruction", label: "Obstructions/Shading", required: false },
  { type: "attic", label: "Attic Access", required: false },
  { type: "mounting_area", label: "Mounting Surface", required: false },
];

/**
 * Default values for a new roof plane measurement.
 * Installers measure each roof face separately for accurate design.
 */
const DEFAULT_PLANE = {
  area: "",
  pitch: "",
  azimuth: "",
  shading_factor: "1.0",
};

export default function DashboardSurvey() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Core state
  const [surveyId, setSurveyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [surveyStatus, setSurveyStatus] = useState("draft");

  // Collapsible sections — all start expanded for installer efficiency
  const [expanded, setExpanded] = useState({
    property: true,
    roof: true,
    electrical: true,
    shading: true,
    utility: true,
    photos: true,
  });

  // Property section
  const [property, setProperty] = useState({
    address: "",
    lat: null,
    lng: null,
    roof_type: "",
    roof_age_years: "",
    roof_condition: "",
    stories: "",
    square_footage: "",
    year_built: "",
  });

  // Roof measurements — includes multiple planes
  const [roofMeasurements, setRoofMeasurements] = useState({
    total_area_sqft: "",
    usable_area_sqft: "",
    pitch: "",
    azimuth: "",
    planes: [{ ...DEFAULT_PLANE, id: "plane_1" }],
  });

  // Electrical section — extended fields for installers
  const [electrical, setElectrical] = useState({
    panel_type: "",
    panel_amps: "",
    main_breaker_amps: "",
    available_spaces: "",
    bus_bar_rating: "",
    panel_location: "",
    meter_type: "",
    service_voltage: "",
  });

  // Shading section — structured for installers
  const [shading, setShading] = useState({
    obstructions: [
      {
        type: "",
        direction: "",
        distance_ft: "",
        height_ft: "",
        seasonal_impact: "",
      },
    ],
    tsrf: "",
    annual_shading_loss: "",
  });

  // Utility section
  const [utility, setUtility] = useState({
    provider: "",
    account_number: "",
    avg_monthly_kwh: "",
    annual_kwh: "",
    avg_monthly_bill: "",
    rate_schedule: "",
    net_metering_eligible: "",
  });

  // Installer-specific assessments
  const [assessment, setAssessment] = useState({
    attic_access: "",
    attic_access_notes: "",
    mounting_surface_condition: "",
    mounting_surface_notes: "",
  });

  // Photos organized by type
  const [photos, setPhotos] = useState({
    roof_overview: [],
    electrical_panel: [],
    meter: [],
    obstruction: [],
    attic: [],
    mounting_area: [],
  });

  // File input ref
  const fileInputRef = useRef(null);
  const [activePhotoType, setActivePhotoType] = useState(null);

  /**
   * Load existing survey data on mount.
   */
  useEffect(() => {
    const load = async () => {
      try {
        if (projectId) {
          const result = await getSurveysByProject(projectId);
          if (result.success && result.surveys?.length > 0) {
            const existing = result.surveys[0];
            setSurveyId(existing.id);
            setSurveyStatus(existing.status || "draft");
            populateFromSurvey(existing);
          }
        }
      } catch (err) {
        console.error("Error loading survey:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  /**
   * Populate all form sections from a Firestore survey document.
   */
  const populateFromSurvey = (survey) => {
    if (survey.property) {
      setProperty((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(survey.property).map(([k, v]) => [k, v ?? ""]),
        ),
      }));
    }
    if (survey.roof_measurements) {
      const rm = survey.roof_measurements;
      setRoofMeasurements((prev) => ({
        total_area_sqft: rm.total_area_sqft ?? "",
        usable_area_sqft: rm.usable_area_sqft ?? "",
        pitch: rm.pitch ?? "",
        azimuth: rm.azimuth ?? "",
        planes:
          rm.planes?.length > 0
            ? rm.planes.map((p, i) => ({
                ...DEFAULT_PLANE,
                ...p,
                id: p.id || `plane_${i + 1}`,
              }))
            : prev.planes,
      }));
    }
    if (survey.electrical) {
      setElectrical((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(survey.electrical).map(([k, v]) => [k, v ?? ""]),
        ),
      }));
    }
    if (survey.shading) {
      const sh = survey.shading;
      setShading({
        obstructions:
          sh.obstructions?.length > 0
            ? sh.obstructions.map((o, i) => ({
                type: o.type || "",
                direction: o.direction || "",
                distance_ft: o.distance_ft || "",
                height_ft: o.height_ft || "",
                seasonal_impact: o.seasonal_impact || "",
                id: `obs_${i}`,
              }))
            : [
                {
                  type: "",
                  direction: "",
                  distance_ft: "",
                  height_ft: "",
                  seasonal_impact: "",
                },
              ],
        tsrf: sh.tsrf ?? "",
        annual_shading_loss: sh.annual_shading_loss ?? "",
      });
    }
    if (survey.utility) {
      setUtility((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(survey.utility).map(([k, v]) => [k, v ?? ""]),
        ),
      }));
    }
    if (survey.photos?.length > 0) {
      const grouped = {
        roof_overview: [],
        electrical_panel: [],
        meter: [],
        obstruction: [],
        attic: [],
        mounting_area: [],
      };
      for (const p of survey.photos) {
        if (grouped[p.type]) grouped[p.type].push(p);
      }
      setPhotos(grouped);
    }
  };

  /**
   * Toggle section expand/collapse.
   */
  const toggleSection = (section) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  /**
   * Handle address selection from AddressAutocomplete.
   */
  const handleAddressSelect = (addressData) => {
    setProperty((prev) => ({
      ...prev,
      address: addressData.formattedAddress || addressData.address || "",
      lat: addressData.lat || null,
      lng: addressData.lng || null,
    }));
  };

  /**
   * Add a new roof plane measurement row.
   */
  const addPlane = () => {
    setRoofMeasurements((prev) => ({
      ...prev,
      planes: [
        ...prev.planes,
        { ...DEFAULT_PLANE, id: `plane_${prev.planes.length + 1}` },
      ],
    }));
  };

  /**
   * Remove a roof plane measurement row by index.
   */
  const removePlane = (index) => {
    setRoofMeasurements((prev) => ({
      ...prev,
      planes: prev.planes.filter((_, i) => i !== index),
    }));
  };

  /**
   * Update a field within a specific roof plane.
   */
  const updatePlane = (index, field, value) => {
    setRoofMeasurements((prev) => ({
      ...prev,
      planes: prev.planes.map((p, i) =>
        i === index ? { ...p, [field]: value } : p,
      ),
    }));
  };

  /**
   * Add a new shading obstruction row.
   */
  const addObstruction = () => {
    setShading((prev) => ({
      ...prev,
      obstructions: [
        ...prev.obstructions,
        {
          type: "",
          direction: "",
          distance_ft: "",
          height_ft: "",
          seasonal_impact: "",
        },
      ],
    }));
  };

  /**
   * Remove a shading obstruction row by index.
   */
  const removeObstruction = (index) => {
    setShading((prev) => ({
      ...prev,
      obstructions: prev.obstructions.filter((_, i) => i !== index),
    }));
  };

  /**
   * Update a field within a specific obstruction.
   */
  const updateObstruction = (index, field, value) => {
    setShading((prev) => ({
      ...prev,
      obstructions: prev.obstructions.map((o, i) =>
        i === index ? { ...o, [field]: value } : o,
      ),
    }));
  };

  /**
   * Save all survey sections to Firestore.
   */
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      let id = surveyId;

      if (!id) {
        if (!projectId) {
          setError("No project ID — navigate from a project.");
          setSaving(false);
          return;
        }
        const createResult = await createSurvey(projectId, user?.uid);
        if (!createResult.success) {
          setError(createResult.error || "Failed to create survey");
          setSaving(false);
          return;
        }
        id = createResult.surveyId;
        setSurveyId(id);
      }

      const sectionData = {};

      // Property
      const cleanProp = filterEmpty(property);
      if (Object.keys(cleanProp).length > 0) sectionData.property = cleanProp;

      // Roof measurements — include planes array
      const cleanRoof = filterEmpty({
        total_area_sqft: roofMeasurements.total_area_sqft,
        usable_area_sqft: roofMeasurements.usable_area_sqft,
        pitch: roofMeasurements.pitch,
        azimuth: roofMeasurements.azimuth,
      });
      // Clean and include non-empty planes
      const cleanPlanes = roofMeasurements.planes
        .map((p) =>
          filterEmpty({
            area: p.area,
            pitch: p.pitch,
            azimuth: p.azimuth,
            shading_factor: p.shading_factor,
            id: p.id,
          }),
        )
        .filter((p) => p.area || p.pitch || p.azimuth);
      if (cleanPlanes.length > 0) cleanRoof.planes = cleanPlanes;
      if (Object.keys(cleanRoof).length > 0)
        sectionData.roof_measurements = cleanRoof;

      // Electrical
      const cleanElec = filterEmpty(electrical);
      if (Object.keys(cleanElec).length > 0) sectionData.electrical = cleanElec;

      // Shading — structured obstructions
      const cleanShading = {};
      const cleanObs = shading.obstructions
        .map((o) => filterEmpty(o))
        .filter((o) => o.type || o.direction);
      if (cleanObs.length > 0) cleanShading.obstructions = cleanObs;
      if (shading.tsrf) cleanShading.tsrf = parseFloat(shading.tsrf);
      if (shading.annual_shading_loss)
        cleanShading.annual_shading_loss = parseFloat(
          shading.annual_shading_loss,
        );
      if (Object.keys(cleanShading).length > 0)
        sectionData.shading = cleanShading;

      // Utility
      const cleanUtil = filterEmpty(utility);
      // Handle boolean conversion for net_metering_eligible
      if (cleanUtil.net_metering_eligible !== undefined) {
        cleanUtil.net_metering_eligible =
          cleanUtil.net_metering_eligible === "yes" ||
          cleanUtil.net_metering_eligible === true;
      }
      if (Object.keys(cleanUtil).length > 0) sectionData.utility = cleanUtil;

      if (Object.keys(sectionData).length > 0) {
        const updateResult = await updateSurvey(id, sectionData);
        if (!updateResult.success) {
          setError(updateResult.error || "Failed to save");
          setSaving(false);
          return;
        }
      }

      setSuccessMsg("Survey saved");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Submit the survey for AI review.
   */
  const handleSubmit = async () => {
    // Basic validation
    if (!property.address) {
      setError("Address is required before submitting");
      return;
    }
    if (!electrical.panel_amps || !electrical.main_breaker_amps) {
      setError("Panel amps and main breaker amps are required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await handleSave();

      if (!surveyId) {
        setError("Survey must be saved first");
        setSubmitting(false);
        return;
      }

      const result = await submitSurvey(surveyId);
      if (!result.success) {
        setError(result.error || "Failed to submit");
        setSubmitting(false);
        return;
      }

      setSurveyStatus("submitted");
      setSuccessMsg("Survey submitted for AI review");
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle photo upload for a specific category.
   */
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !activePhotoType) return;

    let id = surveyId;
    if (!id && projectId) {
      const createResult = await createSurvey(projectId, user?.uid);
      if (createResult.success) {
        id = createResult.surveyId;
        setSurveyId(id);
      }
    }
    if (!id) {
      setError("Save survey first to upload photos");
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;

      const previewUrl = URL.createObjectURL(file);
      setPhotos((prev) => ({
        ...prev,
        [activePhotoType]: [
          ...prev[activePhotoType],
          {
            id: `temp_${Date.now()}`,
            url: previewUrl,
            type: activePhotoType,
            uploading: true,
          },
        ],
      }));

      const result = await addSurveyPhoto(id, file, activePhotoType);
      if (result.success) {
        setPhotos((prev) => ({
          ...prev,
          [activePhotoType]: prev[activePhotoType].map((p) =>
            p.url === previewUrl
              ? { ...p, id: result.photoId, url: result.url, uploading: false }
              : p,
          ),
        }));
      } else {
        setPhotos((prev) => ({
          ...prev,
          [activePhotoType]: prev[activePhotoType].filter(
            (p) => p.url !== previewUrl,
          ),
        }));
        setError(result.error || "Photo upload failed");
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerPhotoUpload = (type) => {
    setActivePhotoType(type);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-48 rounded bg-gray-200" />
        <div className="h-64 rounded-xl bg-gray-100" />
        <div className="h-48 rounded-xl bg-gray-100" />
      </div>
    );
  }

  /** Status badge color mapping */
  const statusColors = {
    draft: "bg-gray-100 text-gray-600",
    in_progress: "bg-blue-100 text-blue-700",
    submitted: "bg-yellow-100 text-yellow-700",
    ai_review: "bg-purple-100 text-purple-700",
    approved: "bg-green-100 text-green-700",
    revision_needed: "bg-red-100 text-red-700",
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              to={`/dashboard/projects/${projectId}`}
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Site Survey</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[surveyStatus] || statusColors.draft}`}
            >
              {surveyStatus.replace(/_/g, " ")}
            </span>
          </div>
          <p className="mt-1 ml-8 text-sm text-gray-500">
            Professional survey — all fields for design and permitting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              submitting ||
              surveyStatus === "submitted" ||
              surveyStatus === "approved"
            }
            className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      <div className="space-y-4">
        {/* Property Section */}
        <CollapsibleSection
          title="Property Details"
          icon={<MapPin className="h-4 w-4" />}
          expanded={expanded.property}
          onToggle={() => toggleSection("property")}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Address *
              </label>
              <AddressAutocomplete
                onAddressSelect={handleAddressSelect}
                placeholder="Property address..."
              />
              {property.address && (
                <p className="mt-1 text-xs text-green-600">
                  {property.address}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <FieldInput
                label="Roof Type *"
                type="select"
                value={property.roof_type}
                onChange={(v) => setProperty((p) => ({ ...p, roof_type: v }))}
                options={ROOF_TYPES.map((r) => ({
                  value: r.value,
                  label: r.label,
                }))}
              />
              <FieldInput
                label="Condition"
                type="select"
                value={property.roof_condition}
                onChange={(v) =>
                  setProperty((p) => ({ ...p, roof_condition: v }))
                }
                options={ROOF_CONDITIONS.map((c) => ({
                  value: c,
                  label: c.charAt(0).toUpperCase() + c.slice(1),
                }))}
              />
              <FieldInput
                label="Roof Age (yrs)"
                type="number"
                value={property.roof_age_years}
                onChange={(v) =>
                  setProperty((p) => ({ ...p, roof_age_years: v }))
                }
              />
              <FieldInput
                label="Stories *"
                type="number"
                value={property.stories}
                onChange={(v) => setProperty((p) => ({ ...p, stories: v }))}
                min="1"
                max="4"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FieldInput
                label="Square Footage"
                type="number"
                value={property.square_footage}
                onChange={(v) =>
                  setProperty((p) => ({ ...p, square_footage: v }))
                }
              />
              <FieldInput
                label="Year Built"
                type="number"
                value={property.year_built}
                onChange={(v) => setProperty((p) => ({ ...p, year_built: v }))}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Roof Measurements Section */}
        <CollapsibleSection
          title="Roof Measurements"
          icon={<Ruler className="h-4 w-4" />}
          expanded={expanded.roof}
          onToggle={() => toggleSection("roof")}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <FieldInput
                label="Total Area (sqft)"
                type="number"
                value={roofMeasurements.total_area_sqft}
                onChange={(v) =>
                  setRoofMeasurements((p) => ({ ...p, total_area_sqft: v }))
                }
              />
              <FieldInput
                label="Usable Area (sqft)"
                type="number"
                value={roofMeasurements.usable_area_sqft}
                onChange={(v) =>
                  setRoofMeasurements((p) => ({ ...p, usable_area_sqft: v }))
                }
              />
              <FieldInput
                label="Primary Pitch"
                type="number"
                value={roofMeasurements.pitch}
                onChange={(v) =>
                  setRoofMeasurements((p) => ({ ...p, pitch: v }))
                }
                placeholder="degrees"
              />
              <FieldInput
                label="Primary Azimuth"
                type="number"
                value={roofMeasurements.azimuth}
                onChange={(v) =>
                  setRoofMeasurements((p) => ({ ...p, azimuth: v }))
                }
                placeholder="0-360"
              />
            </div>

            {/* Roof Planes — dynamic add/remove */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Roof Planes
                </label>
                <button
                  onClick={addPlane}
                  className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                >
                  <Plus className="h-3 w-3" /> Add Plane
                </button>
              </div>
              <div className="space-y-2">
                {roofMeasurements.planes.map((plane, idx) => (
                  <div
                    key={plane.id || idx}
                    className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2"
                  >
                    <span className="text-xs text-gray-400 w-6">
                      {idx + 1}.
                    </span>
                    <input
                      type="number"
                      value={plane.area}
                      onChange={(e) => updatePlane(idx, "area", e.target.value)}
                      placeholder="Area sqft"
                      className="w-24 rounded border border-gray-200 px-2 py-1 text-xs focus:border-amber-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      value={plane.pitch}
                      onChange={(e) =>
                        updatePlane(idx, "pitch", e.target.value)
                      }
                      placeholder="Pitch"
                      className="w-20 rounded border border-gray-200 px-2 py-1 text-xs focus:border-amber-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      value={plane.azimuth}
                      onChange={(e) =>
                        updatePlane(idx, "azimuth", e.target.value)
                      }
                      placeholder="Azimuth"
                      className="w-20 rounded border border-gray-200 px-2 py-1 text-xs focus:border-amber-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      value={plane.shading_factor}
                      onChange={(e) =>
                        updatePlane(idx, "shading_factor", e.target.value)
                      }
                      placeholder="Shade 0-1"
                      step="0.01"
                      min="0"
                      max="1"
                      className="w-20 rounded border border-gray-200 px-2 py-1 text-xs focus:border-amber-500 focus:outline-none"
                    />
                    {roofMeasurements.planes.length > 1 && (
                      <button
                        onClick={() => removePlane(idx)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                <p className="text-xs text-gray-400">
                  Fields: Area (sqft) | Pitch (degrees) | Azimuth (0-360) |
                  Shading Factor (0-1, where 1 = no shade)
                </p>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Electrical Section */}
        <CollapsibleSection
          title="Electrical"
          icon={<Zap className="h-4 w-4" />}
          expanded={expanded.electrical}
          onToggle={() => toggleSection("electrical")}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <FieldInput
                label="Panel Amps *"
                type="select"
                value={electrical.panel_amps}
                onChange={(v) =>
                  setElectrical((p) => ({ ...p, panel_amps: v }))
                }
                options={[100, 125, 150, 200, 225, 320, 400].map((a) => ({
                  value: String(a),
                  label: `${a}A`,
                }))}
              />
              <FieldInput
                label="Main Breaker *"
                type="select"
                value={electrical.main_breaker_amps}
                onChange={(v) =>
                  setElectrical((p) => ({ ...p, main_breaker_amps: v }))
                }
                options={[100, 125, 150, 200, 225].map((a) => ({
                  value: String(a),
                  label: `${a}A`,
                }))}
              />
              <FieldInput
                label="Bus Bar Rating"
                type="select"
                value={electrical.bus_bar_rating}
                onChange={(v) =>
                  setElectrical((p) => ({ ...p, bus_bar_rating: v }))
                }
                options={[100, 125, 150, 200, 225, 320, 400].map((a) => ({
                  value: String(a),
                  label: `${a}A`,
                }))}
              />
              <FieldInput
                label="Service Voltage"
                type="select"
                value={electrical.service_voltage}
                onChange={(v) =>
                  setElectrical((p) => ({ ...p, service_voltage: v }))
                }
                options={[
                  { value: "120/240", label: "120/240V (Single Phase)" },
                  { value: "120/208", label: "120/208V (Three Phase)" },
                  { value: "277/480", label: "277/480V (Commercial)" },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <FieldInput
                label="Available Spaces"
                type="number"
                value={electrical.available_spaces}
                onChange={(v) =>
                  setElectrical((p) => ({ ...p, available_spaces: v }))
                }
              />
              <FieldInput
                label="Panel Location"
                type="select"
                value={electrical.panel_location}
                onChange={(v) =>
                  setElectrical((p) => ({ ...p, panel_location: v }))
                }
                options={[
                  { value: "garage", label: "Garage" },
                  { value: "exterior", label: "Exterior" },
                  { value: "basement", label: "Basement" },
                  { value: "utility_room", label: "Utility Room" },
                  { value: "other", label: "Other" },
                ]}
              />
              <FieldInput
                label="Panel Type"
                type="text"
                value={electrical.panel_type}
                onChange={(v) =>
                  setElectrical((p) => ({ ...p, panel_type: v }))
                }
                placeholder="e.g., Square D"
              />
              <FieldInput
                label="Meter Type"
                type="select"
                value={electrical.meter_type}
                onChange={(v) =>
                  setElectrical((p) => ({ ...p, meter_type: v }))
                }
                options={[
                  { value: "digital", label: "Digital/Smart" },
                  { value: "analog", label: "Analog" },
                  { value: "unknown", label: "Unknown" },
                ]}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Shading Section */}
        <CollapsibleSection
          title="Shading Analysis"
          icon={<TreePine className="h-4 w-4" />}
          expanded={expanded.shading}
          onToggle={() => toggleSection("shading")}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FieldInput
                label="TSRF (%)"
                type="number"
                value={shading.tsrf}
                onChange={(v) => setShading((p) => ({ ...p, tsrf: v }))}
                placeholder="e.g., 92"
                min="0"
                max="100"
              />
              <FieldInput
                label="Annual Shading Loss (%)"
                type="number"
                value={shading.annual_shading_loss}
                onChange={(v) =>
                  setShading((p) => ({ ...p, annual_shading_loss: v }))
                }
                placeholder="e.g., 8"
                min="0"
                max="100"
              />
            </div>

            {/* Obstructions — dynamic rows */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Obstructions
                </label>
                <button
                  onClick={addObstruction}
                  className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {shading.obstructions.map((obs, idx) => (
                  <div
                    key={obs.id || idx}
                    className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2"
                  >
                    <select
                      value={obs.type}
                      onChange={(e) =>
                        updateObstruction(idx, "type", e.target.value)
                      }
                      className="w-28 rounded border border-gray-200 px-2 py-1 text-xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">Type...</option>
                      <option value="tree">Tree</option>
                      <option value="chimney">Chimney</option>
                      <option value="building">Building</option>
                      <option value="vent">Vent/Pipe</option>
                      <option value="antenna">Antenna</option>
                      <option value="other">Other</option>
                    </select>
                    <select
                      value={obs.direction}
                      onChange={(e) =>
                        updateObstruction(idx, "direction", e.target.value)
                      }
                      className="w-16 rounded border border-gray-200 px-2 py-1 text-xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">Dir</option>
                      <option value="N">N</option>
                      <option value="NE">NE</option>
                      <option value="E">E</option>
                      <option value="SE">SE</option>
                      <option value="S">S</option>
                      <option value="SW">SW</option>
                      <option value="W">W</option>
                      <option value="NW">NW</option>
                    </select>
                    <input
                      type="number"
                      value={obs.distance_ft}
                      onChange={(e) =>
                        updateObstruction(idx, "distance_ft", e.target.value)
                      }
                      placeholder="Dist ft"
                      className="w-20 rounded border border-gray-200 px-2 py-1 text-xs focus:border-amber-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      value={obs.height_ft}
                      onChange={(e) =>
                        updateObstruction(idx, "height_ft", e.target.value)
                      }
                      placeholder="Ht ft"
                      className="w-20 rounded border border-gray-200 px-2 py-1 text-xs focus:border-amber-500 focus:outline-none"
                    />
                    <select
                      value={obs.seasonal_impact}
                      onChange={(e) =>
                        updateObstruction(
                          idx,
                          "seasonal_impact",
                          e.target.value,
                        )
                      }
                      className="w-28 rounded border border-gray-200 px-2 py-1 text-xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">Season...</option>
                      <option value="year_round">Year-round</option>
                      <option value="summer">Summer</option>
                      <option value="winter">Winter</option>
                      <option value="spring_fall">Spring/Fall</option>
                    </select>
                    {shading.obstructions.length > 1 && (
                      <button
                        onClick={() => removeObstruction(idx)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Utility Section */}
        <CollapsibleSection
          title="Utility Information"
          icon={<Receipt className="h-4 w-4" />}
          expanded={expanded.utility}
          onToggle={() => toggleSection("utility")}
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <FieldInput
              label="Provider"
              type="text"
              value={utility.provider}
              onChange={(v) => setUtility((p) => ({ ...p, provider: v }))}
              placeholder="e.g., PG&E"
            />
            <FieldInput
              label="Account Number"
              type="text"
              value={utility.account_number}
              onChange={(v) => setUtility((p) => ({ ...p, account_number: v }))}
            />
            <FieldInput
              label="Avg Monthly kWh"
              type="number"
              value={utility.avg_monthly_kwh}
              onChange={(v) =>
                setUtility((p) => ({ ...p, avg_monthly_kwh: v }))
              }
            />
            <FieldInput
              label="Annual kWh"
              type="number"
              value={utility.annual_kwh}
              onChange={(v) => setUtility((p) => ({ ...p, annual_kwh: v }))}
            />
            <FieldInput
              label="Avg Monthly Bill ($)"
              type="number"
              value={utility.avg_monthly_bill}
              onChange={(v) =>
                setUtility((p) => ({ ...p, avg_monthly_bill: v }))
              }
            />
            <FieldInput
              label="Rate Schedule"
              type="text"
              value={utility.rate_schedule}
              onChange={(v) => setUtility((p) => ({ ...p, rate_schedule: v }))}
            />
            <FieldInput
              label="Net Metering Eligible"
              type="select"
              value={utility.net_metering_eligible}
              onChange={(v) =>
                setUtility((p) => ({ ...p, net_metering_eligible: v }))
              }
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
                { value: "unknown", label: "Unknown" },
              ]}
            />
          </div>
        </CollapsibleSection>

        {/* Installer Assessments */}
        <CollapsibleSection
          title="Installer Assessments"
          icon={<Eye className="h-4 w-4" />}
          expanded={true}
          onToggle={() => {}}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FieldInput
                label="Attic Access"
                type="select"
                value={assessment.attic_access}
                onChange={(v) =>
                  setAssessment((p) => ({ ...p, attic_access: v }))
                }
                options={[
                  { value: "easy", label: "Easy (pull-down stairs)" },
                  { value: "moderate", label: "Moderate (scuttle hole)" },
                  { value: "difficult", label: "Difficult (no access)" },
                  { value: "na", label: "N/A (no attic)" },
                ]}
              />
              <FieldInput
                label="Mounting Surface"
                type="select"
                value={assessment.mounting_surface_condition}
                onChange={(v) =>
                  setAssessment((p) => ({
                    ...p,
                    mounting_surface_condition: v,
                  }))
                }
                options={[
                  { value: "excellent", label: "Excellent" },
                  { value: "good", label: "Good" },
                  { value: "fair", label: "Fair — minor repairs needed" },
                  { value: "poor", label: "Poor — reroof recommended" },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Attic Notes
                </label>
                <textarea
                  value={assessment.attic_access_notes}
                  onChange={(e) =>
                    setAssessment((p) => ({
                      ...p,
                      attic_access_notes: e.target.value,
                    }))
                  }
                  placeholder="Rafter spacing, insulation type, clearance..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Mounting Notes
                </label>
                <textarea
                  value={assessment.mounting_surface_notes}
                  onChange={(e) =>
                    setAssessment((p) => ({
                      ...p,
                      mounting_surface_notes: e.target.value,
                    }))
                  }
                  placeholder="Decking type, plywood vs OSB, condition details..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Photos Section */}
        <CollapsibleSection
          title="Survey Photos"
          icon={<Image className="h-4 w-4" />}
          expanded={expanded.photos}
          onToggle={() => toggleSection("photos")}
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {PHOTO_CATEGORIES.map((cat) => (
              <div
                key={cat.type}
                className="rounded-lg border border-gray-200 p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-700">
                    {cat.label}{" "}
                    {cat.required && <span className="text-red-400">*</span>}
                  </span>
                  <span className="text-xs text-gray-400">
                    {photos[cat.type]?.length || 0}
                  </span>
                </div>
                {/* Thumbnails */}
                {photos[cat.type]?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {photos[cat.type].map((photo) => (
                      <div
                        key={photo.id}
                        className="relative h-12 w-12 rounded border overflow-hidden"
                      >
                        <img
                          src={photo.url}
                          alt={cat.label}
                          className="h-full w-full object-cover"
                        />
                        {photo.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <Loader2 className="h-3 w-3 animate-spin text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => triggerPhotoUpload(cat.type)}
                  className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-gray-300 py-1.5 text-xs text-gray-500 hover:border-amber-400 hover:text-amber-600"
                >
                  <Camera className="h-3 w-3" />
                  Upload
                </button>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}

/**
 * CollapsibleSection - Expandable form section with title and icon.
 * Used throughout the installer survey for organized, compact layout.
 *
 * @param {string} title - Section heading
 * @param {React.ReactNode} icon - Lucide icon element
 * @param {boolean} expanded - Whether section content is visible
 * @param {function} onToggle - Callback to toggle expand/collapse
 * @param {React.ReactNode} children - Section content
 */
function CollapsibleSection({ title, icon, expanded, onToggle, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-500">{icon}</span>
          <span className="text-sm font-semibold text-gray-800">{title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4">{children}</div>
      )}
    </div>
  );
}

/**
 * FieldInput - Compact form field wrapper that renders text, number, or select inputs.
 * Provides consistent styling and label formatting across the installer form.
 *
 * @param {string} label - Field label text
 * @param {string} type - Input type: "text" | "number" | "select"
 * @param {string} value - Current field value
 * @param {function} onChange - Callback with new value
 * @param {object[]} [options] - Options for select type: [{value, label}]
 * @param {string} [placeholder] - Input placeholder text
 * @param {number} [min] - Minimum value for number inputs
 * @param {number} [max] - Maximum value for number inputs
 */
function FieldInput({
  label,
  type,
  value,
  onChange,
  options,
  placeholder,
  min,
  max,
}) {
  const inputClass =
    "w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </label>
      {type === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          <option value="">Select...</option>
          {(options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          className={inputClass}
        />
      )}
    </div>
  );
}

/**
 * Filter out empty string values and convert numeric strings to numbers.
 * Removes null/undefined values for clean Firestore writes.
 *
 * @param {object} obj - Object to filter
 * @returns {object} Cleaned object
 */
function filterEmpty(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== "" && value !== null && value !== undefined) {
      if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value)) {
        result[key] = parseFloat(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}
