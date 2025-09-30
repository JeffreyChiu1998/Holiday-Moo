import { useState, useEffect, useRef } from "react";
import { ENV_CONFIG } from "../config/environment";

const GooglePlacesAutocomplete = ({
  value,
  onChange,
  placeholder = "Search for a destination...",
  className = "",
  required = false,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    // Load Google Maps API if not already loaded
    if (!window.google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${ENV_CONFIG.FRONTEND_KEYS.GOOGLE_MAPS}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsLoaded(true);
      document.head.appendChild(script);
    } else {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && inputRef.current && !autocompleteRef.current) {
      // Initialize Google Places Autocomplete
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ["(cities)"], // Restrict to cities and regions
          fields: ["place_id", "formatted_address", "name", "geometry"],
        }
      );

      // Listen for place selection
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace();

        if (place && place.formatted_address) {
          const selectedPlace = {
            placeId: place.place_id,
            address: place.formatted_address,
            name: place.name,
            coordinates: place.geometry?.location
              ? {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng(),
                }
              : null,
          };

          setInputValue(place.formatted_address);
          onChange(selectedPlace);
        }
      });
    }
  }, [isLoaded, onChange]);

  useEffect(() => {
    // Update input value when prop changes
    setInputValue(value || "");
  }, [value]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // If user clears the input, notify parent
    if (!newValue) {
      onChange(null);
    }
  };

  const handleKeyDown = (e) => {
    // Prevent form submission when Enter is pressed in autocomplete
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  return (
    <div className="google-places-autocomplete">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={isLoaded ? placeholder : "Loading Google Places..."}
        className={className}
        required={required}
        disabled={!isLoaded}
      />
      {!isLoaded && (
        <div
          className="loading-indicator"
          style={{
            fontSize: "12px",
            color: "#666",
            marginTop: "4px",
          }}
        >
          Loading Google Places API...
        </div>
      )}
    </div>
  );
};

export default GooglePlacesAutocomplete;
