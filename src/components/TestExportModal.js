import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import localExportService from "../services/localExportService";

const TestExportModal = ({ isOpen, onClose, trips, onTestExport }) => {
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [serviceStatus, setServiceStatus] = useState(null);

  // Check service status when modal opens
  useEffect(() => {
    if (isOpen) {
      checkServiceStatus();
      setSelectedTripId(null);
    }
  }, [isOpen]);

  const checkServiceStatus = async () => {
    try {
      const status = await localExportService.healthCheck();
      setServiceStatus(status);
    } catch (error) {
      setServiceStatus({ status: "error", message: error.message });
    }
  };

  const handleTestExport = () => {
    if (!selectedTripId) {
      alert("Please select a trip to export");
      return;
    }

    const selectedTrip = trips.find((trip) => trip.id === selectedTripId);
    if (!selectedTrip) {
      alert("Selected trip not found");
      return;
    }

    onTestExport(selectedTrip);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "600px", width: "90vw" }}
      >
        <div className="modal-header">
          <h2>🧪 Test Export - Beautiful Calendar Dashboard</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body" style={{ padding: "20px" }}>
          {/* Service Status */}
          {serviceStatus && (
            <div
              style={{
                padding: "12px",
                borderRadius: "6px",
                marginBottom: "16px",
                backgroundColor:
                  serviceStatus.status === "healthy" ? "#f0f9ff" : "#fef2f2",
                border: `1px solid ${
                  serviceStatus.status === "healthy" ? "#bfdbfe" : "#fecaca"
                }`,
                color:
                  serviceStatus.status === "healthy" ? "#1e40af" : "#dc2626",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span>{serviceStatus.status === "healthy" ? "✅" : "❌"}</span>
                <span>
                  {serviceStatus.status === "healthy"
                    ? "Local Python service is ready! 🐍"
                    : `Local service error: ${serviceStatus.message}`}
                </span>
              </div>
            </div>
          )}

          {serviceStatus?.status !== "healthy" && (
            <div
              style={{
                padding: "16px",
                borderRadius: "8px",
                marginBottom: "16px",
                backgroundColor: "#fef3c7",
                border: "1px solid #fcd34d",
                color: "#92400e",
              }}
            >
              <h4 style={{ margin: "0 0 8px 0" }}>🚀 Setup Instructions:</h4>
              <div style={{ fontSize: "14px", lineHeight: "1.5" }}>
                <p>
                  <strong>1. Install Python dependencies:</strong>
                </p>
                <code
                  style={{
                    backgroundColor: "#fff",
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  pip install flask flask-cors openpyxl
                </code>

                <p style={{ marginTop: "12px" }}>
                  <strong>2. Run the local service:</strong>
                </p>
                <code
                  style={{
                    backgroundColor: "#fff",
                    padding: "4px 8px",
                    borderRadius: "4px",
                  }}
                >
                  python src/services/localExportService.py
                </code>

                <p style={{ marginTop: "12px" }}>
                  <strong>3. Features you'll get:</strong>
                </p>
                <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
                  <li>📅 Calendar-focused dashboard layout</li>
                  <li>📊 Professional charts and statistics</li>
                  <li>🎨 Color-coded event types</li>
                  <li>📋 Multiple sheets with detailed information</li>
                </ul>
              </div>
            </div>
          )}

          <p style={{ marginBottom: "20px", color: "#6b7280" }}>
            Select a trip to test the beautiful calendar dashboard export with
            local Python service.
          </p>

          {trips.length === 0 ? (
            <div
              style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}
            >
              <p>No trips available to export.</p>
              <p>Create a trip first to use the test export feature.</p>
            </div>
          ) : (
            <div className="trip-selection-list">
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className={`trip-selection-item ${
                    selectedTripId === trip.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedTripId(trip.id)}
                  style={{
                    border: "2px solid",
                    borderColor:
                      selectedTripId === trip.id ? "#8b5cf6" : "#e5e7eb",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "12px",
                    cursor: "pointer",
                    backgroundColor:
                      selectedTripId === trip.id ? "#f3f4f6" : "#ffffff",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTripId !== trip.id) {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.backgroundColor = "#f9fafb";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTripId !== trip.id) {
                      e.target.style.borderColor = "#e5e7eb";
                      e.target.style.backgroundColor = "#ffffff";
                    }
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h3
                        style={{
                          margin: "0 0 8px 0",
                          color: "#1f2937",
                          fontSize: "18px",
                        }}
                      >
                        {trip.name}
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          gap: "16px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <strong style={{ color: "#374151" }}>Period:</strong>
                          <div style={{ color: "#6b7280" }}>
                            {formatDate(trip.startDate)} -{" "}
                            {formatDate(trip.endDate)}
                          </div>
                        </div>
                        <div>
                          <strong style={{ color: "#374151" }}>
                            Duration:
                          </strong>
                          <div style={{ color: "#6b7280" }}>
                            {calculateDuration(trip.startDate, trip.endDate)}{" "}
                            days
                          </div>
                        </div>
                        {trip.destination && (
                          <div>
                            <strong style={{ color: "#374151" }}>
                              Destination:
                            </strong>
                            <div style={{ color: "#6b7280" }}>
                              {trip.destination}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedTripId === trip.id && (
                      <div
                        style={{
                          color: "#8b5cf6",
                          fontSize: "24px",
                          marginLeft: "16px",
                        }}
                      >
                        ✓
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="modal-footer"
          style={{ padding: "20px", borderTop: "1px solid #e5e7eb" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ color: "#6b7280", fontSize: "14px" }}>
              {selectedTripId && serviceStatus?.status === "healthy" && (
                <>
                  Beautiful calendar dashboard with professional formatting 📊
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={onClose} className="cancel-button">
                Cancel
              </button>
              <button
                onClick={handleTestExport}
                className="confirm-button"
                disabled={
                  !selectedTripId ||
                  trips.length === 0 ||
                  serviceStatus?.status !== "healthy"
                }
                style={{
                  backgroundColor:
                    selectedTripId && serviceStatus?.status === "healthy"
                      ? "#8b5cf6"
                      : "#9ca3af",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor:
                    selectedTripId && serviceStatus?.status === "healthy"
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                🧪 Test Export
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TestExportModal;
