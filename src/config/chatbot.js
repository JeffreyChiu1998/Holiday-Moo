// Chatbot Configuration
// Handles all AI service configurations for the travel assistant chatbot

import { getApiKeys } from "./environment";

const apiKeys = getApiKeys();

// Controller AI Configuration (xAI/Grok)
export const CONTROLLER_AI_CONFIG = {
  apiKey: apiKeys.XAI,
  baseUrl: "https://api.x.ai/v1",
  model: "grok-3-mini",
  maxTokens: 150, // Reduced for simple JSON response
  temperature: 0.1, // Lower temperature for more consistent JSON
};

// Recommendation AI Configuration (Perplexity)
export const RECOMMENDATION_AI_CONFIG = {
  apiKey: apiKeys.PERPLEXITY,
  baseUrl: "https://api.perplexity.ai",
  model: "sonar",
  maxTokens: 800,
  temperature: 0.2,
};

// Predefined Responses and Options
export const PREDEFINED_RESPONSES = {
  WELCOME: {
    content:
      "Hi there! 🐄 I'm Moo, your friendly travel assistant!\n\nI can help you with:\n• Travel advice and recommendations\n• Your current calendar and trips\n• Questions about me\n\nWhat would you like to explore?",
    options: ["🎯 Get travel advice", "📅 Check my calendar", "🐄 About Moo"],
  },

  TRAVEL_ADVICE_START: {
    content:
      "Great! I'd love to help you with travel advice! 🗺️\n\nTo give you the best recommendations, I need some information about your trip.",
    options: ["📍 Choose from my trips", "🌍 Plan for a new destination"],
  },

  CALENDAR_INFO: {
    content:
      "📅 Here's your calendar information!\n\nI can show you details about your saved trips and events.\n\nWhat would you like to see?",
    options: ["🧳 My trips", "📋 My events", "📊 Calendar summary"],
  },

  ABOUT_MOO: {
    content:
      "🐄 Hi! I'm Moo, your travel companion!\n\nI'm here to help you plan amazing trips and discover wonderful places. I love helping travelers create unforgettable experiences!\n\nWhat else would you like to know?",
    options: [
      "🎯 Get travel advice",
      "📅 Check my calendar",
      "💬 Tell me more about yourself",
    ],
  },
};

// Information Gathering Structure for Travel Advice
export const TRAVEL_INFO_FIELDS = {
  TRIP: "trip",
  DESTINATION: "destination",
  TRIP_DATES: "tripDates",
  DATE_PREFERENCE: "datePreference",
  EVENT_TYPE: "eventType",
  TIME_PREFERENCE: "timePreference",
  BUDGET: "budget",
  NUMBER_OF_PEOPLE: "numberOfPeople",
  ACTIVITY_PREFERENCES: "activityPreferences",
};

export const TRAVEL_INFO_QUESTIONS = {
  [TRAVEL_INFO_FIELDS.TRIP]: {
    question: "Which trip are you planning for?",
    options: [], // Will be populated with user's trips
  },
  [TRAVEL_INFO_FIELDS.DESTINATION]: {
    question:
      "What's your destination? Please type the city or country you'd like to visit.",
    options: [], // Free text input
  },
  [TRAVEL_INFO_FIELDS.TRIP_DATES]: {
    question:
      "When are you planning to travel? Please provide your travel dates.",
    options: [], // Free text input
  },
  [TRAVEL_INFO_FIELDS.EVENT_TYPE]: {
    question: "What type of activity are you looking for?",
    options: ["🍽️ Dining", "🏛️ Sightseeing", "🎯 Activities", "🛍️ Other"],
  },
  [TRAVEL_INFO_FIELDS.TIME_PREFERENCE]: {
    question: "What time of day do you prefer?",
    options: ["🌅 Morning", "🌇 Afternoon", "🌆 Evening", "🤷 No preference"],
  },
  [TRAVEL_INFO_FIELDS.BUDGET]: {
    question: "What's your budget range?",
    options: ["💰 Budget-friendly", "💎 Luxury", "🤷 Skip"],
  },
  [TRAVEL_INFO_FIELDS.NUMBER_OF_PEOPLE]: {
    question: "How many people will be joining?",
    options: ["👤 Solo", "👥 Group", "🤷 Skip"],
  },
  [TRAVEL_INFO_FIELDS.ACTIVITY_PREFERENCES]: {
    question:
      "Any specific preferences or interests for your activities? This will help me find the perfect recommendations for you!",
    options: [], // Open-ended response
  },
};

// Moo's Story and Background
export const MOO_STORY = {
  BASIC_INFO:
    "I'm Moo, a friendly AI travel assistant who loves helping people discover amazing places and plan perfect trips!",
  PERSONALITY:
    "I'm enthusiastic about travel, always positive, and I love using emojis to make our conversations fun! 🐄",
  PURPOSE:
    "My mission is to help you create unforgettable travel experiences by providing personalized recommendations and advice.",
  CAPABILITIES:
    "I can help you with travel advice, check your calendar, and answer questions about myself!",
};

// Chatbot UI Configuration
export const CHATBOT_UI_CONFIG = {
  maxMessages: 100,
  typingDelay: 1000,
  autoScrollDelay: 100,
  welcomeMessage: PREDEFINED_RESPONSES.WELCOME,

  // Thinking time configuration (in milliseconds)
  thinkingTime: {
    predefined: 800, // For predefined responses
    calendar: 600, // For calendar information
    aboutMoo: 400, // For Moo information
    aiResponse: 1500, // For actual AI responses
    error: 300, // For error responses
    minimum: 200, // Minimum thinking time
    maximum: 2000, // Maximum thinking time
  },
};