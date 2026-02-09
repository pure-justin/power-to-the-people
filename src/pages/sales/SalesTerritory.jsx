import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";
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
  MapPin,
  Navigation,
  Route,
  Home,
  Users,
  Target,
  Clock,
  ChevronRight,
  Calendar,
  Sun,
  Zap,
  ListOrdered,
  Map as MapIcon,
  Filter,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function DoorKnockCard({ lead, index, onSelect }) {
  return (
    <button
      onClick={() => onSelect(lead)}
      className="card-padded flex w-full items-start gap-3 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {lead.customerName || lead.name || "Unnamed"}
        </p>
        <p className="truncate text-xs text-gray-500">
          {lead.address || "No address on file"}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
          {lead.score !== undefined && (
            <span className="font-medium">Score: {lead.score}</span>
          )}
          <span className="capitalize">{lead.status || "new"}</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
    </button>
  );
}

// Color mapping for lead statuses (matches SalesPerformance.jsx palette)
const STATUS_MARKER_COLORS = {
  new: "#3B82F6", // blue-500
  contacted: "#6366F1", // indigo-500
  qualified: "#10B981", // emerald-500
  site_survey: "#14B8A6", // teal-500
  proposal: "#F59E0B", // amber-500
  negotiation: "#F97316", // orange-500
  contract: "#A855F7", // purple-500
  won: "#22C55E", // green-500
  lost: "#EF4444", // red-500
};

function getMarkerColor(status) {
  return STATUS_MARKER_COLORS[status] || "#10B981";
}

function LeadMap({ leads, optimizedRoute, onSelectLead }) {
  const { isLoaded, error, maps } = useGoogleMaps();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const infoWindowRef = useRef(null);

  // Filter leads that have valid lat/lng
  const mappableLeads = leads.filter(
    (l) => l.lat != null && l.lng != null && !isNaN(l.lat) && !isNaN(l.lng),
  );

  // Initialize the map
  useEffect(() => {
    if (!isLoaded || !maps || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Already initialized

    // Compute center from leads, default to US center
    let center = { lat: 32.7767, lng: -96.797 }; // Dallas, TX default
    if (mappableLeads.length > 0) {
      const avgLat =
        mappableLeads.reduce((sum, l) => sum + Number(l.lat), 0) /
        mappableLeads.length;
      const avgLng =
        mappableLeads.reduce((sum, l) => sum + Number(l.lng), 0) /
        mappableLeads.length;
      center = { lat: avgLat, lng: avgLng };
    }

    mapInstanceRef.current = new maps.Map(mapContainerRef.current, {
      center,
      zoom: mappableLeads.length > 0 ? 10 : 5,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    });

    infoWindowRef.current = new maps.InfoWindow();
  }, [isLoaded, maps]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render markers when leads change
  const updateMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !maps) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (mappableLeads.length === 0) return;

    const bounds = new maps.LatLngBounds();

    mappableLeads.forEach((lead) => {
      const position = {
        lat: Number(lead.lat),
        lng: Number(lead.lng),
      };
      const color = getMarkerColor(lead.status);

      // Create an SVG marker icon
      const svgIcon = {
        path: maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 0.85,
        strokeColor: "#ffffff",
        strokeWeight: 2,
        scale: 8,
      };

      const marker = new maps.Marker({
        position,
        map: mapInstanceRef.current,
        icon: svgIcon,
        title: lead.customerName || lead.name || lead.address || "Lead",
        cursor: "pointer",
      });

      marker.addListener("click", () => {
        if (infoWindowRef.current) {
          const statusLabel = (lead.status || "new")
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          infoWindowRef.current.setContent(
            `<div style="padding:4px 0;min-width:160px;">` +
              `<p style="margin:0 0 4px;font-weight:600;font-size:14px;">${lead.customerName || lead.name || "Unnamed"}</p>` +
              `<p style="margin:0 0 2px;font-size:12px;color:#666;">${lead.address || "No address"}</p>` +
              `<p style="margin:0;font-size:12px;">` +
              `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:4px;vertical-align:middle;"></span>` +
              `${statusLabel}` +
              `${lead.score != null ? ` &middot; Score: ${lead.score}` : ""}` +
              `</p>` +
              `</div>`,
          );
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        }
        if (onSelectLead) {
          onSelectLead(lead);
        }
      });

      bounds.extend(position);
      markersRef.current.push(marker);
    });

    // Fit bounds with padding if we have more than one marker
    if (mappableLeads.length > 1) {
      mapInstanceRef.current.fitBounds(bounds, {
        top: 40,
        right: 40,
        bottom: 40,
        left: 40,
      });
    } else if (mappableLeads.length === 1) {
      mapInstanceRef.current.setCenter(bounds.getCenter());
      mapInstanceRef.current.setZoom(14);
    }
  }, [maps, mappableLeads, onSelectLead]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  // Draw optimized route polyline
  useEffect(() => {
    if (!mapInstanceRef.current || !maps) return;

    // Clear previous polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (!optimizedRoute || optimizedRoute.length < 2) return;

    const routeCoords = optimizedRoute
      .filter(
        (stop) =>
          stop.lat != null &&
          stop.lng != null &&
          !isNaN(stop.lat) &&
          !isNaN(stop.lng),
      )
      .map((stop) => ({
        lat: Number(stop.lat),
        lng: Number(stop.lng),
      }));

    if (routeCoords.length < 2) return;

    polylineRef.current = new maps.Polyline({
      path: routeCoords,
      geodesic: true,
      strokeColor: "#10B981",
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map: mapInstanceRef.current,
    });
  }, [maps, optimizedRoute]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
      mapInstanceRef.current = null;
    };
  }, []);

  // Error fallback
  if (error) {
    return (
      <div className="card-padded">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <MapIcon className="h-5 w-5 text-emerald-600" />
            Territory Map
          </h2>
        </div>
        <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" />
            <p className="mt-2 text-sm font-medium text-gray-600">
              Unable to load map
            </p>
            <p className="mt-1 text-xs text-gray-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Build the status legend from leads that are actually on the map
  const statusesOnMap = [
    ...new Set(mappableLeads.map((l) => l.status || "new")),
  ];

  return (
    <div className="card-padded">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <MapIcon className="h-5 w-5 text-emerald-600" />
          Territory Map
        </h2>
        <span className="text-xs text-gray-400">
          {mappableLeads.length} of {leads.length} leads mapped
        </span>
      </div>

      {/* Google Map */}
      <div
        ref={mapContainerRef}
        className="mb-4 h-80 w-full rounded-xl border border-gray-200 lg:h-96"
        style={{ minHeight: "320px" }}
      >
        {!isLoaded && (
          <div className="flex h-full items-center justify-center rounded-xl bg-gray-50">
            <div className="text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      {/* Status Legend */}
      {statusesOnMap.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-gray-500">Legend:</span>
          {statusesOnMap.map((status) => (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: getMarkerColor(status) }}
              />
              <span className="text-xs capitalize text-gray-600">
                {status.replace(/_/g, " ")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SalesTerritory() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(
    WEEKDAYS[Math.min(Math.max(new Date().getDay() - 1, 0), 4)] || "Monday",
  );
  const [optimizeBy, setOptimizeBy] = useState("score");
  const [selectedLead, setSelectedLead] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const q = query(
          collection(db, "leads"),
          where("assignedTo", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(500),
        );
        const snap = await getDocs(q);
        setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Failed to load territory data:", err);
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
        <div className="h-64 rounded-xl bg-gray-100" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  // Filter leads
  const activeStatuses = [
    "new",
    "contacted",
    "qualified",
    "site_survey",
    "proposal",
    "negotiation",
    "contract",
  ];
  let territoryLeads = leads;
  if (statusFilter === "active") {
    territoryLeads = leads.filter((l) => activeStatuses.includes(l.status));
  } else if (statusFilter === "new") {
    territoryLeads = leads.filter((l) => l.status === "new");
  }

  const leadsWithAddress = territoryLeads.filter((l) => l.address);
  const leadsWithoutAddress = territoryLeads.filter((l) => !l.address);

  // Sort for door-knock optimization
  let optimizedLeads = [...leadsWithAddress];
  if (optimizeBy === "score") {
    optimizedLeads.sort((a, b) => (b.score || 0) - (a.score || 0));
  } else if (optimizeBy === "status") {
    const statusOrder = {
      new: 0,
      contacted: 1,
      qualified: 2,
      site_survey: 3,
      proposal: 4,
      negotiation: 5,
      contract: 6,
    };
    optimizedLeads.sort(
      (a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99),
    );
  } else {
    // proximity: group by zip code
    optimizedLeads.sort((a, b) => {
      const aZip = a.address?.match(/\b(\d{5})\b/)?.[1] || "";
      const bZip = b.address?.match(/\b(\d{5})\b/)?.[1] || "";
      return aZip.localeCompare(bZip);
    });
  }

  // Daily target: split leads across weekdays
  const dailyTarget = Math.ceil(optimizedLeads.length / 5);
  const dayIndex = WEEKDAYS.indexOf(selectedDay);
  const dayLeads = optimizedLeads.slice(
    dayIndex * dailyTarget,
    (dayIndex + 1) * dailyTarget,
  );

  // Stats
  const totalWithAddress = leadsWithAddress.length;
  const avgScore =
    leadsWithAddress.length > 0
      ? Math.round(
          leadsWithAddress.reduce((sum, l) => sum + (l.score || 0), 0) /
            leadsWithAddress.length,
        )
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Territory</h1>
        <p className="mt-1 text-sm text-gray-500">
          Map view and door-knock route optimizer for your assigned leads.
        </p>
      </div>

      {/* Territory Map */}
      <LeadMap
        leads={leadsWithAddress}
        optimizedRoute={dayLeads}
        onSelectLead={setSelectedLead}
      />

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card-padded">
          <p className="text-sm text-gray-500">Leads with Address</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {totalWithAddress}
          </p>
        </div>
        <div className="card-padded">
          <p className="text-sm text-gray-500">No Address</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {leadsWithoutAddress.length}
          </p>
        </div>
        <div className="card-padded">
          <p className="text-sm text-gray-500">Avg Lead Score</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{avgScore}</p>
        </div>
        <div className="card-padded">
          <p className="text-sm text-gray-500">Daily Target</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{dailyTarget}</p>
        </div>
      </div>

      {/* Door-Knock Optimizer */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Route className="h-5 w-5 text-emerald-600" />
            Door-Knock Route
          </h2>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-auto text-sm"
            >
              <option value="active">Active Leads</option>
              <option value="new">New Only</option>
              <option value="all">All Leads</option>
            </select>
          </div>
        </div>

        {/* Day Selector */}
        <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
          {WEEKDAYS.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                selectedDay === day
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>

        {/* Optimize By */}
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-gray-500">Optimize by:</span>
          {[
            { value: "score", label: "Lead Score", icon: Target },
            { value: "proximity", label: "Proximity", icon: Navigation },
            { value: "status", label: "Stage", icon: ListOrdered },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setOptimizeBy(opt.value)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                optimizeBy === opt.value
                  ? "bg-emerald-100 text-emerald-700"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <opt.icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          ))}
        </div>

        {/* Daily Route List */}
        {dayLeads.length === 0 ? (
          <div className="card-padded py-12 text-center">
            <Navigation className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">
              No leads with addresses for {selectedDay}.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Add addresses to your leads to generate routes.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              {dayLeads.length} stops for {selectedDay}
            </p>
            {dayLeads.map((lead, i) => (
              <DoorKnockCard
                key={lead.id}
                lead={lead}
                index={i}
                onSelect={setSelectedLead}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lead Detail Quick View */}
      {selectedLead && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setSelectedLead(null)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm overflow-y-auto bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedLead.customerName ||
                  selectedLead.name ||
                  "Lead Details"}
              </h2>
              <button
                onClick={() => setSelectedLead(null)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>
            <div className="space-y-4 p-6">
              {selectedLead.address && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Address</p>
                  <p className="text-sm text-gray-600">
                    {selectedLead.address}
                  </p>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedLead.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    <Navigation className="h-3.5 w-3.5" /> Get Directions
                  </a>
                </div>
              )}
              {selectedLead.phone && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Phone</p>
                  <a
                    href={`tel:${selectedLead.phone}`}
                    className="text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    {selectedLead.phone}
                  </a>
                </div>
              )}
              {selectedLead.email && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Email</p>
                  <a
                    href={`mailto:${selectedLead.email}`}
                    className="text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    {selectedLead.email}
                  </a>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-700">Status</p>
                <p className="text-sm capitalize text-gray-600">
                  {selectedLead.status || "new"}
                </p>
              </div>
              {selectedLead.score !== undefined && (
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Lead Score
                  </p>
                  <p className="text-sm text-gray-600">{selectedLead.score}</p>
                </div>
              )}
              {selectedLead.notes && selectedLead.notes.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    Latest Note
                  </p>
                  <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                    {selectedLead.notes[selectedLead.notes.length - 1].text}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
