import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import awsExportService from "../services/awsExportService";

const TripExportModal = ({
  isOpen,
  onClose,
  trips,
  onExportTrip,
  calendarData,
}) => {
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [serviceStatus, setServiceStatus] = useState(null);
  const [exportError, setExportError] = useState(null);

  // Check service status when modal opens
  useEffect(() => {
    if (isOpen) {
      checkServiceStatus();
      setExportError(null);
    }
  }, [isOpen]);

  const checkServiceStatus = async () => {
    try {
      const status = await awsExportService.healthCheck();
      setServiceStatus(status);
    } catch (error) {
      setServiceStatus({ status: "error", message: error.message });
    }
  };

  const handleExport = async () => {
    if (!selectedTripId) {
      setExportError("Please select a trip to export");
      return;
    }

    const selectedTrip = trips.find((trip) => trip.id === selectedTripId);
    if (!selectedTrip) {
      setExportError("Selected trip not found");
      return;
    }

    if (!awsExportService.isAvailable()) {
      setExportError(
        "Export service is not available. Please check your configuration."
      );
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      // Use AWS Lambda service for export
      const result = await awsExportService.exportToExcel(
        calendarData,
        selectedTrip
      );

      // Download the file
      awsExportService.downloadExcelFile(result.filename, result.data);

      // Call the original export handler if provided (for compatibility)
      if (onExportTrip) {
        await onExportTrip(selectedTrip);
      }

      onClose();
    } catch (error) {
      console.error("Export error:", error);
      setExportError(error.message || "Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
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
          <h2>📤 Export Trip Calendar</h2>
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
                  serviceStatus.status === "healthy"
                    ? "#f0f9ff"
                    : serviceStatus.status === "disabled"
                    ? "#fef3c7"
                    : "#fef2f2",
                border: `1px solid ${
                  serviceStatus.status === "healthy"
                    ? "#bfdbfe"
                    : serviceStatus.status === "disabled"
                    ? "#fcd34d"
                    : "#fecaca"
                }`,
                color:
                  serviceStatus.status === "healthy"
                    ? "#1e40af"
                    : serviceStatus.status === "disabled"
                    ? "#92400e"
                    : "#dc2626",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span>
                  {serviceStatus.status === "healthy"
                    ? "✅"
                    : serviceStatus.status === "disabled"
                    ? "⚠️"
                    : "❌"}
                </span>
                <span>
                  {serviceStatus.status === "healthy"
                    ? "Export service is ready"
                    : serviceStatus.status === "disabled"
                    ? "Export service is not configured"
                    : `Export service error: ${serviceStatus.message}`}
                </span>
              </div>
            </div>
          )}

          {/* Export Error */}
          {exportError && (
            <div
              style={{
                padding: "12px",
                borderRadius: "6px",
                marginBottom: "16px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span>❌</span>
                <span>{exportError}</span>
              </div>
            </div>
          )}

          <p style={{ marginBottom: "20px", color: "#6b7280" }}>
            Select a trip to export as an Excel calendar with detailed event
            information.
          </p>

          {trips.length === 0 ? (
            <div
              style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}
            >
              <p>No trips available to export.</p>
              <p>Create a trip first to use the export feature.</p>
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
                      selectedTripId === trip.id ? "#3b82f6" : "#e5e7eb",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "12px",
                    cursor: "pointer",
                    backgroundColor:
                      selectedTripId === trip.id ? "#eff6ff" : "#ffffff",
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
                          color: "#3b82f6",
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
              {selectedTripId && (
                <>Export will include calendar view and detailed event list</>
              )}
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={onClose}
                className="cancel-button"
                disabled={isExporting}
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="confirm-button"
                disabled={
                  !selectedTripId ||
                  isExporting ||
                  trips.length === 0 ||
                  (serviceStatus && serviceStatus.status !== "healthy")
                }
                style={{
                  backgroundColor:
                    selectedTripId &&
                    !isExporting &&
                    serviceStatus?.status === "healthy"
                      ? "#3b82f6"
                      : "#9ca3af",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor:
                    selectedTripId &&
                    !isExporting &&
                    serviceStatus?.status === "healthy"
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                {isExporting ? "📤 Exporting..." : "📤 Export Excel"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TripExportModal;
