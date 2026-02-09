/**
 * PortalSurvey - Customer Site Survey Wizard
 *
 * Mobile-first step-by-step wizard that guides homeowners through collecting
 * all the data needed for solar system design. Six steps:
 *   1. Address verification with autocomplete + satellite view
 *   2. Roof details (type, age, condition, stories)
 *   3. Electrical panel (photo upload + specs)
 *   4. Shading (obstructions + photos)
 *   5. Utility info (provider, bill, usage)
 *   6. Review all info and submit
 *
 * Features:
 * - Progress bar showing completion
 * - Save Draft persists to both localStorage and Firestore
 * - Resume from where the user left off
 * - Photo upload with drag-and-drop and camera capture
 * - Clean validation with inline error messages
 * - Responsive: stacks on mobile, wider on desktop
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  Upload,
  Camera,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image,
} from "lucide-react";

/** Total number of wizard steps */
const TOTAL_STEPS = 6;

/** Step configuration with labels and icons */
const STEPS = [
  { key: "address", label: "Address", icon: MapPin },
  { key: "roof", label: "Roof", icon: Home },
  { key: "electrical", label: "Electrical", icon: Zap },
  { key: "shading", label: "Shading", icon: TreePine },
  { key: "utility", label: "Utility", icon: Receipt },
  { key: "review", label: "Review", icon: ClipboardCheck },
];

/** Dropdown options for roof type */
const ROOF_TYPES = [
  { value: "composite_shingle", label: "Composite Shingle" },
  { value: "tile", label: "Tile (Clay/Concrete)" },
  { value: "metal", label: "Metal" },
  { value: "flat", label: "Flat/Low-slope" },
  { value: "other", label: "Other" },
];

/** Radio options for roof condition */
const ROOF_CONDITIONS = [
  {
    value: "excellent",
    label: "Excellent",
    desc: "Less than 5 years old, no damage",
  },
  { value: "good", label: "Good", desc: "5-15 years old, minor wear" },
  { value: "fair", label: "Fair", desc: "15-25 years old, some wear" },
  { value: "poor", label: "Poor", desc: "25+ years old or significant damage" },
];

/** localStorage key prefix for caching survey data */
const CACHE_KEY = "solar_survey_draft";

export default function PortalSurvey() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Core state
  const [currentStep, setCurrentStep] = useState(0);
  const [surveyId, setSurveyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form data for each section
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

  const [electrical, setElectrical] = useState({
    panel_type: "",
    panel_amps: "",
    main_breaker_amps: "",
    available_spaces: "",
    panel_location: "",
    meter_type: "",
  });

  const [shading, setShading] = useState({
    obstructions: "",
    notes: "",
  });

  const [utility, setUtility] = useState({
    provider: "",
    account_number: "",
    avg_monthly_kwh: "",
    avg_monthly_bill: "",
    rate_schedule: "",
  });

  // Roof measurements
  const [roofMeasurements, setRoofMeasurements] = useState({
    area_sqft: "",
    pitch_degrees: "",
    orientation: "",
  });

  // Obstruction checklist
  const [obstructionChecklist, setObstructionChecklist] = useState({
    trees: false,
    vents: false,
    chimneys: false,
    skylights: false,
    satellite_dishes: false,
  });

  // Photos organized by type
  const [photos, setPhotos] = useState({
    roof_north: [],
    roof_south: [],
    roof_east: [],
    roof_west: [],
    roof_overview: [],
    electrical_panel: [],
    meter: [],
    obstruction: [],
    mounting_area: [],
  });

  // Validation errors per step
  const [stepErrors, setStepErrors] = useState({});

  // File input refs for photo uploads
  const fileInputRef = useRef(null);
  const [activePhotoType, setActivePhotoType] = useState(null);

  /**
   * Load existing survey data on mount.
   * Checks for: existing survey for project, localStorage cache, or creates new.
   */
  useEffect(() => {
    const loadSurvey = async () => {
      try {
        // If we have a projectId, check for existing survey
        if (projectId) {
          const result = await getSurveysByProject(projectId);
          if (result.success && result.surveys && result.surveys.length > 0) {
            const existing = result.surveys[0];
            setSurveyId(existing.id);
            populateFromSurvey(existing);
            // Restore step position from localStorage
            const cachedStep = localStorage.getItem(
              `${CACHE_KEY}_step_${existing.id}`,
            );
            if (cachedStep) setCurrentStep(parseInt(cachedStep, 10));
            setLoading(false);
            return;
          }
        }

        // Check localStorage for cached draft
        const cached = localStorage.getItem(
          `${CACHE_KEY}_${projectId || "new"}`,
        );
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.property)
              setProperty((prev) => ({ ...prev, ...parsed.property }));
            if (parsed.electrical)
              setElectrical((prev) => ({ ...prev, ...parsed.electrical }));
            if (parsed.shading)
              setShading((prev) => ({ ...prev, ...parsed.shading }));
            if (parsed.utility)
              setUtility((prev) => ({ ...prev, ...parsed.utility }));
            if (parsed.roofMeasurements)
              setRoofMeasurements((prev) => ({
                ...prev,
                ...parsed.roofMeasurements,
              }));
            if (parsed.obstructionChecklist)
              setObstructionChecklist((prev) => ({
                ...prev,
                ...parsed.obstructionChecklist,
              }));
            if (parsed.surveyId) setSurveyId(parsed.surveyId);
            if (parsed.currentStep) setCurrentStep(parsed.currentStep);
          } catch {
            // Corrupt cache, ignore
          }
        }
      } catch (err) {
        console.error("Error loading survey:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSurvey();
  }, [projectId]);

  /**
   * Populate local form state from a Firestore survey document.
   * Handles missing fields gracefully with defaults.
   */
  const populateFromSurvey = (survey) => {
    if (survey.property) {
      setProperty((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(survey.property).map(([k, v]) => [
            k,
            v ?? prev[k] ?? "",
          ]),
        ),
      }));
    }
    if (survey.electrical) {
      setElectrical((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(survey.electrical).map(([k, v]) => [
            k,
            v ?? prev[k] ?? "",
          ]),
        ),
      }));
    }
    if (survey.shading) {
      setShading((prev) => ({ ...prev, ...survey.shading }));
    }
    if (survey.utility) {
      setUtility((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(survey.utility).map(([k, v]) => [
            k,
            v ?? prev[k] ?? "",
          ]),
        ),
      }));
    }
    if (survey.roof_measurements) {
      setRoofMeasurements((prev) => ({ ...prev, ...survey.roof_measurements }));
    }
    if (survey.obstruction_checklist) {
      setObstructionChecklist((prev) => ({
        ...prev,
        ...survey.obstruction_checklist,
      }));
    }
    if (survey.photos && survey.photos.length > 0) {
      const grouped = {
        roof_north: [],
        roof_south: [],
        roof_east: [],
        roof_west: [],
        roof_overview: [],
        electrical_panel: [],
        meter: [],
        obstruction: [],
        mounting_area: [],
      };
      for (const p of survey.photos) {
        if (grouped[p.type]) grouped[p.type].push(p);
      }
      setPhotos(grouped);
    }
  };

  /**
   * Cache current form state to localStorage as backup.
   * Called on every step change and save action.
   */
  const cacheToLocal = useCallback(() => {
    const cacheData = {
      property,
      electrical,
      shading,
      utility,
      roofMeasurements,
      obstructionChecklist,
      surveyId,
      currentStep,
    };
    localStorage.setItem(
      `${CACHE_KEY}_${projectId || "new"}`,
      JSON.stringify(cacheData),
    );
    if (surveyId) {
      localStorage.setItem(
        `${CACHE_KEY}_step_${surveyId}`,
        String(currentStep),
      );
    }
  }, [
    property,
    electrical,
    shading,
    utility,
    roofMeasurements,
    obstructionChecklist,
    surveyId,
    currentStep,
    projectId,
  ]);

  /**
   * Save current survey data to Firestore.
   * Creates the survey if it doesn't exist yet, then updates sections.
   */
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      let id = surveyId;

      // Create survey if it doesn't exist
      if (!id) {
        if (!projectId) {
          setError("No project linked. Please start from your project page.");
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

      // Build section data with only non-empty values
      const sectionData = {};

      const cleanProperty = filterEmpty(property);
      if (Object.keys(cleanProperty).length > 0)
        sectionData.property = cleanProperty;

      const cleanElectrical = filterEmpty(electrical);
      if (Object.keys(cleanElectrical).length > 0)
        sectionData.electrical = cleanElectrical;

      // Shading section — convert free-text obstructions into array format
      if (shading.obstructions || shading.notes) {
        sectionData.shading = {};
        if (shading.obstructions) {
          sectionData.shading.obstructions = shading.obstructions
            .split("\n")
            .filter(Boolean)
            .map((line) => ({
              type: "user_reported",
              description: line.trim(),
            }));
        }
        if (shading.notes) sectionData.shading.notes = shading.notes;
      }

      const cleanUtility = filterEmpty(utility);
      if (Object.keys(cleanUtility).length > 0)
        sectionData.utility = cleanUtility;

      // Roof measurements
      const cleanRoofMeasurements = filterEmpty(roofMeasurements);
      if (Object.keys(cleanRoofMeasurements).length > 0)
        sectionData.roof_measurements = cleanRoofMeasurements;

      // Obstruction checklist — save all values
      const anyChecked = Object.values(obstructionChecklist).some(Boolean);
      if (anyChecked) sectionData.obstruction_checklist = obstructionChecklist;

      if (Object.keys(sectionData).length > 0) {
        const updateResult = await updateSurvey(id, sectionData);
        if (!updateResult.success) {
          setError(updateResult.error || "Failed to save survey");
          setSaving(false);
          return;
        }
      }

      cacheToLocal();
      setSuccessMsg("Draft saved");
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
   * Saves first, then calls submitSurvey cloud function.
   */
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      // Save first to ensure latest data is in Firestore
      await handleSave();

      if (!surveyId) {
        setError("Survey must be saved first");
        setSubmitting(false);
        return;
      }

      const result = await submitSurvey(surveyId);
      if (!result.success) {
        setError(result.error || "Failed to submit survey");
        setSubmitting(false);
        return;
      }

      // Clear localStorage cache after successful submission
      localStorage.removeItem(`${CACHE_KEY}_${projectId || "new"}`);
      if (surveyId) localStorage.removeItem(`${CACHE_KEY}_step_${surveyId}`);

      setSuccessMsg("Survey submitted for review!");
      // Redirect to project page after a moment
      setTimeout(() => {
        navigate(projectId ? `/portal/project/${projectId}` : "/portal");
      }, 2000);
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle photo file selection. Uploads to Storage and registers with survey.
   */
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !activePhotoType) return;

    // Ensure survey exists first
    let id = surveyId;
    if (!id && projectId) {
      const createResult = await createSurvey(projectId, user?.uid);
      if (createResult.success) {
        id = createResult.surveyId;
        setSurveyId(id);
      } else {
        setError("Must save survey before uploading photos");
        return;
      }
    }
    if (!id) {
      setError("Please save your survey before uploading photos");
      return;
    }

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please upload image files only");
        continue;
      }

      // Create local preview immediately
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

      // Upload in background
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
        // Remove failed upload preview
        setPhotos((prev) => ({
          ...prev,
          [activePhotoType]: prev[activePhotoType].filter(
            (p) => p.url !== previewUrl,
          ),
        }));
        setError(result.error || "Photo upload failed");
      }
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /**
   * Open file picker for a specific photo type.
   */
  const triggerPhotoUpload = (type) => {
    setActivePhotoType(type);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  /**
   * Validate the current step before advancing.
   * Returns true if valid, false with error messages if not.
   */
  const validateStep = (step) => {
    const errors = {};

    switch (step) {
      case 0: // Address
        if (!property.address) errors.address = "Address is required";
        break;
      case 1: // Roof
        if (!property.roof_type) errors.roof_type = "Roof type is required";
        if (!property.stories) errors.stories = "Number of stories is required";
        break;
      case 2: // Electrical
        if (!electrical.panel_amps)
          errors.panel_amps = "Panel amperage is required";
        if (!electrical.main_breaker_amps)
          errors.main_breaker_amps = "Main breaker size is required";
        break;
      // Steps 3-5 have no required fields
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Navigate to next step with validation.
   */
  const goNext = () => {
    if (!validateStep(currentStep)) return;
    cacheToLocal();
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
    setStepErrors({});
    window.scrollTo(0, 0);
  };

  /**
   * Navigate to previous step.
   */
  const goBack = () => {
    cacheToLocal();
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    setStepErrors({});
    window.scrollTo(0, 0);
  };

  /**
   * Handle address selection from AddressAutocomplete component.
   */
  const handleAddressSelect = (addressData) => {
    setProperty((prev) => ({
      ...prev,
      address: addressData.formattedAddress || addressData.address || "",
      lat: addressData.lat || null,
      lng: addressData.lng || null,
    }));
  };

  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-6 w-48 rounded bg-gray-200" />
        <div className="h-2 rounded-full bg-gray-100" />
        <div className="h-64 rounded-xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Site Survey</h1>
        <p className="mt-1 text-sm text-gray-500">
          Help us understand your home so we can design the perfect solar
          system.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isComplete = idx < currentStep;
            const isCurrent = idx === currentStep;
            return (
              <button
                key={step.key}
                onClick={() => {
                  if (idx < currentStep || validateStep(currentStep)) {
                    cacheToLocal();
                    setCurrentStep(idx);
                    setStepErrors({});
                  }
                }}
                className={`flex flex-col items-center gap-1 text-xs transition-colors ${
                  isCurrent
                    ? "text-amber-600 font-semibold"
                    : isComplete
                      ? "text-green-600"
                      : "text-gray-400"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                    isCurrent
                      ? "border-amber-500 bg-amber-50"
                      : isComplete
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 bg-white"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span className="hidden sm:block">{step.label}</span>
              </button>
            );
          })}
        </div>
        {/* Progress track */}
        <div className="h-1.5 rounded-full bg-gray-100">
          <div
            className="h-1.5 rounded-full bg-amber-500 transition-all duration-300"
            style={{ width: `${(currentStep / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Error / Success messages */}
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

      {/* Hidden file input for photo uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Step Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Step 1: Address */}
        {currentStep === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Property Address
            </h2>
            <p className="text-sm text-gray-500">
              Enter your home address so we can locate your property and analyze
              your roof.
            </p>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Home Address *
              </label>
              <AddressAutocomplete
                onAddressSelect={handleAddressSelect}
                placeholder="Start typing your address..."
              />
              {property.address && (
                <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {property.address}
                </p>
              )}
              {stepErrors.address && (
                <p className="mt-1 text-sm text-red-600">
                  {stepErrors.address}
                </p>
              )}
            </div>

            {/* Satellite preview placeholder — shows when lat/lng available */}
            {property.lat && property.lng && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                <MapPin className="mx-auto h-8 w-8 text-amber-500 mb-2" />
                <p className="text-sm text-gray-600">
                  Location: {property.lat.toFixed(4)}, {property.lng.toFixed(4)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Satellite imagery will be used for roof analysis
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Square Footage
                </label>
                <input
                  type="number"
                  value={property.square_footage}
                  onChange={(e) =>
                    setProperty((p) => ({
                      ...p,
                      square_footage: e.target.value,
                    }))
                  }
                  placeholder="e.g., 2400"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Year Built
                </label>
                <input
                  type="number"
                  value={property.year_built}
                  onChange={(e) =>
                    setProperty((p) => ({ ...p, year_built: e.target.value }))
                  }
                  placeholder="e.g., 2005"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Roof Details */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Roof Details
            </h2>
            <p className="text-sm text-gray-500">
              Tell us about your roof so we can determine panel placement.
            </p>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Roof Type *
              </label>
              <select
                value={property.roof_type}
                onChange={(e) =>
                  setProperty((p) => ({ ...p, roof_type: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Select roof type...</option>
                {ROOF_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>
                    {rt.label}
                  </option>
                ))}
              </select>
              {stepErrors.roof_type && (
                <p className="mt-1 text-sm text-red-600">
                  {stepErrors.roof_type}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Roof Age (years)
              </label>
              <input
                type="number"
                value={property.roof_age_years}
                onChange={(e) =>
                  setProperty((p) => ({ ...p, roof_age_years: e.target.value }))
                }
                placeholder="e.g., 10"
                min="0"
                max="100"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Roof Condition
              </label>
              <div className="space-y-2">
                {ROOF_CONDITIONS.map((rc) => (
                  <label
                    key={rc.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                      property.roof_condition === rc.value
                        ? "border-amber-500 bg-amber-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="roof_condition"
                      value={rc.value}
                      checked={property.roof_condition === rc.value}
                      onChange={(e) =>
                        setProperty((p) => ({
                          ...p,
                          roof_condition: e.target.value,
                        }))
                      }
                      className="mt-0.5 accent-amber-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {rc.label}
                      </span>
                      <p className="text-xs text-gray-500">{rc.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Number of Stories *
              </label>
              <select
                value={property.stories}
                onChange={(e) =>
                  setProperty((p) => ({ ...p, stories: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Select...</option>
                <option value="1">1 Story</option>
                <option value="2">2 Stories</option>
                <option value="3">3+ Stories</option>
              </select>
              {stepErrors.stories && (
                <p className="mt-1 text-sm text-red-600">
                  {stepErrors.stories}
                </p>
              )}
            </div>

            {/* Roof measurements */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Roof Measurements
              </label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Roof Area (sqft)
                  </label>
                  <input
                    type="number"
                    value={roofMeasurements.area_sqft}
                    onChange={(e) =>
                      setRoofMeasurements((p) => ({
                        ...p,
                        area_sqft: e.target.value,
                      }))
                    }
                    placeholder="e.g., 1800"
                    min="0"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Pitch (degrees)
                  </label>
                  <input
                    type="number"
                    value={roofMeasurements.pitch_degrees}
                    onChange={(e) =>
                      setRoofMeasurements((p) => ({
                        ...p,
                        pitch_degrees: e.target.value,
                      }))
                    }
                    placeholder="e.g., 25"
                    min="0"
                    max="90"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Orientation
                  </label>
                  <select
                    value={roofMeasurements.orientation}
                    onChange={(e) =>
                      setRoofMeasurements((p) => ({
                        ...p,
                        orientation: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">Select...</option>
                    <option value="N">North</option>
                    <option value="S">South</option>
                    <option value="E">East</option>
                    <option value="W">West</option>
                    <option value="NE">Northeast</option>
                    <option value="NW">Northwest</option>
                    <option value="SE">Southeast</option>
                    <option value="SW">Southwest</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Roof photos from 4 angles */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Roof Photos - 4 Angles (optional but helpful)
              </label>
              <p className="text-xs text-gray-400">
                Take photos of your roof from each side of your home.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">
                    North Side
                  </p>
                  <PhotoUploadArea
                    photos={photos.roof_north}
                    onUpload={() => triggerPhotoUpload("roof_north")}
                    label="North"
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">
                    South Side
                  </p>
                  <PhotoUploadArea
                    photos={photos.roof_south}
                    onUpload={() => triggerPhotoUpload("roof_south")}
                    label="South"
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">
                    East Side
                  </p>
                  <PhotoUploadArea
                    photos={photos.roof_east}
                    onUpload={() => triggerPhotoUpload("roof_east")}
                    label="East"
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">
                    West Side
                  </p>
                  <PhotoUploadArea
                    photos={photos.roof_west}
                    onUpload={() => triggerPhotoUpload("roof_west")}
                    label="West"
                  />
                </div>
              </div>

              {/* Overview photo */}
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">
                  Overall Roof Overview
                </p>
                <PhotoUploadArea
                  photos={photos.roof_overview}
                  onUpload={() => triggerPhotoUpload("roof_overview")}
                  label="Upload roof overview"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Electrical Panel */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Electrical Panel
            </h2>
            <p className="text-sm text-gray-500">
              We need details about your electrical panel to design the solar
              connection. Look at the label inside your breaker box for this
              info.
            </p>

            {/* Panel photo — most important */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Electrical Panel Photo *
              </label>
              <p className="mb-2 text-xs text-gray-400">
                Take a clear photo of the panel door open showing all breakers
                and the label.
              </p>
              <PhotoUploadArea
                photos={photos.electrical_panel}
                onUpload={() => triggerPhotoUpload("electrical_panel")}
                label="Upload panel photo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Panel Amps *
                </label>
                <select
                  value={electrical.panel_amps}
                  onChange={(e) =>
                    setElectrical((p) => ({ ...p, panel_amps: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">Select...</option>
                  <option value="100">100 Amps</option>
                  <option value="125">125 Amps</option>
                  <option value="150">150 Amps</option>
                  <option value="200">200 Amps</option>
                  <option value="225">225 Amps</option>
                  <option value="320">320 Amps</option>
                  <option value="400">400 Amps</option>
                </select>
                {stepErrors.panel_amps && (
                  <p className="mt-1 text-sm text-red-600">
                    {stepErrors.panel_amps}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Main Breaker *
                </label>
                <select
                  value={electrical.main_breaker_amps}
                  onChange={(e) =>
                    setElectrical((p) => ({
                      ...p,
                      main_breaker_amps: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">Select...</option>
                  <option value="100">100 Amps</option>
                  <option value="125">125 Amps</option>
                  <option value="150">150 Amps</option>
                  <option value="200">200 Amps</option>
                  <option value="225">225 Amps</option>
                </select>
                {stepErrors.main_breaker_amps && (
                  <p className="mt-1 text-sm text-red-600">
                    {stepErrors.main_breaker_amps}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Available Breaker Spaces
                </label>
                <input
                  type="number"
                  value={electrical.available_spaces}
                  onChange={(e) =>
                    setElectrical((p) => ({
                      ...p,
                      available_spaces: e.target.value,
                    }))
                  }
                  placeholder="e.g., 4"
                  min="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Panel Location
                </label>
                <select
                  value={electrical.panel_location}
                  onChange={(e) =>
                    setElectrical((p) => ({
                      ...p,
                      panel_location: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">Select...</option>
                  <option value="garage">Garage</option>
                  <option value="exterior">Exterior Wall</option>
                  <option value="basement">Basement</option>
                  <option value="utility_room">Utility Room</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Meter Type
              </label>
              <select
                value={electrical.meter_type}
                onChange={(e) =>
                  setElectrical((p) => ({ ...p, meter_type: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Select...</option>
                <option value="digital">Digital Smart Meter</option>
                <option value="analog">Analog (Dial)</option>
                <option value="unknown">Not Sure</option>
              </select>
            </div>

            {/* Meter photo */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Meter Photo (optional)
              </label>
              <PhotoUploadArea
                photos={photos.meter}
                onUpload={() => triggerPhotoUpload("meter")}
                label="Upload meter photo"
              />
            </div>
          </div>
        )}

        {/* Step 4: Shading */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Shading & Obstructions
            </h2>
            <p className="text-sm text-gray-500">
              Trees, chimneys, nearby buildings, and other objects that cast
              shadows on your roof affect solar production. Let us know what's
              around.
            </p>

            {/* Obstruction checklist */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Common Obstructions (check all that apply)
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  { key: "trees", label: "Trees" },
                  { key: "vents", label: "Roof Vents" },
                  { key: "chimneys", label: "Chimneys" },
                  { key: "skylights", label: "Skylights" },
                  { key: "satellite_dishes", label: "Satellite Dishes" },
                ].map((item) => (
                  <label
                    key={item.key}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                      obstructionChecklist[item.key]
                        ? "border-amber-500 bg-amber-50 text-amber-800"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={obstructionChecklist[item.key]}
                      onChange={(e) =>
                        setObstructionChecklist((prev) => ({
                          ...prev,
                          [item.key]: e.target.checked,
                        }))
                      }
                      className="accent-amber-500"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Describe any obstructions near your roof
              </label>
              <textarea
                value={shading.obstructions}
                onChange={(e) =>
                  setShading((p) => ({ ...p, obstructions: e.target.value }))
                }
                placeholder={
                  "Large oak tree to the south, about 30 feet away\nChimney on the west side\nNeighbor's 2-story house to the east"
                }
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                One obstruction per line. Include direction, distance, and
                height if possible.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Additional Notes
              </label>
              <textarea
                value={shading.notes}
                onChange={(e) =>
                  setShading((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Any other details about your roof or property..."
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Obstruction photos */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Photos of obstructions (optional)
              </label>
              <PhotoUploadArea
                photos={photos.obstruction}
                onUpload={() => triggerPhotoUpload("obstruction")}
                label="Upload obstruction photos"
              />
            </div>
          </div>
        )}

        {/* Step 5: Utility Info */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Utility Information
            </h2>
            <p className="text-sm text-gray-500">
              Your utility info helps us size your system and calculate savings.
              Check a recent electric bill for these details.
            </p>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Electric Utility Provider
              </label>
              <input
                type="text"
                value={utility.provider}
                onChange={(e) =>
                  setUtility((p) => ({ ...p, provider: e.target.value }))
                }
                placeholder="e.g., TXU Energy, PG&E, Duke Energy"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Average Monthly Bill
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-gray-400">
                    $
                  </span>
                  <input
                    type="number"
                    value={utility.avg_monthly_bill}
                    onChange={(e) =>
                      setUtility((p) => ({
                        ...p,
                        avg_monthly_bill: e.target.value,
                      }))
                    }
                    placeholder="e.g., 185"
                    className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Average Monthly kWh
                </label>
                <input
                  type="number"
                  value={utility.avg_monthly_kwh}
                  onChange={(e) =>
                    setUtility((p) => ({
                      ...p,
                      avg_monthly_kwh: e.target.value,
                    }))
                  }
                  placeholder="e.g., 1200"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Account Number (optional)
              </label>
              <input
                type="text"
                value={utility.account_number}
                onChange={(e) =>
                  setUtility((p) => ({ ...p, account_number: e.target.value }))
                }
                placeholder="Found on your bill"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Rate Schedule (optional)
              </label>
              <input
                type="text"
                value={utility.rate_schedule}
                onChange={(e) =>
                  setUtility((p) => ({ ...p, rate_schedule: e.target.value }))
                }
                placeholder="e.g., TOU-D-A, Residential Service"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        )}

        {/* Step 6: Review & Submit */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Review Your Survey
            </h2>
            <p className="text-sm text-gray-500">
              Please review your information below. You can go back to any step
              to make changes.
            </p>

            {/* Property summary */}
            <ReviewSection
              title="Property"
              icon={<MapPin className="h-4 w-4" />}
              onEdit={() => setCurrentStep(0)}
              items={[
                { label: "Address", value: property.address },
                {
                  label: "Square Footage",
                  value: property.square_footage
                    ? `${property.square_footage} sqft`
                    : "",
                },
                { label: "Year Built", value: property.year_built },
              ]}
            />

            {/* Roof summary */}
            <ReviewSection
              title="Roof"
              icon={<Home className="h-4 w-4" />}
              onEdit={() => setCurrentStep(1)}
              items={[
                {
                  label: "Type",
                  value: ROOF_TYPES.find((r) => r.value === property.roof_type)
                    ?.label,
                },
                {
                  label: "Age",
                  value: property.roof_age_years
                    ? `${property.roof_age_years} years`
                    : "",
                },
                {
                  label: "Condition",
                  value: property.roof_condition
                    ? property.roof_condition.charAt(0).toUpperCase() +
                      property.roof_condition.slice(1)
                    : "",
                },
                { label: "Stories", value: property.stories },
              ]}
            />

            {/* Electrical summary */}
            <ReviewSection
              title="Electrical"
              icon={<Zap className="h-4 w-4" />}
              onEdit={() => setCurrentStep(2)}
              items={[
                {
                  label: "Panel",
                  value: electrical.panel_amps
                    ? `${electrical.panel_amps}A`
                    : "",
                },
                {
                  label: "Main Breaker",
                  value: electrical.main_breaker_amps
                    ? `${electrical.main_breaker_amps}A`
                    : "",
                },
                {
                  label: "Available Spaces",
                  value: electrical.available_spaces,
                },
                { label: "Location", value: electrical.panel_location },
              ]}
            />

            {/* Roof measurements summary */}
            <ReviewSection
              title="Roof Measurements"
              icon={<Home className="h-4 w-4" />}
              onEdit={() => setCurrentStep(1)}
              items={[
                {
                  label: "Area",
                  value: roofMeasurements.area_sqft
                    ? `${roofMeasurements.area_sqft} sqft`
                    : "",
                },
                {
                  label: "Pitch",
                  value: roofMeasurements.pitch_degrees
                    ? `${roofMeasurements.pitch_degrees} degrees`
                    : "",
                },
                {
                  label: "Orientation",
                  value: roofMeasurements.orientation || "",
                },
              ]}
            />

            {/* Shading summary */}
            <ReviewSection
              title="Shading"
              icon={<TreePine className="h-4 w-4" />}
              onEdit={() => setCurrentStep(3)}
              items={[
                {
                  label: "Checklist",
                  value: (() => {
                    const checked = Object.entries(obstructionChecklist)
                      .filter(([, v]) => v)
                      .map(([k]) => k.replace(/_/g, " "));
                    return checked.length > 0
                      ? checked.join(", ")
                      : "None checked";
                  })(),
                },
                {
                  label: "Details",
                  value: shading.obstructions
                    ? `${shading.obstructions.split("\n").filter(Boolean).length} noted`
                    : "None noted",
                },
              ]}
            />

            {/* Utility summary */}
            <ReviewSection
              title="Utility"
              icon={<Receipt className="h-4 w-4" />}
              onEdit={() => setCurrentStep(4)}
              items={[
                { label: "Provider", value: utility.provider },
                {
                  label: "Monthly Bill",
                  value: utility.avg_monthly_bill
                    ? `$${utility.avg_monthly_bill}`
                    : "",
                },
                {
                  label: "Monthly kWh",
                  value: utility.avg_monthly_kwh
                    ? `${utility.avg_monthly_kwh} kWh`
                    : "",
                },
              ]}
            />

            {/* Photo count summary */}
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Image className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Photos Uploaded
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(photos).map(([type, arr]) => (
                  <span
                    key={type}
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      arr.length > 0
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {type.replace(/_/g, " ")}: {arr.length}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={goBack}
          disabled={currentStep === 0}
          className="flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center gap-2">
          {/* Save Draft button — available on all steps */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Draft
          </button>

          {currentStep < TOTAL_STEPS - 1 ? (
            <button
              onClick={goNext}
              className="flex items-center gap-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit Survey
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * PhotoUploadArea - Reusable photo upload component with drag-and-drop styling
 * and camera capture button. Shows preview thumbnails for uploaded photos.
 *
 * @param {object[]} photos - Array of photo objects with url and optional uploading flag
 * @param {function} onUpload - Callback to trigger file picker
 * @param {string} label - Button label text
 */
function PhotoUploadArea({ photos, onUpload, label }) {
  return (
    <div className="space-y-2">
      {/* Thumbnails */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative h-20 w-20 rounded-lg border border-gray-200 overflow-hidden"
            >
              <img
                src={photo.url}
                alt={photo.type}
                className="h-full w-full object-cover"
              />
              {photo.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button area */}
      <button
        type="button"
        onClick={onUpload}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-4 text-sm text-gray-500 transition-colors hover:border-amber-400 hover:text-amber-600"
      >
        <Camera className="h-5 w-5" />
        <Upload className="h-5 w-5" />
        <span>{label}</span>
      </button>
    </div>
  );
}

/**
 * ReviewSection - Summary card for the review step showing section data.
 *
 * @param {string} title - Section title
 * @param {React.ReactNode} icon - Lucide icon element
 * @param {function} onEdit - Callback to navigate back to that step
 * @param {object[]} items - Array of {label, value} pairs to display
 */
function ReviewSection({ title, icon, onEdit, items }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">{icon}</span>
          <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>
        <button
          onClick={onEdit}
          className="text-xs text-amber-600 hover:text-amber-700 font-medium"
        >
          Edit
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {items.map((item) => (
          <div key={item.label} className="flex justify-between text-sm">
            <span className="text-gray-400">{item.label}</span>
            <span className="text-gray-700 font-medium">
              {item.value || <span className="text-gray-300">--</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Filter out empty string values and null/undefined from an object.
 * Converts numeric strings to numbers for Firestore storage.
 *
 * @param {object} obj - Object to filter
 * @returns {object} Cleaned object with only non-empty values
 */
function filterEmpty(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== "" && value !== null && value !== undefined) {
      // Convert numeric strings to numbers
      if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value)) {
        result[key] = parseFloat(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}
