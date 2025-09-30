// Environment Configuration
// This file handles environment variables and provides fallbacks
// FROZEN VERSION: AWS deployment disabled for local development

const getEnvVar = (key, fallback = "") => {
  // In a real production app, use process.env for Node.js or import.meta.env for Vite
  // For now, we'll use a secure configuration approach
  return process.env[key] || fallback;
};

// Environment-based API Keys (more secure approach)
export const ENV_CONFIG = {
  // Development/Production environment detection
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",

  // FREEZE MODE: Force development mode to prevent AWS deployments
  isFrozen: true,
  freezeVersion: "1.0.0",

  // API Keys from environment variables (recommended for production)
  API_KEYS: {
    XAI: getEnvVar("REACT_APP_XAI_API_KEY"),
    PERPLEXITY: getEnvVar("REACT_APP_PERPLEXITY_API_KEY"),
    GOOGLE_MAPS: getEnvVar("REACT_APP_GOOGLE_MAPS_API_KEY"),
  },

  // Backend API Configuration
  BACKEND_API: {
    BASE_URL: getEnvVar("REACT_APP_BACKEND_URL", "http://localhost:5000"),
    ENDPOINTS: {
      XAI_CHAT: "/api/xai/chat",
      PERPLEXITY_SEARCH: "/api/perplexity/search",
      TRAVEL_RECOMMENDATIONS: "/api/travel/recommendations",
      SCRAPE_TRAVEL_URL: "/api/scrape/travel-url",
      HEALTH: "/health",
    },
  },

  // Only Google Maps key remains in frontend (needed for interactive maps)
  FRONTEND_KEYS: {
    GOOGLE_MAPS: getEnvVar(
      "REACT_APP_GOOGLE_MAPS_API_KEY",
      "" // Input your Google API Key here
    ),
  },

  // Export Service Configuration
  EXPORT_SERVICE: {
    URL: getEnvVar(
      "REACT_APP_EXPORT_API_URL",
      "https://047i27vjyk.execute-api.us-east-1.amazonaws.com/prod"
    ),
    ENABLED: getEnvVar("REACT_APP_EXPORT_SERVICE_ENABLED", "true") === "true",
    TIMEOUT: parseInt(getEnvVar("REACT_APP_EXPORT_TIMEOUT", "30000")),
  },
};

// Export API configuration (only Google Maps key exposed to frontend)
export const getApiKeys = () => {
  return {
    // Only Google Maps key in frontend (needed for interactive maps)
    GOOGLE_MAPS:
      ENV_CONFIG.API_KEYS.GOOGLE_MAPS || ENV_CONFIG.FRONTEND_KEYS.GOOGLE_MAPS,
    // AI services now use backend API
    XAI: null, // Use backend API instead
    PERPLEXITY: null, // Use backend API instead
  };
};

// Export backend API configuration
export const getBackendConfig = () => {
  return ENV_CONFIG.BACKEND_API;
};
