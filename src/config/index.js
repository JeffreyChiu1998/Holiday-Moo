// Configuration Index
// Central export point for all configuration modules

// Environment and security
export { ENV_CONFIG, getApiKeys } from "./environment";

// Feature-specific configurations
export {
  CONTROLLER_AI_CONFIG,
  RECOMMENDATION_AI_CONFIG,
  CHATBOT_SYSTEM_PROMPT,
  CHATBOT_UI_CONFIG,
} from "./chatbot";

export { MAPS_CONFIG, MAP_STYLES, LOCATION_CONFIG } from "./maps";

export {
  TRAVEL_EVENT_TYPES,
  DEFAULT_EVENT_TYPE,
  EVENT_CATEGORIES,
  EVENT_COLORS,
  getEventTypeByValue,
  getEventTypeColor,
  getEventTypeLabel,
} from "./events";

// Legacy exports for backward compatibility (can be removed after migration)
export {
  CONTROLLER_AI_CONFIG as XAI_CONFIG,
  CHATBOT_SYSTEM_PROMPT as MOO_SYSTEM_PROMPT,
  RECOMMENDATION_AI_CONFIG as PERPLEXITY_CONFIG,
} from "./chatbot";

export { MAPS_CONFIG as GOOGLE_MAPS_CONFIG } from "./maps";
