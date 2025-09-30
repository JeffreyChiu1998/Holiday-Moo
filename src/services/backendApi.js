// Backend API Service
// Handles all communication with the secure Python backend

import { getBackendConfig } from "../config/environment";

const backendConfig = getBackendConfig();

class BackendApiService {
  constructor() {
    this.baseUrl = backendConfig.BASE_URL;
    this.endpoints = backendConfig.ENDPOINTS;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`Backend API request failed:`, error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    return this.makeRequest(this.endpoints.HEALTH);
  }

  // xAI Chat (Grok) - for conversation management
  async xaiChat(messages, options = {}) {
    const payload = {
      messages,
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
    };

    return this.makeRequest(this.endpoints.XAI_CHAT, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // xAI Chat with Structured Outputs - for trip planning
  async xaiChatStructured(messages, schema, options = {}) {
    const payload = {
      messages,
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.7,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "trip_itinerary",
          schema: schema,
          strict: true,
        },
      },
    };

    return this.makeRequest(this.endpoints.XAI_CHAT, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // Perplexity Search - for travel recommendations
  async perplexitySearch(query, options = {}) {
    const payload = {
      query,
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.3,
      model: options.model || "sonar",
    };

    // Add structured output support for Perplexity if provided
    if (options.response_format) {
      payload.response_format = options.response_format;
    }

    return this.makeRequest(this.endpoints.PERPLEXITY_SEARCH, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // Travel Recommendations - combined endpoint
  async getTravelRecommendations(destination, options = {}) {
    const payload = {
      destination,
      dates: options.dates || "",
      interests: options.interests || [],
      budget: options.budget || "",
    };

    return this.makeRequest(this.endpoints.TRAVEL_RECOMMENDATIONS, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // Chat with AI assistant (uses xAI)
  async chatWithAssistant(userMessage, conversationHistory = []) {
    const messages = [
      {
        role: "system",
        content:
          "You are Moo, a helpful AI assistant for the Holiday Moo travel planning app. Help users plan their trips, manage their calendar events, and provide travel advice. Be friendly, concise, and helpful.",
      },
      ...conversationHistory,
      {
        role: "user",
        content: userMessage,
      },
    ];

    return this.xaiChat(messages);
  }

  // Get travel advice (uses Perplexity for real-time data)
  async getTravelAdvice(query) {
    const travelQuery = `Travel advice: ${query}. Provide current, accurate information with specific recommendations.`;
    return this.perplexitySearch(travelQuery);
  }

  // Scrape travel booking URLs (Klook, KKday, etc.)
  async scrapeTravelUrl(url) {
    const payload = { url };

    return this.makeRequest(this.endpoints.SCRAPE_TRAVEL_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

// Export singleton instance
export const backendApi = new BackendApiService();
export default backendApi;
