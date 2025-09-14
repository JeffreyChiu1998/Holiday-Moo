// Google Maps API Loader
// Centralized loader to prevent multiple script loading conflicts

import { getApiKeys } from "../config/environment";

class GoogleMapsLoader {
  constructor() {
    this.isLoading = false;
    this.isLoaded = false;
    this.loadPromise = null;
    this.callbacks = [];
  }

  // Check if Google Maps API is already loaded
  isGoogleMapsLoaded() {
    const hasGoogle = !!window.google;
    const hasMaps = !!window.google?.maps;
    const hasPlaces = !!window.google?.maps?.places;
    const hasPlacesService = !!window.google?.maps?.places?.PlacesService;
    const hasPlacesServiceStatus =
      !!window.google?.maps?.places?.PlacesServiceStatus;

    const isFullyLoaded =
      hasGoogle &&
      hasMaps &&
      hasPlaces &&
      hasPlacesService &&
      hasPlacesServiceStatus;

    if (!isFullyLoaded) {
    }

    return isFullyLoaded;
  }

  // Load Google Maps API with proper async handling
  async loadGoogleMaps() {
    // If already loaded, return immediately
    if (this.isGoogleMapsLoaded()) {
      return Promise.resolve();
    }

    // If currently loading, return the existing promise
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // Start loading
    this.isLoading = true;

    this.loadPromise = new Promise((resolve, reject) => {
      const apiKeys = getApiKeys();

      if (!apiKeys.GOOGLE_MAPS) {
        const error = "Google Maps API key not configured";
        this.isLoading = false;
        reject(new Error(error));
        return;
      }

      // Check if script already exists
      const existingScript = document.querySelector(
        'script[src*="maps.googleapis.com"]'
      );
      if (existingScript) {

        // Wait for the existing script to load with robust checking
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds with 100ms intervals

        const checkExistingScript = () => {
          attempts++;

          if (this.isGoogleMapsLoaded()) {
            this.isLoading = false;
            this.isLoaded = true;
            resolve();
          } else if (attempts >= maxAttempts) {
            this.isLoading = false;
            const error =
              "Timeout waiting for existing Google Maps script to load Places API";
            reject(new Error(error));
          } else {
            setTimeout(checkExistingScript, 100);
          }
        };

        checkExistingScript();

        return;
      }

      // Create new script
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKeys.GOOGLE_MAPS}&libraries=places&v=weekly&loading=async`;
      script.async = true;
      script.defer = true;

      script.onload = () => {

        // Wait for Places API to be fully initialized
        const waitForPlaces = () => {
          let attempts = 0;
          const maxAttempts = 50; // 5 seconds with 100ms intervals

          const checkPlaces = () => {
            attempts++;

            if (this.isGoogleMapsLoaded()) {
              this.isLoading = false;
              this.isLoaded = true;
              resolve();
            } else if (attempts >= maxAttempts) {
              this.isLoading = false;
              const error =
                "Timeout: Google Maps API script loaded but Places API not available after 5 seconds";
              reject(new Error(error));
            } else {
              setTimeout(checkPlaces, 100);
            }
          };

          checkPlaces();
        };

        waitForPlaces();
      };

      script.onerror = (event) => {
        this.isLoading = false;
        const error = "Failed to load Google Maps API script";
        reject(new Error(error));
      };

      // Add script to document
      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  // Get loading status
  getStatus() {
    return {
      isLoaded: this.isLoaded,
      isLoading: this.isLoading,
      isAvailable: this.isGoogleMapsLoaded(),
    };
  }
}

// Create singleton instance
const googleMapsLoader = new GoogleMapsLoader();

export default googleMapsLoader;

// Convenience function for components
export const loadGoogleMaps = () => googleMapsLoader.loadGoogleMaps();
export const isGoogleMapsLoaded = () => googleMapsLoader.isGoogleMapsLoaded();
