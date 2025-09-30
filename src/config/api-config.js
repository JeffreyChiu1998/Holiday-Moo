// API Configuration for Holiday Moo
export const API_CONFIG = {
  // Use environment variable or fallback to AWS API Gateway
  BASE_URL:
    process.env.REACT_APP_API_BASE_URL ||
    "https://047i27vjyk.execute-api.us-east-1.amazonaws.com/prod",

  ENDPOINTS: {
    XAI: "/api/xai",
    PERPLEXITY: "/api/perplexity",
    GOOGLE_PLACES: "/api/google-places",
    SCRAPE_TRAVEL_URL: "/api/scrape/travel-url",
    EXPORT_EXCEL: "/api/export/excel",
  },

  // Default request configuration
  DEFAULT_HEADERS: {
    "Content-Type": "application/json",
  },

  // Timeout for API calls (30 seconds)
  TIMEOUT: 30000,

  // Model configurations
  MODELS: {
    XAI: "grok-3-mini",
    PERPLEXITY: "sonar",
  },
};

export default API_CONFIG;
