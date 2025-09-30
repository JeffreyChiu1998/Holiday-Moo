import React, { useState } from "react";
import apiService from "../services/apiService";
import API_CONFIG from "../config/api-config";

const ApiTestPanel = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState({});
  const [apiUrl, setApiUrl] = useState(API_CONFIG.BASE_URL);

  const updateApiUrl = () => {
    // Update the API configuration
    API_CONFIG.BASE_URL = apiUrl;
    console.log("Updated API URL to:", apiUrl);
  };

  const testEndpoint = async (endpointName, testFunction) => {
    setLoading((prev) => ({ ...prev, [endpointName]: true }));

    try {
      const result = await testFunction();
      setTestResults((prev) => ({
        ...prev,
        [endpointName]: {
          status: "success",
          data: result,
          timestamp: new Date().toLocaleTimeString(),
        },
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [endpointName]: {
          status: "error",
          error: error.message,
          timestamp: new Date().toLocaleTimeString(),
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [endpointName]: false }));
    }
  };

  const testXAI = () => {
    return testEndpoint("xai", () =>
      apiService.callXAI(
        [{ role: "user", content: "Say hello in exactly 5 words" }],
        { maxTokens: 50 }
      )
    );
  };

  const testPerplexity = () => {
    return testEndpoint("perplexity", () =>
      apiService.callPerplexity(
        [{ role: "user", content: "What is the capital of France?" }],
        { maxTokens: 50 }
      )
    );
  };

  const testGooglePlaces = () => {
    return testEndpoint("googlePlaces", () =>
      apiService.callGooglePlaces("restaurants in Paris", {})
    );
  };

  const testHealthCheck = () => {
    return testEndpoint("health", () => apiService.healthCheck());
  };

  const ResultDisplay = ({ result }) => {
    if (!result) return null;

    return (
      <div className={`test-result ${result.status}`}>
        <div className="result-header">
          <span className={`status-badge ${result.status}`}>
            {result.status === "success" ? "✅" : "❌"}{" "}
            {result.status.toUpperCase()}
          </span>
          <span className="timestamp">{result.timestamp}</span>
        </div>

        {result.status === "success" ? (
          <div className="result-data">
            <pre>{JSON.stringify(result.data, null, 2)}</pre>
          </div>
        ) : (
          <div className="result-error">
            <strong>Error:</strong> {result.error}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="api-test-panel">
      <h3>🧪 API Gateway Test Panel</h3>

      <div className="api-config">
        <label>
          <strong>API Gateway URL:</strong>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod"
            style={{ width: "100%", marginTop: "5px", padding: "8px" }}
          />
        </label>
        <button onClick={updateApiUrl} style={{ marginTop: "10px" }}>
          Update API URL
        </button>
      </div>

      <div className="test-buttons">
        <h4>Test Endpoints:</h4>

        <button
          onClick={testHealthCheck}
          disabled={loading.health}
          className="test-button health"
        >
          {loading.health ? "🔄 Testing..." : "🏥 Health Check"}
        </button>

        <button
          onClick={testXAI}
          disabled={loading.xai}
          className="test-button xai"
        >
          {loading.xai ? "🔄 Testing..." : "🤖 Test xAI (Grok)"}
        </button>

        <button
          onClick={testPerplexity}
          disabled={loading.perplexity}
          className="test-button perplexity"
        >
          {loading.perplexity ? "🔄 Testing..." : "🔍 Test Perplexity"}
        </button>

        <button
          onClick={testGooglePlaces}
          disabled={loading.googlePlaces}
          className="test-button google"
        >
          {loading.googlePlaces ? "🔄 Testing..." : "📍 Test Google Places"}
        </button>
      </div>

      <div className="test-results">
        <h4>Test Results:</h4>

        <div className="result-section">
          <h5>Health Check:</h5>
          <ResultDisplay result={testResults.health} />
        </div>

        <div className="result-section">
          <h5>xAI (Grok) API:</h5>
          <ResultDisplay result={testResults.xai} />
        </div>

        <div className="result-section">
          <h5>Perplexity AI:</h5>
          <ResultDisplay result={testResults.perplexity} />
        </div>

        <div className="result-section">
          <h5>Google Places:</h5>
          <ResultDisplay result={testResults.googlePlaces} />
        </div>
      </div>

      <style jsx>{`
        .api-test-panel {
          padding: 20px;
          border: 2px solid #ddd;
          border-radius: 8px;
          margin: 20px 0;
          background: #f9f9f9;
        }

        .api-config {
          margin-bottom: 20px;
          padding: 15px;
          background: white;
          border-radius: 5px;
          border: 1px solid #ddd;
        }

        .test-buttons {
          margin-bottom: 20px;
        }

        .test-button {
          display: block;
          width: 100%;
          margin: 10px 0;
          padding: 12px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
        }

        .test-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .test-button.health {
          background: #e3f2fd;
          color: #1976d2;
        }
        .test-button.xai {
          background: #f3e5f5;
          color: #7b1fa2;
        }
        .test-button.perplexity {
          background: #e8f5e8;
          color: #388e3c;
        }
        .test-button.google {
          background: #fff3e0;
          color: #f57c00;
        }

        .test-button:hover:not(:disabled) {
          opacity: 0.8;
        }

        .result-section {
          margin: 15px 0;
          padding: 10px;
          background: white;
          border-radius: 5px;
          border: 1px solid #ddd;
        }

        .result-section h5 {
          margin: 0 0 10px 0;
          color: #333;
        }

        .test-result {
          border-radius: 4px;
          padding: 10px;
        }

        .test-result.success {
          background: #e8f5e8;
          border: 1px solid #4caf50;
        }

        .test-result.error {
          background: #ffebee;
          border: 1px solid #f44336;
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .status-badge {
          font-weight: bold;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .status-badge.success {
          background: #4caf50;
          color: white;
        }

        .status-badge.error {
          background: #f44336;
          color: white;
        }

        .timestamp {
          font-size: 12px;
          color: #666;
        }

        .result-data {
          background: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
        }

        .result-data pre {
          margin: 0;
          font-size: 12px;
          max-height: 200px;
          overflow-y: auto;
        }

        .result-error {
          color: #d32f2f;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default ApiTestPanel;
