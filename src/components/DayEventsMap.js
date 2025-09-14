import { useState, useEffect, useRef, useCallback } from "react";
import { MAPS_CONFIG as GOOGLE_MAPS_CONFIG } from "../config/maps";

const DayEventsMap = ({ events, onMapError }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const idleListenerRef = useRef(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);

  const getLocationCoordinates = useCallback((event) => {
    // Check for coordinates directly on the event object (from bucket list items)
    if (event.coordinates && typeof event.coordinates === "object") {
      return event.coordinates;
    }
    // Check for coordinates nested in location object (legacy format)
    if (typeof event.location === "object" && event.location?.coordinates) {
      return event.location.coordinates;
    }
    return null;
  }, []);

  const getLocationName = useCallback((location) => {
    if (typeof location === "object") {
      return location.name || location.address || "Event Location";
    }
    return location || "Event Location";
  }, []);

  const getLocationAddress = useCallback((location) => {
    if (typeof location === "object") {
      return location.address || location.name || "";
    }
    return location || "";
  }, []);

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  // Generate Google Maps directions URL for all events with coordinates
  const generateGoogleMapsDirectionsUrl = useCallback(() => {
    if (!events || events.length === 0) return null;

    const eventsWithCoordinates = events.filter((event) =>
      getLocationCoordinates(event)
    );

    if (eventsWithCoordinates.length === 0) return null;

    // Sort events by start time
    const sortedEvents = eventsWithCoordinates.sort(
      (a, b) => new Date(a.startTime) - new Date(b.startTime)
    );

    // Create waypoints for Google Maps directions
    const waypoints = sortedEvents.map((event) => {
      const coords = getLocationCoordinates(event);
      // eslint-disable-next-line no-unused-vars
      const name = getLocationName(event.location);

      // Use coordinates for more accurate directions
      return `${coords.lat},${coords.lng}`;
    });

    if (waypoints.length === 1) {
      // Single location - just show the location
      return `https://www.google.com/maps/search/?api=1&query=${waypoints[0]}`;
    }

    // Multiple locations - create directions
    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const intermediateWaypoints = waypoints.slice(1, -1);

    let url = `https://www.google.com/maps/dir/${origin}/${destination}`;

    if (intermediateWaypoints.length > 0) {
      // Add intermediate waypoints
      const waypointsParam = intermediateWaypoints.join("/");
      url = `https://www.google.com/maps/dir/${origin}/${waypointsParam}/${destination}`;
    }

    // Add parameters for better experience
    url += "?travelmode=transit"; // Default to public transit, can be changed to driving, walking, etc.

    return url;
  }, [events, getLocationCoordinates, getLocationName]);

  const initializeMap = useCallback(() => {
    if (!mapRef.current) return;

    // Clear any previous error
    setMapError(null);

    // Clear existing markers and their event listeners
    markersRef.current.forEach((marker) => {
      if (marker.infoWindow) {
        window.google?.maps?.event?.clearInstanceListeners(marker.infoWindow);
      }
      window.google?.maps?.event?.clearInstanceListeners(marker);
      marker.setMap(null);
    });
    markersRef.current = [];

    // Clear existing map instance and its event listeners
    if (mapInstanceRef.current) {
      window.google?.maps?.event?.clearInstanceListeners(
        mapInstanceRef.current
      );
      mapInstanceRef.current = null;
    }

    // Clear idle listener if it exists
    if (idleListenerRef.current) {
      window.google.maps.event.removeListener(idleListenerRef.current);
      idleListenerRef.current = null;
    }

    // If there are no events at all, don't initialize the map
    if (!events || events.length === 0) {
      // Clear the map instance if it exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
      // Clear the map container
      if (mapRef.current) {
        mapRef.current.innerHTML = "";
      }
      return;
    }

    // Filter events that have location coordinates
    const eventsWithCoordinates = events.filter((event) =>
      getLocationCoordinates(event)
    );

    if (eventsWithCoordinates.length === 0) {
      // Clear the map instance if it exists since no events have locations
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
      // Clear the map container
      if (mapRef.current) {
        mapRef.current.innerHTML = "";
      }
      return;
    }

    try {
      // Calculate center point from all event locations
      const coordinates = eventsWithCoordinates.map((event) =>
        getLocationCoordinates(event)
      );

      const centerLat =
        coordinates.reduce((sum, coord) => sum + coord.lat, 0) /
        coordinates.length;
      const centerLng =
        coordinates.reduce((sum, coord) => sum + coord.lng, 0) /
        coordinates.length;

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: centerLat, lng: centerLng },
        zoom: 12,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        clickableIcons: true,
        disableDefaultUI: false,
        gestureHandling: "cooperative",
      });

      // Create markers for each event
      eventsWithCoordinates.forEach((event, index) => {
        const coordinates = getLocationCoordinates(event);
        const locationName = getLocationName(event.location);
        const locationAddress = getLocationAddress(event.location);

        const marker = new window.google.maps.Marker({
          position: coordinates,
          map: mapInstanceRef.current,
          title: `${event.name} - ${locationName}`,
          animation: window.google.maps.Animation.DROP,
          label: {
            text: (index + 1).toString(),
            color: "white",
            fontWeight: "bold",
          },
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 12px; max-width: 250px;">
              <h4 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px;">${
                event.name
              }</h4>
              <div style="margin-bottom: 6px;">
                <strong>🕐 Time:</strong> ${formatTime(
                  event.startTime
                )} - ${formatTime(event.endTime)}
              </div>
              <div style="margin-bottom: 6px;">
                <strong>📍 Location:</strong> ${locationName}
              </div>
              ${
                locationAddress && locationAddress !== locationName
                  ? `<div style="margin-bottom: 6px; color: #6b7280; font-size: 12px;">${locationAddress}</div>`
                  : ""
              }
              ${
                event.remark
                  ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                  <div style="color: #6b7280; font-size: 13px;">${event.remark}</div>
                </div>`
                  : ""
              }
            </div>
          `,
        });

        marker.addListener("click", () => {
          // Check if map instance still exists before operating on it
          if (!mapInstanceRef.current) return;

          // Close all other info windows
          markersRef.current.forEach((m) => {
            if (m.infoWindow) {
              m.infoWindow.close();
            }
          });
          infoWindow.open(mapInstanceRef.current, marker);
        });

        // Store reference to info window
        marker.infoWindow = infoWindow;
        markersRef.current.push(marker);
      });

      // Adjust zoom to fit all markers
      if (coordinates.length > 1) {
        const bounds = new window.google.maps.LatLngBounds();
        coordinates.forEach((coord) => bounds.extend(coord));
        mapInstanceRef.current.fitBounds(bounds);

        // Ensure minimum zoom level
        idleListenerRef.current = window.google.maps.event.addListener(
          mapInstanceRef.current,
          "idle",
          () => {
            // Add null check to prevent errors during component unmounting
            if (mapInstanceRef.current && mapInstanceRef.current.getZoom) {
              try {
                if (mapInstanceRef.current.getZoom() > 15) {
                  mapInstanceRef.current.setZoom(15);
                }
              } catch (error) {}
            }
            // Clean up the listener
            if (idleListenerRef.current) {
              window.google.maps.event.removeListener(idleListenerRef.current);
              idleListenerRef.current = null;
            }
          }
        );
      }
    } catch (error) {
      const errorMessage = "Failed to initialize map";
      setMapError(errorMessage);
      if (onMapError) {
        onMapError(errorMessage);
      }
    }
  }, [
    events,
    getLocationCoordinates,
    getLocationName,
    getLocationAddress,
    onMapError,
  ]);

  // Handle Google Maps overlay issues
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;

    const fixMapOverlays = () => {
      const mapContainer = mapRef.current;
      if (!mapContainer) return;

      // Fix high z-index elements that block interaction - but preserve markers
      const highZIndexElements = mapContainer.querySelectorAll(
        'div[style*="z-index: 1000002"], div[style*="z-index: 1000001"], div[style*="z-index: 1000000"]'
      );

      highZIndexElements.forEach((element) => {
        // Skip elements that are markers or interactive elements
        const style = window.getComputedStyle(element);
        const isMarker =
          style.cursor === "pointer" ||
          element.querySelector('img[src*="marker"]') ||
          element.querySelector('img[src*="pin"]') ||
          element.classList.contains("gm-style-iw") ||
          element.getAttribute("role") === "button";

        if (!isMarker) {
          // Check if it's a transparent or invisible overlay
          if (
            style.opacity === "0" ||
            style.background === "transparent" ||
            style.backgroundColor === "transparent" ||
            element.style.pointerEvents === "none"
          ) {
            element.style.pointerEvents = "none";
            element.style.zIndex = "-1";
          }
        }
      });

      // Remove keyboard shortcuts overlays
      const keyboardOverlays = document.querySelectorAll(
        ".LGLeeN-keyboard-shortcuts-view"
      );
      keyboardOverlays.forEach((overlay) => {
        overlay.remove();
      });

      // Fix aria-describedby elements
      const mapDivs = mapContainer.querySelectorAll("div[aria-describedby]");
      mapDivs.forEach((div) => {
        const describedBy = div.getAttribute("aria-describedby");
        if (describedBy) {
          const descriptionEl = document.getElementById(describedBy);
          if (
            descriptionEl &&
            descriptionEl.textContent.includes("Move left")
          ) {
            div.removeAttribute("aria-describedby");
            div.removeAttribute("tabindex");
            descriptionEl.remove();
            div.style.pointerEvents = "auto";
          }
        }
      });

      // Ensure map container is interactive
      const mapDiv = mapContainer.querySelector('div[aria-label="Map"]');
      if (mapDiv) {
        mapDiv.style.pointerEvents = "auto";
        mapDiv.style.zIndex = "10";
      }

      // Ensure markers are visible and interactive
      const markerElements = mapContainer.querySelectorAll(
        'div[style*="cursor: pointer"]'
      );
      markerElements.forEach((marker) => {
        marker.style.pointerEvents = "auto";
        marker.style.zIndex = "1000";
        marker.style.visibility = "visible";
        marker.style.opacity = "1";
      });

      // Ensure marker images are visible
      const markerImages = mapContainer.querySelectorAll(
        'img[src*="marker"], img[src*="pin"]'
      );
      markerImages.forEach((img) => {
        img.style.visibility = "visible";
        img.style.opacity = "1";
        img.style.zIndex = "1000";
      });
    };

    // Run fixes multiple times
    const timeouts = [
      setTimeout(fixMapOverlays, 100),
      setTimeout(fixMapOverlays, 500),
      setTimeout(fixMapOverlays, 1000),
      setTimeout(fixMapOverlays, 2000),
    ];

    // Set up MutationObserver for dynamic elements
    const observer = new MutationObserver(() => {
      fixMapOverlays();
    });

    observer.observe(mapRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "aria-describedby"],
    });

    return () => {
      timeouts.forEach(clearTimeout);
      observer.disconnect();
    };
  }, [isMapLoaded]);

  // Load Google Maps API and initialize map
  useEffect(() => {
    if (window.google?.maps) {
      setIsMapLoaded(true);
      return;
    }

    if (GOOGLE_MAPS_CONFIG.apiKey === "YOUR_GOOGLE_MAPS_API_KEY") {
      const errorMessage = "Google Maps API key not configured";
      setMapError(errorMessage);
      if (onMapError) {
        onMapError(errorMessage);
      }
      return;
    }

    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com"]`
    );
    if (existingScript) {
      const checkLoaded = setInterval(() => {
        if (window.google?.maps) {
          setIsMapLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!window.google?.maps) {
          const errorMessage = "Timeout loading Google Maps...";
          setMapError(errorMessage);
          if (onMapError) {
            onMapError(errorMessage);
          }
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
      } else {
        const errorMessage = "Google Maps API not available";
        setMapError(errorMessage);
        if (onMapError) {
          onMapError(errorMessage);
        }
      }
    };

    script.onerror = () => {
      const errorMessage = "Failed to load Google Maps API";
      setMapError(errorMessage);
      if (onMapError) {
        onMapError(errorMessage);
      }
    };

    document.head.appendChild(script);
  }, [onMapError]);

  // Initialize map when loaded and events change
  useEffect(() => {
    if (isMapLoaded) {
      initializeMap();
    }
  }, [isMapLoaded, initializeMap]);

  // Cleanup map when component unmounts
  useEffect(() => {
    const mapElement = mapRef.current;

    return () => {
      // Clear idle listener
      if (idleListenerRef.current) {
        window.google?.maps?.event?.removeListener(idleListenerRef.current);
        idleListenerRef.current = null;
      }

      if (mapInstanceRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(
          mapInstanceRef.current
        );
        mapInstanceRef.current = null;
      }
      markersRef.current.forEach((marker) => {
        if (marker.infoWindow) {
          window.google?.maps?.event?.clearInstanceListeners(marker.infoWindow);
        }
        window.google?.maps?.event?.clearInstanceListeners(marker);
      });
      markersRef.current = [];

      // Clear map container
      if (mapElement) {
        mapElement.innerHTML = "";
      }
    };
  }, []);

  // Propagate map error to parent
  useEffect(() => {
    if (mapError && onMapError) {
      onMapError(mapError);
    }
  }, [mapError, onMapError]);

  if (mapError) {
    return (
      <div className="map-error">
        <div className="map-error-content">
          <h4>📍 {mapError}</h4>
          <p>Unable to load the map. Please try again later.</p>
        </div>
      </div>
    );
  }

  const googleMapsUrl = generateGoogleMapsDirectionsUrl();

  return (
    <div className="day-map-container">
      <div
        ref={mapRef}
        className="day-map"
        style={{
          width: "100%",
          flex: 1,
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
        }}
      />
      {!isMapLoaded && (
        <div className="map-loading">
          <p>Loading map...</p>
        </div>
      )}
      {googleMapsUrl && (
        <div className="google-maps-link-container">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="google-maps-link"
          >
            🗺️ Open in Google Maps
          </a>
        </div>
      )}
    </div>
  );
};

export default DayEventsMap;
