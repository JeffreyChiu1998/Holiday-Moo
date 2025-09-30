import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MAPS_CONFIG } from "../config/maps";
import MapLocationPicker from "./MapLocationPicker";
import googleMapsLoader from "../utils/googleMapsLoader";
import apiService from "../services/apiService";

const AddBucketItemModal = ({
  isOpen,
  onClose,
  onAddItem,
  editingItem,
  isEditing,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    type: "activity",
    country: "",
    city: "",
    estimatedCost: "",
    openHours: "",
    description: "",
    location: "",
    link: "",
    imgUrl: "",
    imageUrl: "", // Alternative field name for compatibility
    websiteLink: "", // Alternative field name for compatibility
    coordinates: null,
    placeId: "",
    dateAdded: new Date().toISOString(),
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [countryHints, setCountryHints] = useState([]);
  const [cityHints, setCityHints] = useState([]);
  const [showCountryHints, setShowCountryHints] = useState(false);
  const [showCityHints, setShowCityHints] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [countryDropdownPosition, setCountryDropdownPosition] = useState(null);
  const [cityDropdownPosition, setCityDropdownPosition] = useState(null);

  // Input method selection
  const [inputMethod, setInputMethod] = useState("manual"); // "manual", "map", "url"
  const [urlInput, setUrlInput] = useState("");
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);

  const countryInputRef = useRef(null);
  const cityInputRef = useRef(null);

  const activityTypes = [
    "restaurant",
    "attraction",
    "activity",
    "shopping",
    "entertainment",
    "cultural",
    "outdoor",
    "other",
  ];

  const calculateDropdownPosition = (inputRef) => {
    if (!inputRef.current) return null;

    const rect = inputRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    };
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Provide hints for country and city fields
    if (field === "country") {
      if (value.length > 1) {
        const position = calculateDropdownPosition(countryInputRef);
        setCountryDropdownPosition(position);
        getCountryHints(value);
      } else {
        setShowCountryHints(false);
        setCountryHints([]);
        setCountryDropdownPosition(null);
      }
    }

    if (field === "city") {
      if (value.length > 1) {
        const position = calculateDropdownPosition(cityInputRef);
        setCityDropdownPosition(position);
        getCityHints(value);
      } else {
        setShowCityHints(false);
        setCityHints([]);
        setCityDropdownPosition(null);
      }
    }
  };

  const getCountryHints = async (query) => {
    if (!window.google?.maps?.places) {
      // Fallback with common countries
      const commonCountries = [
        "United States",
        "Canada",
        "United Kingdom",
        "Australia",
        "Germany",
        "France",
        "Italy",
        "Spain",
        "Japan",
        "China",
        "India",
        "Brazil",
        "Mexico",
        "Netherlands",
        "Sweden",
        "Norway",
        "Denmark",
        "Vietnam",
      ];
      const matches = commonCountries
        .filter((country) =>
          country.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 5);
      setCountryHints(matches);
      setShowCountryHints(matches.length > 0);
      return;
    }

    try {
      const service = new window.google.maps.places.AutocompleteService();
      const request = {
        input: query,
        types: ["(regions)"],
      };

      service.getPlacePredictions(request, (predictions, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          predictions
        ) {
          // Get countries and administrative areas that could be countries
          const countries = predictions
            .filter(
              (p) =>
                p.types.includes("country") ||
                (p.types.includes("administrative_area_level_1") &&
                  p.description.split(",").length <= 2)
            )
            .map((p) => p.description)
            .slice(0, 5);
          setCountryHints(countries);
          setShowCountryHints(countries.length > 0);
        } else {
          setShowCountryHints(false);
        }
      });
    } catch (error) {
      setShowCountryHints(false);
    }
  };

  const getCityHints = async (query) => {
    if (!window.google?.maps?.places) {
      // Fallback with common cities
      const commonCities = [
        "New York",
        "Los Angeles",
        "London",
        "Paris",
        "Tokyo",
        "Sydney",
        "Berlin",
        "Rome",
        "Madrid",
        "Amsterdam",
        "Stockholm",
        "Copenhagen",
        "Ho Chi Minh City",
        "Hanoi",
        "Bangkok",
        "Singapore",
        "Hong Kong",
      ];
      const matches = commonCities
        .filter((city) => city.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);
      setCityHints(matches);
      setShowCityHints(matches.length > 0);
      return;
    }

    try {
      const service = new window.google.maps.places.AutocompleteService();
      const request = {
        input: query,
        types: ["(cities)"],
      };

      service.getPlacePredictions(request, (predictions, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          predictions
        ) {
          const cities = predictions
            .map((p) => {
              // Extract just the city name (first part before comma)
              const cityName = p.description.split(",")[0].trim();
              return cityName;
            })
            .filter((city, index, arr) => arr.indexOf(city) === index) // Remove duplicates
            .slice(0, 5);
          setCityHints(cities);
          setShowCityHints(cities.length > 0);
        } else {
          setShowCityHints(false);
        }
      });
    } catch (error) {
      setShowCityHints(false);
    }
  };

  const handleGoogleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Use Google Places API for real search results
      if (window.google?.maps?.places) {
        const service = new window.google.maps.places.PlacesService(
          document.createElement("div")
        );

        const request = {
          query: searchQuery,
          fields: [
            "name",
            "formatted_address",
            "address_components",
            "geometry",
            "place_id",
            "types",
            "business_status",
            "photos",
            "opening_hours",
            "price_level",
            "website",
          ],
        };

        service.textSearch(request, (results, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            results
          ) {
            const searchResults = results.slice(0, 5).map((place) => {
              // Determine activity type based on Google place types
              let activityType = "other";
              if (place.types) {
                if (
                  place.types.includes("restaurant") ||
                  place.types.includes("food") ||
                  place.types.includes("meal_takeaway")
                ) {
                  activityType = "restaurant";
                } else if (
                  place.types.includes("tourist_attraction") ||
                  place.types.includes("museum") ||
                  place.types.includes("amusement_park")
                ) {
                  activityType = "attraction";
                } else if (
                  place.types.includes("shopping_mall") ||
                  place.types.includes("store")
                ) {
                  activityType = "shopping";
                } else if (
                  place.types.includes("night_club") ||
                  place.types.includes("movie_theater")
                ) {
                  activityType = "entertainment";
                } else if (
                  place.types.includes("park") ||
                  place.types.includes("zoo")
                ) {
                  activityType = "outdoor";
                } else if (
                  place.types.includes("church") ||
                  place.types.includes("hindu_temple") ||
                  place.types.includes("synagogue")
                ) {
                  activityType = "cultural";
                } else if (
                  place.types.includes("gym") ||
                  place.types.includes("spa")
                ) {
                  activityType = "activity";
                }
              }

              // Get photo URL if available
              let photoUrl = null;
              if (place.photos && place.photos.length > 0) {
                photoUrl = place.photos[0].getUrl({
                  maxWidth: 400,
                  maxHeight: 300,
                });
              }

              // Estimate cost based on price level
              let estimatedCost = "Cost varies";
              if (place.price_level !== undefined) {
                switch (place.price_level) {
                  case 0:
                    estimatedCost = "Free";
                    break;
                  case 1:
                    estimatedCost = "$";
                    break;
                  case 2:
                    estimatedCost = "$$";
                    break;
                  case 3:
                    estimatedCost = "$$$";
                    break;
                  case 4:
                    estimatedCost = "$$$$";
                    break;
                  default:
                    estimatedCost = "Cost varies";
                    break;
                }
              }

              // Get opening hours
              let openHours = "Hours vary";
              if (place.opening_hours?.weekday_text) {
                openHours = place.opening_hours.weekday_text[0] || "Hours vary";
              }

              // Extract country and city from address components
              let country = "";
              let city = "";

              if (place.address_components) {
                place.address_components.forEach((component) => {
                  if (component.types.includes("country")) {
                    country = component.long_name;
                  }
                  // Prioritize locality, then administrative areas
                  if (component.types.includes("locality")) {
                    city = component.long_name;
                  } else if (
                    !city &&
                    component.types.includes("administrative_area_level_2")
                  ) {
                    city = component.long_name;
                  } else if (
                    !city &&
                    component.types.includes("administrative_area_level_1")
                  ) {
                    city = component.long_name;
                  } else if (!city && component.types.includes("sublocality")) {
                    city = component.long_name;
                  }
                });
              }

              // Fallback: extract from formatted_address if address_components not available
              if (!country || !city) {
                const addressParts = place.formatted_address
                  .split(",")
                  .map((part) => part.trim());
                if (!country && addressParts.length > 0) {
                  country = addressParts[addressParts.length - 1];
                }
                if (!city && addressParts.length > 1) {
                  // Try to get the first part that's not a street address
                  for (
                    let i = 0;
                    i < Math.min(2, addressParts.length - 1);
                    i++
                  ) {
                    const part = addressParts[i];
                    // Skip if it looks like a street address (contains numbers)
                    if (!/^\d/.test(part) && part.length > 2) {
                      city = part;
                      break;
                    }
                  }
                  if (!city) {
                    city = addressParts[0];
                  }
                }
              }

              return {
                name: place.name,
                type: activityType,
                country: country,
                city: city,
                description: `${place.name} - ${place.formatted_address}`,
                location: place.formatted_address,
                coordinates: place.geometry
                  ? {
                      lat: place.geometry.location.lat(),
                      lng: place.geometry.location.lng(),
                    }
                  : null,
                placeId: place.place_id,
                estimatedCost,
                openHours,
                link:
                  place.website ||
                  `https://www.google.com/search?q=${encodeURIComponent(
                    place.name
                  )}`,
                imgUrl: photoUrl,
                types: place.types || [],
              };
            });

            setSearchResults(searchResults);
          } else {
            setSearchResults([]);
          }
          setIsSearching(false);
        });
      } else {
        // Fallback to mock results if Google Maps API is not available
        const mockResults = [
          {
            name: searchQuery,
            type: "attraction",
            description: `Popular ${searchQuery} destination`,
            location: "Location not specified",
            coordinates: null,
            estimatedCost: "Cost varies",
            openHours: "Hours vary",
            link: `https://www.google.com/search?q=${encodeURIComponent(
              searchQuery
            )}`,
            imgUrl: null,
          },
        ];
        setSearchResults(mockResults);
        setIsSearching(false);
      }
    } catch (error) {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result) => {
    setFormData({
      ...result,
      // Ensure imgUrl is properly set
      imgUrl: result.imgUrl || "",
    });
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const itemData = {
      ...formData,
    };

    if (!isEditing) {
      itemData.id = Date.now() + Math.random();
    }

    onAddItem(itemData);
    resetForm();
    onClose();
  };

  const getChangedFields = () => {
    const changedFields = [];

    // Safe string checking with fallback to empty string
    const safeString = (value) => (value || "").toString();

    if (safeString(formData.name).trim() !== "")
      changedFields.push("Activity Name");
    if (formData.type !== "activity") changedFields.push("Type");
    if (safeString(formData.country).trim() !== "")
      changedFields.push("Country");
    if (safeString(formData.city).trim() !== "") changedFields.push("City");
    if (safeString(formData.location).trim() !== "")
      changedFields.push("Location");
    if (safeString(formData.estimatedCost).trim() !== "")
      changedFields.push("Estimated Cost");
    if (safeString(formData.openHours).trim() !== "")
      changedFields.push("Open Hours");
    if (safeString(formData.link).trim() !== "")
      changedFields.push("Website Link");
    if (safeString(formData.description).trim() !== "")
      changedFields.push("Description");
    if (safeString(formData.imgUrl).trim() !== "")
      changedFields.push("Image URL");
    if (safeString(searchQuery).trim() !== "")
      changedFields.push("Search Query");

    return changedFields;
  };

  const handleClose = () => {
    const changedFields = getChangedFields();
    const hasChanges = changedFields.length > 0;

    if (hasChanges) {
      const fieldsList =
        changedFields.length <= 3
          ? changedFields.join(", ")
          : `${changedFields.slice(0, 2).join(", ")} and ${
              changedFields.length - 2
            } other field${changedFields.length > 3 ? "s" : ""}`;

      const confirmed = window.confirm(
        `You have made changes to: ${fieldsList}.\n\nAre you sure you want to close without saving?`
      );
      if (confirmed) {
        resetForm();
        onClose();
      }
    } else {
      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "activity",
      country: "",
      city: "",
      estimatedCost: "",
      openHours: "",
      description: "",
      location: "",
      link: "",
      imgUrl: "",
      imageUrl: "", // Alternative field name for compatibility
      websiteLink: "", // Alternative field name for compatibility
      coordinates: null,
      placeId: "",
      dateAdded: new Date().toISOString(),
    });
    setSearchResults([]);
    setSearchQuery("");
    setCountryHints([]);
    setCityHints([]);
    setShowCountryHints(false);
    setShowCityHints(false);
    setCountryDropdownPosition(null);
    setCityDropdownPosition(null);
    setInputMethod("manual");
    setUrlInput("");
    setIsScrapingUrl(false);
  };

  const handleUrlScraping = async () => {
    if (!urlInput.trim()) return;

    setIsScrapingUrl(true);
    try {
      const result = await apiService.scrapeTravelUrl(urlInput.trim());

      if (result.success && result.data) {
        // Fill form with scraped data
        setFormData((prev) => ({
          ...prev,
          name: result.data.name || "",
          description: result.data.description || "",
          country: result.data.country || "",
          city: result.data.city || "",
          location: result.data.location || "",
          estimatedCost: result.data.price ? String(result.data.price) : "",
          link: result.data.website || urlInput,
          imgUrl: result.data.images?.[0] || "",
          type: result.data.category?.toLowerCase() || "activity",
        }));

        // Show success message with extracted info
        const extractedInfo = [
          result.data.name && `Name: ${result.data.name}`,
          result.data.price && `Price: ${result.data.price}`,
          result.data.country && `Country: ${result.data.country}`,
          result.data.city && `City: ${result.data.city}`,
          result.data.location && `Location: ${result.data.location}`,
        ]
          .filter(Boolean)
          .join("\n");

        alert(
          `${
            result.source_detected || `📋 Extracted from ${result.source}`
          }\n\n${extractedInfo}\n\nPlease review and complete the form below.`
        );
      } else {
        // Check if it's an unsupported site error
        if (result.supported_sites) {
          alert(
            `🚫 Unsupported Website\n\n${
              result.error
            }\n\nCurrently supported sites:\n• ${result.supported_sites
              .split(", ")
              .join("\n• ")}`
          );
        } else if (result.expected_format) {
          // URL format validation error
          alert(
            `❌ Invalid URL Format\n\n${result.error}\n\nExpected format:\n${result.expected_format}\n\nExamples:\n• Klook: https://www.klook.com/.../activity/...\n• KKday: https://www.kkday.com/.../product/...`
          );
        } else {
          alert(`Failed to scrape URL: ${result.error || "Unknown error"}`);
        }
      }
    } catch (error) {
      console.error("URL scraping error:", error);
      alert("Failed to scrape URL. Please check the URL and try again.");
    } finally {
      setIsScrapingUrl(false);
    }
  };

  // Initialize form with editing item data
  useEffect(() => {
    if (isEditing && editingItem) {
      setFormData({
        name: editingItem.name || "",
        type: editingItem.type || "activity",
        country: editingItem.country || "",
        city: editingItem.city || "",
        estimatedCost: editingItem.estimatedCost || "",
        openHours: editingItem.openHours || "",
        description: editingItem.description || "",
        location: editingItem.location || "",
        link: editingItem.link || editingItem.websiteLink || "",
        imgUrl: editingItem.imgUrl || editingItem.imageUrl || "",
        imageUrl: editingItem.imageUrl || editingItem.imgUrl || "",
        websiteLink: editingItem.websiteLink || editingItem.link || "",
        coordinates: editingItem.coordinates || null,
        placeId: editingItem.placeId || "",
        dateAdded: editingItem.dateAdded || new Date().toISOString(),
      });
    } else if (!isEditing) {
      resetForm();
    }
  }, [isEditing, editingItem]);

  // Load Google Maps API using centralized loader
  useEffect(() => {
    if (googleMapsLoader.isGoogleMapsLoaded()) {
      setIsGoogleMapsLoaded(true);
      return;
    }

    if (
      MAPS_CONFIG.apiKey &&
      MAPS_CONFIG.apiKey !== "YOUR_GOOGLE_MAPS_API_KEY" &&
      MAPS_CONFIG.apiKey !== "your-google-maps-key-here"
    ) {
      googleMapsLoader
        .loadGoogleMaps()
        .then(() => {
          setIsGoogleMapsLoaded(true);
        })
        .catch((error) => {
          console.error("Failed to load Google Maps API:", error.message);
        });
    } else {
    }
  }, []);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="modal-overlay add-bucket-item-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="modal-content add-bucket-item-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-content">
            <div className="add-item-icon">{isEditing ? "✏️" : "➕"}</div>
            <h2>
              {isEditing ? "Edit Bucket List Item" : "Add to Bucket List"}
              {getChangedFields().length > 0 && (
                <span
                  className="unsaved-indicator"
                  title="You have unsaved changes"
                >
                  •
                </span>
              )}
            </h2>
          </div>
          <button className="close-button" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="add-item-content">
          {/* Input Method Selection - Only show when adding new items */}
          {!isEditing && (
            <div className="input-method-selection">
              <h3>How would you like to add this item?</h3>
              <div className="method-buttons">
                <button
                  className={`method-button ${
                    inputMethod === "manual" ? "active" : ""
                  }`}
                  onClick={() => setInputMethod("manual")}
                >
                  ✏️ Manual Input
                </button>
                <button
                  className={`method-button ${
                    inputMethod === "map" ? "active" : ""
                  }`}
                  onClick={() => setInputMethod("map")}
                >
                  🔍 Search + Manual
                </button>
                {/* URL scraping temporarily disabled due to anti-bot protection */}
                {/* <button
                  className={`method-button ${
                    inputMethod === "url" ? "active" : ""
                  }`}
                  onClick={() => setInputMethod("url")}
                >
                  🌐 URL + Manual
                </button> */}
              </div>
            </div>
          )}

          {/* URL Input Section - Temporarily disabled */}
          {/* URL scraping disabled due to anti-bot protection from travel sites */}
          {false && !isEditing && inputMethod === "url" && (
            <div className="url-input-section">
              <h3>🌐 Add from Travel Website</h3>
              <p>Paste an activity URL from Klook or KKday.</p>
              <div className="url-input-form">
                <input
                  type="url"
                  placeholder="https://www.klook.com/activity/..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="url-input-field"
                  disabled={isScrapingUrl}
                />
                <button
                  onClick={handleUrlScraping}
                  disabled={!urlInput.trim() || isScrapingUrl}
                  className="url-scrape-button"
                >
                  {isScrapingUrl ? "⏳ Extracting..." : "🔍 Extract Info"}
                </button>
              </div>
              <div className="supported-sites">
                <small>
                  Supported: Klook activity links, KKday product links
                </small>
              </div>
            </div>
          )}

          {/* Google Search Section - Only show when method is "map" */}
          {!isEditing && inputMethod === "map" && (
            <>
              <div className="search-section">
                <h3>Search for Activities</h3>
                <div className="search-input-container">
                  <input
                    type="text"
                    placeholder="Search for places, activities, restaurants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleGoogleSearch()
                    }
                  />
                  <button
                    onClick={handleGoogleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="search-button"
                  >
                    {isSearching ? "Searching..." : "🔍 Search"}
                  </button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="search-results">
                    <h4>Search Results:</h4>
                    {searchResults.map((result, index) => (
                      <div
                        key={index}
                        className="search-result-item"
                        onClick={() => handleSelectSearchResult(result)}
                      >
                        <div className="result-name">{result.name}</div>
                        <div className="result-type">{result.type}</div>
                        <div className="result-description">
                          {result.description}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="divider">
                <span>OR</span>
              </div>
            </>
          )}

          {/* Manual Entry Form */}
          <form onSubmit={handleSubmit} className="add-item-form">
            <h3>
              {isEditing
                ? "Edit Item Details"
                : inputMethod === "map"
                ? "Complete Details"
                : "Add Manually"}
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label>Activity Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter activity name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange("type", e.target.value)}
                >
                  {activityTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Country</label>
                <div className="input-with-hints">
                  <input
                    ref={countryInputRef}
                    type="text"
                    value={formData.country}
                    onChange={(e) =>
                      handleInputChange("country", e.target.value)
                    }
                    placeholder="Enter country"
                    onFocus={() => {
                      if (formData.country.length > 1) {
                        const position =
                          calculateDropdownPosition(countryInputRef);
                        setCountryDropdownPosition(position);
                        setShowCountryHints(true);
                      }
                    }}
                    onBlur={() =>
                      setTimeout(() => {
                        setShowCountryHints(false);
                        setCountryDropdownPosition(null);
                      }, 300)
                    }
                  />
                </div>
              </div>
              <div className="form-group">
                <label>City</label>
                <div className="input-with-hints">
                  <input
                    ref={cityInputRef}
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="Enter city"
                    onFocus={() => {
                      if (formData.city.length > 1) {
                        const position =
                          calculateDropdownPosition(cityInputRef);
                        setCityDropdownPosition(position);
                        setShowCityHints(true);
                      }
                    }}
                    onBlur={() =>
                      setTimeout(() => {
                        setShowCityHints(false);
                        setCityDropdownPosition(null);
                      }, 300)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Location</label>
                <div className="location-input-container">
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      handleInputChange("location", e.target.value)
                    }
                    placeholder="Enter specific location/address"
                    className="location-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMapModal(true)}
                    className="map-button"
                    title="Select location on map"
                  >
                    🔍
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Website Link</label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => handleInputChange("link", e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Estimated Cost</label>
                <input
                  type="text"
                  value={formData.estimatedCost}
                  onChange={(e) =>
                    handleInputChange("estimatedCost", e.target.value)
                  }
                  placeholder="e.g., $50-100"
                />
              </div>
              <div className="form-group">
                <label>Open Hours</label>
                <input
                  type="text"
                  value={formData.openHours}
                  onChange={(e) =>
                    handleInputChange("openHours", e.target.value)
                  }
                  placeholder="e.g., 9 AM - 6 PM"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date Added</label>
                <input
                  type="date"
                  value={
                    formData.dateAdded
                      ? new Date(formData.dateAdded).toISOString().split("T")[0]
                      : new Date().toISOString().split("T")[0]
                  }
                  readOnly
                  disabled
                  className="readonly-field"
                  title="Date cannot be modified"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Describe this activity..."
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Image URL (optional)</label>
              <input
                type="url"
                value={formData.imgUrl}
                onChange={(e) => handleInputChange("imgUrl", e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={handleClose}
                className="cancel-button"
              >
                Cancel
              </button>
              <button type="submit" className="add-button">
                {isEditing ? "Update Item" : "Add to Bucket List"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(modalContent, document.body)}

      {/* Map Location Picker */}
      <MapLocationPicker
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        onLocationSelect={(location) => {
          handleInputChange("location", location.address || location.name);
          if (location.coordinates) {
            handleInputChange("coordinates", location.coordinates);
          }
          setShowMapModal(false);
        }}
        initialLocation={
          formData.coordinates
            ? {
                coordinates: formData.coordinates,
                name: formData.name,
                address: formData.location,
              }
            : null
        }
      />

      {/* Country hints dropdown portal */}
      {showCountryHints &&
        countryHints.length > 0 &&
        countryDropdownPosition &&
        createPortal(
          <div
            className="hints-dropdown"
            style={{
              top: countryDropdownPosition.top,
              left: countryDropdownPosition.left,
              width: countryDropdownPosition.width,
            }}
          >
            {countryHints.map((hint, index) => (
              <div
                key={index}
                className="hint-item"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur event
                  handleInputChange("country", hint);
                  setShowCountryHints(false);
                  setCountryDropdownPosition(null);
                }}
              >
                {hint}
              </div>
            ))}
          </div>,
          document.body
        )}

      {/* City hints dropdown portal */}
      {showCityHints &&
        cityHints.length > 0 &&
        cityDropdownPosition &&
        createPortal(
          <div
            className="hints-dropdown"
            style={{
              top: cityDropdownPosition.top,
              left: cityDropdownPosition.left,
              width: cityDropdownPosition.width,
            }}
          >
            {cityHints.map((hint, index) => (
              <div
                key={index}
                className="hint-item"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur event
                  handleInputChange("city", hint);
                  setShowCityHints(false);
                  setCityDropdownPosition(null);
                }}
              >
                {hint}
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
};

export default AddBucketItemModal;
