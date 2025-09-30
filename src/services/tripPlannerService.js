import apiService from "./apiService";
import { getCurrentLocalDateTime, formatLocalDate } from "../utils/dateUtils";

// Trip Planner Configuration
const TRIP_PLANNER_CONFIG = {
  MAX_TRIP_DAYS: 8, // Maximum days to plan in single request
  MAX_ACTIVITIES_PER_DAY: 8, // Maximum activities per day
  MAX_TOKENS: 2500, // Maximum tokens for AI response
  TIMEOUT_SECONDS: 120, // Request timeout in seconds
};

class TripPlannerService {
  constructor() {
    this.conversationHistory = [];
    // Configuration parameters (can be modified at runtime)
    this.MAX_TRIP_DAYS = TRIP_PLANNER_CONFIG.MAX_TRIP_DAYS;
    this.MAX_ACTIVITIES_PER_DAY = TRIP_PLANNER_CONFIG.MAX_ACTIVITIES_PER_DAY;
    this.MAX_TOKENS = TRIP_PLANNER_CONFIG.MAX_TOKENS;
  }

  /**
   * Get maximum trip days configuration
   */
  getMaxTripDays() {
    return this.MAX_TRIP_DAYS;
  }

  /**
   * Set maximum trip days configuration
   */
  setMaxTripDays(days) {
    if (days > 0 && days <= 30) {
      // Reasonable limits
      this.MAX_TRIP_DAYS = days;
    } else {
    }
  }

  /**
   * Get JSON schema for structured trip itinerary output
   */
  getTripItinerarySchema() {
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
          description: "When the itinerary was generated",
        },
        summary: {
          type: "object",
          properties: {
            totalDays: { type: "integer" },
            totalActivities: { type: "integer" },
            totalMeals: { type: "integer" },
            estimatedBudget: { type: "string" },
          },
          required: ["totalDays", "totalActivities", "totalMeals"],
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
              activities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    time: {
                      type: "string",
                      pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
                      description: "Time in HH:MM format (24-hour)",
                    },
                    title: {
                      type: "string",
                      description: "Activity title",
                    },
                    description: {
                      type: "string",
                      description: "Detailed description of the activity",
                    },
                    location: {
                      type: "string",
                      description: "Specific location or address",
                    },
                    type: {
                      type: "string",
                      enum: [
                        "meal",
                        "activity",
                        "transport",
                        "culture",
                        "shopping",
                        "rest",
                        "sightseeing",
                        "entertainment",
                      ],
                      description: "Type of activity",
                    },
                    estimatedCost: {
                      type: "string",
                      description: "Estimated cost in local currency",
                    },
                    duration: {
                      type: "string",
                      description:
                        "Expected duration (e.g., '2 hours', '30 minutes')",
                    },
                    tips: {
                      type: "string",
                      description: "Helpful tips or insider information",
                    },
                  },
                  required: [
                    "time",
                    "title",
                    "description",
                    "location",
                    "type",
                  ],
                  additionalProperties: false,
                },
                minItems: 1,
              },
            },
            required: ["date", "dayNumber", "activities"],
            additionalProperties: false,
          },
          minItems: 1,
        },
      },
      required: ["tripId", "generatedAt", "summary", "days"],
      additionalProperties: false,
    };
  }

  /**
   * Generate initial trip itinerary based on user preferences
   */
  async generateItinerary(formData) {
    try {
      const {
        selectedTrip,
        preferences,
        selectedBucketItems,
        selectedDateRange,
      } = formData;

      // Build the prompt for AI
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.buildInitialPrompt(
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

      // Call AI service through API Gateway
      const response = await apiService.callXAI(messages, {
        maxTokens: this.MAX_TOKENS,
        temperature: 0.7,
      });

      if (
        !response.choices ||
        !response.choices[0] ||
        !response.choices[0].message
      ) {
        console.error("❌ Invalid AI response structure:", response);
        throw new Error("Invalid response from AI service");
      }

      const aiContent = response.choices[0].message.content;

      // Parse JSON response directly (no complex parsing needed!)

      let itinerary;
      try {
        // Clean up the AI content - sometimes it has extra text or is truncated
        let cleanContent = aiContent.trim();

        // Try to find JSON boundaries if there's extra text
        const jsonStart = cleanContent.indexOf("{");
        const jsonEnd = cleanContent.lastIndexOf("}");

        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
        }

        // If the JSON appears truncated, try to fix common issues
        if (!cleanContent.endsWith("}")) {
          // Try to close incomplete JSON structures
          let openBraces = 0;
          let openBrackets = 0;

          for (let char of cleanContent) {
            if (char === "{") openBraces++;
            if (char === "}") openBraces--;
            if (char === "[") openBrackets++;
            if (char === "]") openBrackets--;
          }

          // Add missing closing brackets and braces
          while (openBrackets > 0) {
            cleanContent += "]";
            openBrackets--;
          }
          while (openBraces > 0) {
            cleanContent += "}";
            openBraces--;
          }
        }

        itinerary = JSON.parse(cleanContent);

        // Validate the structure matches our expected format
        if (!itinerary.days || !Array.isArray(itinerary.days)) {
          throw new Error(
            "Invalid itinerary structure: missing or invalid days array"
          );
        }

        // Ensure tripId is set
        if (!itinerary.tripId) {
          itinerary.tripId = selectedTrip.id;
        }

        // Ensure generatedAt is set
        if (!itinerary.generatedAt) {
          itinerary.generatedAt = getCurrentLocalDateTime();
        }

        // Ensure summary is present
        if (!itinerary.summary) {
          itinerary.summary = {
            totalDays: itinerary.days.length,
            totalActivities: itinerary.days.reduce(
              (total, day) => total + day.activities.length,
              0
            ),
            totalMeals: itinerary.days.reduce(
              (total, day) =>
                total +
                day.activities.filter((activity) => activity.type === "meal")
                  .length,
              0
            ),
            estimatedBudget: "Budget varies by preferences",
          };
        }
      } catch (parseError) {
        console.error("❌ Failed to parse JSON response:", parseError);
        console.error("Raw content length:", aiContent.length);
        console.error("Raw content preview:", aiContent.substring(0, 1000));

        // Create a fallback itinerary if JSON parsing completely fails

        itinerary = this.createFallbackItinerary(selectedTrip, aiContent);
      }

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

      return itinerary;
    } catch (error) {
      console.error("❌ ERROR in generateItinerary:");
      console.error("Error object:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      throw new Error("Failed to generate trip itinerary. Please try again.");
    }
  }

  /**
   * Edit existing itinerary based on user feedback
   */
  async editItinerary(currentItinerary, userRequest) {
    try {
      // Add user's edit request to conversation
      const editPrompt = `Please modify the current itinerary based on this request: "${userRequest}"\n\nCurrent itinerary:\n${this.formatItineraryForAI(
        currentItinerary
      )}`;

      const messages = [
        ...this.conversationHistory,
        {
          role: "user",
          content: editPrompt,
        },
      ];

      const response = await apiService.callXAI(messages, {
        maxTokens: this.MAX_TOKENS,
        temperature: 0.7,
      });

      if (
        !response.choices ||
        !response.choices[0] ||
        !response.choices[0].message
      ) {
        console.error("❌ Invalid AI edit response structure:", response);
        throw new Error("Invalid response from AI service during edit");
      }

      const aiContent = response.choices[0].message.content;

      // Parse updated JSON response directly

      let updatedItinerary;
      try {
        updatedItinerary = JSON.parse(aiContent);

        // Ensure tripId is preserved
        if (!updatedItinerary.tripId) {
          updatedItinerary.tripId = currentItinerary.tripId;
        }

        // Update generatedAt timestamp
        updatedItinerary.generatedAt = getCurrentLocalDateTime();
      } catch (parseError) {
        console.error("❌ Failed to parse edited JSON response:", parseError);
        console.error("Raw content:", aiContent);
        throw new Error("Invalid JSON response from AI service during edit");
      }

      // Update conversation history
      this.conversationHistory = [
        ...messages,
        {
          role: "assistant",
          content: aiContent,
        },
      ];

      return {
        itinerary: updatedItinerary,
        aiResponse: aiContent,
      };
    } catch (error) {
      console.error("❌ ERROR in editItinerary:");
      console.error("Error object:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      throw new Error("Failed to edit itinerary. Please try again.");
    }
  }

  /**
   * Build initial prompt for AI
   */
  buildInitialPrompt(trip, preferences, bucketItems, selectedDateRange = null) {
    const tripStartDate = new Date(trip.startDate);
    const tripEndDate = new Date(trip.endDate);
    const totalTripDays =
      Math.ceil((tripEndDate - tripStartDate) / (1000 * 60 * 60 * 24)) + 1;

    // Use selected date range if provided, otherwise use full trip with day limit
    let startDate, endDate, days;

    if (selectedDateRange && totalTripDays > this.MAX_TRIP_DAYS) {
      // Calculate actual dates based on selected range
      startDate = new Date(tripStartDate);
      startDate.setDate(startDate.getDate() + selectedDateRange.startDay - 1);

      endDate = new Date(tripStartDate);
      endDate.setDate(endDate.getDate() + selectedDateRange.endDay - 1);

      days = selectedDateRange.endDay - selectedDateRange.startDay + 1;
    } else {
      // Use full trip or apply day limit
      startDate = tripStartDate;
      endDate = tripEndDate;
      days = Math.min(totalTripDays, this.MAX_TRIP_DAYS);

      if (totalTripDays > this.MAX_TRIP_DAYS) {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + days - 1);
      }
    }

    let prompt = `Create a detailed ${days}-day itinerary for ${trip.destination}`;

    if (selectedDateRange && totalTripDays > this.MAX_TRIP_DAYS) {
      prompt += ` (Note: This is a ${totalTripDays}-day trip, planning days ${selectedDateRange.startDay}-${selectedDateRange.endDay}. Additional days can be planned separately if needed)`;
    } else if (totalTripDays > this.MAX_TRIP_DAYS) {
      prompt += ` (Note: This is a ${totalTripDays}-day trip, but we're planning the first ${days} days. Additional days can be planned separately if needed)`;
    }

    prompt += ` from ${startDate.toDateString()} to ${endDate.toDateString()}.\n\n`;

    prompt += `Trip Details:\n`;
    prompt += `- Destination: ${trip.destination}\n`;
    prompt += `- Duration: ${days} days\n`;
    if (trip.budget) prompt += `- Budget: $${trip.budget}\n`;
    if (trip.travelers && trip.travelers.length > 0) {
      prompt += `- Travelers: ${trip.travelers
        .map((t) => t.name)
        .join(", ")} (${trip.travelers.length} people)\n`;
    }

    prompt += `\nPreferences:\n`;

    // Accommodation & Trip Type
    prompt += `- Accommodation Type: ${preferences.accommodationType}${
      preferences.accommodationTypeOther
        ? ` (${preferences.accommodationTypeOther})`
        : ""
    }\n`;
    prompt += `- Room Setup: ${preferences.roomSetup}${
      preferences.roomSetupOther ? ` (${preferences.roomSetupOther})` : ""
    }\n`;
    prompt += `- Trip Type: ${preferences.tripType}${
      preferences.tripTypeOther ? ` (${preferences.tripTypeOther})` : ""
    }\n`;

    // Food & Dietary
    if (preferences.dietaryRestrictions.length > 0) {
      prompt += `- Dietary Restrictions: ${preferences.dietaryRestrictions.join(
        ", "
      )}${
        preferences.dietaryRestrictionsOther
          ? ` (${preferences.dietaryRestrictionsOther})`
          : ""
      }\n`;
    }
    if (preferences.cuisineInterests.length > 0) {
      prompt += `- Cuisine Interests: ${preferences.cuisineInterests.join(
        ", "
      )}${
        preferences.cuisineInterestsOther
          ? ` (${preferences.cuisineInterestsOther})`
          : ""
      }\n`;
    }
    if (preferences.snackingHabits) {
      prompt += `- Snacking Habits: ${preferences.snackingHabits}\n`;
    }

    // Activities & Interests
    if (preferences.preferredExperiences.length > 0) {
      prompt += `- Preferred Experiences: ${preferences.preferredExperiences.join(
        ", "
      )}${
        preferences.preferredExperiencesOther
          ? ` (${preferences.preferredExperiencesOther})`
          : ""
      }\n`;
    }
    if (preferences.socialPreference) {
      prompt += `- Social Preference: ${preferences.socialPreference}\n`;
    }
    if (preferences.itineraryStyle) {
      prompt += `- Itinerary Style: ${preferences.itineraryStyle}\n`;
    }
    if (preferences.specialInterests) {
      prompt += `- Special Interests: ${preferences.specialInterests}\n`;
    }

    // Daily Rhythm & Meals
    prompt += `- Wake-Up Time: ${preferences.wakeUpTime}\n`;
    prompt += `- Preparation Time: ${preferences.preparationTime}\n`;
    prompt += `- Return Time: ${preferences.returnTime}\n`;
    prompt += `- Meals Per Day: ${preferences.mealsPerDay}\n`;
    if (preferences.breakfastTime)
      prompt += `- Breakfast Time: ${preferences.breakfastTime}\n`;
    if (preferences.lunchTime)
      prompt += `- Lunch Time: ${preferences.lunchTime}\n`;
    if (preferences.dinnerTime)
      prompt += `- Dinner Time: ${preferences.dinnerTime}\n`;

    // Break Preferences
    prompt += `- Need Breaks: ${preferences.needBreaks}\n`;
    if (preferences.breakDuration) {
      prompt += `- Break Duration: ${preferences.breakDuration}\n`;
    }
    if (preferences.breakActivities.length > 0) {
      prompt += `- Break Activities: ${preferences.breakActivities.join(", ")}${
        preferences.breakActivitiesOther
          ? ` (${preferences.breakActivitiesOther})`
          : ""
      }\n`;
    }

    // Shopping Preferences
    prompt += `- Shopping Interest: ${preferences.shoppingInterest}\n`;
    if (preferences.shoppingCategories.length > 0) {
      prompt += `- Shopping Categories: ${preferences.shoppingCategories.join(
        ", "
      )}${
        preferences.shoppingCategoriesOther
          ? ` (${preferences.shoppingCategoriesOther})`
          : ""
      }\n`;
    }
    if (preferences.shoppingStyle) {
      prompt += `- Shopping Style: ${preferences.shoppingStyle}\n`;
    }

    // Additional Notes
    if (preferences.additionalNotes) {
      prompt += `- Additional Notes: ${preferences.additionalNotes}\n`;
    }

    if (bucketItems && bucketItems.length > 0) {
      prompt += `\nMust-Include Activities:\n`;
      bucketItems.forEach((item, index) => {
        prompt += `${index + 1}. ${item.name}`;
        if (item.location)
          prompt += ` (${
            typeof item.location === "string"
              ? item.location
              : item.location.address || item.location.name
          })`;
        if (item.description) prompt += ` - ${item.description}`;
        prompt += `\n`;
      });
    }

    prompt += `\nPlease create a day-by-day itinerary with specific times, activities, meals, and locations. Include practical details like estimated costs, duration, and travel time between activities. Format the response as a structured itinerary that can be easily parsed.`;

    return prompt;
  }

  /**
   * Get system prompt for AI
   */
  getSystemPrompt() {
    return `You are an expert travel planner AI for Holiday Moo. Create detailed, practical itineraries that match user preferences.

IMPORTANT: You must respond with a valid JSON object that matches the provided schema exactly. Do not include any text outside the JSON structure.

Create a comprehensive day-by-day itinerary with:
- Specific times (use 24-hour format like 09:00, 14:30)
- Detailed activity descriptions with insider tips
- Specific locations with addresses when possible
- Realistic estimated costs in local currency
- Accurate duration estimates
- Appropriate activity types (meal, activity, transport, culture, shopping, sightseeing, entertainment, rest)

Consider these factors:
- Local customs, opening hours, and seasonal factors
- Realistic travel time between locations
- User's meal timing preferences and dietary restrictions
- Weather and seasonal considerations
- Budget constraints and group demographics
- Accessibility needs and special requirements
- Shopping interests and preferred categories
- Break preferences and timing needs
- Daily rhythm (wake-up, preparation, return times)
- Accommodation type and location

Pay special attention to:
- Shopping: Include shopping activities based on user's interest level and preferred categories
- Breaks: Schedule appropriate breaks based on user preferences and activity intensity
- Meals: Respect preferred meal times, dietary restrictions, and cuisine interests
- Daily flow: Plan logical activity sequences that minimize travel time
- Local experiences: Include authentic local experiences and hidden gems
- Practical details: Provide helpful tips, booking information, and insider advice

Generate a realistic, actionable itinerary that the user can actually follow. Include specific venue names, addresses, and practical details whenever possible.

IMPORTANT CONSTRAINTS:
- Maximum itinerary length is limited to prevent response truncation
- Focus on quality over quantity - provide detailed, practical information for each day
- If the actual trip is longer than the planned days, focus on the most important/popular activities for the initial days
- Each day should have 6-8 activities including meals, with realistic timing and transitions`;
  }

  /**
   * Parse AI response into structured itinerary
   */
  parseItineraryResponse(aiResponse, trip) {
    try {
      // This is a simplified parser - in production, you'd want more robust parsing
      const days = [];
      const lines = aiResponse.split("\n");
      let currentDay = null;
      let currentActivities = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        if (!trimmedLine) {
          continue;
        }

        // Detect day headers (Day 1, Day 2, etc.)
        const dayMatch = trimmedLine.match(/^Day\s+(\d+)/i);
        if (dayMatch) {
          // Save previous day if exists
          if (currentDay && currentActivities.length > 0) {
            days.push({
              ...currentDay,
              activities: currentActivities,
            });
          }

          // Start new day
          const dayNumber = parseInt(dayMatch[1]);
          const tripStart = new Date(trip.startDate || Date.now());
          const dayDate = new Date(tripStart);
          dayDate.setDate(dayDate.getDate() + dayNumber - 1);

          currentDay = {
            date: dayDate.toISOString().split("T")[0],
          };
          currentActivities = [];

          continue;
        }

        // Detect time-based activities
        const timeMatch = trimmedLine.match(
          /^(\d{1,2}):(\d{2})\s*[-:]?\s*(.+)/
        );
        if (timeMatch && currentDay) {
          const [, hours, minutes, description] = timeMatch;
          const time = `${hours.padStart(2, "0")}:${minutes}`;

          // Extract activity details from description
          const activity = this.parseActivityDescription(description, time);
          currentActivities.push(activity);
        } else if (trimmedLine.includes(":") && currentDay) {
        } else if (!currentDay) {
        } else {
        }
      }

      // Add final day
      if (currentDay && currentActivities.length > 0) {
        days.push({
          ...currentDay,
          activities: currentActivities,
        });
      }

      // If no structured days found, create a simple fallback
      if (days.length === 0) {
        const tripStart = new Date(trip.startDate || Date.now());
        days.push({
          date: formatLocalDate(tripStart),
          activities: [
            {
              time: "09:00",
              title: "Explore Destination",
              location: trip.destination,
              description:
                "AI-generated itinerary - please regenerate for detailed plan",
              type: "activity",
            },
          ],
        });
      }

      const result = {
        tripId: trip.id,
        days: days,
        generatedAt: getCurrentLocalDateTime(),
      };

      return result;
    } catch (error) {
      console.error("❌ ERROR in parseItineraryResponse:");
      console.error("Error object:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      throw new Error("Failed to parse AI response. Please try regenerating.");
    }
  }

  /**
   * Create fallback itinerary when JSON parsing fails but we have partial data
   */
  createFallbackItinerary(trip, aiContent) {
    try {
      // Try to extract activities from the partial JSON content
      const activities = [];

      // Look for activity patterns in the content
      const activityMatches = aiContent.match(
        /"time":\s*"([^"]+)"[^}]*"title":\s*"([^"]+)"[^}]*"description":\s*"([^"]+)"[^}]*"location":\s*"([^"]+)"[^}]*"type":\s*"([^"]+)"/g
      );

      if (activityMatches) {
        activityMatches.forEach((match) => {
          const timeMatch = match.match(/"time":\s*"([^"]+)"/);
          const titleMatch = match.match(/"title":\s*"([^"]+)"/);
          const descMatch = match.match(/"description":\s*"([^"]+)"/);
          const locationMatch = match.match(/"location":\s*"([^"]+)"/);
          const typeMatch = match.match(/"type":\s*"([^"]+)"/);

          if (
            timeMatch &&
            titleMatch &&
            descMatch &&
            locationMatch &&
            typeMatch
          ) {
            activities.push({
              time: timeMatch[1],
              title: titleMatch[1],
              description: descMatch[1],
              location: locationMatch[1],
              type: typeMatch[1],
              estimatedCost: "Cost varies",
              duration: "Duration varies",
            });
          }
        });
      }

      // Create a basic itinerary structure
      const startDate = new Date(trip.startDate || Date.now());
      const days = [];

      if (activities.length > 0) {
        // Group activities by day (assuming they're in order)
        const activitiesPerDay = Math.ceil(activities.length / 3); // Assume 3 days max
        let currentDayActivities = [];
        let dayNumber = 1;

        activities.forEach((activity, index) => {
          currentDayActivities.push(activity);

          if (
            currentDayActivities.length >= activitiesPerDay ||
            index === activities.length - 1
          ) {
            const dayDate = new Date(startDate);
            dayDate.setDate(dayDate.getDate() + dayNumber - 1);

            days.push({
              date: formatLocalDate(dayDate),
              dayNumber: dayNumber,
              activities: currentDayActivities,
            });

            currentDayActivities = [];
            dayNumber++;
          }
        });
      } else {
        // Create a minimal fallback day
        days.push({
          date: formatLocalDate(startDate),
          dayNumber: 1,
          activities: [
            {
              time: "09:00",
              title: "Explore Destination",
              description:
                "AI-generated detailed itinerary (partial data recovered)",
              location: trip.destination,
              type: "activity",
              estimatedCost: "Varies",
              duration: "Full day",
            },
          ],
        });
      }

      return {
        tripId: trip.id,
        generatedAt: new Date().toISOString(),
        summary: {
          totalDays: days.length,
          totalActivities: days.reduce(
            (total, day) => total + day.activities.length,
            0
          ),
          totalMeals: days.reduce(
            (total, day) =>
              total +
              day.activities.filter((activity) => activity.type === "meal")
                .length,
            0
          ),
          estimatedBudget: "Budget varies by preferences",
        },
        days: days,
      };
    } catch (fallbackError) {
      console.error("❌ Fallback creation failed:", fallbackError);

      // Ultimate fallback - basic itinerary
      const startDate = new Date(trip.startDate || Date.now());
      return {
        tripId: trip.id,
        generatedAt: getCurrentLocalDateTime(),
        summary: {
          totalDays: 1,
          totalActivities: 1,
          totalMeals: 0,
          estimatedBudget: "Budget varies",
        },
        days: [
          {
            date: formatLocalDate(startDate),
            dayNumber: 1,
            activities: [
              {
                time: "09:00",
                title: "Explore Destination",
                description: "Please regenerate for a detailed itinerary",
                location: trip.destination,
                type: "activity",
                estimatedCost: "Varies",
                duration: "Full day",
              },
            ],
          },
        ],
      };
    }
  }

  /**
   * Parse activity description to extract details
   */
  parseActivityDescription(description, time) {
    // Extract location (text in parentheses)
    const locationMatch = description.match(/\(([^)]+)\)/);
    const location = locationMatch ? locationMatch[1] : "";

    // Remove location from title
    const title = description.replace(/\s*\([^)]+\)\s*/, "").trim();

    // Determine activity type based on time and keywords
    let type = "activity";
    const lowerDesc = description.toLowerCase();

    if (
      time >= "07:00" &&
      time <= "10:00" &&
      (lowerDesc.includes("breakfast") || lowerDesc.includes("coffee"))
    ) {
      type = "meal";
    } else if (
      time >= "12:00" &&
      time <= "14:00" &&
      (lowerDesc.includes("lunch") || lowerDesc.includes("eat"))
    ) {
      type = "meal";
    } else if (
      time >= "18:00" &&
      time <= "22:00" &&
      (lowerDesc.includes("dinner") || lowerDesc.includes("restaurant"))
    ) {
      type = "meal";
    } else if (
      lowerDesc.includes("museum") ||
      lowerDesc.includes("temple") ||
      lowerDesc.includes("historic")
    ) {
      type = "culture";
    } else if (
      lowerDesc.includes("shop") ||
      lowerDesc.includes("market") ||
      lowerDesc.includes("mall")
    ) {
      type = "shopping";
    } else if (
      lowerDesc.includes("transport") ||
      lowerDesc.includes("taxi") ||
      lowerDesc.includes("bus")
    ) {
      type = "transport";
    }

    return {
      time,
      title: title || "Activity",
      location,
      description: description,
      type,
    };
  }

  /**
   * Format itinerary for AI editing
   */
  formatItineraryForAI(itinerary) {
    let formatted = "";

    itinerary.days.forEach((day, dayIndex) => {
      formatted += `Day ${dayIndex + 1} (${day.date}):\n`;
      day.activities.forEach((activity) => {
        formatted += `${activity.time} - ${activity.title}`;
        if (activity.location) formatted += ` (${activity.location})`;
        if (activity.description && activity.description !== activity.title) {
          formatted += ` - ${activity.description}`;
        }
        formatted += `\n`;
      });
      formatted += `\n`;
    });

    return formatted;
  }

  /**
   * Reset conversation history
   */
  resetConversation() {
    this.conversationHistory = [];
  }
}

// Export singleton instance
export const tripPlannerService = new TripPlannerService();
export default tripPlannerService;
