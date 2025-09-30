import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { MAPS_CONFIG } from "../config/maps";

const BucketListMapModal = ({ isOpen, onClose, bucketItem }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Initialize map
  const initializeMap = useCallback(() => {
    if (!mapRef.current || !bucketItem?.coordinates) return;

    try {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: bucketItem.coordinates,
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
        position: bucketItem.coordinates,
        map: mapInstanceRef.current,
        title: bucketItem.name,
        animation: window.google.maps.Animation.DROP,
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 200px;">
            <h4 style="margin: 0 0 4px 0; color: #1f2937;">${
              bucketItem.name
            }</h4>
            <p style="margin: 0; color: #6b7280; font-size: 12px;">${
              bucketItem.location || ""
            }</p>
          </div>
        `,
      });

      markerRef.current.addListener("click", () => {
        infoWindow.open(mapInstanceRef.current, markerRef.current);
      });
    } catch (error) {
      setMapError("Failed to initialize map");
    }
  }, [bucketItem]);

  // Load Google Maps API and initialize map
  useEffect(() => {
    if (!bucketItem?.coordinates || !isOpen) return;

    if (window.google?.maps) {
      setIsMapLoaded(true);
      initializeMap();
      return;
    }

    if (MAPS_CONFIG.apiKey === "YOUR_GOOGLE_MAPS_API_KEY") {
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
          initializeMap();
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_CONFIG.apiKey}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google?.maps) {
        setIsMapLoaded(true);
        initializeMap();
      } else {
        setMapError("Google Maps API not available");
      }
    };

    script.onerror = () => {
      setMapError("Failed to load Google Maps API");
    };

    document.head.appendChild(script);
  }, [bucketItem?.coordinates, isOpen, initializeMap]);

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

  // Only show modal if we have a bucket item with coordinates and modal is open
  if (!isOpen || !bucketItem || !bucketItem.coordinates) {
    return null;
  }

  const modalContent = (
    <div className="modal-overlay event-detail-overlay" onMouseDown={onClose}>
      <div
        className="modal-content event-detail-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "600px", width: "90vw" }}
      >
        <div className="modal-header">
          <h2>Location</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="event-detail-content">
          {/* Location Info */}
          <div className="event-detail-section">
            <div className="event-detail-info">
              <div className="location-text">
                <div
                  style={{
                    fontWeight: "bold",
                    color: "#2563eb",
                    fontSize: "16px",
                    marginBottom: "4px",
                  }}
                >
                  {bucketItem.name}
                </div>
                {bucketItem.location && (
                  <div
                    className="location-address"
                    style={{ color: "#6b7280" }}
                  >
                    {bucketItem.location}
                  </div>
                )}
              </div>

              {/* Map Display */}
              <div className="event-location-map">
                {mapError ? (
                  <div className="map-error">
                    <p>📍 {mapError}</p>
                    <p className="map-fallback">
                      Location: {bucketItem.location}
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
                {bucketItem.coordinates && !mapError && (
                  <div className="map-actions">
                    <button
                      onClick={() => {
                        const coords = bucketItem.coordinates;
                        const url = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
                        window.open(url, "_blank");
                      }}
                      className="map-action-button"
                    >
                      🗺️ Open in Google Maps
                    </button>
                    <button
                      onClick={() => {
                        const coords = bucketItem.coordinates;
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
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="event-detail-actions">
          <button onClick={onClose} className="cancel-button">
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default BucketListMapModal;
