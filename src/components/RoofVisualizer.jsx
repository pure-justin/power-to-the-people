import { useState, useEffect, useRef, useCallback } from "react";
import {
  Sun,
  Loader2,
  AlertCircle,
  Zap,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Image,
} from "lucide-react";
import {
  getDataLayers,
  fetchRgbImagery,
  fetchFluxData,
  calculatePanelProduction,
} from "../services/solarApi";
import proj4 from "proj4";

// Gemini API for direct calls (bypasses Cloud Run auth issues)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

// Define UTM zones for US (we'll detect the right one based on longitude)
function getUtmZone(lng) {
  return Math.floor((lng + 180) / 6) + 1;
}

function getUtmProjection(lat, lng) {
  const zone = getUtmZone(lng);
  const hemisphere = lat >= 0 ? "north" : "south";
  // UTM projection string
  return `+proj=utm +zone=${zone} +${hemisphere} +datum=WGS84 +units=m +no_defs`;
}

/**
 * Convert lat/lng to UTM coordinates then to pixel position
 * GeoTIFF bounds are in UTM, so we need to convert panel lat/lng to UTM first
 */
function latLngToPixelFromBounds(lat, lng, bounds, width, height, utmProj) {
  // bounds are [minX, minY, maxX, maxY] in UTM meters
  const [minX, minY, maxX, maxY] = bounds;

  // Convert lat/lng to UTM
  const [utmX, utmY] = proj4("EPSG:4326", utmProj, [lng, lat]);

  // Convert UTM to pixel position
  const x = ((utmX - minX) / (maxX - minX)) * width;
  const y = ((maxY - utmY) / (maxY - minY)) * height; // Flip Y (UTM Y increases up, pixels increase down)

  return { x, y };
}

/**
 * Calculate meters per pixel from GeoTIFF bounds (already in UTM meters)
 */
function metersPerPixelFromBounds(bounds, width, height) {
  const [minX, minY, maxX, maxY] = bounds;
  // Bounds are already in meters (UTM), so this is straightforward
  const widthMeters = maxX - minX;
  const heightMeters = maxY - minY;
  return (widthMeters / width + heightMeters / height) / 2;
}

/**
 * Visual roof diagram showing Solar API imagery with solar panel overlay
 * Uses GeoTIFF imagery from Solar API for perfect panel alignment
 */
export default function RoofVisualizer({
  latitude,
  longitude,
  panelCount,
  systemSizeKw,
  roofData,
  buildingCenter,
  roofSegments,
  solarPanels,
  panelDimensions,
  showAllPanels = false,
  onPanelCountChange,
  showSidePanel = true,
}) {
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageryData, setImageryData] = useState(null);
  const [fluxData, setFluxData] = useState(null);
  const [panelsWithProduction, setPanelsWithProduction] = useState(null);
  const [selectedPanelCount, setSelectedPanelCount] = useState(null); // null = not yet initialized

  // AI Generation state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreviewUrl, setAiPreviewUrl] = useState(null);
  const [showAiPreview, setShowAiPreview] = useState(false);

  // Calculate max panels - use passed panelCount prop as default if provided
  const maxPanels = solarPanels?.length || 0;
  const defaultPanelCount =
    panelCount > 0 ? panelCount : Math.round(maxPanels * 0.8);
  const panelWattage = panelDimensions?.capacityWatts || 400;

  // Initialize selected count when panels load - use the prop value
  // Also sync back to parent to ensure values match
  useEffect(() => {
    if (maxPanels > 0 && selectedPanelCount === null) {
      // Use the panelCount prop if provided, otherwise use 80% of max
      const initialCount =
        panelCount > 0 ? Math.min(panelCount, maxPanels) : defaultPanelCount;
      setSelectedPanelCount(initialCount);
      // Sync to parent on initialization
      const initialSystemKw = (initialCount * panelWattage) / 1000;
      onPanelCountChange?.(initialCount, initialSystemKw);
    }
  }, [
    maxPanels,
    defaultPanelCount,
    selectedPanelCount,
    panelCount,
    panelWattage,
    onPanelCountChange,
  ]);

  // Use selected count or fall back to default
  const activePanelCount = selectedPanelCount ?? defaultPanelCount;
  const currentSystemKw = (activePanelCount * panelWattage) / 1000;

  // Debug: log panel counts
  console.log("Panel counts:", {
    maxPanels,
    defaultPanelCount,
    selectedPanelCount,
    activePanelCount,
    propPanelCount: panelCount,
  });

  // Stepper functions - notify parent when count changes
  // Step by 1 panel at a time for precise 100% offset matching
  const decreasePanels = () => {
    const newCount = Math.max(1, activePanelCount - 1);
    setSelectedPanelCount(newCount);
    onPanelCountChange?.(newCount, (newCount * panelWattage) / 1000);
  };
  const increasePanels = () => {
    const newCount = Math.min(maxPanels, activePanelCount + 1);
    setSelectedPanelCount(newCount);
    onPanelCountChange?.(newCount, (newCount * panelWattage) / 1000);
  };

  // Display dimensions - responsive to container
  // Will be overridden by CSS for responsive sizing
  const baseDisplaySize = 560;
  const displayWidth = baseDisplaySize;
  const displayHeight = baseDisplaySize;

  // Export canvas + SVG as combined image
  const exportVisualization = useCallback(async () => {
    if (!canvasRef.current || !svgRef.current) return null;

    // Create a new canvas to composite everything
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = displayWidth * 2; // 2x for higher quality
    exportCanvas.height = displayHeight * 2;
    const ctx = exportCanvas.getContext("2d");
    ctx.scale(2, 2);

    // Draw the GeoTIFF background
    ctx.drawImage(canvasRef.current, 0, 0, displayWidth, displayHeight);

    // Convert SVG to image and draw on top
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
        URL.revokeObjectURL(svgUrl);
        resolve(exportCanvas.toDataURL("image/png"));
      };
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        resolve(exportCanvas.toDataURL("image/png")); // Return just the background
      };
      img.src = svgUrl;
    });
  }, [displayWidth, displayHeight]);

  // Export just the clean roof (no panels)
  const exportCleanRoof = useCallback(() => {
    if (!canvasRef.current) return null;
    return canvasRef.current.toDataURL("image/png");
  }, []);

  // Generate AI-enhanced realistic preview (calls Gemini directly)
  const generateRealisticPreview = useCallback(async () => {
    if (aiGenerating) return;

    if (!GEMINI_API_KEY) {
      alert("Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env");
      return;
    }

    setAiGenerating(true);
    try {
      // Capture both images
      const cleanRoofBase64 = exportCleanRoof();
      const withPanelsBase64 = await exportVisualization();

      if (!cleanRoofBase64 || !withPanelsBase64) {
        throw new Error("Failed to capture images");
      }

      console.log("🎨 Generating AI-enhanced solar preview...");

      // Strip data URL prefix for Gemini
      const cleanBase64 = cleanRoofBase64.replace(
        /^data:image\/\w+;base64,/,
        "",
      );
      const overlayBase64 = withPanelsBase64.replace(
        /^data:image\/\w+;base64,/,
        "",
      );

      const prompt = `You are an expert at generating photorealistic architectural renderings.

I'm providing you with two aerial/satellite images of a residential property:

IMAGE 1 (Clean Roof): Shows the actual roof of the house from above - this is the real satellite imagery showing the roof surface, shingles, obstacles (vents, chimneys, skylights), and surroundings.

IMAGE 2 (Panel Overlay): Shows the same view with colored rectangles overlaid where solar panels should be installed. These colored shapes indicate the planned panel positions.

YOUR TASK: Generate a single photorealistic aerial photograph showing this home with actual solar panels professionally installed on the roof.

CRITICAL REQUIREMENTS:
1. The solar panels must look REAL - dark blue/black monocrystalline cells with silver aluminum frames
2. Panels should have realistic light reflections based on the sun angle in the original image
3. Panels should cast appropriate shadows on the roof surface
4. The panels should follow the exact positions shown in the overlay image
5. Work AROUND any roof obstacles (vents, skylights, chimneys) visible in the clean roof image
6. Maintain the exact same perspective, lighting, and image quality as the original satellite photo
7. The result should be indistinguishable from a real drone photo of an installed solar system
8. This is a ${currentSystemKw?.toFixed(1) || "residential"} kW system with ${activePanelCount || "multiple"} panels

AVOID:
- Cartoon or illustrated look
- Panels floating above the roof
- Panels covering obstacles
- Inconsistent lighting or shadows
- Any text or watermarks

Generate only the photorealistic image, no text response.`;

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: "image/png", data: cleanBase64 } },
                {
                  inline_data: { mime_type: "image/png", data: overlayBase64 },
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", errorText);
        throw new Error("Gemini API request failed");
      }

      const data = await response.json();
      const imagePart = data.candidates?.[0]?.content?.parts?.find(
        (p) => p.inlineData || p.inline_data,
      );
      const imageData = imagePart?.inlineData || imagePart?.inline_data;

      if (imageData?.data) {
        const imageUrl = `data:image/${imageData.mimeType || "png"};base64,${imageData.data}`;
        setAiPreviewUrl(imageUrl);
        setShowAiPreview(true);
        console.log("✅ AI preview generated successfully");
      } else {
        throw new Error("No image in Gemini response");
      }
    } catch (err) {
      console.error("AI generation error:", err);
      alert("Failed to generate realistic preview. Please try again.");
    } finally {
      setAiGenerating(false);
    }
  }, [
    aiGenerating,
    exportCleanRoof,
    exportVisualization,
    activePanelCount,
    currentSystemKw,
  ]);

  // Use building center for imagery
  const centerLat = buildingCenter?.latitude || latitude;
  const centerLng = buildingCenter?.longitude || longitude;

  // Get UTM projection for this location
  const utmProj =
    centerLat && centerLng ? getUtmProjection(centerLat, centerLng) : null;

  // Panel dimensions in meters
  const panelHeightM = panelDimensions?.heightMeters || 1.65;
  const panelWidthM = panelDimensions?.widthMeters || 0.99;

  // Calculate optimal radius from panel positions with enough context to see the building
  const calculateRadius = () => {
    if (!solarPanels || solarPanels.length === 0 || !centerLat || !centerLng) {
      return 30; // Default fallback for residential
    }

    const metersPerDegreeLat = 111320;
    const metersPerDegreeLng = 111320 * Math.cos((centerLat * Math.PI) / 180);

    let maxDistance = 0;
    for (const panel of solarPanels) {
      if (!panel.center?.latitude || !panel.center?.longitude) continue;
      const dLat = (panel.center.latitude - centerLat) * metersPerDegreeLat;
      const dLng = (panel.center.longitude - centerLng) * metersPerDegreeLng;
      const distance = Math.sqrt(dLat * dLat + dLng * dLng);
      maxDistance = Math.max(maxDistance, distance);
    }

    // Add buffer: panel half-diagonal (~1m) + margin for building context (15m)
    // This ensures we see the full roof and some surrounding area
    const panelHalfDiagonal =
      Math.sqrt(panelHeightM * panelHeightM + panelWidthM * panelWidthM) / 2;
    const contextMargin = 15; // meters of surrounding area to show
    const radius = Math.ceil(maxDistance + panelHalfDiagonal + contextMargin);
    return Math.max(radius, 25); // Minimum 25m for residential context
  };

  const optimalRadius = calculateRadius();

  // Fetch Solar API imagery and flux data on mount
  useEffect(() => {
    if (!centerLat || !centerLng) return;

    async function loadImagery() {
      try {
        setLoading(true);
        setError(null);

        // Get data layers URLs with calculated radius
        const dataLayers = await getDataLayers(
          centerLat,
          centerLng,
          optimalRadius,
        );

        // Fetch RGB and flux data in parallel
        const [rgb, flux] = await Promise.all([
          fetchRgbImagery(dataLayers.rgbUrl),
          fetchFluxData(dataLayers.annualFluxUrl),
        ]);

        setImageryData(rgb);
        setFluxData(flux);
      } catch (err) {
        console.error("Failed to load Solar API data:", err);
        setError(err.message || "Failed to load imagery");
      } finally {
        setLoading(false);
      }
    }

    loadImagery();
  }, [centerLat, centerLng, optimalRadius]);

  // Calculate per-panel production when flux data and panels are available
  useEffect(() => {
    if (!fluxData || !solarPanels?.length || !utmProj) return;

    // Create conversion function for lat/lng to UTM
    const latLngToUtm = (lng, lat) => proj4("EPSG:4326", utmProj, [lng, lat]);

    const panelWattage = panelDimensions?.capacityWatts || 400;
    const optimizedPanels = calculatePanelProduction(
      solarPanels,
      fluxData,
      panelDimensions,
      panelWattage,
      latLngToUtm,
    );

    setPanelsWithProduction(optimizedPanels);
  }, [fluxData, solarPanels, panelDimensions, utmProj]);

  // Draw imagery to canvas when loaded
  useEffect(() => {
    if (!imageryData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set canvas size to display size
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Create temporary canvas for the GeoTIFF at its native size
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = imageryData.width;
    tempCanvas.height = imageryData.height;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.putImageData(imageryData.imageData, 0, 0);

    // Draw scaled to display canvas
    ctx.drawImage(tempCanvas, 0, 0, displayWidth, displayHeight);
  }, [imageryData, displayWidth, displayHeight]);

  if (!latitude || !longitude) {
    return (
      <div
        style={{
          width: "100%",
          height: 200,
          background: "var(--gray-100)",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <AlertCircle size={32} style={{ color: "var(--accent)" }} />
        <p style={{ color: "var(--gray-500)", margin: 0 }}>
          Location data not available
        </p>
      </div>
    );
  }

  // Get color based on panel production (green = high, yellow = medium, red = low)
  const getProductionColor = (panel) => {
    if (!panelsWithProduction || !panel.annualProductionKwh) {
      return "#1a1a2e"; // Default dark blue
    }

    // Find min/max production for color scaling
    const productions = panelsWithProduction
      .map((p) => p.annualProductionKwh)
      .filter((p) => p > 0);
    const maxProd = Math.max(...productions);
    const minProd = Math.min(...productions);
    const range = maxProd - minProd || 1;

    // Normalize to 0-1
    const normalized = (panel.annualProductionKwh - minProd) / range;

    // Color gradient: red (low) -> yellow (medium) -> green (high)
    if (normalized > 0.66) {
      return "#22c55e"; // Green - high production
    } else if (normalized > 0.33) {
      return "#eab308"; // Yellow - medium production
    } else {
      return "#ef4444"; // Red - low production
    }
  };

  // Render a single panel as an SVG polygon
  const SolarPanelPolygon = ({ panel, index }) => {
    if (
      !panel.center?.latitude ||
      !panel.center?.longitude ||
      !imageryData ||
      !utmProj
    )
      return null;

    // Convert panel center to pixels using GeoTIFF bounds (with UTM projection)
    // Scale from native GeoTIFF size to display size
    const nativeCenter = latLngToPixelFromBounds(
      panel.center.latitude,
      panel.center.longitude,
      imageryData.bounds,
      imageryData.width,
      imageryData.height,
      utmProj,
    );

    // Scale to display size
    const center = {
      x: (nativeCenter.x / imageryData.width) * displayWidth,
      y: (nativeCenter.y / imageryData.height) * displayHeight,
    };

    // Skip panels outside visible area
    if (
      center.x < -50 ||
      center.x > displayWidth + 50 ||
      center.y < -50 ||
      center.y > displayHeight + 50
    ) {
      return null;
    }

    // Get azimuth and pitch from the roof segment
    const segment = roofSegments?.[panel.segmentIndex];
    // Round azimuth to nearest 5 degrees for cleaner alignment
    const rawAzimuth = segment?.azimuthDegrees || 0;
    const azimuth = Math.round(rawAzimuth / 5) * 5;
    const pitch = segment?.pitchDegrees || 0;

    // Calculate meters per pixel at display scale
    const nativeMpp = metersPerPixelFromBounds(
      imageryData.bounds,
      imageryData.width,
      imageryData.height,
    );
    const displayScale = displayWidth / imageryData.width;
    const mpp = nativeMpp / displayScale;

    // Panel dimensions in meters
    const isPortrait = panel.orientation === "PORTRAIT";
    // For LANDSCAPE: long side (height) is along the slope direction
    // For PORTRAIT: long side (height) is perpendicular to slope
    const longSide = panelHeightM;
    const shortSide = panelWidthM;

    // Apply pitch foreshortening - panels on sloped roofs appear shorter in slope direction
    // The dimension going up/down the slope is compressed by cos(pitch)
    const pitchFactor = Math.cos((pitch * Math.PI) / 180);

    // For satellite view looking down:
    // - Dimension parallel to ridge (horizontal on roof) stays same
    // - Dimension perpendicular to ridge (up/down slope) is foreshortened
    let dimAlongSlope, dimAcrossSlope;
    if (isPortrait) {
      // PORTRAIT: long side is vertical (perpendicular to ridge, along slope)
      dimAlongSlope = longSide * pitchFactor;
      dimAcrossSlope = shortSide;
    } else {
      // LANDSCAPE: long side is horizontal (parallel to ridge)
      dimAlongSlope = shortSide * pitchFactor;
      dimAcrossSlope = longSide;
    }

    // Convert to pixels - width is across slope, height is along slope
    const halfW = dimAcrossSlope / 2 / mpp;
    const halfH = dimAlongSlope / 2 / mpp;

    // Rotation: azimuth is compass direction roof faces (0=N, 90=E, 180=S, 270=W)
    const rotation = (azimuth * Math.PI) / 180;

    // Calculate corners in pixel space, then rotate around center
    const corners = [
      { x: -halfW, y: -halfH },
      { x: halfW, y: -halfH },
      { x: halfW, y: halfH },
      { x: -halfW, y: halfH },
    ].map(({ x, y }) => {
      const rx = x * Math.cos(rotation) - y * Math.sin(rotation);
      const ry = x * Math.sin(rotation) + y * Math.cos(rotation);
      return { x: center.x + rx, y: center.y + ry };
    });

    const pointsStr = corners.map((p) => `${p.x},${p.y}`).join(" ");
    const fillColor = getProductionColor(panel);
    const production = panel.annualProductionKwh || 0;

    return (
      <polygon
        points={pointsStr}
        fill={fillColor}
        fillOpacity="0.85"
        stroke="#fff"
        strokeWidth="0.5"
      >
        <title>
          {production > 0 ? `${production} kWh/year` : "Loading..."}
        </title>
      </polygon>
    );
  };

  if (error) {
    return (
      <div
        style={{
          width: "100%",
          height: 200,
          background: "var(--gray-100)",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <AlertCircle size={32} style={{ color: "var(--accent)" }} />
        <p style={{ color: "var(--gray-500)", margin: 0 }}>{error}</p>
      </div>
    );
  }

  const hasPanelData = solarPanels && solarPanels.length > 0;

  // Calculate estimated production
  const estimatedProductionKwh = panelsWithProduction
    ? panelsWithProduction
        .slice(0, activePanelCount)
        .reduce((sum, p) => sum + (p.annualProductionKwh || 0), 0)
    : 0;
  const estimatedProductionMwh = estimatedProductionKwh / 1000;

  // Calculate specific yield (kWh per kW) - key solar performance metric
  const specificYield =
    currentSystemKw > 0
      ? Math.round(estimatedProductionKwh / currentSystemKw)
      : 0;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      {/* Map/Imagery Container - Fills parent */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          background: "#0f1419",
        }}
      >
        {/* Loading spinner */}
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 12,
              zIndex: 5,
            }}
          >
            <Loader2
              size={32}
              style={{
                color: "var(--primary)",
                animation: "spin 1s linear infinite",
              }}
            />
            <p style={{ color: "white", margin: 0, fontSize: "0.85rem" }}>
              Loading Solar API imagery...
            </p>
          </div>
        )}

        {/* Canvas for GeoTIFF imagery */}
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: !loading && imageryData ? 1 : 0,
            transition: "opacity 0.5s",
            zIndex: 1,
          }}
        />

        {/* Render panels as SVG overlay */}
        {!loading && imageryData && hasPanelData && (
          <svg
            ref={svgRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "auto",
              zIndex: 10,
            }}
            viewBox={`0 0 ${displayWidth} ${displayHeight}`}
            preserveAspectRatio="xMidYMid slice"
          >
            {(() => {
              const panels = panelsWithProduction || solarPanels;
              return panels.map((panel, i) => {
                const isUsed = i < activePanelCount;
                if (!showAllPanels && !isUsed) return null;
                return (
                  <SolarPanelPolygon
                    key={`panel-${i}-${activePanelCount}`}
                    panel={panel}
                    index={i}
                  />
                );
              });
            })()}
          </svg>
        )}

        {/* System Size Stepper Overlay */}
        {!loading && imageryData && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              background:
                "linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))",
              color: "white",
              padding: "6px 10px",
              borderRadius: "var(--radius)",
              fontSize: "0.85rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
              zIndex: 20,
            }}
          >
            <button
              onClick={decreasePanels}
              disabled={activePanelCount <= 1}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                borderRadius: 4,
                color: "white",
                cursor: activePanelCount <= 1 ? "not-allowed" : "pointer",
                opacity: activePanelCount <= 1 ? 0.5 : 1,
                padding: "4px 6px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <div style={{ minWidth: 80, textAlign: "center" }}>
              <Zap
                size={14}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />
              {currentSystemKw.toFixed(1)} kW
            </div>
            <button
              onClick={increasePanels}
              disabled={activePanelCount >= maxPanels}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                borderRadius: 4,
                color: "white",
                cursor:
                  activePanelCount >= maxPanels ? "not-allowed" : "pointer",
                opacity: activePanelCount >= maxPanels ? 0.5 : 1,
                padding: "4px 6px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Panel Count Overlay */}
        {!loading && imageryData && (
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(4px)",
              color: "white",
              padding: "8px 12px",
              borderRadius: "var(--radius)",
              fontSize: "0.8rem",
              boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
              zIndex: 20,
            }}
          >
            <Sun
              size={14}
              style={{
                color: "#fbbf24",
                marginRight: 6,
                verticalAlign: "middle",
              }}
            />
            {activePanelCount} of {maxPanels} Panels
          </div>
        )}

        {/* Specific Yield Overlay (kWh/kW) */}
        {specificYield > 0 && !loading && imageryData && (
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              background:
                "linear-gradient(135deg, rgba(251, 191, 36, 0.95), rgba(245, 158, 11, 0.95))",
              backdropFilter: "blur(4px)",
              color: "#1a1a2e",
              padding: "8px 12px",
              borderRadius: "var(--radius)",
              fontSize: "0.8rem",
              boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
              zIndex: 20,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: "1.1rem", lineHeight: 1 }}>
              {specificYield.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.65rem", opacity: 0.8, marginTop: 2 }}>
              kWh/kW/yr
            </div>
          </div>
        )}

        {/* Small production legend on map */}
        {panelsWithProduction && !loading && imageryData && (
          <div
            style={{
              position: "absolute",
              bottom: 12,
              right: 12,
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(4px)",
              padding: "8px 10px",
              borderRadius: "var(--radius)",
              fontSize: "0.7rem",
              color: "white",
              zIndex: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    background: "#22c55e",
                    borderRadius: 2,
                  }}
                />
                <span>High</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    background: "#eab308",
                    borderRadius: 2,
                  }}
                />
                <span>Med</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    background: "#ef4444",
                    borderRadius: 2,
                  }}
                />
                <span>Low</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Side Panel with Controls & Stats */}
      {showSidePanel && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            minWidth: 280,
          }}
        >
          {/* System Size Control */}
          <div
            style={{
              background: "linear-gradient(135deg, #0f172a, #1e293b)",
              borderRadius: "var(--radius-lg)",
              padding: 20,
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <h4
                style={{
                  margin: 0,
                  color: "white",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                }}
              >
                System Size
              </h4>
              <div
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "white",
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: "0.85rem",
                  fontWeight: 700,
                }}
              >
                {currentSystemKw.toFixed(1)} kW
              </div>
            </div>

            {/* Panel Stepper */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(255,255,255,0.05)",
                borderRadius: "var(--radius)",
                padding: "8px 12px",
              }}
            >
              <button
                onClick={decreasePanels}
                disabled={activePanelCount <= 4}
                style={{
                  background:
                    activePanelCount <= 4
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(239, 68, 68, 0.2)",
                  border: "none",
                  borderRadius: 6,
                  color: activePanelCount <= 4 ? "#666" : "#ef4444",
                  cursor: activePanelCount <= 4 ? "not-allowed" : "pointer",
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.2s",
                }}
              >
                <ChevronLeft size={20} />
              </button>

              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    color: "white",
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {activePanelCount}
                </div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                  }}
                >
                  of {maxPanels} panels
                </div>
              </div>

              <button
                onClick={increasePanels}
                disabled={activePanelCount >= maxPanels}
                style={{
                  background:
                    activePanelCount >= maxPanels
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(34, 197, 94, 0.2)",
                  border: "none",
                  borderRadius: 6,
                  color: activePanelCount >= maxPanels ? "#666" : "#22c55e",
                  cursor:
                    activePanelCount >= maxPanels ? "not-allowed" : "pointer",
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.2s",
                }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Production Stats */}
          <div
            style={{
              background: "linear-gradient(135deg, #0f172a, #1e293b)",
              borderRadius: "var(--radius-lg)",
              padding: 20,
              border: "1px solid rgba(255,255,255,0.1)",
              flex: 1,
            }}
          >
            <h4
              style={{
                margin: "0 0 16px 0",
                color: "white",
                fontSize: "0.9rem",
                fontWeight: 600,
              }}
            >
              Roof Analysis
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Sun Hours */}
              {roofData?.sunshineHoursPerYear && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "0.85rem",
                    }}
                  >
                    Sun Hours/Year
                  </span>
                  <span
                    style={{
                      color: "#fbbf24",
                      fontWeight: 600,
                      fontSize: "1rem",
                    }}
                  >
                    {roofData.sunshineHoursPerYear.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Max Capacity */}
              {roofData?.maxPanelsCapacity && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "0.85rem",
                    }}
                  >
                    Roof Capacity
                  </span>
                  <span
                    style={{
                      color: "#34d399",
                      fontWeight: 600,
                      fontSize: "1rem",
                    }}
                  >
                    {roofData.maxPanelsCapacity}
                  </span>
                </div>
              )}

              {/* Roof Utilization */}
              {roofData?.utilizationPercent && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "0.85rem",
                    }}
                  >
                    Roof Utilized
                  </span>
                  <span
                    style={{
                      color: "#60a5fa",
                      fontWeight: 600,
                      fontSize: "1rem",
                    }}
                  >
                    {Math.round((activePanelCount / maxPanels) * 100)}%
                  </span>
                </div>
              )}

              {/* Est Production */}
              {estimatedProductionMwh > 0 && (
                <>
                  <div
                    style={{
                      height: 1,
                      background: "rgba(255,255,255,0.1)",
                      margin: "4px 0",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        color: "rgba(255,255,255,0.6)",
                        fontSize: "0.85rem",
                      }}
                    >
                      Est. Production
                    </span>
                    <span
                      style={{
                        color: "#22c55e",
                        fontWeight: 700,
                        fontSize: "1.1rem",
                      }}
                    >
                      {estimatedProductionMwh.toFixed(1)} MWh/yr
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* AI Preview Button - Hidden for now */}
          {false && !loading && imageryData && hasPanelData && (
            <button
              onClick={generateRealisticPreview}
              disabled={aiGenerating}
              style={{
                background: aiGenerating
                  ? "rgba(139, 92, 246, 0.5)"
                  : "linear-gradient(135deg, #8b5cf6, #6366f1)",
                color: "white",
                border: "none",
                padding: "14px 20px",
                borderRadius: "var(--radius)",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: aiGenerating ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 2px 10px rgba(139, 92, 246, 0.4)",
                transition: "all 0.2s",
              }}
            >
              {aiGenerating ? (
                <>
                  <Loader2
                    size={18}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  Generating Preview...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate AI Preview
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* AI Preview Modal */}
      {showAiPreview && aiPreviewUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.9)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 20,
            padding: 20,
          }}
          onClick={() => setShowAiPreview(false)}
        >
          <div style={{ color: "white", textAlign: "center", maxWidth: 600 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: "1.5rem" }}>
              <Sparkles
                size={24}
                style={{ verticalAlign: "middle", marginRight: 8 }}
              />
              AI-Enhanced Preview
            </h2>
            <p style={{ margin: 0, opacity: 0.7 }}>
              Photorealistic rendering of your {currentSystemKw.toFixed(1)} kW
              solar installation
            </p>
          </div>
          <img
            src={aiPreviewUrl}
            alt="AI-generated solar installation preview"
            style={{
              maxWidth: "90%",
              maxHeight: "70vh",
              borderRadius: 12,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setShowAiPreview(false)}
            style={{
              background: "white",
              color: "#1f2937",
              border: "none",
              padding: "12px 24px",
              borderRadius: 8,
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close Preview
          </button>
        </div>
      )}
    </div>
  );
}
