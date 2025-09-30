import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { MAPS_CONFIG as GOOGLE_MAPS_CONFIG } from "../config/maps";
import DocumentPreview from "./DocumentPreview";

const EventDetailModal = ({ event, trip, onEdit, onDelete, onClose }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const formatDate = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDuration = () => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const diffMs = end - start;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return diffMinutes > 0
        ? `${diffHours}h ${diffMinutes}m`
        : `${diffHours}h`;
    }
    return `${diffMinutes}m`;
  };

  const getLocationCoordinates = useCallback(() => {
    // Check for coordinates directly on the event object (from bucket list items)
    if (event.coordinates && typeof event.coordinates === "object") {
      return event.coordinates;
    }
    // Check for coordinates nested in location object (legacy format)
    if (typeof event.location === "object" && event.location?.coordinates) {
      return event.location.coordinates;
    }
    return null;
  }, [event.location, event.coordinates]);

  const getLocationName = useCallback(() => {
    if (typeof event.location === "object") {
      return event.location.name || event.location.address || "Event Location";
    }
    return event.location || "Event Location";
  }, [event.location]);

  const getLocationAddress = useCallback(() => {
    if (typeof event.location === "object") {
      return event.location.address || event.location.name || "";
    }
    return event.location || "";
  }, [event.location]);

  const handleLocationClick = useCallback(() => {
    const coordinates = getLocationCoordinates();

    if (coordinates) {
      // If we have coordinates, use them for precise location
      const url = `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`;
      window.open(url, "_blank");
    } else {
      // If no coordinates, search by location name/address
      const locationQuery = getLocationAddress() || getLocationName();
      if (locationQuery && locationQuery !== "Event Location") {
        const encodedQuery = encodeURIComponent(locationQuery);
        const url = `https://www.google.com/maps/search/${encodedQuery}`;
        window.open(url, "_blank");
      }
    }
  }, [getLocationCoordinates, getLocationAddress, getLocationName]);

  const initializeMap = useCallback(
    (coordinates) => {
      if (!mapRef.current || !coordinates) return;

      try {
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: coordinates,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
          clickableIcons: true,
          disableDefaultUI: false,
          gestureHandling: "cooperative",
        });

        // Remove problematic overlays after map loads
        window.google.maps.event.addListenerOnce(
          mapInstanceRef.current,
          "idle",
          () => {
            // Find and remove overlay elements that interfere with interaction
            const mapContainer = mapRef.current;
            if (mapContainer) {
              const overlays = mapContainer.querySelectorAll(
                'div[style*="pointer-events: none"][style*="z-index: 1000002"]'
              );
              overlays.forEach((overlay) => {
                if (
                  overlay.style.opacity === "0" ||
                  overlay.style.border.includes("rgb(26, 115, 232)")
                ) {
                  overlay.style.display = "none";
                }
              });
            }
          }
        );

        markerRef.current = new window.google.maps.Marker({
          position: coordinates,
          map: mapInstanceRef.current,
          title: getLocationName(),
          animation: window.google.maps.Animation.DROP,
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
          <div style="padding: 8px; max-width: 200px;">
            <h4 style="margin: 0 0 4px 0; color: #1f2937;">${getLocationName()}</h4>
            <p style="margin: 0; color: #6b7280; font-size: 12px;">${getLocationAddress()}</p>
          </div>
        `,
        });

        markerRef.current.addListener("click", () => {
          infoWindow.open(mapInstanceRef.current, markerRef.current);
        });
      } catch (error) {
        setMapError("Failed to initialize map");
      }
    },
    [getLocationName, getLocationAddress]
  );

  // Load Google Maps API and initialize map
  useEffect(() => {
    const coordinates = getLocationCoordinates();
    if (!coordinates || !event.location) return;

    if (window.google?.maps) {
      setIsMapLoaded(true);
      initializeMap(coordinates);
      return;
    }

    if (GOOGLE_MAPS_CONFIG.apiKey === "YOUR_GOOGLE_MAPS_API_KEY") {
      setMapError("Google Maps API key not configured");
      return;
    }

    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com"]`
    );
    if (existingScript) {
      const checkLoaded = setInterval(() => {
        if (window.google?.maps) {
          setIsMapLoaded(true);
          initializeMap(coordinates);
          clearInterval(checkLoaded);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!window.google?.maps) {
          setMapError("Timeout loading Google Maps...");
        }
      }, 10000);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_CONFIG.apiKey}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google?.maps) {
        setIsMapLoaded(true);
        initializeMap(coordinates);
      } else {
        setMapError("Google Maps API not available");
      }
    };

    script.onerror = () => {
      setMapError("Failed to load Google Maps API");
    };

    document.head.appendChild(script);
  }, [event.location, getLocationCoordinates, initializeMap]);

  // Cleanup map when modal closes
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(
          mapInstanceRef.current
        );
      }
      if (markerRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(markerRef.current);
      }
    };
  }, []);

  const handleEdit = () => {
    onEdit();
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      onDelete();
      onClose();
    }
  };

  const eventTypes = [
    { value: "meeting", label: "Meeting", color: "#3b82f6" },
    { value: "appointment", label: "Appointment", color: "#10b981" },
    { value: "task", label: "Task", color: "#f59e0b" },
    { value: "personal", label: "Personal", color: "#8b5cf6" },
    { value: "travel", label: "Travel", color: "#ef4444" },
    { value: "break", label: "Break", color: "#6b7280" },
    { value: "event", label: "Event", color: "#ec4899" },
    { value: "deadline", label: "Deadline", color: "#dc2626" },
  ];

  const eventType = eventTypes.find((type) => type.value === event.type);

  const modalContent = (
    <div className="modal-overlay event-detail-overlay" onClick={onClose}>
      <div
        className="modal-content event-detail-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Event Details</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="event-detail-content">
          {/* Event Header */}
          <div className="event-detail-header">
            <div className="event-detail-name">
              <div
                className="event-type-indicator"
                style={{ backgroundColor: eventType?.color || "#3b82f6" }}
              />
              <h3>{event.name}</h3>
            </div>
            <div className="event-detail-type">
              {eventType?.label || "Event"}
            </div>
          </div>

          {/* Trip Association */}
          {trip && (
            <div className="event-detail-trip">
              🧳 <strong>Trip:</strong> {trip.name}
            </div>
          )}

          {/* Date and Time */}
          <div className="event-detail-section">
            <h4>📅 Date & Time</h4>
            <div className="event-detail-info">
              <div>
                <strong>Date:</strong> {formatDate(event.startTime)}
              </div>
              <div>
                <strong>Time:</strong> {formatTime(event.startTime)} -{" "}
                {formatTime(event.endTime)}
              </div>
              <div>
                <strong>Duration:</strong> {getDuration()}
              </div>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="event-detail-section">
              <h4>📍 Location</h4>
              <div className="event-detail-info">
                <div className="location-text">
                  <button
                    onClick={handleLocationClick}
                    className="location-name-button"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2563eb",
                      textDecoration: "underline",
                      cursor: "pointer",
                      fontSize: "inherit",
                      fontWeight: "bold",
                      padding: 0,
                      fontFamily: "inherit",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => (e.target.style.color = "#1d4ed8")}
                    onMouseLeave={(e) => (e.target.style.color = "#2563eb")}
                    title="Click to open in Google Maps"
                  >
                    {getLocationName()}
                  </button>
                  {getLocationAddress() &&
                    getLocationAddress() !== getLocationName() && (
                      <div
                        className="location-address"
                        style={{ marginTop: "4px", color: "#6b7280" }}
                      >
                        {getLocationAddress()}
                      </div>
                    )}
                </div>

                {/* Map Display */}
                {getLocationCoordinates() && (
                  <div className="event-location-map">
                    {mapError ? (
                      <div className="map-error">
                        <p>📍 {mapError}</p>
                        <p className="map-fallback">
                          Location: {getLocationAddress()}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div
                          ref={mapRef}
                          className="location-map"
                          style={{
                            width: "100%",
                            height: "200px",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                            marginTop: "12px",
                          }}
                        />
                        {!isMapLoaded && (
                          <div className="map-loading">
                            <p>Loading map...</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Map Actions */}
                    {getLocationCoordinates() && !mapError && (
                      <div className="map-actions">
                        <button
                          onClick={() => {
                            const coords = getLocationCoordinates();
                            const url = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
                            window.open(url, "_blank");
                          }}
                          className="map-action-button"
                        >
                          🗺️ Open in Google Maps
                        </button>
                        <button
                          onClick={() => {
                            const coords = getLocationCoordinates();
                            const url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
                            window.open(url, "_blank");
                          }}
                          className="map-action-button"
                        >
                          🧭 Get Directions
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {event.remark && (
            <div className="event-detail-section">
              <h4>📝 Description</h4>
              <div className="event-detail-info">{event.remark}</div>
            </div>
          )}

          {/* Contact and Cost */}
          {(event.contact || event.cost) && (
            <div className="event-detail-section">
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                {event.contact && (
                  <div style={{ flex: "1", minWidth: "200px" }}>
                    <h4>👤 Contact</h4>
                    <div className="event-detail-info">{event.contact}</div>
                  </div>
                )}
                {event.cost && (
                  <div style={{ flex: "1", minWidth: "200px" }}>
                    <h4>💰 Cost</h4>
                    <div className="event-detail-info">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span>
                          ${parseFloat(event.cost || 0).toFixed(2)}
                          {event.isPrepaid && (
                            <span
                              style={{
                                marginLeft: "8px",
                                color: "#10b981",
                                fontWeight: "bold",
                              }}
                            >
                              ✓ Pre-paid
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {event.tags && (
            <div className="event-detail-section">
              <h4>🏷️ Tags</h4>
              <div className="event-detail-tags">
                {event.tags.split(",").map((tag, index) => (
                  <span key={index} className="event-detail-tag">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {(event.documents?.length > 0 || event.document) && (
            <div className="event-detail-section">
              <h4>📎 Documents</h4>
              <div className="event-detail-info">
                {/* Handle legacy single document */}
                {event.document && !event.documents && (
                  <div className="document-item">
                    <button
                      onClick={() => setShowDocumentPreview(event.document)}
                      className="document-name-button"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#2563eb",
                        textDecoration: "underline",
                        cursor: "pointer",
                        fontSize: "inherit",
                        padding: 0,
                        fontFamily: "inherit",
                      }}
                      onMouseEnter={(e) => (e.target.style.color = "#1d4ed8")}
                      onMouseLeave={(e) => (e.target.style.color = "#2563eb")}
                    >
                      {event.document.name}
                    </button>
                    {event.document.size && (
                      <span className="document-size">
                        ({(event.document.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>
                )}

                {/* Handle multiple documents */}
                {event.documents?.map((doc, index) => (
                  <div key={index} className="document-item">
                    <button
                      onClick={() => setShowDocumentPreview(doc)}
                      className="document-name-button"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#2563eb",
                        textDecoration: "underline",
                        cursor: "pointer",
                        fontSize: "inherit",
                        padding: 0,
                        fontFamily: "inherit",
                      }}
                      onMouseEnter={(e) => (e.target.style.color = "#1d4ed8")}
                      onMouseLeave={(e) => (e.target.style.color = "#2563eb")}
                    >
                      {doc.name}
                    </button>
                    {doc.size && (
                      <span className="document-size">
                        ({(doc.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="event-detail-actions">
          <div className="event-detail-action-buttons">
            <button onClick={handleEdit} className="edit-button">
              ✏️ Edit Event
            </button>
            <button onClick={handleDelete} className="delete-button">
              🗑️ Delete Event
            </button>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {showDocumentPreview && (
        <DocumentPreview
          document={showDocumentPreview}
          onClose={() => setShowDocumentPreview(false)}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default EventDetailModal;
