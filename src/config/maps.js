// Maps Configuration
// Handles Google Maps API and location services configuration

import { getApiKeys } from "./environment";

const apiKeys = getApiKeys();

// Google Maps Configuration
export const MAPS_CONFIG = {
  apiKey: apiKeys.GOOGLE_MAPS,
  libraries: ["places"], // Required libraries for Places API
  language: "en", // Language for the API
  region: "US", // Region for the API

  // Map display options
  defaultCenter: {
    lat: 40.7128, // New York City
    lng: -74.006,
  },
  defaultZoom: 10,

  // Places API options
  placesOptions: {
    types: ["establishment"], // Types of places to search
    componentRestrictions: { country: "us" }, // Restrict to specific country
  },
};

// Map Styles (optional custom styling)
export const MAP_STYLES = [
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
];

// Location Services Configuration
export const LOCATION_CONFIG = {
  enableHighAccuracy: true,
  timeout: 10000, // 10 seconds
  maximumAge: 300000, // 5 minutes

  // Fallback locations for different regions
  fallbackLocations: {
    US: { lat: 39.8283, lng: -98.5795 }, // Geographic center of US
    EU: { lat: 54.526, lng: 15.2551 }, // Geographic center of EU
    WORLD: { lat: 0, lng: 0 }, // Equator/Prime Meridian
  },
};

// Instructions for setup:
// 1. Get Google Maps API key from: https://console.cloud.google.com/google/maps-apis/
// 2. Enable the following APIs:
//    - Maps JavaScript API
//    - Places API
//    - Geocoding API
// 3. Set REACT_APP_GOOGLE_MAPS_API_KEY in your .env file
// 4. Restrict the API key to your domain for security
