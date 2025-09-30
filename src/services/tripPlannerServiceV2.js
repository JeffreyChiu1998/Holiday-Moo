import apiService from "./apiService";
import { getCurrentLocalDateTime } from "../utils/dateUtils";

/**
 * Trip Planner Service V2 - High-Level Planning Approach
 *
 * This service implements the new approach:
 * 1. Generate high-level daily themes instead of detailed itineraries
 * 2. Two-step validation for user modifications
 * 3. Real-time plan updates through specialized Moo AI chat
 */
class TripPlannerServiceV2 {
  constructor() {
    this.conversationHistory = [];
    this.currentPlan = null;
    this.originalSurveyData = null;
  }

  /**
   * Generate initial high-level trip plan
   */
  async generateHighLevelPlan(formData) {
    try {
      const {
        selectedTrip,
        preferences,
        selectedBucketItems,
        selectedDateRange,
      } = formData;

      // Store original survey data for context
      this.originalSurveyData = formData;

      // Build the prompt for high-level planning
      const systemPrompt = this.getHighLevelSystemPrompt();
      const userPrompt = this.buildHighLevelPrompt(
        selectedTrip,
        preferences,
        selectedBucketItems,
        selectedDateRange
      );

      const messages = [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ];

      // Get the simplified JSON schema for high-level planning
      const schema = this.getHighLevelPlanSchema();

      // Call AI service with structured output
      const response = await apiService.callXAI(messages, schema, {
        maxTokens: 2500, // Increased for longer, more detailed descriptions
        temperature: 0.7,
      });

      if (
        !response.choices ||
        !response.choices[0] ||
        !response.choices[0].message
      ) {
        throw new Error("Invalid response from AI service");
      }

      const aiContent = response.choices[0].message.content;
      let plan;

      try {
        plan = JSON.parse(aiContent);

        // Ensure required fields
        if (!plan.tripId) {
          plan.tripId = selectedTrip.id;
        }
        // Always set generatedAt to current date when AI generates the plan
        plan.generatedAt = getCurrentLocalDateTime();

        // Store current plan for modifications
        this.currentPlan = plan;

        // Store conversation for future edits
        this.conversationHistory = [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
          {
            role: "assistant",
            content: aiContent,
          },
        ];

        return plan;
      } catch (parseError) {
        console.error("❌ Failed to parse high-level plan JSON:", parseError);
        throw new Error("Invalid JSON response from AI service");
      }
    } catch (error) {
      console.error("🚨 ERROR in generateHighLevelPlan:", error);
      throw new Error(
        "Failed to generate high-level trip plan. Please try again."
      );
    }
  }

  /**
   * Validate user message before processing modification
   */
  async validateUserMessage(userMessage) {
    try {
      // Simple validation patterns - be more permissive
      const lowerMessage = userMessage.toLowerCase().trim();

      // Check for obviously invalid requests
      const invalidPatterns = [
        /^(hi|hello|hey|thanks|thank you)$/i,
        /^(what|how|when|where|why)\s/i, // Questions about general info
        /weather/i,
        /^(yes|no|ok|okay)$/i,
        /^.{1,2}$/i, // Too short (1-2 characters)
      ];

      const isInvalid = invalidPatterns.some((pattern) =>
        pattern.test(lowerMessage)
      );

      if (isInvalid) {
        return {
          isValid: false,
          interpretedRequest: null,
          clarificationRequest:
            "Could you please tell me what specific changes you'd like to make to your trip plan? For example: 'Add Ocean Park to day 6' or 'Make day 2 more relaxing'.",
        };
      }

      // Check for valid modification patterns
      const validPatterns = [
        /day\s*\d+/i, // "day 6", "day 2"
        /(add|include|visit|go to|see)/i, // Action words
        /(more|less|replace|change|move)/i, // Modification words
        /(relaxing|cultural|food|shopping|adventure|nature)/i, // Activity types
        /(morning|afternoon|evening|whole day)/i, // Time periods
        /\b[A-Z][a-zA-Z\s]{2,}\b/, // Proper nouns (place names)
      ];

      const hasValidPattern = validPatterns.some((pattern) =>
        pattern.test(userMessage)
      );

      if (hasValidPattern || userMessage.length > 10) {
        // Most requests with valid patterns or reasonable length are probably valid
        return {
          isValid: true,
          interpretedRequest: userMessage,
          clarificationRequest: null,
        };
      }

      // Fallback for unclear requests
      return {
        isValid: false,
        interpretedRequest: null,
        clarificationRequest:
          "I'd like to help you modify your trip plan. Could you be more specific about what you'd like to change? For example, you could say 'Add Ocean Park to day 6' or 'Make day 2 more relaxing'.",
      };
    } catch (error) {
      console.error("🚨 ERROR in validateUserMessage:", error);
      // Default to valid if validation fails
      return {
        isValid: true,
        interpretedRequest: userMessage,
        clarificationRequest: null,
      };
    }
  }

  /**
   * Modify existing plan based on validated user request
   */
  async modifyPlan(validatedRequest) {
    try {
      if (!this.currentPlan) {
        throw new Error("No current plan to modify");
      }

      // Extract specific places mentioned in the request
      const extractedPlaces = this.extractPlacesFromRequest(validatedRequest);

      // Build modification prompt with full context
      const modificationPrompt = `
Please modify the current high-level trip plan based on this request: "${validatedRequest}"

CURRENT PLAN:
${JSON.stringify(this.currentPlan, null, 2)}

ORIGINAL SURVEY PREFERENCES:
${JSON.stringify(this.originalSurveyData?.preferences, null, 2)}

MODIFICATION INSTRUCTIONS:
1. Keep the detailed description format with approximately 50 words per time period (Morning/Afternoon/Evening)
2. Include rich, engaging details about activities and experiences
3. If specific places are mentioned in the user request, include them in brackets after the relevant time period description
4. Format specific places like: "Morning: [detailed description] [Place A, Place B]"
5. Maintain the inspiring and immersive tone while incorporating the requested changes

${
  extractedPlaces.length > 0
    ? `
SPECIFIC PLACES TO INCLUDE:
${extractedPlaces.map((place) => `- ${place}`).join("\n")}

Make sure to incorporate these places into the appropriate time periods and include them in brackets at the end of the relevant descriptions.
`
    : ""
}

Please return the updated plan in the same JSON format, keeping the same structure but modifying the content according to the user's request.
`;

      const messages = [
        ...this.conversationHistory,
        {
          role: "user",
          content: modificationPrompt,
        },
      ];

      const schema = this.getHighLevelPlanSchema();
      const response = await apiService.callXAI(messages, schema, {
        maxTokens: 2000, // Increased for longer descriptions
        temperature: 0.7,
      });

      if (
        !response.choices ||
        !response.choices[0] ||
        !response.choices[0].message
      ) {
        throw new Error("Invalid modification response from AI service");
      }

      const aiContent = response.choices[0].message.content;
      let updatedPlan;

      try {
        updatedPlan = JSON.parse(aiContent);

        // Ensure required fields are preserved
        if (!updatedPlan.tripId) {
          updatedPlan.tripId = this.currentPlan.tripId;
        }
        // Always update generatedAt to current date when plan is modified
        updatedPlan.generatedAt = getCurrentLocalDateTime();

        // Update current plan
        this.currentPlan = updatedPlan;

        // Update conversation history
        this.conversationHistory = [
          ...messages,
          {
            role: "assistant",
            content: aiContent,
          },
        ];

        return updatedPlan;
      } catch (parseError) {
        console.error("❌ Failed to parse modified plan JSON:", parseError);
        throw new Error(
          "Invalid JSON response from AI service during modification"
        );
      }
    } catch (error) {
      console.error("❌ ERROR in modifyPlan:", error);
      throw new Error("Failed to modify trip plan. Please try again.");
    }
  }

  /**
   * Get JSON schema for high-level planning
   */
  getHighLevelPlanSchema() {
    return {
      type: "object",
      properties: {
        tripId: {
          type: "string",
          description: "Unique identifier for the trip",
        },
        generatedAt: {
          type: "string",
          format: "date-time",
          description: "When the plan was generated",
        },
        destination: {
          type: "string",
          description: "Trip destination",
        },
        totalDays: {
          type: "integer",
          description: "Total number of days in the plan",
        },
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: {
                type: "string",
                format: "date",
                description: "Date in YYYY-MM-DD format",
              },
              dayNumber: {
                type: "integer",
                description: "Day number of the trip (1, 2, 3, etc.)",
              },
              topic: {
                type: "string",
                description:
                  "Main theme/topic for this day (e.g., 'Cultural Exploration', 'Adventure Day', 'Relaxation')",
              },
              description: {
                type: "string",
                description:
                  "High-level description of the day including morning, afternoon, and evening activities",
              },
            },
            required: ["date", "dayNumber", "topic", "description"],
            additionalProperties: false,
          },
          minItems: 1,
        },
      },
      required: ["tripId", "generatedAt", "destination", "totalDays", "days"],
      additionalProperties: false,
    };
  }

  /**
   * Get system prompt for high-level planning
   */
  getHighLevelSystemPrompt() {
    return `You are an expert travel planner AI for Holiday Moo. Create detailed daily themes and rich descriptions for trip planning.

IMPORTANT: You must respond with a valid JSON object that matches the provided schema exactly. Do not include any text outside the JSON structure.

Create a comprehensive day-by-day plan with:
- A clear TOPIC/THEME for each day (e.g., "Cultural Exploration", "Adventure Day", "Food & Markets", "Relaxation & Wellness")
- A DETAILED DESCRIPTION that outlines specific activities and experiences for morning, afternoon, and evening
- Each time period should be approximately 50 words with rich, engaging details
- Include specific place names, neighborhoods, or attractions when relevant

Consider these factors:
- User's preferences and trip type
- Logical progression of experiences throughout the trip
- Balance between different types of activities
- Local customs and seasonal considerations
- Travel rhythm and energy levels
- Must-include bucket list items
- Specific places mentioned by users

Format the description to include:
- Morning: Detailed activities with specific areas, markets, or neighborhoods to explore (~50 words)
- Afternoon: Main experiences with landmark names, districts, or attraction types (~50 words)  
- Evening: Dining recommendations with cuisine types, entertainment areas, and atmosphere (~50 words)

When users request specific places, include them in brackets after the relevant time period description.
Example format: "Morning: Start your day exploring the bustling fish markets and traditional tea houses in the historic old quarter, where vendors display fresh catches and locals gather for morning conversations. The narrow alleyways reveal hidden shrines and authentic breakfast spots. [Tsukiji Market, Senso-ji Temple]"

Generate realistic, inspiring daily themes with rich details that create an immersive trip experience while maintaining flexibility for personalization.`;
  }

  /**
   * Build high-level planning prompt
   */
  buildHighLevelPrompt(trip, preferences, bucketItems, selectedDateRange) {
    const tripStartDate = new Date(trip.startDate);
    const tripEndDate = new Date(trip.endDate);
    const totalTripDays =
      Math.ceil((tripEndDate - tripStartDate) / (1000 * 60 * 60 * 24)) + 1;

    // Calculate planning period
    let startDate, endDate, days;

    if (selectedDateRange) {
      startDate = new Date(tripStartDate);
      startDate.setDate(startDate.getDate() + selectedDateRange.startDay - 1);

      // End date should be the last day to plan (not the checkout day)
      endDate = new Date(tripStartDate);
      endDate.setDate(endDate.getDate() + selectedDateRange.endDay - 2);

      // Days should be the actual planning days (not including checkout day)
      days = selectedDateRange.endDay - selectedDateRange.startDay;
    } else {
      startDate = tripStartDate;
      // For full trip, end date should be one day before the trip end date
      endDate = new Date(tripEndDate);
      endDate.setDate(endDate.getDate() - 1);
      days = totalTripDays - 1;
    }

    let prompt = `Create a high-level ${days}-day trip plan for ${trip.destination}`;

    if (selectedDateRange && totalTripDays > days) {
      prompt += ` (This is part of a ${totalTripDays}-day trip, planning days ${selectedDateRange.startDay}-${selectedDateRange.endDay})`;
    }

    prompt += ` from ${startDate.toDateString()} to ${endDate.toDateString()}.\n\n`;

    // Trip context
    prompt += `Trip Context:\n`;
    prompt += `- Full Trip Period: ${tripStartDate.toDateString()} to ${tripEndDate.toDateString()} (${totalTripDays} days)\n`;
    prompt += `- Planning Period: ${startDate.toDateString()} to ${endDate.toDateString()} (${days} days)\n`;
    prompt += `- Destination: ${trip.destination}\n`;
    if (trip.budget) prompt += `- Budget: ${trip.budget}\n`;
    if (trip.travelers && trip.travelers.length > 0) {
      prompt += `- Travelers: ${trip.travelers
        .map((t) => t.name)
        .join(", ")} (${trip.travelers.length} people)\n`;
    }

    // Key preferences for theming
    prompt += `\nKey Preferences for Daily Themes:\n`;
    prompt += `- Trip Type: ${preferences.tripType}${
      preferences.tripTypeOther ? ` (${preferences.tripTypeOther})` : ""
    }\n`;
    prompt += `- Accommodation: ${preferences.accommodationType}\n`;
    prompt += `- Daily Rhythm: Wake ${preferences.wakeUpTime}, Return ${preferences.returnTime}\n`;
    prompt += `- Meals: ${preferences.mealsPerDay}\n`;
    prompt += `- Break Needs: ${preferences.needBreaks}\n`;
    prompt += `- Shopping Interest: ${preferences.shoppingInterest}\n`;

    if (preferences.preferredExperiences.length > 0) {
      prompt += `- Preferred Experiences: ${preferences.preferredExperiences.join(
        ", "
      )}\n`;
    }

    if (preferences.cuisineInterests.length > 0) {
      prompt += `- Cuisine Interests: ${preferences.cuisineInterests.join(
        ", "
      )}\n`;
    }

    if (preferences.dietaryRestrictions.length > 0) {
      prompt += `- Dietary Restrictions: ${preferences.dietaryRestrictions.join(
        ", "
      )}\n`;
    }

    // Must-include activities
    if (bucketItems && bucketItems.length > 0) {
      prompt += `\nMust-Include Activities:\n`;
      bucketItems.forEach((item, index) => {
        prompt += `${index + 1}. ${item.name}`;
        if (item.location) {
          prompt += ` (${
            typeof item.location === "string"
              ? item.location
              : item.location.address || item.location.name
          })`;
        }
        if (item.description) prompt += ` - ${item.description}`;
        prompt += `\n`;
      });
    }

    if (preferences.additionalNotes) {
      prompt += `\nAdditional Notes: ${preferences.additionalNotes}\n`;
    }

    prompt += `\nCreate daily themes that flow logically and provide a cohesive trip experience. Focus on high-level concepts and general activity types rather than specific venues or detailed schedules.`;

    return prompt;
  }

  /**
   * Reset conversation for new planning session
   */
  reset() {
    this.conversationHistory = [];
    this.currentPlan = null;
    this.originalSurveyData = null;
  }

  /**
   * Extract specific places mentioned in user request
   */
  extractPlacesFromRequest(userRequest) {
    const places = [];

    // Common patterns for place mentions
    const placePatterns = [
      // "go to [place]", "visit [place]", "see [place]"
      /(?:go to|visit|see|check out|explore)\s+([A-Z][a-zA-Z\s&'-]+(?:Temple|Market|Park|Museum|Tower|Bridge|Palace|Castle|Garden|Square|District|Street|Avenue|Road|Beach|Island|Mountain|Lake|River|Station|Airport|Mall|Center|Centre|Building|Hall|Gallery|Theater|Theatre|Church|Shrine|Mosque|Cathedral|Observatory|Zoo|Aquarium|Stadium|Arena|Plaza|Pier|Wharf|Harbor|Harbour|Bay|Cove|Falls|Waterfall|Valley|Hill|Peak|Summit|Cliff|Cave|Forest|Reserve|Sanctuary|Monument|Memorial|Statue|Fountain|Arch|Gate|Wall|Fort|Fortress|Citadel|Ruins|Site|Complex|Resort|Hotel|Restaurant|Cafe|Bar|Club|Shop|Store|Boutique|Factory|Brewery|Winery|Farm|Ranch|Village|Town|City|Prefecture|Province|Region|Area|Zone|Quarter|Neighborhood|Neighbourhood))/gi,

      // Proper nouns (capitalized words that could be places)
      /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*(?:\s+(?:Temple|Market|Park|Museum|Tower|Bridge|Palace|Castle|Garden|Square|District|Street|Avenue|Road|Beach|Island|Mountain|Lake|River|Station|Airport|Mall|Center|Centre|Building|Hall|Gallery|Theater|Theatre|Church|Shrine|Mosque|Cathedral|Observatory|Zoo|Aquarium|Stadium|Arena|Plaza|Pier|Wharf|Harbor|Harbour|Bay|Cove|Falls|Waterfall|Valley|Hill|Peak|Summit|Cliff|Cave|Forest|Reserve|Sanctuary|Monument|Memorial|Statue|Fountain|Arch|Gate|Wall|Fort|Fortress|Citadel|Ruins|Site|Complex|Resort|Hotel|Restaurant|Cafe|Bar|Club|Shop|Store|Boutique|Factory|Brewery|Winery|Farm|Ranch|Village|Town|City|Prefecture|Province|Region|Area|Zone|Quarter|Neighborhood|Neighbourhood)))\b/g,

      // Quoted places
      /"([^"]+)"/g,
      /'([^']+)'/g,
    ];

    placePatterns.forEach((pattern) => {
      const matches = userRequest.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          // Clean up the match
          let place = match.replace(
            /^(?:go to|visit|see|check out|explore)\s+/i,
            ""
          );
          place = place.replace(/^["']|["']$/g, ""); // Remove quotes
          place = place.trim();

          // Only add if it looks like a real place (has some length and proper capitalization)
          if (
            place.length > 2 &&
            /^[A-Z]/.test(place) &&
            !places.includes(place)
          ) {
            places.push(place);
          }
        });
      }
    });

    return places;
  }

  /**
   * Get current plan
   */
  getCurrentPlan() {
    return this.currentPlan;
  }
}

// Export singleton instance
export const tripPlannerServiceV2 = new TripPlannerServiceV2();
export default tripPlannerServiceV2;
