import { useState, useCallback, useRef } from "react";
import {
  Play,
  AlertCircle,
  CheckCircle,
  Loader,
  Copy,
  Check,
  Clock,
  Trash2,
  ChevronDown,
  ChevronRight,
  Terminal,
  Download,
} from "lucide-react";
import {
  getBuildingInsights,
  designSolarSystem,
  getDataLayers,
} from "../services/solarApi";
import "../styles/ApiPlayground.css";

const ENDPOINT_CATEGORIES = {
  solar: {
    label: "Solar API",
    endpoints: {
      getBuildingInsights: {
        name: "Get Building Insights",
        method: "GET",
        description: "Fetch solar potential data for a property",
        params: [
          {
            key: "latitude",
            label: "Latitude",
            type: "number",
            default: "30.2672",
            step: "0.0001",
            required: true,
          },
          {
            key: "longitude",
            label: "Longitude",
            type: "number",
            default: "-97.7431",
            step: "0.0001",
            required: true,
          },
        ],
        curlTemplate: (p) =>
          `curl -G "https://solar.googleapis.com/v1/buildingInsights:findClosest" \\\n  --data-urlencode "location.latitude=${p.latitude}" \\\n  --data-urlencode "location.longitude=${p.longitude}" \\\n  --data-urlencode "key=YOUR_API_KEY"`,
      },
      designSolarSystem: {
        name: "Design Solar System",
        method: "POST",
        description:
          "Complete system design with panel configuration and battery",
        params: [
          {
            key: "latitude",
            label: "Latitude",
            type: "number",
            default: "30.2672",
            step: "0.0001",
            required: true,
          },
          {
            key: "longitude",
            label: "Longitude",
            type: "number",
            default: "-97.7431",
            step: "0.0001",
            required: true,
          },
          {
            key: "annualUsage",
            label: "Annual Usage (kWh)",
            type: "number",
            default: "12000",
            required: true,
          },
          {
            key: "targetOffset",
            label: "Target Offset",
            type: "number",
            default: "1.0",
            step: "0.1",
            hint: "1.0 = 100% offset",
          },
        ],
        curlTemplate: (p) =>
          `# This is a client-side function.\n# Equivalent API call:\ncurl -G "https://solar.googleapis.com/v1/buildingInsights:findClosest" \\\n  --data-urlencode "location.latitude=${p.latitude}" \\\n  --data-urlencode "location.longitude=${p.longitude}" \\\n  --data-urlencode "key=YOUR_API_KEY"`,
      },
      getDataLayers: {
        name: "Get Data Layers",
        method: "GET",
        description: "Fetch GeoTIFF imagery and flux data URLs",
        params: [
          {
            key: "latitude",
            label: "Latitude",
            type: "number",
            default: "30.2672",
            step: "0.0001",
            required: true,
          },
          {
            key: "longitude",
            label: "Longitude",
            type: "number",
            default: "-97.7431",
            step: "0.0001",
            required: true,
          },
        ],
        curlTemplate: (p) =>
          `curl -G "https://solar.googleapis.com/v1/dataLayers:get" \\\n  --data-urlencode "location.latitude=${p.latitude}" \\\n  --data-urlencode "location.longitude=${p.longitude}" \\\n  --data-urlencode "radiusMeters=50" \\\n  --data-urlencode "key=YOUR_API_KEY"`,
      },
    },
  },
  leads: {
    label: "Lead Management",
    endpoints: {
      createLead: {
        name: "Create Lead",
        method: "POST",
        description: "Create a new solar installation lead",
        params: [
          {
            key: "name",
            label: "Full Name",
            type: "text",
            default: "John Smith",
            required: true,
          },
          {
            key: "email",
            label: "Email",
            type: "email",
            default: "john@example.com",
            required: true,
          },
          {
            key: "phone",
            label: "Phone",
            type: "text",
            default: "512-555-0100",
          },
          {
            key: "address",
            label: "Address",
            type: "text",
            default: "123 Solar St, Austin, TX 78701",
            required: true,
          },
          {
            key: "annualUsage",
            label: "Annual Usage (kWh)",
            type: "number",
            default: "12000",
          },
        ],
        curlTemplate: (p) =>
          `curl -X POST \\\n  'https://us-central1-power-to-the-people-vpp.cloudfunctions.net/createLead' \\\n  -H 'Authorization: Bearer YOUR_TOKEN' \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify({ data: { name: p.name, email: p.email, phone: p.phone, address: p.address, annualUsageKwh: parseInt(p.annualUsage) || 12000 } }, null, 2)}'`,
        demoOnly: true,
      },
      searchLeads: {
        name: "Search Leads",
        method: "GET",
        description: "Search leads by name, email, phone, or address",
        params: [
          {
            key: "searchTerm",
            label: "Search Term",
            type: "text",
            default: "Austin, TX",
            required: true,
          },
        ],
        curlTemplate: (p) =>
          `# Client-side Firestore query:\n# searchProjects("${p.searchTerm}")\n# Searches across: name, email, phone, address, document ID`,
        demoOnly: true,
      },
    },
  },
  coordinator: {
    label: "Agent Coordinator",
    endpoints: {
      healthCheck: {
        name: "Health Check",
        method: "GET",
        description: "Check Mac Studio coordinator health status",
        params: [],
        curlTemplate: () => `curl http://100.124.119.18:5050/health`,
        liveEndpoint: "http://100.124.119.18:5050/health",
      },
      listAgents: {
        name: "List Agents",
        method: "GET",
        description: "List all registered agents in the coordinator",
        params: [],
        curlTemplate: () => `curl http://100.124.119.18:5050/coord/agents`,
        liveEndpoint: "http://100.124.119.18:5050/coord/agents",
      },
      getTasks: {
        name: "Get Tasks",
        method: "GET",
        description: "Get shared task queue with optional status filter",
        params: [
          {
            key: "status",
            label: "Status Filter",
            type: "select",
            options: ["all", "pending", "in_progress", "completed", "failed"],
            default: "all",
          },
        ],
        curlTemplate: (p) =>
          p.status === "all"
            ? `curl http://100.124.119.18:5050/coord/tasks`
            : `curl 'http://100.124.119.18:5050/coord/tasks?status=${p.status}'`,
        liveEndpoint: "http://100.124.119.18:5050/coord/tasks",
      },
    },
  },
};

const ApiPlayground = () => {
  const [activeCategory, setActiveCategory] = useState("solar");
  const [activeEndpoint, setActiveEndpoint] = useState("getBuildingInsights");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [responseTime, setResponseTime] = useState(null);
  const [paramValues, setParamValues] = useState({});
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showCurl, setShowCurl] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({
    solar: true,
    leads: false,
    coordinator: false,
  });
  const resultRef = useRef(null);

  const currentEndpoint =
    ENDPOINT_CATEGORIES[activeCategory]?.endpoints[activeEndpoint];

  const getParamValue = (key) => {
    if (paramValues[key] !== undefined) return paramValues[key];
    const param = currentEndpoint?.params.find((p) => p.key === key);
    return param?.default || "";
  };

  const setParamValue = (key, value) => {
    setParamValues((prev) => ({ ...prev, [key]: value }));
  };

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const selectEndpoint = (categoryId, endpointId) => {
    setActiveCategory(categoryId);
    setActiveEndpoint(endpointId);
    setResult(null);
    setError(null);
    setResponseTime(null);
    setShowCurl(false);
    setParamValues({});
  };

  const executeEndpoint = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setResponseTime(null);

    const startTime = performance.now();
    const params = {};
    currentEndpoint.params.forEach((p) => {
      params[p.key] = getParamValue(p.key);
    });

    try {
      let response;

      if (currentEndpoint.demoOnly) {
        // Simulate for demo-only endpoints
        await new Promise((r) => setTimeout(r, 800));
        response = {
          _demo: true,
          message: `This is a demo response for ${currentEndpoint.name}. In production, this would call the actual API.`,
          params,
          timestamp: new Date().toISOString(),
        };
      } else if (currentEndpoint.liveEndpoint) {
        const url = new URL(currentEndpoint.liveEndpoint);
        if (params.status && params.status !== "all") {
          url.searchParams.set("status", params.status);
        }
        const res = await fetch(url.toString(), {
          signal: AbortSignal.timeout(10000),
        });
        response = await res.json();
      } else {
        // Solar API calls
        const lat = parseFloat(params.latitude);
        const lng = parseFloat(params.longitude);

        switch (activeEndpoint) {
          case "getBuildingInsights":
            response = await getBuildingInsights(lat, lng);
            break;
          case "designSolarSystem":
            response = await designSolarSystem(
              lat,
              lng,
              parseInt(params.annualUsage),
              parseFloat(params.targetOffset),
            );
            break;
          case "getDataLayers":
            response = await getDataLayers(lat, lng);
            break;
          default:
            throw new Error("Unknown endpoint");
        }
      }

      const elapsed = Math.round(performance.now() - startTime);
      setResponseTime(elapsed);
      setResult(response);

      // Add to history
      setHistory((prev) =>
        [
          {
            endpoint: currentEndpoint.name,
            method: currentEndpoint.method,
            params: { ...params },
            timestamp: new Date().toISOString(),
            duration: elapsed,
            success: true,
          },
          ...prev,
        ].slice(0, 20),
      );

      // Scroll to result
      setTimeout(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
    } catch (err) {
      const elapsed = Math.round(performance.now() - startTime);
      setResponseTime(elapsed);
      setError(err.message || "An error occurred");

      setHistory((prev) =>
        [
          {
            endpoint: currentEndpoint.name,
            method: currentEndpoint.method,
            params: { ...params },
            timestamp: new Date().toISOString(),
            duration: elapsed,
            success: false,
            error: err.message,
          },
          ...prev,
        ].slice(0, 20),
      );
    } finally {
      setLoading(false);
    }
  };

  const getCurlCommand = () => {
    if (!currentEndpoint?.curlTemplate) return "";
    const params = {};
    currentEndpoint.params.forEach((p) => {
      params[p.key] = getParamValue(p.key);
    });
    return currentEndpoint.curlTemplate(params);
  };

  const downloadResult = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeEndpoint}-response.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="api-playground">
      <div className="playground-header">
        <div className="playground-title-row">
          <div>
            <h2>API Playground</h2>
            <p>Test API endpoints with live data</p>
          </div>
          <div className="playground-actions">
            <button
              className={`pg-action-btn ${showHistory ? "active" : ""}`}
              onClick={() => setShowHistory(!showHistory)}
              title="Request History"
            >
              <Clock size={16} />
              {history.length > 0 && (
                <span className="history-count">{history.length}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Request History Panel */}
      {showHistory && history.length > 0 && (
        <div className="history-panel">
          <div className="history-header">
            <h4>Request History</h4>
            <button
              className="history-clear"
              onClick={() => setHistory([])}
              title="Clear history"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="history-list">
            {history.map((entry, idx) => (
              <div
                key={idx}
                className={`history-item ${entry.success ? "success" : "error"}`}
              >
                <span
                  className={`history-method ${entry.method.toLowerCase()}`}
                >
                  {entry.method}
                </span>
                <span className="history-name">{entry.endpoint}</span>
                <span className="history-time">{entry.duration}ms</span>
                <span
                  className={`history-status ${entry.success ? "ok" : "fail"}`}
                >
                  {entry.success ? "200" : "ERR"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="playground-layout">
        {/* Endpoint Sidebar */}
        <div className="endpoint-sidebar">
          {Object.entries(ENDPOINT_CATEGORIES).map(([catId, category]) => (
            <div key={catId} className="endpoint-category">
              <button
                className="category-toggle"
                onClick={() =>
                  setExpandedCategories((prev) => ({
                    ...prev,
                    [catId]: !prev[catId],
                  }))
                }
              >
                {expandedCategories[catId] ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
                <span>{category.label}</span>
              </button>
              {expandedCategories[catId] && (
                <div className="endpoint-list">
                  {Object.entries(category.endpoints).map(([epId, ep]) => (
                    <button
                      key={epId}
                      className={`endpoint-item ${activeCategory === catId && activeEndpoint === epId ? "active" : ""}`}
                      onClick={() => selectEndpoint(catId, epId)}
                    >
                      <span className={`ep-method ${ep.method.toLowerCase()}`}>
                        {ep.method}
                      </span>
                      <span className="ep-name">{ep.name}</span>
                      {ep.demoOnly && <span className="ep-demo">Demo</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Main Panel */}
        <div className="endpoint-main">
          {currentEndpoint && (
            <>
              <div className="endpoint-info">
                <div className="endpoint-info-header">
                  <span
                    className={`method-pill ${currentEndpoint.method.toLowerCase()}`}
                  >
                    {currentEndpoint.method}
                  </span>
                  <span className="endpoint-name-display">
                    {currentEndpoint.name}
                  </span>
                  {currentEndpoint.demoOnly && (
                    <span className="demo-badge">Demo Mode</span>
                  )}
                </div>
                <p className="endpoint-desc">{currentEndpoint.description}</p>
              </div>

              {/* Parameter Inputs */}
              {currentEndpoint.params.length > 0 && (
                <div className="param-section">
                  <h4>Parameters</h4>
                  <div className="param-inputs">
                    {currentEndpoint.params.map((param) => (
                      <div key={param.key} className="input-group">
                        <label>
                          {param.label}
                          {param.required && (
                            <span className="required-star">*</span>
                          )}
                        </label>
                        {param.type === "select" ? (
                          <select
                            value={getParamValue(param.key)}
                            onChange={(e) =>
                              setParamValue(param.key, e.target.value)
                            }
                          >
                            {param.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={
                              param.type === "email"
                                ? "email"
                                : param.type === "number"
                                  ? "number"
                                  : "text"
                            }
                            step={param.step}
                            value={getParamValue(param.key)}
                            onChange={(e) =>
                              setParamValue(param.key, e.target.value)
                            }
                            placeholder={param.default}
                          />
                        )}
                        {param.hint && (
                          <span className="input-hint">{param.hint}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="action-row">
                <button
                  className="execute-button"
                  onClick={executeEndpoint}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader className="spin" size={18} />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play size={18} />
                      Send Request
                    </>
                  )}
                </button>

                <button
                  className={`curl-toggle ${showCurl ? "active" : ""}`}
                  onClick={() => setShowCurl(!showCurl)}
                >
                  <Terminal size={16} />
                  cURL
                </button>
              </div>

              {/* cURL Preview */}
              {showCurl && (
                <div className="curl-preview">
                  <div className="curl-header">
                    <span>cURL Command</span>
                    <button
                      className="curl-copy"
                      onClick={() => copyToClipboard(getCurlCommand())}
                    >
                      {copied ? (
                        <>
                          <Check size={14} /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={14} /> Copy
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="curl-code">{getCurlCommand()}</pre>
                </div>
              )}

              {/* Results */}
              <div ref={resultRef}>
                {error && (
                  <div className="result-box error">
                    <div className="result-header">
                      <div className="result-status">
                        <AlertCircle size={18} />
                        <span>Error</span>
                      </div>
                      {responseTime !== null && (
                        <span className="response-time">{responseTime}ms</span>
                      )}
                    </div>
                    <pre>{error}</pre>
                  </div>
                )}

                {result && (
                  <div className="result-box success">
                    <div className="result-header">
                      <div className="result-status">
                        <CheckCircle size={18} />
                        <span>200 OK</span>
                      </div>
                      <div className="result-actions">
                        {responseTime !== null && (
                          <span className="response-time">
                            {responseTime}ms
                          </span>
                        )}
                        <button
                          className="result-action-btn"
                          onClick={() =>
                            copyToClipboard(JSON.stringify(result, null, 2))
                          }
                          title="Copy response"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          className="result-action-btn"
                          onClick={downloadResult}
                          title="Download JSON"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiPlayground;
