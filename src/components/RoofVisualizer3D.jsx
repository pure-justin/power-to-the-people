import { useEffect, useRef, useState, useCallback } from "react";
import { Viewer, Entity, Cesium3DTileset } from "resium";
import {
  Ion,
  IonResource,
  Cartesian3,
  Cartographic,
  Color,
  HeadingPitchRoll,
  Transforms,
  Math as CesiumMath,
  defined,
  HeadingPitchRange,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Quaternion,
  Matrix3,
  Matrix4,
} from "cesium";
import { Loader2, RotateCcw, ZoomIn, ZoomOut, Target } from "lucide-react";

// Set Cesium Ion token
Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

// Google Photorealistic 3D Tiles asset ID on Cesium Ion
const GOOGLE_3D_TILES_ASSET_ID = 2275207;

// Panel dimensions in meters
const PANEL_THICKNESS = 0.04; // 4cm thick
const PANEL_HEIGHT_OFFSET = 0.3; // Raise panels 30cm (~12 inches) above roof for visibility

/**
 * Compute orientation quaternion for a panel on a tilted roof surface.
 *
 * @param {Cartesian3} position - Panel position in ECEF coordinates
 * @param {number} azimuthDegrees - Compass direction the roof faces (0=N, 90=E, 180=S, 270=W)
 * @param {number} pitchDegrees - Roof tilt from horizontal (0=flat, 90=vertical)
 * @returns {Quaternion} Orientation quaternion for the panel
 */
function computeRoofSurfaceOrientation(position, azimuthDegrees, pitchDegrees) {
  // Convert to radians
  const azimuthRad = CesiumMath.toRadians(azimuthDegrees);
  const pitchRad = CesiumMath.toRadians(pitchDegrees);

  // Calculate roof surface normal in local ENU (East-North-Up) coordinates
  // For a roof facing 'azimuth' direction with 'pitch' tilt:
  // - The normal tilts AWAY from the azimuth direction (toward the uphill side)
  // - azimuth=180 (south-facing) means normal tilts toward +Y (North) and up
  // - The roof slopes DOWN toward azimuth, normal points UP and away from azimuth
  const normalEast = -Math.sin(azimuthRad) * Math.sin(pitchRad);
  const normalNorth = -Math.cos(azimuthRad) * Math.sin(pitchRad);
  const normalUp = Math.cos(pitchRad);

  // The panel's local Z axis (up/normal) should align with the roof normal
  // The panel's local Y axis should point in the azimuth direction (downslope)
  // The panel's local X axis is perpendicular to both (across the slope)

  // Get the ENU to ECEF rotation at this position
  const enuToEcef = Transforms.eastNorthUpToFixedFrame(position);

  // Create rotation matrix from ENU axes
  // We want: local X = across slope, local Y = along slope, local Z = roof normal

  // Horizontal direction toward azimuth (the direction the roof faces/slopes toward)
  const hE = Math.sin(azimuthRad);
  const hN = Math.cos(azimuthRad);
  const hU = 0;

  // Project the horizontal azimuth direction onto the roof plane
  // Y = H - (H · N) * N, where N is the roof normal
  // This gives the tangent vector on the roof surface pointing toward azimuth
  const dotHN = hE * normalEast + hN * normalNorth + hU * normalUp;
  const yAxisEast = hE - dotHN * normalEast;
  const yAxisNorth = hN - dotHN * normalNorth;
  const yAxisUp = hU - dotHN * normalUp;

  // Normalize Y axis
  const yLen = Math.sqrt(
    yAxisEast * yAxisEast + yAxisNorth * yAxisNorth + yAxisUp * yAxisUp,
  );
  const yE = yAxisEast / yLen;
  const yN = yAxisNorth / yLen;
  const yU = yAxisUp / yLen;

  // Panel's Z axis is the roof normal (calculated above)
  const zE = normalEast;
  const zN = normalNorth;
  const zU = normalUp;

  // Panel's X axis = Y cross Z (right-handed system)
  // X = Y × Z
  const xAxisEast = yN * zU - yU * zN;
  const xAxisNorth = yU * zE - yE * zU;
  const xAxisUp = yE * zN - yN * zE;

  // Normalize the X axis
  const xLen = Math.sqrt(
    xAxisEast * xAxisEast + xAxisNorth * xAxisNorth + xAxisUp * xAxisUp,
  );
  const xE = xAxisEast / xLen;
  const xN = xAxisNorth / xLen;
  const xU = xAxisUp / xLen;

  // Create rotation matrix: columns are X, Y, Z axes in ENU coordinates
  // This represents the rotation from the panel's local frame to ENU
  const rotationMatrix = new Matrix3(
    xE,
    yE,
    zE, // Column 0: X axis in ENU
    xN,
    yN,
    zN, // Column 1: Y axis in ENU
    xU,
    yU,
    zU, // Column 2: Z axis in ENU
  );

  // Convert rotation matrix to quaternion (this is the ENU-relative rotation)
  const rotationQuat = Quaternion.fromRotationMatrix(rotationMatrix);

  // Get the ENU to ECEF quaternion from the transform matrix
  const enuToEcefRotation = Matrix4.getMatrix3(enuToEcef, new Matrix3());
  const enuToEcefQuat = Quaternion.fromRotationMatrix(enuToEcefRotation);

  // Combine: first apply panel rotation (in ENU), then ENU to ECEF
  // Final = enuToEcefQuat * rotationQuat
  return Quaternion.multiply(enuToEcefQuat, rotationQuat, new Quaternion());
}

/**
 * 3D Roof Visualizer using Cesium and Google Photorealistic 3D Tiles
 * Panels are clamped to the actual building surface using clampToHeightMostDetailed
 */
export default function RoofVisualizer3D({
  latitude,
  longitude,
  solarPanels = [],
  roofSegments = [],
  panelCount = 20,
  maxPanels = 30,
  buildingCenter,
  panelDimensions,
  onPanelCountChange,
  showControls = true,
}) {
  const viewerRef = useRef(null);
  const tilesetRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [heightsReady, setHeightsReady] = useState(false);
  const [clampedPositions, setClampedPositions] = useState([]);
  const [activePanelCount, setActivePanelCount] = useState(panelCount);
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const [useRealisticPanels, setUseRealisticPanels] = useState(true); // Toggle for panel appearance

  // Use building center from Solar API (more accurate than address geocoding)
  const centerLat = buildingCenter?.latitude || latitude;
  const centerLng = buildingCenter?.longitude || longitude;

  // Panel dimensions from API or defaults
  const panelW = panelDimensions?.widthMeters || 1.0;
  const panelH = panelDimensions?.heightMeters || 1.7;

  // Clamp panels to the 3D tileset surface
  const clampPanelsToSurface = useCallback(async () => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || solarPanels.length === 0) return;

    setStatusMessage("Sampling building heights...");

    // Create Cartesian3 positions for all panels
    const positions = solarPanels
      .slice(0, maxPanels)
      .map((panel) => {
        if (!panel.center?.latitude || !panel.center?.longitude) return null;
        return Cartesian3.fromDegrees(
          panel.center.longitude,
          panel.center.latitude,
          0, // Start at ground level
        );
      })
      .filter((p) => p !== null);

    if (positions.length === 0) {
      setLoading(false);
      return;
    }

    try {
      // Use clampToHeightMostDetailed to get actual building surface heights
      // This loads the necessary tiles asynchronously
      const clamped = await viewer.scene.clampToHeightMostDetailed(positions);

      // Store clamped positions with panel data
      const panelsWithHeight = solarPanels
        .slice(0, maxPanels)
        .map((panel, i) => {
          const clampedPos = clamped[i];
          if (!defined(clampedPos)) {
            // Fallback: use segment height estimate + offset
            const segment = roofSegments[panel.segmentIndex];
            const fallbackHeight =
              (segment?.planeHeightAtCenterMeters || 10) + PANEL_HEIGHT_OFFSET;
            return {
              ...panel,
              position: Cartesian3.fromDegrees(
                panel.center.longitude,
                panel.center.latitude,
                fallbackHeight,
              ),
              heightSource: "fallback",
            };
          }
          // Add height offset to raise panel above roof for visibility
          const carto = Cartographic.fromCartesian(clampedPos);
          const raisedPos = Cartesian3.fromRadians(
            carto.longitude,
            carto.latitude,
            carto.height + PANEL_HEIGHT_OFFSET,
          );
          return {
            ...panel,
            position: raisedPos,
            heightSource: "clamped",
          };
        });

      setClampedPositions(panelsWithHeight);
      setHeightsReady(true);
      setStatusMessage("");
      setLoading(false);
    } catch (err) {
      console.error("Height sampling error:", err);
      setStatusMessage("Using estimated heights");

      // Fallback to segment heights
      const fallbackPanels = solarPanels.slice(0, maxPanels).map((panel) => {
        const segment = roofSegments[panel.segmentIndex];
        const height =
          (segment?.planeHeightAtCenterMeters || 10) + PANEL_HEIGHT_OFFSET;
        return {
          ...panel,
          position: Cartesian3.fromDegrees(
            panel.center.longitude,
            panel.center.latitude,
            height,
          ),
          heightSource: "estimated",
        };
      });
      setClampedPositions(fallbackPanels);
      setHeightsReady(true);
      setLoading(false);
    }
  }, [solarPanels, roofSegments, maxPanels]);

  // Handle tileset ready - fly to building and sample heights
  const handleTilesetReady = useCallback(
    async (tileset) => {
      tilesetRef.current = tileset;
      setStatusMessage("Flying to location...");

      const viewer = viewerRef.current?.cesiumElement;
      if (!viewer) return;

      // Fly camera to center on the building - position camera south of building looking north
      const destination = Cartesian3.fromDegrees(
        centerLng,
        centerLat - 0.001, // Position camera south of building
        150, // Higher altitude for better overview
      );

      await viewer.camera.flyTo({
        destination,
        orientation: {
          heading: CesiumMath.toRadians(0), // Looking north toward building
          pitch: CesiumMath.toRadians(-45), // Looking down at 45 degrees
          roll: 0,
        },
        duration: 2,
      });

      // Wait for tiles to load at this location
      setStatusMessage("Loading 3D tiles...");

      // Give tiles time to load, then sample heights
      // The clampToHeightMostDetailed will load additional tiles as needed
      setTimeout(() => {
        clampPanelsToSurface();
      }, 2000);
    },
    [centerLat, centerLng, clampPanelsToSurface],
  );

  // Camera controls
  const resetCamera = () => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(centerLng, centerLat - 0.001, 150),
      orientation: {
        heading: CesiumMath.toRadians(0),
        pitch: CesiumMath.toRadians(-45),
        roll: 0,
      },
      duration: 1,
    });
  };

  const zoomIn = () => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;
    viewer.camera.zoomIn(15);
  };

  const zoomOut = () => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;
    viewer.camera.zoomOut(15);
  };

  // Adjust panel count
  const handlePanelChange = (delta) => {
    const newCount = Math.max(4, Math.min(maxPanels, activePanelCount + delta));
    setActivePanelCount(newCount);
    onPanelCountChange?.(newCount);
  };

  // Get panel color based on mode
  const getPanelColor = (index, total) => {
    if (useRealisticPanels) {
      // Realistic black-on-black solar panel with glass-like appearance
      // Slight blue tint like real monocrystalline panels
      return Color.fromCssColorString("#0a0f1a").withAlpha(0.85); // Dark with slight transparency for glass effect
    }
    // Production-based coloring (panels are pre-sorted by production)
    const ratio = index / Math.max(total - 1, 1);
    if (ratio < 0.33) return Color.fromCssColorString("#22c55e").withAlpha(0.9); // Green - high
    if (ratio < 0.66) return Color.fromCssColorString("#eab308").withAlpha(0.9); // Yellow - medium
    return Color.fromCssColorString("#ef4444").withAlpha(0.9); // Red - lower
  };

  // Get outline color based on mode
  const getOutlineColor = () => {
    if (useRealisticPanels) {
      return Color.fromCssColorString("#2a2a2a"); // Dark frame for black panels
    }
    return Color.WHITE;
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 500,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Loading overlay */}
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 16,
            zIndex: 100,
          }}
        >
          <Loader2
            size={40}
            style={{ color: "#10b981", animation: "spin 1s linear infinite" }}
          />
          <p style={{ color: "white", margin: 0 }}>
            {statusMessage || "Loading 3D Building..."}
          </p>
        </div>
      )}

      {/* Cesium Viewer */}
      <Viewer
        ref={viewerRef}
        full
        timeline={false}
        animation={false}
        homeButton={false}
        geocoder={false}
        sceneModePicker={false}
        baseLayerPicker={false}
        navigationHelpButton={false}
        fullscreenButton={false}
        vrButton={false}
        infoBox={false}
        selectionIndicator={false}
        shadows={true}
        style={{ width: "100%", height: "100%" }}
        onMount={(viewer) => {
          // Hide the globe but keep it enabled (required by resium)
          if (viewer.scene.globe) {
            viewer.scene.globe.show = false;
          }
          // Remove default imagery layer
          viewer.imageryLayers.removeAll();

          // Enhance rendering quality
          viewer.scene.postProcessStages.fxaa.enabled = true; // Anti-aliasing
          viewer.scene.highDynamicRange = false; // Better colors
          viewer.scene.fog.enabled = false; // Disable fog for clearer view
          viewer.scene.light.intensity = 2.0; // Brighter lighting
        }}
      >
        {/* Google Photorealistic 3D Tiles */}
        <Cesium3DTileset
          url={IonResource.fromAssetId(GOOGLE_3D_TILES_ASSET_ID)}
          onReady={handleTilesetReady}
          maximumScreenSpaceError={2} // Higher quality (lower = more detail)
          showCreditsOnScreen={true}
          preferLeaves={true} // Load highest detail first
        />

        {/* Render panels only after heights are ready */}
        {heightsReady &&
          clampedPositions.slice(0, activePanelCount).map((panel, index) => {
            if (!panel.position) return null;

            const segment = roofSegments[panel.segmentIndex] || {};
            // Solar API azimuth: compass direction roof faces (0=N, 90=E, 180=S, 270=W)
            const azimuthDeg = segment.azimuthDegrees ?? 180;
            // Solar API pitch: roof tilt angle from horizontal (0=flat, 90=vertical)
            const pitchDeg = segment.pitchDegrees ?? 20;

            // HeadingPitchRoll approach:
            // - Heading: azimuth + 180 to flip direction
            // - Pitch: 0
            // - Roll: roof pitch
            const heading = CesiumMath.toRadians(azimuthDeg + 180);
            const pitch = 0;
            const roll = CesiumMath.toRadians(pitchDeg);

            const orientation = Transforms.headingPitchRollQuaternion(
              panel.position,
              new HeadingPitchRoll(heading, pitch, roll),
            );

            // Panel dimensions based on orientation
            // - PORTRAIT: long edge parallel to azimuth (along slope)
            // - LANDSCAPE: long edge perpendicular to azimuth (across slope)
            const isPortrait = panel.orientation === "PORTRAIT";
            const boxWidth = isPortrait ? panelW : panelH;
            const boxLength = isPortrait ? panelH : panelW;

            return (
              <Entity
                key={`panel-${index}`}
                position={panel.position}
                orientation={orientation}
                box={{
                  dimensions: new Cartesian3(
                    boxWidth,
                    boxLength,
                    PANEL_THICKNESS,
                  ),
                  material: getPanelColor(index, activePanelCount),
                  outline: true,
                  outlineColor: getOutlineColor(),
                  outlineWidth: useRealisticPanels ? 2 : 1,
                }}
                description={`Panel ${index + 1}: ${panel.yearlyEnergyDcKwh?.toFixed(0) || "~400"} kWh/year`}
              />
            );
          })}
      </Viewer>

      {/* Controls overlay */}
      {showControls && (
        <>
          {/* Panel count control */}
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(8px)",
              padding: "10px 14px",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              gap: 12,
              zIndex: 50,
            }}
          >
            <button
              onClick={() => handlePanelChange(-4)}
              disabled={activePanelCount <= 4}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: 6,
                color: "white",
                padding: "8px 12px",
                fontWeight: 600,
                cursor: activePanelCount <= 4 ? "not-allowed" : "pointer",
                opacity: activePanelCount <= 4 ? 0.4 : 1,
              }}
            >
              -4
            </button>
            <div style={{ color: "white", minWidth: 100, textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                {activePanelCount} Panels
              </div>
              <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                {(
                  (activePanelCount * (panelDimensions?.capacityWatts || 400)) /
                  1000
                ).toFixed(1)}{" "}
                kW
              </div>
            </div>
            <button
              onClick={() => handlePanelChange(4)}
              disabled={activePanelCount >= maxPanels}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: 6,
                color: "white",
                padding: "8px 12px",
                fontWeight: 600,
                cursor:
                  activePanelCount >= maxPanels ? "not-allowed" : "pointer",
                opacity: activePanelCount >= maxPanels ? 0.4 : 1,
              }}
            >
              +4
            </button>
          </div>

          {/* Panel style toggle */}
          <div
            style={{
              position: "absolute",
              top: 80,
              left: 12,
              zIndex: 50,
            }}
          >
            <button
              onClick={() => setUseRealisticPanels(!useRealisticPanels)}
              style={{
                background: useRealisticPanels
                  ? "rgba(0,0,0,0.9)"
                  : "linear-gradient(135deg, #22c55e, #eab308, #ef4444)",
                border: "none",
                borderRadius: 8,
                color: "white",
                padding: "8px 14px",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              {useRealisticPanels ? "🖤 Realistic" : "🌈 Production"}
            </button>
          </div>

          {/* Camera controls */}
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              zIndex: 50,
            }}
          >
            <button
              onClick={resetCamera}
              style={{
                background: "rgba(0,0,0,0.8)",
                border: "none",
                borderRadius: 8,
                color: "white",
                padding: 10,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Center on Building"
            >
              <Target size={18} />
            </button>
            <button
              onClick={zoomIn}
              style={{
                background: "rgba(0,0,0,0.8)",
                border: "none",
                borderRadius: 8,
                color: "white",
                padding: 10,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={zoomOut}
              style={{
                background: "rgba(0,0,0,0.8)",
                border: "none",
                borderRadius: 8,
                color: "white",
                padding: 10,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </button>
          </div>

          {/* Legend */}
          <div
            style={{
              position: "absolute",
              bottom: 12,
              right: 12,
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(8px)",
              padding: "12px 16px",
              borderRadius: 10,
              zIndex: 50,
            }}
          >
            <div
              style={{
                color: "white",
                fontSize: "0.8rem",
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              Production Ranking
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    background: "#22c55e",
                    borderRadius: 4,
                  }}
                />
                <span style={{ color: "white", fontSize: "0.75rem" }}>
                  Best
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    background: "#eab308",
                    borderRadius: 4,
                  }}
                />
                <span style={{ color: "white", fontSize: "0.75rem" }}>
                  Good
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    background: "#ef4444",
                    borderRadius: 4,
                  }}
                />
                <span style={{ color: "white", fontSize: "0.75rem" }}>
                  Fair
                </span>
              </div>
            </div>
          </div>

          {/* Location badge */}
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              background: "linear-gradient(135deg, #10b981, #059669)",
              padding: "10px 16px",
              borderRadius: 10,
              zIndex: 50,
            }}
          >
            <div
              style={{ color: "white", fontSize: "0.85rem", fontWeight: 600 }}
            >
              3D Solar Preview
            </div>
            <div
              style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.75rem" }}
            >
              Photorealistic 3D Tiles
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
