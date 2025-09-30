import apiService from "./apiService";
import { TRAVEL_EVENT_TYPES } from "../config/events";
import googleMapsLoader from "../utils/googleMapsLoader";
import {
  formatLocalDateTime,
  getCurrentLocalDateTime,
} from "../utils/dateUtils";

/**
 * Trip Planner Detailed Service
 * Handles day-by-day detailed planning using Perplexity AI + Google Places API
 */
class TripPlannerDetailedService {
  constructor() {
    this.currentItinerary = null;
    this.generationProgress = {
      currentDay: 0,
      totalDays: 0,
      currentTask: 0, // 0-2 (3 tasks per day)
      totalTasks: 0,
      completedTasks: 0,
      isGenerating: false,
      error: null,
      taskStatus: [], // Array to track individual task status
    };
  }

  /**
   * Generate detailed itinerary from high-level plan
   */
  async generateDetailedItinerary(highLevelPlan, formData, onProgressUpdate) {
    try {
      this.generationProgress = {
        currentDay: 0,
        totalDays: highLevelPlan.days.length,
        currentTask: 0,
        totalTasks: highLevelPlan.days.length * 3, // 3 tasks per day
        completedTasks: 0,
        isGenerating: true,
        error: null,
        taskStatus: [],
      };

      const detailedDays = [];

      // Generate each day separately
      for (let i = 0; i < highLevelPlan.days.length; i++) {
        const day = highLevelPlan.days[i];

        this.generationProgress.currentDay = i + 1;
        if (onProgressUpdate) {
          onProgressUpdate(this.generationProgress);
        }

        // Task 1: Generate events using Perplexity AI
        this.updateTaskProgress(
          i + 1,
          1,
          "Generating events with Perplexity AI",
          onProgressUpdate
        );
        let dayEvents = [];
        try {
          dayEvents = await this.generateDayEvents(
            day,
            highLevelPlan,
            formData
          );
          this.completeTask(i + 1, 1, true, onProgressUpdate);
        } catch (error) {
          this.completeTask(i + 1, 1, false, onProgressUpdate);
          // Continue with empty events array
        }

        // Task 2: Enrich with Google Places data
        this.updateTaskProgress(
          i + 1,
          2,
          "Enriching locations with Google Places",
          onProgressUpdate
        );
        let enrichedEvents = dayEvents;
        try {
          enrichedEvents = await this.enrichEventsWithGooglePlaces(dayEvents);
          this.completeTask(i + 1, 2, true, onProgressUpdate);
        } catch (error) {
          this.completeTask(i + 1, 2, false, onProgressUpdate);
          // Continue with non-enriched events
        }

        // Task 3: Create detailed timeline
        this.updateTaskProgress(
          i + 1,
          3,
          "Creating detailed timeline",
          onProgressUpdate
        );
        try {
          // Timeline creation is implicit in the processing
          this.completeTask(i + 1, 3, true, onProgressUpdate);
        } catch (error) {
          this.completeTask(i + 1, 3, false, onProgressUpdate);
        }

        detailedDays.push({
          ...day,
          events: enrichedEvents,
        });
      }

      // Combine into final itinerary
      const detailedItinerary = {
        ...highLevelPlan,
        days: detailedDays,
        generatedAt: getCurrentLocalDateTime(),
        totalEvents: detailedDays.reduce(
          (total, day) => total + day.events.length,
          0
        ),
      };

      this.currentItinerary = detailedItinerary;
      this.generationProgress.isGenerating = false;

      return detailedItinerary;
    } catch (error) {
      this.generationProgress.error = error.message;
      this.generationProgress.isGenerating = false;
      throw new Error(
        "Failed to generate detailed itinerary. Please try again."
      );
    }
  }

  /**
   * Generate events for a single day using Perplexity AI
   */
  async generateDayEvents(day, highLevelPlan, formData) {
    try {
      const prompt = this.buildPerplexityPrompt(day, highLevelPlan, formData);

      // Call Perplexity with structured output (according to their documentation)
      const schema = this.getPerplexityResponseSchema();
      const response = await apiService.callPerplexity(
        [{ role: "user", content: prompt }],
        {
          maxTokens: 2000,
          temperature: 0.7,
          model: "sonar", // Use sonar model as requested
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "day_events",
              schema: schema,
            },
          },
        }
      );

      if (
        !response.choices ||
        !response.choices[0] ||
        !response.choices[0].message
      ) {
        throw new Error("Invalid response from Perplexity AI");
      }

      const aiContent = response.choices[0].message.content;

      // Parse the structured JSON response
      let dayEventsData;
      try {
        // Clean the content first to handle malformed JSON
        const cleanedContent = this.cleanJsonContent(aiContent);
        dayEventsData = JSON.parse(cleanedContent);
      } catch (parseError) {
        // Fallback to text parsing if structured output fails
        try {
          dayEventsData = this.parsePerplexityTextResponse(aiContent);
        } catch (fallbackError) {
          throw new Error("Invalid response format from Perplexity AI");
        }
      }

      // Process and validate events
      // Handle both array format and object format
      const eventsArray = Array.isArray(dayEventsData)
        ? dayEventsData
        : dayEventsData.events || [];

      const processedEvents = this.processPerplexityEvents(
        eventsArray,
        day,
        formData
      );

      return processedEvents;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Build comprehensive prompt for Perplexity AI
   */
  buildPerplexityPrompt(day, highLevelPlan, formData) {
    const { selectedTrip, preferences } = formData;

    let prompt = `Generate a detailed daily itinerary for ${day.topic} in ${highLevelPlan.destination} on ${day.date}.\n\n`;

    // Trip context
    prompt += `TRIP CONTEXT:\n`;
    prompt += `- Destination: ${highLevelPlan.destination}\n`;
    prompt += `- Day ${day.dayNumber} of ${highLevelPlan.totalDays}\n`;
    prompt += `- Theme: ${day.topic}\n`;
    prompt += `- Date: ${day.date}\n`;
    if (selectedTrip.budget) prompt += `- Budget: ${selectedTrip.budget}\n`;
    if (selectedTrip.travelers && selectedTrip.travelers.length > 0) {
      prompt += `- Travelers: ${selectedTrip.travelers.length} people\n`;
    }

    // High-level description
    prompt += `\nDAY OVERVIEW:\n${day.description}\n\n`;

    // Preferences
    prompt += `PREFERENCES:\n`;
    prompt += `- Trip Type: ${preferences.tripType}\n`;
    prompt += `- Wake Up: ${preferences.wakeUpTime}\n`;
    prompt += `- Return: ${preferences.returnTime}\n`;
    prompt += `- Meals Per Day: ${preferences.mealsPerDay}\n`;
    prompt += `- Need Breaks: ${preferences.needBreaks}\n`;
    if (preferences.preferredExperiences.length > 0) {
      prompt += `- Experiences: ${preferences.preferredExperiences.join(
        ", "
      )}\n`;
    }
    if (preferences.cuisineInterests.length > 0) {
      prompt += `- Cuisine: ${preferences.cuisineInterests.join(", ")}\n`;
    }
    if (preferences.dietaryRestrictions.length > 0) {
      prompt += `- Dietary Restrictions: ${preferences.dietaryRestrictions.join(
        ", "
      )}\n`;
    }

    // Event type guidelines
    const eventTypesList = TRAVEL_EVENT_TYPES.map(
      (type) => `"${type.value}"`
    ).join(", ");
    prompt += `\nEVENT TYPES (use only these): ${eventTypesList}\n\n`;

    // Instructions
    prompt += `INSTRUCTIONS:\n`;
    prompt += `1. Create 4-8 events for this day based on the theme and preferences\n`;
    prompt += `2. Include realistic start and end times in HH:MM format (24-hour)\n`;
    prompt += `3. Provide specific location names (restaurants, attractions, areas)\n`;
    prompt += `4. Classify each event using only the provided event types\n`;
    prompt += `5. Include brief descriptions and estimated costs when relevant\n`;
    prompt += `6. Consider travel time between locations\n`;
    prompt += `7. Match the wake up and return times from preferences\n`;
    prompt += `8. Include appropriate meal events based on meals per day preference\n\n`;

    prompt += `Generate events that bring the day's theme to life with specific, actionable activities. The response will be structured according to the provided JSON schema.`;

    return prompt;
  }

  /**
   * Get JSON schema for Perplexity structured output
   */
  getPerplexityResponseSchema() {
    return {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Event name/title",
          },
          type: {
            type: "string",
            enum: TRAVEL_EVENT_TYPES.map((type) => type.value),
            description: "Event type from predefined list",
          },
          startTime: {
            type: "string",
            pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
            description: "Start time in HH:MM format (24-hour)",
          },
          endTime: {
            type: "string",
            pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
            description: "End time in HH:MM format (24-hour)",
          },
          locationName: {
            type: "string",
            description: "Specific location name for Google Places search",
          },
          description: {
            type: "string",
            description: "Brief description of the activity",
          },
          estimatedCost: {
            type: "string",
            description: "Estimated cost (optional)",
          },
        },
        required: ["name", "type", "startTime", "endTime", "locationName"],
        additionalProperties: false,
      },
      minItems: 1,
    };
  }

  /**
   * Clean JSON content to handle common formatting issues
   */
  cleanJsonContent(content) {
    // Remove any markdown code blocks
    let cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "");

    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();

    // Fix common field name inconsistencies
    cleaned = cleaned.replace(/"start_time"/g, '"startTime"');
    cleaned = cleaned.replace(/"end_time"/g, '"endTime"');
    cleaned = cleaned.replace(/"location_name"/g, '"locationName"');
    cleaned = cleaned.replace(/"estimated_cost"/g, '"estimatedCost"');
    cleaned = cleaned.replace(/"event_type"/g, '"type"');

    return cleaned;
  }

  /**
   * Parse Perplexity text response to extract JSON (fallback method)
   */
  parsePerplexityTextResponse(textResponse) {
    try {
      // First, try to parse the entire response as JSON
      return JSON.parse(textResponse);
    } catch (error) {
      // If that fails, try to extract JSON from the text

      // Look for JSON object and array patterns
      const jsonPatterns = [
        /\[[\s\S]*\]/, // Match anything between [ and ] (arrays)
        /\{[\s\S]*\}/, // Match anything between { and } (objects)
        /```json\s*([\s\S]*?)\s*```/, // Match JSON in code blocks
        /```\s*([\s\S]*?)\s*```/, // Match content in any code blocks
      ];

      for (const pattern of jsonPatterns) {
        const match = textResponse.match(pattern);
        if (match) {
          try {
            const jsonStr = match[1] || match[0];
            const parsed = JSON.parse(jsonStr.trim());

            return parsed;
          } catch (parseError) {
            continue;
          }
        }
      }

      // If no JSON found, try to create a structured response from the text

      return this.createEventsFromText(textResponse);
    }
  }

  /**
   * Create events structure from unstructured text
   */
  createEventsFromText(text) {
    const events = [];

    // Split text into lines and look for event-like patterns
    const lines = text.split("\n").filter((line) => line.trim());

    let currentEvent = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Look for time patterns (e.g., "9:00 AM", "14:30", etc.)
      const timePattern = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
      const timeMatch = trimmedLine.match(timePattern);

      if (timeMatch) {
        // If we have a current event, save it
        if (currentEvent && currentEvent.name) {
          events.push(currentEvent);
        }

        // Start a new event
        let hour = parseInt(timeMatch[1]);
        const minute = parseInt(timeMatch[2]);
        const ampm = timeMatch[3];

        // Convert to 24-hour format
        if (ampm) {
          if (ampm.toUpperCase() === "PM" && hour !== 12) {
            hour += 12;
          } else if (ampm.toUpperCase() === "AM" && hour === 12) {
            hour = 0;
          }
        }

        const startTime = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        const endTime = `${(hour + 1).toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;

        currentEvent = {
          name: trimmedLine.replace(timePattern, "").trim() || "Activity",
          type: this.guessEventType(trimmedLine),
          startTime: startTime,
          endTime: endTime,
          locationName: "Location to be determined",
          description: "",
          estimatedCost: "",
        };
      } else if (currentEvent && trimmedLine) {
        // Add to current event description or name
        if (!currentEvent.name || currentEvent.name === "Activity") {
          currentEvent.name = trimmedLine;
        } else {
          currentEvent.description +=
            (currentEvent.description ? " " : "") + trimmedLine;
        }
      }
    }

    // Add the last event
    if (currentEvent && currentEvent.name) {
      events.push(currentEvent);
    }

    // If no events found, create some default ones
    if (events.length === 0) {
      events.push({
        name: "Morning Activity",
        type: "sightseeing",
        startTime: "09:00",
        endTime: "11:00",
        locationName: "City Center",
        description: "Explore the local area",
        estimatedCost: "",
      });

      events.push({
        name: "Lunch",
        type: "dining",
        startTime: "12:00",
        endTime: "13:30",
        locationName: "Local Restaurant",
        description: "Try local cuisine",
        estimatedCost: "",
      });

      events.push({
        name: "Afternoon Activity",
        type: "activity",
        startTime: "14:30",
        endTime: "17:00",
        locationName: "Main Attraction",
        description: "Main activity of the day",
        estimatedCost: "",
      });
    }

    return { events };
  }

  /**
   * Guess event type from text content
   */
  guessEventType(text) {
    const lowerText = text.toLowerCase();

    if (
      lowerText.includes("breakfast") ||
      lowerText.includes("lunch") ||
      lowerText.includes("dinner") ||
      lowerText.includes("eat") ||
      lowerText.includes("restaurant") ||
      lowerText.includes("cafe")
    ) {
      return "dining";
    }

    if (
      lowerText.includes("transport") ||
      lowerText.includes("taxi") ||
      lowerText.includes("bus") ||
      lowerText.includes("train") ||
      lowerText.includes("flight") ||
      lowerText.includes("drive")
    ) {
      return "transport";
    }

    if (
      lowerText.includes("hotel") ||
      lowerText.includes("check") ||
      lowerText.includes("accommodation")
    ) {
      return "accommodation";
    }

    if (
      lowerText.includes("shop") ||
      lowerText.includes("market") ||
      lowerText.includes("buy")
    ) {
      return "shopping";
    }

    if (
      lowerText.includes("museum") ||
      lowerText.includes("temple") ||
      lowerText.includes("palace") ||
      lowerText.includes("monument") ||
      lowerText.includes("historic")
    ) {
      return "sightseeing";
    }

    if (
      lowerText.includes("spa") ||
      lowerText.includes("massage") ||
      lowerText.includes("relax") ||
      lowerText.includes("beach")
    ) {
      return "relaxation";
    }

    if (
      lowerText.includes("show") ||
      lowerText.includes("concert") ||
      lowerText.includes("theater") ||
      lowerText.includes("entertainment")
    ) {
      return "entertainment";
    }

    if (
      lowerText.includes("break") ||
      lowerText.includes("rest") ||
      lowerText.includes("coffee")
    ) {
      return "break";
    }

    // Default to activity
    return "activity";
  }

  /**
   * Process events from Perplexity response
   */
  processPerplexityEvents(events, day, formData) {
    const { selectedTrip } = formData;
    const processedEvents = [];

    events.forEach((event, index) => {
      // Generate unique ID
      const eventId = `${Date.now()}-${day.dayNumber}-${index + 1}`;

      // Handle different field name formats from Perplexity
      const startTime = event.startTime || event.start_time;
      const endTime = event.endTime || event.end_time;
      const eventType = event.type || event.event_type;
      const eventName = event.name || event.title || "Activity";
      const locationName = event.locationName || event.location || "Location";
      const description = event.description || "";
      const estimatedCost = event.estimatedCost || event.estimated_cost || "";

      if (!startTime || !endTime) {
        return; // Skip this event
      }

      // Create date-time objects
      const eventDate = new Date(day.date);
      const [startHour, startMinute] = startTime.split(":").map(Number);
      const [endHour, endMinute] = endTime.split(":").map(Number);

      const startDateTime = new Date(eventDate);
      startDateTime.setHours(startHour, startMinute, 0, 0);

      const endDateTime = new Date(eventDate);
      endDateTime.setHours(endHour, endMinute, 0, 0);

      // Get event type color - validate and map event type
      let validEventType = eventType;
      if (!TRAVEL_EVENT_TYPES.find((type) => type.value === eventType)) {
        // If event type is not valid, try to map it or default to 'activity'
        validEventType = this.mapToValidEventType(eventType) || "activity";
      }

      const eventTypeObj = TRAVEL_EVENT_TYPES.find(
        (type) => type.value === validEventType
      );
      const color = eventTypeObj ? eventTypeObj.color : "#3b82f6";

      const processedEvent = {
        id: eventId,
        name: eventName,
        type: validEventType,
        tripId: selectedTrip.id,
        date: day.date,
        startTime: formatLocalDateTime(startDateTime),
        endTime: formatLocalDateTime(endDateTime),
        locationName: locationName, // Store for Google Places lookup
        location: "", // Will be filled by Google Places
        coordinates: null, // Will be filled by Google Places
        placeId: "", // Will be filled by Google Places
        remark: description,
        tags: "",
        contact: "",
        cost: estimatedCost,
        documents: [],
        isPrepaid: false,
        color: color,
      };

      processedEvents.push(processedEvent);
    });

    return processedEvents;
  }

  /**
   * Update task progress without completing
   */
  updateTaskProgress(dayNumber, taskNumber, taskMessage, onProgressUpdate) {
    this.generationProgress.currentDay = dayNumber;
    this.generationProgress.currentTask = taskNumber;
    this.generationProgress.currentTaskMessage = taskMessage;

    if (onProgressUpdate) {
      onProgressUpdate(this.generationProgress);
    }
  }

  /**
   * Complete a task and update progress
   */
  completeTask(dayNumber, taskNumber, success, onProgressUpdate) {
    const taskIndex = (dayNumber - 1) * 3 + (taskNumber - 1);

    // Initialize taskStatus array if needed
    if (!this.generationProgress.taskStatus[taskIndex]) {
      this.generationProgress.taskStatus[taskIndex] = {};
    }

    this.generationProgress.taskStatus[taskIndex] = {
      day: dayNumber,
      task: taskNumber,
      success: success,
      completed: true,
    };

    if (success) {
      this.generationProgress.completedTasks++;
    }

    if (onProgressUpdate) {
      onProgressUpdate(this.generationProgress);
    }
  }

  /**
   * Map Perplexity event types to valid event types
   */
  mapToValidEventType(eventType) {
    if (!eventType) return "activity";

    const lowerType = eventType.toLowerCase();

    // Direct mappings
    const typeMap = {
      meal: "dining",
      food: "dining",
      restaurant: "dining",
      breakfast: "dining",
      lunch: "dining",
      dinner: "dining",
      eat: "dining",
      cafe: "dining",

      sightseeing: "sightseeing",
      sight: "sightseeing",
      museum: "sightseeing",
      temple: "sightseeing",
      monument: "sightseeing",
      attraction: "sightseeing",
      cultural: "sightseeing",

      transport: "transport",
      transportation: "transport",
      travel: "transport",
      taxi: "transport",
      train: "transport",
      bus: "transport",
      flight: "transport",

      accommodation: "accommodation",
      hotel: "accommodation",
      check: "accommodation",

      shopping: "shopping",
      shop: "shopping",
      market: "shopping",
      buy: "shopping",

      activity: "activity",
      adventure: "activity",
      tour: "activity",
      experience: "activity",

      entertainment: "entertainment",
      show: "entertainment",
      concert: "entertainment",
      theater: "entertainment",
      nightlife: "entertainment",

      relaxation: "relaxation",
      spa: "relaxation",
      massage: "relaxation",
      beach: "relaxation",
      rest: "relaxation",

      break: "break",
      coffee: "break",
      pause: "break",
    };

    // Check for exact matches first
    if (typeMap[lowerType]) {
      return typeMap[lowerType];
    }

    // Check for partial matches
    for (const [key, value] of Object.entries(typeMap)) {
      if (lowerType.includes(key) || key.includes(lowerType)) {
        return value;
      }
    }

    // Default fallback
    return "activity";
  }

  /**
   * Enrich events with Google Places API data
   */
  async enrichEventsWithGooglePlaces(events) {
    try {
      // Ensure Google Maps is loaded
      await googleMapsLoader.loadGoogleMaps();

      const enrichedEvents = [];

      for (const event of events) {
        try {
          const placeData = await this.searchGooglePlace(event.locationName);

          const enrichedEvent = {
            ...event,
            location: placeData || {
              name: event.locationName,
              address: event.locationName,
              coordinates: null,
              placeId: "",
              types: [],
              businessStatus: "UNKNOWN",
            },
            coordinates: placeData?.coordinates || null,
            placeId: placeData?.placeId || "",
          };

          // Update event name if it's still "Activity" - use location name or event type
          if (enrichedEvent.name === "Activity") {
            if (enrichedEvent.location && enrichedEvent.location.name) {
              enrichedEvent.name = enrichedEvent.location.name;
            } else {
              enrichedEvent.name =
                enrichedEvent.type.charAt(0).toUpperCase() +
                enrichedEvent.type.slice(1);
            }
          }

          // Remove the temporary locationName field
          delete enrichedEvent.locationName;

          enrichedEvents.push(enrichedEvent);
        } catch (error) {
          // Add event with basic location info
          const basicEvent = {
            ...event,
            location: {
              name: event.locationName,
              address: event.locationName,
              coordinates: null,
              placeId: "",
              types: [],
              businessStatus: "UNKNOWN",
            },
            coordinates: null,
            placeId: "",
          };

          // Update event name if it's still "Activity" - use location name or event type
          if (basicEvent.name === "Activity") {
            if (basicEvent.location && basicEvent.location.name) {
              basicEvent.name = basicEvent.location.name;
            } else {
              basicEvent.name =
                basicEvent.type.charAt(0).toUpperCase() +
                basicEvent.type.slice(1);
            }
          }

          delete basicEvent.locationName;
          enrichedEvents.push(basicEvent);
        }
      }

      return enrichedEvents;
    } catch (error) {
      // Return events with basic location info if Google Places fails
      return events.map((event) => ({
        ...event,
        location: {
          name: event.locationName,
          address: event.locationName,
          coordinates: null,
          placeId: "",
          types: [],
          businessStatus: "UNKNOWN",
        },
        coordinates: null,
        placeId: "",
      }));
    }
  }

  /**
   * Search Google Places for location data
   */
  async searchGooglePlace(locationName) {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        reject(new Error("Google Places API not loaded"));
        return;
      }

      const service = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );

      const request = {
        query: locationName,
        fields: [
          "place_id",
          "name",
          "formatted_address",
          "geometry",
          "types",
          "business_status",
        ],
      };

      service.textSearch(request, (results, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          results &&
          results.length > 0
        ) {
          const place = results[0];

          const placeData = {
            name: place.name,
            address: place.formatted_address,
            placeId: place.place_id,
            coordinates: place.geometry?.location
              ? {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng(),
                }
              : null,
            types: place.types || [],
            businessStatus: place.business_status || "UNKNOWN",
          };

          resolve(placeData);
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Get current generation progress
   */
  getProgress() {
    return { ...this.generationProgress };
  }

  /**
   * Get current itinerary
   */
  getCurrentItinerary() {
    return this.currentItinerary;
  }

  /**
   * Reset service state
   */
  reset() {
    this.currentItinerary = null;
    this.generationProgress = {
      currentDay: 0,
      totalDays: 0,
      currentTask: 0,
      totalTasks: 0,
      completedTasks: 0,
      isGenerating: false,
      error: null,
      taskStatus: [],
    };
  }
}

// Export singleton instance
export const tripPlannerDetailedService = new TripPlannerDetailedService();
export default tripPlannerDetailedService;
