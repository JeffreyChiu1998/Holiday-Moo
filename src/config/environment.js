// Environment Configuration
// This file handles environment variables and provides fallbacks

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

  // API Keys from environment variables (recommended for production)
  API_KEYS: {
    XAI: getEnvVar("REACT_APP_XAI_API_KEY"),
    PERPLEXITY: getEnvVar("REACT_APP_PERPLEXITY_API_KEY"),
    GOOGLE_MAPS: getEnvVar("REACT_APP_GOOGLE_MAPS_API_KEY"),
  },

  // Export Service Configuration
  EXPORT_SERVICE: {
    URL: getEnvVar("REACT_APP_EXPORT_API_URL", "http://localhost:5000"),
    ENABLED: getEnvVar("REACT_APP_EXPORT_SERVICE_ENABLED", "false") === "true",
    TIMEOUT: parseInt(getEnvVar("REACT_APP_EXPORT_TIMEOUT", "30000")),
  },
};

// Fallback keys for development (NEVER commit real keys to git!)
const DEVELOPMENT_KEYS = {
  XAI: "your-xai-key-here",
  PERPLEXITY: "your-perplexity-key-here",
  GOOGLE_MAPS: "your-google-maps-key-here",
};

// Export secure API keys
export const getApiKeys = () => {
  const keys = {
    XAI:
      ENV_CONFIG.API_KEYS.XAI ||
      (ENV_CONFIG.isDevelopment ? DEVELOPMENT_KEYS.XAI : ""),
    PERPLEXITY:
      ENV_CONFIG.API_KEYS.PERPLEXITY ||
      (ENV_CONFIG.isDevelopment ? DEVELOPMENT_KEYS.PERPLEXITY : ""),
    GOOGLE_MAPS:
      ENV_CONFIG.API_KEYS.GOOGLE_MAPS ||
      (ENV_CONFIG.isDevelopment ? DEVELOPMENT_KEYS.GOOGLE_MAPS : ""),
  };

  return keys;
};