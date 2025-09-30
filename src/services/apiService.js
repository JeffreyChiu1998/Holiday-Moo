// Centralized API service for Holiday Moo
import API_CONFIG from "../config/api-config";

class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  // Generic API call method
  async makeRequest(endpoint, data, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const config = {
      method: "POST",
      headers: {
        ...API_CONFIG.DEFAULT_HEADERS,
        ...options.headers,
      },
      body: JSON.stringify(data),
      ...options,
    };

    try {
      console.log(`Making API call to: ${url}`);
      console.log("Request data:", data);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("API response:", result);
      return result;
    } catch (error) {
      console.error(`API call to ${endpoint} failed:`, error);
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
        url: url,
        endpoint: endpoint,
      });

      if (error.name === "AbortError") {
        throw new Error("Request timeout - please try again");
      }

      // Provide more specific error messages
      if (error.message.includes("Failed to fetch")) {
        throw new Error(
          "Network error - please check your internet connection or try again"
        );
      }

      if (error.message.includes("CORS")) {
        throw new Error(
          "CORS error - this might be a browser or network restriction"
        );
      }

      throw error;
    }
  }

  // XAI (Grok) API calls - GENERIC (avoid using directly)
  async callXAI(messages, schema = null, options = {}) {
    // Check if we're in offline mode for development
    if (process.env.REACT_APP_OFFLINE_MODE === "true") {
      return this.getMockXAIResponse(messages, options);
    }

    const data = {
      model: options.model || API_CONFIG.MODELS.XAI,
      messages: messages,
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      ...options.additionalParams,
    };

    // Add structured output format if schema is provided
    if (schema) {
      data.response_format = {
        type: "json_schema",
        json_schema: {
          name: "trip_plan_response",
          schema: schema,
          strict: true,
        },
      };
    }

    return this.makeRequest(API_CONFIG.ENDPOINTS.XAI, data);
  }

  // XAI for Trip Planner - WITH structured output schema
  async callXAIForTripPlanning(messages, schema, options = {}) {
    console.log("🗺️ Calling XAI for Trip Planning with structured schema");

    // Check if we're in offline mode for development
    if (process.env.REACT_APP_OFFLINE_MODE === "true") {
      return this.getMockXAIResponse(messages, options);
    }

    const data = {
      model: options.model || API_CONFIG.MODELS.XAI,
      messages: messages,
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      ...options.additionalParams,
    };

    // ALWAYS add structured output format for trip planning
    if (schema) {
      data.response_format = {
        type: "json_schema",
        json_schema: {
          name: "trip_plan_response",
          schema: schema,
          strict: true,
        },
      };
    }

    return this.makeRequest(API_CONFIG.ENDPOINTS.XAI, data);
  }

  // XAI for Conversational Chat - NO schema, pure conversational
  async callXAIForConversation(messages, options = {}) {
    console.log("💬 Calling XAI for Conversational Chat (no schema)");

    // Check if we're in offline mode for development
    if (process.env.REACT_APP_OFFLINE_MODE === "true") {
      return this.getMockXAIResponse(messages, options);
    }

    const data = {
      model: options.model || API_CONFIG.MODELS.XAI,
      messages: messages,
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      ...options.additionalParams,
    };

    // NEVER add structured output format for conversation
    // Ensure no schema contamination

    return this.makeRequest(API_CONFIG.ENDPOINTS.XAI, data);
  }

  // Mock XAI response for development
  getMockXAIResponse(messages, options = {}) {
    console.log("🔧 Using mock XAI response for development");

    // Simulate API delay
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockResponse = {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  tripId: "mock-trip-123",
                  generatedAt: new Date().toISOString(),
                  destination: "Hong Kong",
                  totalDays: 2,
                  days: [
                    {
                      date: "2025-09-29",
                      dayNumber: 1,
                      topic: "Urban Adventure and Iconic Views",
                      description:
                        "Morning: Rise after 9 AM and kick off with an exhilarating cable car ride up Victoria Peak for panoramic city vistas, perfect for capturing dramatic skyline photos amidst misty mountains. [Victoria Peak] Afternoon: Dive into the heart of the city for an urban hike along the bustling streets of Central and Sheung Wan, discovering street art and historic alleys that offer thrilling photo ops of colonial architecture. Evening: As night falls, savor a hearty Cantonese dinner at a harbor-side restaurant with fresh seafood and dim sum, enjoying the illuminated skyline from Tsim Sha Tsui. Wrap up with a late-night promenade along the Avenue of Stars. [Avenue of Stars]",
                    },
                    {
                      date: "2025-09-30",
                      dayNumber: 2,
                      topic: "Island Exploration and Nature Thrills",
                      description:
                        "Morning: Start post-9 AM with a ferry ride to Lantau Island for an adventurous hike on scenic trails, offering breathtaking coastal views and wildlife encounters ideal for photography. [Lantau Island] Afternoon: Continue the excitement with a visit to the Big Buddha and surrounding hills, where you can trek up steep steps for epic panoramic shots and cultural insights. Evening: End the day with a flavorful meal of local fusion cuisine at a beachfront eatery on Lantau, featuring grilled meats and fresh veggies. Relax with evening stargazing or a casual beach walk. [Lantau Island beaches]",
                    },
                  ],
                }),
              },
            },
          ],
        };
        resolve(mockResponse);
      }, 1500); // 1.5 second delay to simulate API call
    });
  }

  // Perplexity AI API calls - GENERIC (avoid using directly)
  async callPerplexity(messages, options = {}) {
    // Check if we're in offline mode for development
    if (process.env.REACT_APP_OFFLINE_MODE === "true") {
      return this.getMockPerplexityResponse(messages, options);
    }

    const data = {
      model: options.model || API_CONFIG.MODELS.PERPLEXITY,
      messages: messages,
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      ...options.additionalParams,
    };

    return this.makeRequest(API_CONFIG.ENDPOINTS.PERPLEXITY, data);
  }

  // Perplexity for Moo AI Recommendations - Structured JSON output
  async callPerplexityForMooRecommendations(
    prompt,
    userContext = {},
    options = {}
  ) {
    console.log("🐄 Calling Perplexity for Moo AI Recommendations");
    console.log("🐄 Offline mode:", process.env.REACT_APP_OFFLINE_MODE);
    console.log("🐄 API Base URL:", this.baseURL);

    // Force check the environment variable
    if (process.env.REACT_APP_OFFLINE_MODE === "true") {
      console.log("🐄 WARNING: Still in offline mode! Using mock response.");
    } else {
      console.log("🐄 Offline mode disabled, making real API call");
    }

    // Build structured prompt for recommendations
    const structuredPrompt = `${prompt}

Please provide 3-5 travel recommendations in this exact JSON format. Be precise with the data:

{
  "recommendations": [
    {
      "name": "Exact activity/place name",
      "type": "restaurant|attraction|activity|shopping|entertainment|cultural|outdoor|other",
      "country": "Country name",
      "city": "City name", 
      "websiteLink": "https://official-website.com (if available, otherwise empty string)",
      "estimatedCost": "$XX-XX or Free or Varies",
      "openHours": "X AM - X PM or 24/7 or Varies",
      "description": "Brief 1-2 sentence description focusing on what makes this special"
    }
  ]
}

Important: Return ONLY the JSON object, no additional text or formatting.`;

    // Check if we're in offline mode for development
    // TEMPORARILY DISABLED FOR TESTING - FORCE REAL API CALLS
    if (false && process.env.REACT_APP_OFFLINE_MODE === "true") {
      return this.getMockMooRecommendationsResponse(prompt, userContext);
    }

    console.log("🐄 FORCING REAL API CALL - bypassing offline mode check");

    const data = {
      model: options.model || API_CONFIG.MODELS.PERPLEXITY,
      messages: [{ role: "user", content: structuredPrompt }],
      max_tokens: options.maxTokens || 1500, // Increased for structured output
      temperature: options.temperature || 0.3, // Lower for more consistent JSON
      ...options.additionalParams,
    };

    return this.makeRequest(API_CONFIG.ENDPOINTS.PERPLEXITY, data);
  }

  // Perplexity for General Travel Info - Conversational output
  async callPerplexityForTravelInfo(messages, options = {}) {
    console.log("🌍 Calling Perplexity for General Travel Information");

    // Check if we're in offline mode for development
    if (process.env.REACT_APP_OFFLINE_MODE === "true") {
      return this.getMockPerplexityResponse(messages, options);
    }

    const data = {
      model: options.model || API_CONFIG.MODELS.PERPLEXITY,
      messages: messages,
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      ...options.additionalParams,
    };

    return this.makeRequest(API_CONFIG.ENDPOINTS.PERPLEXITY, data);
  }

  // Mock Perplexity response for development
  getMockPerplexityResponse(messages, options = {}) {
    console.log("🔧 Using mock Perplexity response for development");

    // Simulate API delay
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockResponse = {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  events: [
                    {
                      startTime: "09:00",
                      endTime: "11:00",
                      title: "Victoria Peak Cable Car",
                      description:
                        "Take the historic Peak Tram to Victoria Peak for stunning panoramic views of Hong Kong's skyline and harbor.",
                      location: {
                        name: "Victoria Peak",
                        address: "Victoria Peak, Hong Kong",
                        coordinates: { lat: 22.2711, lng: 114.1489 },
                      },
                      type: "sightseeing",
                      estimatedCost: 65,
                    },
                    {
                      startTime: "11:30",
                      endTime: "13:00",
                      title: "Peak Trail Hiking",
                      description:
                        "Explore the scenic hiking trails around Victoria Peak with breathtaking city views.",
                      location: {
                        name: "Peak Trail",
                        address: "Victoria Peak, Hong Kong",
                        coordinates: { lat: 22.272, lng: 114.1495 },
                      },
                      type: "outdoor",
                      estimatedCost: 0,
                    },
                    {
                      startTime: "14:00",
                      endTime: "16:00",
                      title: "Central District Exploration",
                      description:
                        "Discover the bustling streets of Central district with its mix of modern skyscrapers and colonial architecture.",
                      location: {
                        name: "Central District",
                        address: "Central, Hong Kong",
                        coordinates: { lat: 22.2793, lng: 114.1628 },
                      },
                      type: "sightseeing",
                      estimatedCost: 0,
                    },
                  ],
                }),
              },
            },
          ],
        };
        resolve(mockResponse);
      }, 2000); // 2 second delay to simulate API call
    });
  }

  // Mock Moo AI Recommendations response for development
  getMockMooRecommendationsResponse(prompt, userContext = {}) {
    console.log(
      "🔧 Using mock Moo AI recommendations response for development"
    );
    console.log("Prompt:", prompt);

    // Simulate API delay
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockResponse = {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  recommendations: [
                    {
                      name: "Tim Ho Wan",
                      type: "restaurant",
                      country: "Hong Kong",
                      city: "Hong Kong",
                      websiteLink: "https://www.timhowan.com",
                      estimatedCost: "$20-40",
                      openHours: "10 AM - 10 PM",
                      description:
                        "World's cheapest Michelin-starred restaurant famous for BBQ pork buns and dim sum.",
                    },
                    {
                      name: "Victoria Peak",
                      type: "attraction",
                      country: "Hong Kong",
                      city: "Hong Kong",
                      websiteLink: "https://www.thepeak.com.hk",
                      estimatedCost: "$15-25",
                      openHours: "7 AM - 12 AM",
                      description:
                        "Iconic mountain peak offering panoramic views of Hong Kong's skyline and Victoria Harbor.",
                    },
                    {
                      name: "Star Ferry",
                      type: "activity",
                      country: "Hong Kong",
                      city: "Hong Kong",
                      websiteLink: "https://www.starferry.com.hk",
                      estimatedCost: "$3-5",
                      openHours: "6:30 AM - 11:30 PM",
                      description:
                        "Historic ferry service offering scenic harbor crossings between Hong Kong Island and Kowloon.",
                    },
                    {
                      name: "Temple Street Night Market",
                      type: "shopping",
                      country: "Hong Kong",
                      city: "Hong Kong",
                      websiteLink: "",
                      estimatedCost: "$10-50",
                      openHours: "6 PM - 12 AM",
                      description:
                        "Bustling night market famous for street food, fortune telling, and bargain shopping.",
                    },
                  ],
                }),
              },
            },
          ],
        };
        resolve(mockResponse);
      }, 1800); // 1.8 second delay to simulate API call
    });
  }

  // Mock Google Places API response for development
  getMockGooglePlacesResponse(query, options = {}) {
    console.log("🔧 Using mock Google Places response for development");
    console.log("Query:", query);

    // Simulate API delay
    return new Promise((resolve) => {
      setTimeout(() => {
        // Generate mock response based on query
        const mockPlaces = {
          "tim ho wan": {
            name: "Tim Ho Wan",
            formatted_address:
              "Shop 72, G/F, Olympian City 2, 18 Hoi Ting Road, Tai Kok Tsui, Hong Kong",
            place_id: "ChIJN1t_tDeuEmsRUsoyG83frY4",
            geometry: {
              location: { lat: 22.3193, lng: 114.1694 },
            },
            photos: [
              {
                photo_reference: "mock_photo_ref_timhowan_001",
                height: 400,
                width: 600,
              },
            ],
          },
          "victoria peak": {
            name: "Victoria Peak",
            formatted_address: "Victoria Peak, Hong Kong",
            place_id: "ChIJ_____VictoriaPeak_____",
            geometry: {
              location: { lat: 22.2711, lng: 114.1489 },
            },
            photos: [
              {
                photo_reference: "mock_photo_ref_victoriapeak_001",
                height: 400,
                width: 600,
              },
            ],
          },
          "star ferry": {
            name: "Star Ferry Pier",
            formatted_address: "Star Ferry Pier, Tsim Sha Tsui, Hong Kong",
            place_id: "ChIJ_____StarFerry_____",
            geometry: {
              location: { lat: 22.294, lng: 114.1685 },
            },
            photos: [
              {
                photo_reference: "mock_photo_ref_starferry_001",
                height: 400,
                width: 600,
              },
            ],
          },
          "temple street night market": {
            name: "Temple Street Night Market",
            formatted_address: "Temple St, Yau Ma Tei, Hong Kong",
            place_id: "ChIJ_____TempleStreet_____",
            geometry: {
              location: { lat: 22.308, lng: 114.1714 },
            },
            photos: [
              {
                photo_reference: "mock_photo_ref_templestreet_001",
                height: 400,
                width: 600,
              },
            ],
          },
        };

        // Find matching place based on query
        const queryLower = query.toLowerCase();
        let matchedPlace = null;

        for (const [key, place] of Object.entries(mockPlaces)) {
          if (queryLower.includes(key)) {
            matchedPlace = place;
            break;
          }
        }

        // Default fallback place if no match
        if (!matchedPlace) {
          matchedPlace = {
            name: query,
            formatted_address: "Hong Kong",
            place_id: "ChIJ_____Default_____",
            geometry: {
              location: { lat: 22.3193, lng: 114.1694 },
            },
            photos: [
              {
                photo_reference: "mock_photo_ref_default_001",
                height: 400,
                width: 600,
              },
            ],
          };
        }

        const mockResponse = {
          results: [matchedPlace],
          status: "OK",
        };

        resolve(mockResponse);
      }, 1200); // 1.2 second delay to simulate API call
    });
  }

  // Google Places API calls
  async callGooglePlaces(query, options = {}) {
    // Check if we're in offline mode for development
    if (process.env.REACT_APP_OFFLINE_MODE === "true") {
      return this.getMockGooglePlacesResponse(query, options);
    }

    const data = {
      query: query,
      ...options,
    };

    return this.makeRequest(API_CONFIG.ENDPOINTS.GOOGLE_PLACES, data);
  }

  // Get place details by place ID
  async getPlaceDetails(placeId, options = {}) {
    const data = {
      placeId: placeId,
      ...options,
    };

    return this.makeRequest(API_CONFIG.ENDPOINTS.GOOGLE_PLACES, data);
  }

  // Scrape travel booking URLs (KKday, Klook)
  async scrapeTravelUrl(url) {
    const data = {
      url: url,
    };

    return this.makeRequest(API_CONFIG.ENDPOINTS.SCRAPE_TRAVEL_URL, data);
  }

  // Export calendar data to Excel
  async exportToExcel(calendarData, tripData) {
    const data = {
      calendarData: calendarData,
      tripData: tripData,
    };

    return this.makeRequest(API_CONFIG.ENDPOINTS.EXPORT_EXCEL, data);
  }

  // Health check method
  async healthCheck() {
    try {
      const response = await this.callXAI(
        [{ role: "user", content: "Hello" }],
        { maxTokens: 10 }
      );

      return {
        status: "healthy",
        message: "API Gateway is responding",
        response: response,
      };
    } catch (error) {
      return {
        status: "error",
        message: error.message,
        error: error,
      };
    }
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;

// Named exports for convenience
export const {
  callXAI,
  callXAIForTripPlanning,
  callXAIForConversation,
  callPerplexity,
  callPerplexityForMooRecommendations,
  callPerplexityForTravelInfo,
  callGooglePlaces,
  getPlaceDetails,
  healthCheck,
} = apiService;
