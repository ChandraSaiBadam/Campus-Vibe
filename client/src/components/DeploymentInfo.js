import React, { useState, useEffect } from "react";
import {
  getEnvironment,
  isProduction,
  healthCheck,
  getApiBaseUrl,
} from "../config/api";

/**
 * DeploymentInfo Component
 * Displays deployment information and health status
 * Only visible in non-production environments or when explicitly enabled
 */
const DeploymentInfo = ({ forceShow = false }) => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [buildInfo, setBuildInfo] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development/staging or when forced
    if (!isProduction() || forceShow) {
      setIsVisible(true);
      loadBuildInfo();
      checkHealth();
    }
  }, [forceShow]);

  const loadBuildInfo = async () => {
    try {
      const response = await fetch("/build-info.json");
      if (response.ok) {
        const info = await response.json();
        setBuildInfo(info);
      }
    } catch (error) {
      console.warn("Could not load build info:", error);
    }
  };

  const checkHealth = async () => {
    try {
      const status = await healthCheck();
      setHealthStatus(status);
    } catch (error) {
      setHealthStatus({
        status: "error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-sm z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-sm">Deployment Info</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div>
          <span className="font-medium">Environment:</span>{" "}
          <span
            className={`px-2 py-1 rounded text-xs ${
              getEnvironment() === "production"
                ? "bg-green-600"
                : getEnvironment() === "staging"
                ? "bg-yellow-600"
                : "bg-blue-600"
            }`}
          >
            {getEnvironment()}
          </span>
        </div>

        <div>
          <span className="font-medium">API URL:</span>{" "}
          <span className="text-blue-300 break-all">{getApiBaseUrl()}</span>
        </div>

        {buildInfo && (
          <div>
            <span className="font-medium">Build:</span>{" "}
            <span className="text-gray-300">
              {buildInfo.version} ({buildInfo.buildHash})
            </span>
          </div>
        )}

        {healthStatus && (
          <div>
            <span className="font-medium">Health:</span>{" "}
            <span
              className={`px-2 py-1 rounded text-xs ${
                healthStatus.status === "healthy"
                  ? "bg-green-600"
                  : "bg-red-600"
              }`}
            >
              {healthStatus.status}
            </span>
          </div>
        )}

        <button
          onClick={checkHealth}
          className="w-full mt-2 bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
        >
          Refresh Health
        </button>
      </div>
    </div>
  );
};

export default DeploymentInfo;
