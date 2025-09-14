// Travel Event Types Configuration
// Defines all available event categories for travel planning

export const TRAVEL_EVENT_TYPES = [
  {
    value: "dining",
    label: "🍽️ Dining",
    color: "#f59e0b",
    description: "Restaurants, cafes, food tours, cooking classes",
  },
  {
    value: "shopping",
    label: "🛍️ Shopping",
    color: "#ec4899",
    description: "Markets, malls, boutiques, souvenir shopping",
  },
  {
    value: "sightseeing",
    label: "🏛️ Sightseeing",
    color: "#3b82f6",
    description: "Museums, landmarks, historical sites, city tours",
  },
  {
    value: "transport",
    label: "🚗 Transport",
    color: "#6b7280",
    description: "Flights, trains, buses, car rentals, transfers",
  },
  {
    value: "accommodation",
    label: "🏨 Accommodation",
    color: "#10b981",
    description: "Hotel check-in/out, Airbnb, hostels, camping",
  },
  {
    value: "activity",
    label: "🎯 Activity",
    color: "#8b5cf6",
    description: "Adventures, sports, outdoor activities, experiences",
  },
  {
    value: "entertainment",
    label: "🎭 Entertainment",
    color: "#ef4444",
    description: "Shows, concerts, nightlife, cultural events",
  },
  {
    value: "relaxation",
    label: "🧘 Relaxation",
    color: "#06b6d4",
    description: "Spa, beach time, wellness, rest periods",
  },
  {
    value: "break",
    label: "☕ Break",
    color: "#78716c",
    description: "Rest time, coffee breaks, downtime, free periods",
  },
  {
    value: "other",
    label: "📝 Other",
    color: "#64748b",
    description: "Miscellaneous activities, custom events, special occasions",
  },
];

// Default event type for new events
export const DEFAULT_EVENT_TYPE = "sightseeing";

// Helper functions
export const getEventTypeByValue = (value) => {
  return TRAVEL_EVENT_TYPES.find((type) => type.value === value);
};

export const getEventTypeColor = (value) => {
  const eventType = getEventTypeByValue(value);
  return eventType ? eventType.color : "#3b82f6";
};

export const getEventTypeLabel = (value) => {
  const eventType = getEventTypeByValue(value);
  return eventType ? eventType.label : "🏛️ Sightseeing";
};