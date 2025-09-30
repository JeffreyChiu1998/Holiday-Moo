// Travel Event Types Configuration
// Defines all available event categories for travel planning

export const TRAVEL_EVENT_TYPES = [
  {
    value: "dining",
    label: "🍽️ Dining",
    color: "#f59e0b",
    description: "Restaurants, cafes, food tours, cooking classes",
    examples: [
      "Restaurant reservation",
      "Food tour",
      "Cooking class",
      "Street food exploration",
    ],
  },
  {
    value: "shopping",
    label: "🛍️ Shopping",
    color: "#ec4899",
    description: "Markets, malls, boutiques, souvenir shopping",
    examples: [
      "Local market visit",
      "Souvenir shopping",
      "Mall visit",
      "Boutique browsing",
    ],
  },
  {
    value: "sightseeing",
    label: "🏛️ Sightseeing",
    color: "#3b82f6",
    description: "Museums, landmarks, historical sites, city tours",
    examples: [
      "Museum visit",
      "City tour",
      "Historical site",
      "Landmark viewing",
    ],
  },
  {
    value: "transport",
    label: "🚗 Transport",
    color: "#6b7280",
    description: "Flights, trains, buses, car rentals, transfers",
    examples: [
      "Flight departure",
      "Train journey",
      "Car rental pickup",
      "Airport transfer",
    ],
  },
  {
    value: "accommodation",
    label: "🏨 Accommodation",
    color: "#10b981",
    description: "Hotel check-in/out, Airbnb, hostels, camping",
    examples: [
      "Hotel check-in",
      "Check-out",
      "Airbnb arrival",
      "Hostel booking",
    ],
  },
  {
    value: "activity",
    label: "🎯 Activity",
    color: "#8b5cf6",
    description: "Adventures, sports, outdoor activities, experiences",
    examples: ["Hiking", "Scuba diving", "Zip-lining", "City bike tour"],
  },
  {
    value: "entertainment",
    label: "🎭 Entertainment",
    color: "#ef4444",
    description: "Shows, concerts, nightlife, cultural events",
    examples: ["Theater show", "Concert", "Nightclub", "Cultural performance"],
  },
  {
    value: "relaxation",
    label: "🧘 Relaxation",
    color: "#06b6d4",
    description: "Spa, beach time, wellness, rest periods",
    examples: ["Spa appointment", "Beach day", "Massage", "Pool time"],
  },
  {
    value: "break",
    label: "☕ Break",
    color: "#78716c",
    description: "Rest time, coffee breaks, downtime, free periods",
    examples: ["Coffee break", "Rest period", "Free time", "Nap time"],
  },
  {
    value: "other",
    label: "📝 Other",
    color: "#64748b",
    description: "Miscellaneous activities, custom events, special occasions",
    examples: ["Meeting", "Phone call", "Personal task", "Custom activity"],
  },
];

// Default event type for new events
export const DEFAULT_EVENT_TYPE = "sightseeing";

// Event type categories for filtering/grouping
export const EVENT_CATEGORIES = {
  ESSENTIAL: ["transport", "accommodation"],
  EXPERIENCES: ["sightseeing", "activity", "entertainment"],
  LIFESTYLE: ["dining", "shopping", "relaxation"],
  FLEXIBLE: ["break", "other"],
};

// Color palette for event types (for consistency)
export const EVENT_COLORS = {
  PRIMARY: "#3b82f6", // Blue - sightseeing
  SUCCESS: "#10b981", // Green - accommodation
  WARNING: "#f59e0b", // Orange - dining
  DANGER: "#ef4444", // Red - entertainment
  INFO: "#06b6d4", // Cyan - relaxation
  SECONDARY: "#6b7280", // Gray - transport
  PURPLE: "#8b5cf6", // Purple - activity
  PINK: "#ec4899", // Pink - shopping
  BROWN: "#78716c", // Brown - break
  SLATE: "#64748b", // Slate - other
};

// Helper functions
export const getEventTypeByValue = (value) => {
  return TRAVEL_EVENT_TYPES.find((type) => type.value === value);
};

export const getEventTypeColor = (value) => {
  const eventType = getEventTypeByValue(value);
  return eventType ? eventType.color : EVENT_COLORS.PRIMARY;
};

export const getEventTypeLabel = (value) => {
  const eventType = getEventTypeByValue(value);
  return eventType ? eventType.label : "🏛️ Sightseeing";
};
