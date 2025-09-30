import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MAPS_CONFIG as GOOGLE_MAPS_CONFIG } from "../config/maps";
import MapLocationPicker from "./MapLocationPicker";

const LocationPicker = ({
  value,
  onChange,
  placeholder = "Enter location",
}) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Hide suggestions on scroll to prevent positioning issues
  useEffect(() => {
    const handleScroll = () => {
      if (showSuggestions) {
        setShowSuggestions(false);
      }
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [showSuggestions]);

  // Load Google Maps API
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true);
      return;
    }

    if (GOOGLE_MAPS_CONFIG.apiKey === "YOUR_GOOGLE_MAPS_API_KEY") {
      setError(
        "Please configure your Google Maps API key in src/config/googleMaps.js"
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${
      GOOGLE_MAPS_CONFIG.apiKey
    }&libraries=${GOOGLE_MAPS_CONFIG.libraries.join(",")}&language=${
      GOOGLE_MAPS_CONFIG.language
    }&region=${GOOGLE_MAPS_CONFIG.region}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsLoaded(true);
      } else {
        setError(
          "Google Maps Places API not available. Please ensure Places API is enabled in your Google Cloud Console."
        );
      }
    };

    script.onerror = (e) => {
      setError(
        "Failed to load Google Maps API. Please check your API key and internet connection."
      );
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup script if component unmounts
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      // Cleanup timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Initialize Places Autocomplete
  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ["establishment", "geocode"], // Allow both places and addresses
          fields: [
            "place_id",
            "name",
            "formatted_address",
            "geometry",
            "types",
          ],
        }
      );

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();

        if (!place.geometry) {
          // User entered the name of a Place that was not suggested
          return;
        }

        // Get the selected place details
        const locationData = {
          name: place.name || "",
          address: place.formatted_address || "",
          placeId: place.place_id || "",
          coordinates: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          },
          types: place.types || [],
        };

        // Call the onChange callback with the location data
        onChange(locationData);
      });

      autocompleteRef.current = autocomplete;
    } catch (err) {
      setError(
        "Failed to initialize Google Places Autocomplete: " + err.message
      );
    }
  }, [isLoaded, onChange]);

  // Handle manual input changes
  const handleInputChange = (e) => {
    const inputValue = e.target.value;

    // If user is typing manually (not from autocomplete), treat as simple text
    if (typeof value === "string") {
      onChange(inputValue);
    } else {
      // If we had a place object but user is now typing, preserve the object structure
      // but update the display text (address/name)
      if (value && typeof value === "object") {
        onChange({
          ...value,
          name: inputValue,
          address: inputValue,
        });
      } else {
        onChange(inputValue);
      }
    }

    // Get autocomplete suggestions with debouncing
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      getAutocompleteSuggestions(inputValue);
    }, 300);
  };

  // Handle map location selection
  const handleMapLocationSelect = (locationData) => {
    onChange(locationData);
    setShowMapModal(false);
    // Clear any lingering suggestions
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Open map modal
  const handleOpenMap = async () => {
    // Close suggestions dropdown when opening map
    setShowSuggestions(false);
    setSuggestions([]);

    // If we have a string location, try to geocode it before opening the map
    if (
      typeof value === "string" &&
      value.trim() &&
      isLoaded &&
      window.google?.maps
    ) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: value.trim() }, (results, status) => {
          if (status === window.google.maps.GeocoderStatus.OK && results?.[0]) {
            const result = results[0];
            const locationData = {
              name: value.trim(),
              address: result.formatted_address,
              placeId: result.place_id || "",
              coordinates: {
                lat: result.geometry.location.lat(),
                lng: result.geometry.location.lng(),
              },
            };

            // Update the value with geocoded data
            onChange(locationData);

            // Open map with the geocoded location
            setShowMapModal(true);
          } else {
            // If geocoding fails, still open the map but without initial location
            setShowMapModal(true);
          }
        });
      } catch (error) {
        setShowMapModal(true);
      }
    } else {
      // Open map normally if no string location or if already an object
      setShowMapModal(true);
    }
  };

  // Get autocomplete suggestions
  const getAutocompleteSuggestions = (input) => {
    if (
      !input.trim() ||
      input.length < 2 ||
      !window.google ||
      !window.google.maps.places
    ) {
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
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    // Create a location object similar to what autocomplete would provide
    const locationData = {
      name: suggestion.mainText,
      address: suggestion.description,
      placeId: suggestion.placeId,
    };

    onChange(locationData);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Get display value
  const getDisplayValue = () => {
    if (typeof value === "string") {
      return value;
    } else if (value && typeof value === "object") {
      return value.address || value.name || "";
    }
    return "";
  };

  if (error) {
    return (
      <div className="location-picker-error">
        <div className="location-input-container">
          <input
            type="text"
            value={getDisplayValue()}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="location-input location-input-fallback"
          />
          <button
            type="button"
            onClick={handleOpenMap}
            className="map-button map-button-disabled"
            disabled
            title="Map unavailable - API error"
          >
            🗺️
          </button>
        </div>
        <div className="location-error-message">⚠️ {error}</div>
        {showMapModal && (
          <MapLocationPicker
            isOpen={showMapModal}
            onLocationSelect={handleMapLocationSelect}
            onClose={() => setShowMapModal(false)}
            initialLocation={
              typeof value === "object" && value?.coordinates
                ? value
                : typeof value === "string" && value.trim()
                ? { name: value.trim(), address: value.trim() }
                : null
            }
          />
        )}
      </div>
    );
  }

  return (
    <div className="location-picker">
      <div
        className="location-input-container"
        style={{ position: "relative" }}
      >
        <input
          ref={inputRef}
          type="text"
          value={getDisplayValue()}
          onChange={handleInputChange}
          onFocus={() => {
            const currentValue = getDisplayValue();
            if (currentValue.length >= 2) {
              getAutocompleteSuggestions(currentValue);
            }
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setShowSuggestions(false);
            }
          }}
          placeholder={
            isLoaded
              ? `${placeholder} (type to see suggestions)`
              : "Loading Google Maps..."
          }
          className={`location-input ${
            isLoaded ? "location-input-loaded" : "location-input-loading"
          }`}
          disabled={!isLoaded}
        />
        <button
          type="button"
          onClick={handleOpenMap}
          className="map-button"
          disabled={!isLoaded}
          title="Select location on map"
        >
          🗺️
        </button>
        {!isLoaded && (
          <div className="location-loading">
            <div className="location-spinner"></div>
          </div>
        )}

        {/* Autocomplete Suggestions Dropdown */}
        {showSuggestions &&
          suggestions.length > 0 &&
          inputRef.current &&
          !showMapModal && (
            <>
              {/* Portal-based dropdown for guaranteed top-layer display */}
              {createPortal(
                <div
                  style={{
                    position: "fixed",
                    top: inputRef.current.getBoundingClientRect().bottom,
                    left: inputRef.current.getBoundingClientRect().left,
                    width: inputRef.current.getBoundingClientRect().width - 50, // Account for map button
                    backgroundColor: "white",
                    border: "1px solid #d1d5db",
                    borderTop: "none",
                    borderRadius: "0 0 6px 6px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    zIndex: 999998, // Lower than map modal but higher than form elements
                    maxHeight: "200px",
                    overflowY: "auto",
                    pointerEvents: "auto",
                  }}
                >
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={`portal-${suggestion.placeId}`}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className="location-suggestion-item"
                      style={{
                        padding: "10px 12px",
                        cursor: "pointer",
                        backgroundColor: "white",
                        transition: "background-color 0.2s",
                        borderBottom:
                          index < suggestions.length - 1
                            ? "1px solid #f3f4f6"
                            : "none",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.backgroundColor = "#f9fafb")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.backgroundColor = "white")
                      }
                    >
                      <div
                        style={{
                          fontWeight: "500",
                          color: "#1f2937",
                          fontSize: "14px",
                        }}
                      >
                        {suggestion.mainText}
                      </div>
                      {suggestion.secondaryText && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#6b7280",
                            marginTop: "2px",
                          }}
                        >
                          {suggestion.secondaryText}
                        </div>
                      )}
                    </div>
                  ))}
                </div>,
                document.body
              )}
            </>
          )}
      </div>

      {showMapModal && (
        <MapLocationPicker
          isOpen={showMapModal}
          onLocationSelect={handleMapLocationSelect}
          onClose={() => {
            setShowMapModal(false);
            // Clear any lingering suggestions when map closes
            setShowSuggestions(false);
            setSuggestions([]);
          }}
          initialLocation={
            typeof value === "object" && value?.coordinates
              ? value
              : typeof value === "string" && value.trim()
              ? { name: value.trim(), address: value.trim() }
              : null
          }
        />
      )}
    </div>
  );
};

export default LocationPicker;
