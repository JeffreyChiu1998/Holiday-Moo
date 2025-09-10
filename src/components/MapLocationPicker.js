import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { GOOGLE_MAPS_CONFIG } from "../config/googleMaps";

const MapLocationPicker = ({
  isOpen,
  onLocationSelect,
  onClose,
  initialLocation = null,
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const serviceRef = useRef(null);
  const infoWindowRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const dragTimeoutRef = useRef(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Enhanced function to extract meaningful place names
  const extractPlaceName = useCallback(
    (geocodingResult, fallbackName = "Selected Location") => {
      if (!geocodingResult?.address_components) {
        return fallbackName;
      }

      const result = geocodingResult;
      let placeName = fallbackName;

      // First priority: Establishments (stores, restaurants, businesses)
      const establishment = result.address_components.find((component) =>
        component.types.includes("establishment")
      );

      if (establishment) {
        placeName = establishment.long_name;
      } else {
        // Second priority: Points of interest and premises (buildings, landmarks)
        const poi = result.address_components.find(
          (component) =>
            component.types.includes("point_of_interest") ||
            component.types.includes("premise") ||
            component.types.includes("subpremise")
        );

        if (poi) {
          placeName = poi.long_name;
        } else {
          // Third priority: Specific location types
          const specificLocation = result.address_components.find(
            (component) =>
              component.types.includes("store") ||
              component.types.includes("shopping_mall") ||
              component.types.includes("hospital") ||
              component.types.includes("school") ||
              component.types.includes("university") ||
              component.types.includes("park") ||
              component.types.includes("tourist_attraction") ||
              component.types.includes("transit_station") ||
              component.types.includes("airport") ||
              component.types.includes("gas_station") ||
              component.types.includes("bank") ||
              component.types.includes("pharmacy")
          );

          if (specificLocation) {
            placeName = specificLocation.long_name;
          } else {
            // Fourth priority: Street address
            const streetNumber = result.address_components.find((component) =>
              component.types.includes("street_number")
            );
            const route = result.address_components.find((component) =>
              component.types.includes("route")
            );

            if (streetNumber && route) {
              placeName = `${streetNumber.long_name} ${route.long_name}`;
            } else if (route) {
              placeName = route.long_name;
            } else {
              // Final fallback
              placeName =
                result.address_components[0]?.long_name || fallbackName;
            }
          }
        }
      }

      return placeName;
    },
    []
  );

  // Create marker with proper Google Maps API patterns
  const createMarker = useCallback(
    (options) => {
      if (!options?.position || !mapInstanceRef.current) return;

      // Remove existing marker
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }

      // Create new marker
      markerRef.current = new window.google.maps.Marker({
        map: mapInstanceRef.current,
        position: options.position,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
        title: options.name || "Selected Location",
      });

      // Marker click handler
      markerRef.current.addListener("click", () => {
        const content = `
        <div style="padding: 8px; max-width: 200px;">
          <h4 style="margin: 0 0 8px 0; color: #1f2937;">${
            options.name || "Selected Location"
          }</h4>
          <p style="margin: 0; color: #6b7280; font-size: 12px;">Click and drag to move</p>
        </div>
      `;
        infoWindowRef.current?.setContent(content);
        infoWindowRef.current?.open(mapInstanceRef.current, markerRef.current);
      });

      // Drag end handler with debouncing
      markerRef.current.addListener("dragend", (event) => {
        const draggedLocation = event.latLng;

        // Clear previous timeout
        if (dragTimeoutRef.current) {
          clearTimeout(dragTimeoutRef.current);
        }

        // Debounce the geocoding request
        dragTimeoutRef.current = setTimeout(() => {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: draggedLocation }, (results, status) => {
            if (
              status === window.google.maps.GeocoderStatus.OK &&
              results?.[0]
            ) {
              const result = results[0];
              const placeName = extractPlaceName(result, "Dragged Location");

              setSelectedLocation({
                coordinates: {
                  lat: draggedLocation.lat(),
                  lng: draggedLocation.lng(),
                },
                address: result.formatted_address,
                name: placeName,
                placeId: result.place_id || "",
              });

              // Update marker title
              markerRef.current?.setTitle(placeName);
            } else {
              // Fallback for failed geocoding
              setSelectedLocation({
                coordinates: {
                  lat: draggedLocation.lat(),
                  lng: draggedLocation.lng(),
                },
                address: `${draggedLocation.lat().toFixed(6)}, ${draggedLocation
                  .lng()
                  .toFixed(6)}`,
                name: "Custom Location",
              });
            }
          });
        }, 500); // 500ms debounce
      });

      // Drag start handler
      markerRef.current.addListener("dragstart", () => {
        infoWindowRef.current?.close();
      });
    },
    [extractPlaceName]
  );

  // Initialize map with proper Google Maps API patterns
  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) {
      console.error("Cannot initialize map - missing mapRef or google");
      return;
    }

    const defaultCenter = { lat: 40.7128, lng: -74.006 };
    let center = defaultCenter;

    if (initialLocation?.coordinates) {
      center = {
        lat: initialLocation.coordinates.lat,
        lng: initialLocation.coordinates.lng,
      };
    }

    // Initialize InfoWindow
    infoWindowRef.current = new window.google.maps.InfoWindow();

    // Create map with proper configuration
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: center,
      zoom: 15,
      clickableIcons: true,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      scaleControl: true,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: true,
      gestureHandling: "cooperative",
    });

    // Initialize Places Service
    serviceRef.current = new window.google.maps.places.PlacesService(
      mapInstanceRef.current
    );

    // Create initial marker
    createMarker({
      position: center,
      name: initialLocation?.name || "Selected Location",
    });

    // Set initial selected location
    if (initialLocation?.coordinates) {
      setSelectedLocation({
        coordinates: initialLocation.coordinates,
        address:
          initialLocation.address ||
          initialLocation.name ||
          "Selected Location",
        name:
          initialLocation.name ||
          initialLocation.address ||
          "Selected Location",
        placeId: initialLocation.placeId || "",
      });
    }

    // Handle map clicks
    const handleMapClick = (mapsMouseEvent) => {
      const clickedLocation = mapsMouseEvent.latLng;
      const geocoder = new window.google.maps.Geocoder();
      
      geocoder.geocode({ location: clickedLocation }, (results, status) => {
        if (status === window.google.maps.GeocoderStatus.OK && results?.[0]) {
          const result = results[0];
          const placeName = extractPlaceName(result, "Selected Location");

          createMarker({
            position: clickedLocation,
            name: placeName,
          });

          setSelectedLocation({
            coordinates: {
              lat: clickedLocation.lat(),
              lng: clickedLocation.lng(),
            },
            address: result.formatted_address,
            name: placeName,
            placeId: result.place_id || "",
          });
        }
      });
    };

    // Add click listener
    mapInstanceRef.current.addListener("click", handleMapClick);
  }, [createMarker, extractPlaceName, initialLocation]);

  // Get autocomplete suggestions from Google Places API
  const getAutocompleteSuggestions = useCallback((input) => {
    if (!input.trim() || input.length < 2 || !window.google) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const autocompleteService =
      new window.google.maps.places.AutocompleteService();

    autocompleteService.getPlacePredictions(
      {
        input: input,
        types: ["establishment", "geocode"],
        fields: ["place_id", "description", "structured_formatting"],
      },
      (predictions, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          predictions
        ) {
          const suggestionList = predictions.slice(0, 5).map((prediction) => ({
            placeId: prediction.place_id,
            description: prediction.description,
            mainText:
              prediction.structured_formatting?.main_text ||
              prediction.description,
            secondaryText:
              prediction.structured_formatting?.secondary_text || "",
          }));
          setSuggestions(suggestionList);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }
    );
  }, []);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(
    (suggestion) => {
      setSearchValue(suggestion.mainText);
      setSuggestions([]);
      setShowSuggestions(false);

      if (mapInstanceRef.current) {
        const service = new window.google.maps.places.PlacesService(
          mapInstanceRef.current
        );
        service.getDetails(
          {
            placeId: suggestion.placeId,
            fields: [
              "name",
              "formatted_address",
              "geometry",
              "place_id",
              "types",
            ],
          },
          (place, status) => {
            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              place
            ) {
              const location = place.geometry.location;

              mapInstanceRef.current.setCenter(location);
              mapInstanceRef.current.setZoom(15);

              createMarker({
                position: location,
                name: place.name || suggestion.mainText,
              });

              setSelectedLocation({
                coordinates: { lat: location.lat(), lng: location.lng() },
                address: place.formatted_address || suggestion.description,
                name: place.name || suggestion.mainText,
                placeId: place.place_id || suggestion.placeId,
                types: place.types || [],
              });
            }
          }
        );
      }
    },
    [createMarker]
  );

  // Handle search input changes with debouncing
  const handleSearchInputChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchValue(value);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        getAutocompleteSuggestions(value);
      }, 300);
    },
    [getAutocompleteSuggestions]
  );

  // Handle search
  const handleSearch = useCallback(
    (query) => {
      if (!query.trim() || !serviceRef.current || !mapInstanceRef.current)
        return;

      const request = {
        query: query,
        fields: ["name", "geometry", "formatted_address", "place_id", "types"],
      };

      serviceRef.current.findPlaceFromQuery(request, (results, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          results?.length > 0
        ) {
          const place = results[0];

          // Center map on found location
          mapInstanceRef.current.setCenter(place.geometry.location);
          mapInstanceRef.current.setZoom(15);

          // Create marker
          createMarker({
            position: place.geometry.location,
            name: place.name || query,
          });

          // Update selected location
          setSelectedLocation({
            coordinates: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            },
            address: place.formatted_address || "",
            name: place.name || query,
            placeId: place.place_id || "",
            types: place.types || [],
          });

          // Clear search suggestions
          setShowSuggestions(false);
          setSuggestions([]);
        } else {
          console.warn(`No results found for "${query}"`);
        }
      });
    },
    [createMarker]
  );

  // Handle current location
  const handleCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const currentLocation = { lat, lng };

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter(currentLocation);
          mapInstanceRef.current.setZoom(16);

          createMarker({
            position: currentLocation,
            name: "Current Location",
          });

          // Geocode to get address
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: currentLocation }, (results, status) => {
            if (
              status === window.google.maps.GeocoderStatus.OK &&
              results?.[0]
            ) {
              const result = results[0];
              const placeName = extractPlaceName(result, "Current Location");

              setSelectedLocation({
                coordinates: { lat, lng },
                address: result.formatted_address,
                name: placeName,
                placeId: result.place_id || "",
              });
            } else {
              // Fallback if geocoding fails
              setSelectedLocation({
                coordinates: { lat, lng },
                address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                name: "Current Location",
              });
            }
          });
        }
      },
      (error) => {
        console.error("Error getting current location:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, [createMarker, extractPlaceName]);

  // Load Google Maps API
  useEffect(() => {
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    if (GOOGLE_MAPS_CONFIG.apiKey === "YOUR_GOOGLE_MAPS_API_KEY") {
      setError("Please configure your Google Maps API key");
      return;
    }

    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com"]`
    );
    if (existingScript) {
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          setIsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!window.google?.maps?.places) {
          setError("Timeout loading Google Maps API...");
        }
      }, 10000);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_CONFIG.apiKey}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google?.maps?.places) {
        setIsLoaded(true);
      } else {
        setError("Google Maps Places API not available after script load");
      }
    };

    script.onerror = () => {
      setError(
        "Failed to load Google Maps API - check network tab for details"
      );
    };

    document.head.appendChild(script);
  }, []);

  // Initialize map when loaded
  useEffect(() => {
    if (isLoaded && isOpen && !mapInstanceRef.current) {
      const timer = setTimeout(() => {
        initMap();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [initMap, isLoaded, isOpen]);

  // Cleanup effect when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Clear timeouts
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }

      // Clear map resources
      if (mapInstanceRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(
          mapInstanceRef.current
        );
      }
      if (markerRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(markerRef.current);
        markerRef.current.setMap(null);
      }
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }

      // Reset refs
      mapInstanceRef.current = null;
      markerRef.current = null;
      serviceRef.current = null;
      infoWindowRef.current = null;
    }
  }, [isOpen]);

  // Update map center when selectedLocation changes
  useEffect(() => {
    if (mapInstanceRef.current && selectedLocation?.coordinates) {
      const newCenter = {
        lat: selectedLocation.coordinates.lat,
        lng: selectedLocation.coordinates.lng,
      };
      mapInstanceRef.current.setCenter(newCenter);

      if (markerRef.current) {
        markerRef.current.setPosition(newCenter);
      }
    }
  }, [selectedLocation]);

  const handleConfirm = useCallback(() => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
    }
    onClose();
  }, [selectedLocation, onLocationSelect, onClose]);

  const handleClose = () => {
    if (selectedLocation) {
      const confirmed = window.confirm(
        "You have selected a location. Are you sure you want to close without confirming?"
      );
      if (confirmed) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 99999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          width: "90vw",
          maxWidth: "800px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>
            Select Location
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              padding: "0",
              width: "30px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "20px", flex: 1, overflow: "auto" }}>
          {/* Search Bar with Autocomplete */}
          <div style={{ position: "relative", marginBottom: "15px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  type="text"
                  value={searchValue}
                  onChange={handleSearchInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch(searchValue);
                      setShowSuggestions(false);
                    } else if (e.key === "Escape") {
                      setShowSuggestions(false);
                    }
                  }}
                  onFocus={() =>
                    searchValue.length >= 2 && setShowSuggestions(true)
                  }
                  onBlur={() =>
                    setTimeout(() => setShowSuggestions(false), 200)
                  }
                  placeholder="Search for a location (type to see suggestions)..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />

                {/* Autocomplete Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      backgroundColor: "white",
                      border: "1px solid #d1d5db",
                      borderTop: "none",
                      borderRadius: "0 0 6px 6px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      zIndex: 1000,
                      maxHeight: "200px",
                      overflowY: "auto",
                    }}
                  >
                    {suggestions.map((suggestion) => (
                      <div
                        key={suggestion.placeId}
                        onClick={() => handleSuggestionSelect(suggestion)}
                        style={{
                          padding: "10px 12px",
                          cursor: "pointer",
                          borderBottom: "1px solid #f3f4f6",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.backgroundColor = "#f9fafb")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.backgroundColor = "white")
                        }
                      >
                        <div style={{ fontWeight: "500", color: "#1f2937" }}>
                          {suggestion.mainText}
                        </div>
                        {suggestion.secondaryText && (
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>
                            {suggestion.secondaryText}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleSearch(searchValue)}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Search
              </button>

              <button
                onClick={handleCurrentLocation}
                style={{
                  padding: "10px 12px",
                  backgroundColor: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
                title="Use current location"
              >
                📍
              </button>
            </div>
          </div>

          {/* Map Container */}
          <div
            style={{
              height: "400px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              overflow: "hidden",
              marginBottom: "15px",
            }}
          >
            {error ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f9fafb",
                  color: "#dc2626",
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                <div>
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>⚠️</div>
                  <p>{error}</p>
                </div>
              </div>
            ) : !isLoaded ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f9fafb",
                  color: "#6b7280",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>🗺️</div>
                  <p>Loading Google Maps...</p>
                </div>
              </div>
            ) : (
              <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
            )}
          </div>

          {/* Selected Location Info */}
          {selectedLocation && (
            <div
              style={{
                padding: "12px",
                backgroundColor: "#f0f9ff",
                border: "1px solid #0ea5e9",
                borderRadius: "6px",
                marginBottom: "15px",
              }}
            >
              <div style={{ fontWeight: "600", color: "#0c4a6e" }}>
                Selected Location:
              </div>
              <div style={{ color: "#0369a1", marginTop: "4px" }}>
                {selectedLocation.name}
              </div>
              {selectedLocation.address && (
                <div style={{ fontSize: "12px", color: "#0284c7", marginTop: "2px" }}>
                  {selectedLocation.address}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "20px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            Click on the map or search to select a location
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleClose}
              style={{
                padding: "8px 16px",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedLocation}
              style={{
                padding: "8px 16px",
                backgroundColor: selectedLocation ? "#2563eb" : "#d1d5db",
                color: selectedLocation ? "white" : "#9ca3af",
                border: "none",
                borderRadius: "6px",
                cursor: selectedLocation ? "pointer" : "not-allowed",
                fontSize: "14px",
              }}
            >
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default MapLocationPicker;