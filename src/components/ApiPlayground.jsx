import { useState } from "react";
import { Play, AlertCircle, CheckCircle, Loader } from "lucide-react";
import {
  getBuildingInsights,
  designSolarSystem,
  getDataLayers,
} from "../services/solarApi";
import "../styles/ApiPlayground.css";

const ApiPlayground = () => {
  const [activeEndpoint, setActiveEndpoint] = useState("getBuildingInsights");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Form states for different endpoints
  const [latitude, setLatitude] = useState("30.2672");
  const [longitude, setLongitude] = useState("-97.7431");
  const [annualUsage, setAnnualUsage] = useState("12000");
  const [targetOffset, setTargetOffset] = useState("1.0");

  const endpoints = {
    getBuildingInsights: {
      name: "Get Building Insights",
      description: "Fetch solar potential data for a property",
      params: ["latitude", "longitude"],
    },
    designSolarSystem: {
      name: "Design Solar System",
      description: "Complete system design with panel configuration",
      params: ["latitude", "longitude", "annualUsage", "targetOffset"],
    },
    getDataLayers: {
      name: "Get Data Layers",
      description: "Fetch GeoTIFF imagery URLs",
      params: ["latitude", "longitude"],
    },
  };

  const executeEndpoint = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let response;
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      switch (activeEndpoint) {
        case "getBuildingInsights":
          response = await getBuildingInsights(lat, lng);
          break;

        case "designSolarSystem":
          response = await designSolarSystem(
            lat,
            lng,
            parseInt(annualUsage),
            parseFloat(targetOffset),
          );
          break;

        case "getDataLayers":
          response = await getDataLayers(lat, lng);
          break;

        default:
          throw new Error("Unknown endpoint");
      }

      setResult(response);
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const renderParamInputs = () => {
    const params = endpoints[activeEndpoint].params;

    return (
      <div className="param-inputs">
        {params.includes("latitude") && (
          <div className="input-group">
            <label>Latitude</label>
            <input
              type="number"
              step="0.0001"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="30.2672"
            />
          </div>
        )}

        {params.includes("longitude") && (
          <div className="input-group">
            <label>Longitude</label>
            <input
              type="number"
              step="0.0001"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="-97.7431"
            />
          </div>
        )}

        {params.includes("annualUsage") && (
          <div className="input-group">
            <label>Annual Usage (kWh)</label>
            <input
              type="number"
              value={annualUsage}
              onChange={(e) => setAnnualUsage(e.target.value)}
              placeholder="12000"
            />
          </div>
        )}

        {params.includes("targetOffset") && (
          <div className="input-group">
            <label>Target Offset</label>
            <input
              type="number"
              step="0.1"
              value={targetOffset}
              onChange={(e) => setTargetOffset(e.target.value)}
              placeholder="1.0"
            />
            <span className="input-hint">1.0 = 100% offset</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="api-playground">
      <div className="playground-header">
        <h2>API Playground</h2>
        <p>Test API endpoints with live data</p>
      </div>

      <div className="playground-content">
        {/* Endpoint Selector */}
        <div className="endpoint-selector">
          <label>Select Endpoint</label>
          <select
            value={activeEndpoint}
            onChange={(e) => {
              setActiveEndpoint(e.target.value);
              setResult(null);
              setError(null);
            }}
          >
            {Object.entries(endpoints).map(([key, endpoint]) => (
              <option key={key} value={key}>
                {endpoint.name}
              </option>
            ))}
          </select>
          <p className="endpoint-description">
            {endpoints[activeEndpoint].description}
          </p>
        </div>

        {/* Parameter Inputs */}
        {renderParamInputs()}

        {/* Execute Button */}
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
              Execute API Call
            </>
          )}
        </button>

        {/* Results */}
        {error && (
          <div className="result-box error">
            <div className="result-header">
              <AlertCircle size={20} />
              <span>Error</span>
            </div>
            <pre>{error}</pre>
          </div>
        )}

        {result && (
          <div className="result-box success">
            <div className="result-header">
              <CheckCircle size={20} />
              <span>Success</span>
            </div>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiPlayground;
