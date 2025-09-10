// Google Maps API Configuration
// Replace 'YOUR_GOOGLE_MAPS_API_KEY' with your actual Google Maps API key
// Get your API key from: https://console.cloud.google.com/google/maps-apis/

export const GOOGLE_MAPS_CONFIG = {
  apiKey: "AIzaSyCObsrIJOhfcYa3WKJ4YH_IOoKZPmLEvcQ", // Replace with your actual API key
  libraries: ["places"], // Required libraries for Places API
  language: "en", // Language for the API
  region: "US", // Region for the API
};

// Instructions to get Google Maps API Key:
// 1. Go to https://console.cloud.google.com/
// 2. Create a new project or select an existing one
// 3. Enable the following APIs:
//    - Maps JavaScript API
//    - Places API
//    - Geocoding API
// 4. Create credentials (API Key)
// 5. Restrict the API key to your domain for security
// 6. Replace 'YOUR_GOOGLE_MAPS_API_KEY' above with your actual key