import {
  CONTROLLER_AI_CONFIG,
  RECOMMENDATION_AI_CONFIG,
  PREDEFINED_RESPONSES,
  TRAVEL_INFO_FIELDS,
  TRAVEL_INFO_QUESTIONS,
  MOO_STORY,
  CHATBOT_UI_CONFIG,
} from "../config/chatbot";
import { loadGoogleMaps, isGoogleMapsLoaded } from "../utils/googleMapsLoader";

class MooAgentService {
  constructor() {
    this.controllerApiKey = CONTROLLER_AI_CONFIG.apiKey;
    this.recommendationApiKey = RECOMMENDATION_AI_CONFIG.apiKey;
    this.perplexityApiKey = RECOMMENDATION_AI_CONFIG.apiKey; // Add explicit perplexity key
    this.conversationHistory = [];
    this.gatheringInfo = null; // Track information gathering state
    this.lastRecommendations = null; // Store last recommendations for bucket list
  }

  // Format date range for display
  formatDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startStr = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const endStr = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    if (start.getFullYear() !== end.getFullYear()) {
      return `${start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })} - ${end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    }

    if (start.getMonth() !== end.getMonth()) {
      return `${startStr} - ${endStr}, ${start.getFullYear()}`;
    }

    return `${startStr} - ${endStr}, ${start.getFullYear()}`;
  }

  // Add thinking delay to simulate AI processing
  async addThinkingDelay(responseType = "predefined") {
    const thinkingTimes = CHATBOT_UI_CONFIG.thinkingTime;
    let delay = thinkingTimes.predefined;

    switch (responseType) {
      case "calendar":
        delay = thinkingTimes.calendar;
        break;
      case "aboutMoo":
        delay = thinkingTimes.aboutMoo;
        break;
      case "aiResponse":
        delay = thinkingTimes.aiResponse;
        break;
      case "error":
        delay = thinkingTimes.error;
        break;
      default:
        delay = thinkingTimes.predefined;
    }

    // Add some randomness to make it feel more natural
    const randomVariation = Math.random() * 200 - 100; // ±100ms
    const finalDelay = Math.max(
      thinkingTimes.minimum,
      Math.min(thinkingTimes.maximum, delay + randomVariation)
    );

    await new Promise((resolve) => setTimeout(resolve, finalDelay));
  }

  // Main message processing with structured approach
  async processUserMessage(
    userMessage,
    conversationHistory = [],
    userTrips = [],
    userEvents = [],
    externalConversationState = null
  ) {
    // Use external conversation state if provided, otherwise use internal state
    if (externalConversationState) {
      this.gatheringInfo = externalConversationState;
    }
    try {
      // Simple fallback for empty or invalid messages
      if (
        !userMessage ||
        typeof userMessage !== "string" ||
        userMessage.trim().length === 0
      ) {
        return await this.getDefaultResponse();
      }

      // IMPORTANT: Check if we're in the middle of gathering information first
      if (this.gatheringInfo) {
        // Safety check: if we've been asking the same question repeatedly, reset
        // Normal flow has 5-7 questions, so allow up to 10 to be safe
        if (
          this.gatheringInfo.questionCount &&
          this.gatheringInfo.questionCount > 10
        ) {
          this.resetConversation();
          return await this.getDefaultResponse();
        }

        const result = await this.continueInfoGathering(userMessage, userTrips);
        result.conversationState = this.gatheringInfo;
        return result;
      }

      // Check if we're processing bucket list selection
      if (this.extractedActivities && this.extractedActivities.length > 0) {
        const result = await this.processBucketListSelection(
          userMessage,
          this.extractedActivities
        );

        // Clear extracted activities after processing
        this.extractedActivities = null;

        return result;
      }

      // Detect the type of request
      const requestType = this.detectRequestType(userMessage);

      switch (requestType) {
        case "TRAVEL_ADVICE":
          await this.addThinkingDelay("predefined");
          const travelResponse = await this.handleTravelAdvice(
            userMessage,
            conversationHistory,
            userTrips
          );

          // Include conversation state in response
          travelResponse.conversationState = this.gatheringInfo;
          return travelResponse;

        case "CALENDAR_INFO":
          const calendarResponse = await this.handleCalendarInfo(
            userMessage,
            userTrips,
            userEvents
          );

          return calendarResponse;

        case "ABOUT_MOO":
          const aboutResponse = await this.handleAboutMoo(userMessage);

          return aboutResponse;

        case "CREATE_TRIP":
          return await this.handleCreateTrip(userMessage);

        case "BUCKET_LIST":
          return await this.handleBucketList(
            userMessage,
            this.lastRecommendations
          );

        case "MAIN_MENU":
          return await this.handleMainMenu();

        default:
          return await this.handleUnknownRequest(userMessage);
      }
    } catch (error) {
      return await this.getErrorResponse();
    }
  }

  // Default response for invalid inputs
  async getDefaultResponse() {
    await this.addThinkingDelay("predefined");
    return {
      message: "Hi! 🐄 How can I help you today?",
      options: ["🎯 Get travel advice", "📅 Check my calendar", "🐄 About Moo"],
    };
  }

  // Error response with simple options
  async getErrorResponse() {
    await this.addThinkingDelay("error");
    return {
      message: "Sorry, something went wrong! 😅 Let me help you get started.",
      options: ["🎯 Get travel advice", "📅 Check my calendar", "🐄 About Moo"],
    };
  }

  // Detect what type of request the user is making
  detectRequestType(userMessage) {
    const lowerMessage = userMessage.toLowerCase();

    // Bucket list requests
    if (
      lowerMessage.includes("💾 save to bucket list") ||
      lowerMessage.includes("🪣 save to bucket list") ||
      lowerMessage.includes("save to bucket list") ||
      lowerMessage.includes("bucket list")
    ) {
      return "BUCKET_LIST";
    }

    // Create new trip requests
    if (
      lowerMessage.includes("➕ create new trip") ||
      lowerMessage.includes("create new trip") ||
      lowerMessage.includes("➕ create new event") ||
      lowerMessage.includes("create new event")
    ) {
      return "CREATE_TRIP";
    }

    // Exact button matches first (most specific)
    if (
      lowerMessage.includes("🎯 get travel advice") ||
      lowerMessage.includes("get travel advice") ||
      lowerMessage.includes("🎯 get more travel advice") ||
      lowerMessage.includes("get more travel advice") ||
      lowerMessage.includes("📍 choose from my trips") ||
      lowerMessage.includes("choose from my trips") ||
      lowerMessage.includes("🌍 plan for a new destination") ||
      lowerMessage.includes("plan for a new destination") ||
      lowerMessage.includes("🌍 get general recommendations") ||
      lowerMessage.includes("get general recommendations")
    ) {
      return "TRAVEL_ADVICE";
    }

    if (
      lowerMessage.includes("📅 check my calendar") ||
      lowerMessage.includes("check my calendar") ||
      lowerMessage.includes("🧳 my trips") ||
      lowerMessage.includes("my trips") ||
      lowerMessage.includes("📋 my events") ||
      lowerMessage.includes("my events") ||
      lowerMessage.includes("📊 calendar summary") ||
      lowerMessage.includes("calendar summary") ||
      lowerMessage.includes("🧳 check my trips") ||
      lowerMessage.includes("check my trips") ||
      lowerMessage.includes("📋 check my events") ||
      lowerMessage.includes("check my events") ||
      lowerMessage.includes("🧳 view all trips") ||
      lowerMessage.includes("view all trips") ||
      lowerMessage.includes("📋 view all events") ||
      lowerMessage.includes("view all events")
    ) {
      return "CALENDAR_INFO";
    }

    if (
      lowerMessage.includes("🐄 about moo") ||
      lowerMessage.includes("about moo") ||
      lowerMessage.includes("💬 tell me more about yourself") ||
      lowerMessage.includes("tell me more about yourself") ||
      lowerMessage.includes("🤔 ask something else") ||
      lowerMessage.includes("ask something else")
    ) {
      return "ABOUT_MOO";
    }

    // Back to main menu
    if (
      lowerMessage.includes("🏠 back to main menu") ||
      lowerMessage.includes("back to main menu") ||
      lowerMessage.includes("main menu")
    ) {
      return "MAIN_MENU";
    }

    // Structured recommendation requests from conversation flow
    if (lowerMessage.includes("get travel recommendations for")) {
      return "TRAVEL_ADVICE";
    }

    // General keyword matching (fallback)
    if (
      lowerMessage.includes("travel") ||
      lowerMessage.includes("advice") ||
      lowerMessage.includes("recommendation") ||
      lowerMessage.includes("attraction") ||
      lowerMessage.includes("restaurant") ||
      lowerMessage.includes("activity") ||
      lowerMessage.includes("🎯")
    ) {
      return "TRAVEL_ADVICE";
    }

    if (
      lowerMessage.includes("calendar") ||
      lowerMessage.includes("trip") ||
      lowerMessage.includes("event") ||
      lowerMessage.includes("schedule") ||
      lowerMessage.includes("📅")
    ) {
      return "CALENDAR_INFO";
    }

    if (
      lowerMessage.includes("moo") ||
      lowerMessage.includes("about") ||
      lowerMessage.includes("who are you") ||
      lowerMessage.includes("yourself") ||
      lowerMessage.includes("🐄")
    ) {
      return "ABOUT_MOO";
    }
    return "UNKNOWN";
  }

  // Handle travel advice requests
  async handleTravelAdvice(userMessage, conversationHistory, userTrips) {
    const lowerMessage = userMessage.toLowerCase();

    // Handle "get more travel advice" - always go through questions again for different criteria
    if (
      lowerMessage.includes("get more travel advice") ||
      lowerMessage.includes("🎯 get more travel advice")
    ) {
      // Reset gathering info to start fresh question workflow
      this.gatheringInfo = null;

      // Keep trip context for later use but don't auto-provide recommendations
    } else if (
      lowerMessage.includes("get travel advice") ||
      lowerMessage.includes("🎯 get travel advice")
    ) {
      // For new travel advice requests, always reset
      this.gatheringInfo = null;
    }

    // Check if this is a structured request from the conversation flow
    if (lowerMessage.includes("get travel recommendations for")) {
      // Parse the structured request to extract information
      const parts = userMessage.split(", ");
      let activityType = "activities";
      let timePreference = "any time";
      let budget = "any budget";
      let groupSize = "any group size";
      let preferences = "";

      parts.forEach((part) => {
        if (part.includes("preferred time:")) {
          timePreference = part.split("preferred time:")[1].trim();
        } else if (part.includes("budget:")) {
          budget = part.split("budget:")[1].trim();
        } else if (part.includes("group size:")) {
          groupSize = part.split("group size:")[1].trim();
        } else if (part.includes("specific preferences:")) {
          preferences = part.split("specific preferences:")[1].trim();
        } else if (part.includes("for ") && part.includes("activities")) {
          activityType = part.split("for ")[1].split(" activities")[0].trim();
        }
      });

      // Create a mock gathering info object with the extracted data
      this.gatheringInfo = {
        [TRAVEL_INFO_FIELDS.EVENT_TYPE]: activityType,
        [TRAVEL_INFO_FIELDS.TIME_PREFERENCE]: timePreference,
        [TRAVEL_INFO_FIELDS.BUDGET]: budget,
        [TRAVEL_INFO_FIELDS.NUMBER_OF_PEOPLE]: groupSize,
        [TRAVEL_INFO_FIELDS.ACTIVITY_PREFERENCES]: preferences,
        isNewDestination: true,
        currentField: TRAVEL_INFO_FIELDS.ACTIVITY_PREFERENCES,
      };

      // Directly get recommendations
      return await this.getRecommendations();
    }

    // Check if user wants to plan for a new destination
    const isNewDestination =
      lowerMessage.includes("🌍 plan for a new destination") ||
      lowerMessage.includes("plan for a new destination") ||
      lowerMessage.includes("🌍 get general recommendations") ||
      lowerMessage.includes("get general recommendations");

    // Start new travel advice session
    this.gatheringInfo = {
      [TRAVEL_INFO_FIELDS.TRIP]: null,
      [TRAVEL_INFO_FIELDS.DESTINATION]: null,
      [TRAVEL_INFO_FIELDS.TRIP_DATES]: null,
      [TRAVEL_INFO_FIELDS.DATE_PREFERENCE]: null,
      [TRAVEL_INFO_FIELDS.EVENT_TYPE]: null,
      [TRAVEL_INFO_FIELDS.TIME_PREFERENCE]: null,
      [TRAVEL_INFO_FIELDS.BUDGET]: null,
      [TRAVEL_INFO_FIELDS.NUMBER_OF_PEOPLE]: null,
      [TRAVEL_INFO_FIELDS.ACTIVITY_PREFERENCES]: null,
      currentField: isNewDestination
        ? TRAVEL_INFO_FIELDS.DESTINATION
        : TRAVEL_INFO_FIELDS.TRIP,
      isNewDestination: isNewDestination,
      questionCount: 0, // Track number of questions asked
    };

    if (isNewDestination) {
      // Start with destination question for new destinations
      const question = TRAVEL_INFO_QUESTIONS[TRAVEL_INFO_FIELDS.DESTINATION];
      return {
        message: `🌍 Great! Let's plan your new adventure!\n\n${question.question}`,
        options: question.options,
      };
    } else {
      // Check if we have stored trip context from previous "get more" request
      if (this.lastTripContext) {
        // Pre-populate with stored trip details
        this.gatheringInfo[TRAVEL_INFO_FIELDS.TRIP] =
          this.lastTripContext.tripName;
        this.gatheringInfo.selectedTripDetails = {
          name: this.lastTripContext.tripName,
          destination: this.lastTripContext.destination,
          startDate: "stored", // We don't need exact dates for recommendations
          endDate: "stored",
        };

        // Move to activity type question
        this.gatheringInfo.currentField = TRAVEL_INFO_FIELDS.EVENT_TYPE;
        const question = TRAVEL_INFO_QUESTIONS[TRAVEL_INFO_FIELDS.EVENT_TYPE];

        return {
          message: `🎯 Great! Let's get more recommendations for your ${this.lastTripContext.tripName}!\n\n${question.question}`,
          options: question.options,
        };
      } else {
        // Start with existing trip selection
        return {
          message: PREDEFINED_RESPONSES.TRAVEL_ADVICE_START.content,
          options: PREDEFINED_RESPONSES.TRAVEL_ADVICE_START.options,
        };
      }
    }
  }

  // Continue gathering information for travel advice
  async continueInfoGathering(userMessage, userTrips) {
    await this.addThinkingDelay("predefined");

    const currentField = this.gatheringInfo.currentField;

    // Validate that we have a valid gathering state
    if (!this.gatheringInfo || !currentField) {
      this.gatheringInfo = null;
      return await this.getDefaultResponse();
    }

    // Handle any user response and move to next question
    // Store the user's response regardless of format
    this.gatheringInfo[currentField] = userMessage;

    // Special handling for "Choose from my trips"
    if (
      currentField === TRAVEL_INFO_FIELDS.TRIP &&
      (userMessage.toLowerCase().includes("choose from my trips") ||
        userMessage.toLowerCase().includes("📍 choose from my trips"))
    ) {
      if (!userTrips || userTrips.length === 0) {
        // Reset gathering state since we can't continue without trips
        this.gatheringInfo = null;
        return {
          message:
            "🧳 You don't have any trips saved yet!\n\nI'd love to help you plan a new trip. Would you like to create one first, or get general travel recommendations?",
          options: [
            "➕ Create new trip",
            "🌍 Get general recommendations",
            "🏠 Back to main menu",
          ],
        };
      } else {
        // Show available trips for selection
        let message = "🧳 Great! Here are your saved trips:\n\n";
        const tripOptions = [];

        userTrips.forEach((trip, index) => {
          message += `${index + 1}. **${trip.name}**\n`;
          message += `   📍 ${trip.destination}\n`;
          message += `   📅 ${this.formatDateRange(
            trip.startDate,
            trip.endDate
          )}\n\n`;

          // Create option for each trip
          tripOptions.push(`${index + 1}. ${trip.name}`);
        });

        message += "Which trip would you like recommendations for?";

        return {
          message: message,
          options: tripOptions.slice(0, 4), // Limit to 4 options for UI
        };
      }
    }

    // Special handling for "Plan for a new destination" - restart with destination flow
    const lowerMessage = userMessage.toLowerCase();
    if (
      lowerMessage.includes("🌍 plan for a new destination") ||
      lowerMessage.includes("plan for a new destination") ||
      lowerMessage.includes("🌍 get general recommendations") ||
      lowerMessage.includes("get general recommendations")
    ) {
      // Reset and start new destination flow
      this.gatheringInfo = {
        [TRAVEL_INFO_FIELDS.TRIP]: null,
        [TRAVEL_INFO_FIELDS.DESTINATION]: null,
        [TRAVEL_INFO_FIELDS.TRIP_DATES]: null,
        [TRAVEL_INFO_FIELDS.DATE_PREFERENCE]: null,
        [TRAVEL_INFO_FIELDS.EVENT_TYPE]: null,
        [TRAVEL_INFO_FIELDS.TIME_PREFERENCE]: null,
        [TRAVEL_INFO_FIELDS.BUDGET]: null,
        [TRAVEL_INFO_FIELDS.NUMBER_OF_PEOPLE]: null,
        [TRAVEL_INFO_FIELDS.ACTIVITY_PREFERENCES]: null,
        currentField: TRAVEL_INFO_FIELDS.DESTINATION,
        isNewDestination: true,
      };

      // Start with destination question
      const question = TRAVEL_INFO_QUESTIONS[TRAVEL_INFO_FIELDS.DESTINATION];
      return {
        message: `🌍 Great! Let's plan your new adventure!\n\n${question.question}`,
        options: question.options,
      };
    }

    // Handle trip selection from the list
    if (
      currentField === TRAVEL_INFO_FIELDS.TRIP &&
      userTrips &&
      userTrips.length > 0
    ) {
      // Check if user selected a trip by number or name
      let selectedTrip = null;

      // Try to match by number (e.g., "1. Trip Name" or just "1")
      const numberMatch = userMessage.match(/^(\d+)\.?\s*/);
      if (numberMatch) {
        const tripIndex = parseInt(numberMatch[1]) - 1;
        if (tripIndex >= 0 && tripIndex < userTrips.length) {
          selectedTrip = userTrips[tripIndex];
        }
      }

      // Try to match by trip name if no number match
      if (!selectedTrip) {
        selectedTrip = userTrips.find((trip) =>
          userMessage.toLowerCase().includes(trip.name.toLowerCase())
        );
      }

      if (selectedTrip) {
        // Store the selected trip and extract its details
        this.gatheringInfo[currentField] = selectedTrip.name;
        this.gatheringInfo.selectedTripDetails = {
          name: selectedTrip.name,
          destination: selectedTrip.destination,
          startDate: selectedTrip.startDate,
          endDate: selectedTrip.endDate,
        };

        // IMPORTANT: Set the current field to EVENT_TYPE so the next response is handled correctly
        this.gatheringInfo.currentField = TRAVEL_INFO_FIELDS.EVENT_TYPE;

        // Confirm the selection and show trip details
        return {
          message: `Perfect! I'll help you with recommendations for **${
            selectedTrip.name
          }**.\n\n📍 **Destination:** ${
            selectedTrip.destination
          }\n📅 **Dates:** ${this.formatDateRange(
            selectedTrip.startDate,
            selectedTrip.endDate
          )}\n\nWhat type of activity are you looking for?`,
          options: TRAVEL_INFO_QUESTIONS[TRAVEL_INFO_FIELDS.EVENT_TYPE].options,
        };
      }
    }

    // Special handling for activity type selections
    if (currentField === TRAVEL_INFO_FIELDS.EVENT_TYPE) {
      // Handle "Other" activity type selection - ask for more details
      if (
        userMessage.toLowerCase().includes("other") ||
        userMessage.toLowerCase().includes("🛍️ other")
      ) {
        // Store "Other" and ask for specifics
        this.gatheringInfo[currentField] = "Other";
        return {
          message:
            "Great! I'd love to help you with something specific. What type of activity are you interested in?\n\nFor example:\n• Museums or art galleries\n• Shopping or markets\n• Nightlife or bars\n• Outdoor activities or sports\n• Cultural experiences\n• Wellness or spa\n• Photography spots\n\nPlease tell me what you have in mind!",
          options: [], // Open-ended response
        };
      }

      // Accept ANY user input for activity type - no validation needed
      // The user knows what they want better than our validation logic
    }

    // Move to next field - different order for new destinations vs existing trips
    let fieldOrder;
    if (this.gatheringInfo.isNewDestination) {
      fieldOrder = [
        TRAVEL_INFO_FIELDS.DESTINATION,
        TRAVEL_INFO_FIELDS.TRIP_DATES,
        TRAVEL_INFO_FIELDS.EVENT_TYPE,
        TRAVEL_INFO_FIELDS.TIME_PREFERENCE,
        TRAVEL_INFO_FIELDS.BUDGET,
        TRAVEL_INFO_FIELDS.NUMBER_OF_PEOPLE,
        TRAVEL_INFO_FIELDS.ACTIVITY_PREFERENCES,
      ];
    } else if (this.gatheringInfo.selectedTripDetails) {
      // Skip DATE_PREFERENCE when we have trip details already
      fieldOrder = [
        TRAVEL_INFO_FIELDS.TRIP,
        TRAVEL_INFO_FIELDS.EVENT_TYPE,
        TRAVEL_INFO_FIELDS.TIME_PREFERENCE,
        TRAVEL_INFO_FIELDS.BUDGET,
        TRAVEL_INFO_FIELDS.NUMBER_OF_PEOPLE,
        TRAVEL_INFO_FIELDS.ACTIVITY_PREFERENCES,
      ];
    } else {
      fieldOrder = [
        TRAVEL_INFO_FIELDS.TRIP,
        TRAVEL_INFO_FIELDS.DATE_PREFERENCE,
        TRAVEL_INFO_FIELDS.EVENT_TYPE,
        TRAVEL_INFO_FIELDS.TIME_PREFERENCE,
        TRAVEL_INFO_FIELDS.BUDGET,
        TRAVEL_INFO_FIELDS.NUMBER_OF_PEOPLE,
        TRAVEL_INFO_FIELDS.ACTIVITY_PREFERENCES,
      ];
    }

    const currentIndex = fieldOrder.indexOf(currentField);

    if (currentIndex < fieldOrder.length - 1) {
      // Ask next question
      const nextField = fieldOrder[currentIndex + 1];
      this.gatheringInfo.currentField = nextField;

      const question = TRAVEL_INFO_QUESTIONS[nextField];
      if (!question) {
        this.gatheringInfo = null;
        return await this.getDefaultResponse();
      }

      // Increment question counter
      this.gatheringInfo.questionCount =
        (this.gatheringInfo.questionCount || 0) + 1;

      return {
        message: question.question,
        options: question.options,
      };
    } else {
      // All information gathered, get recommendations
      return await this.getRecommendations();
    }
  }

  // Get recommendations from Perplexity AI
  async getRecommendations() {
    try {
      // Add thinking delay for AI processing
      await this.addThinkingDelay("aiResponse");

      const info = this.gatheringInfo;

      // Build prompt for Perplexity
      let prompt = `Find travel recommendations for: `;

      // Handle destination vs existing trip
      if (info.isNewDestination) {
        prompt += `Destination: ${info[TRAVEL_INFO_FIELDS.DESTINATION]}, `;
        if (info[TRAVEL_INFO_FIELDS.TRIP_DATES]) {
          prompt += `Travel dates: ${info[TRAVEL_INFO_FIELDS.TRIP_DATES]}, `;
        }
      } else if (info.selectedTripDetails) {
        // Use trip details when available
        prompt += `Trip: ${info.selectedTripDetails.name}, `;
        prompt += `Destination: ${info.selectedTripDetails.destination}, `;
        prompt += `Travel dates: ${info.selectedTripDetails.startDate} to ${info.selectedTripDetails.endDate}, `;
      } else {
        prompt += `Trip: ${info[TRAVEL_INFO_FIELDS.TRIP]}, `;
        if (info[TRAVEL_INFO_FIELDS.DATE_PREFERENCE]) {
          prompt += `Date preference: ${
            info[TRAVEL_INFO_FIELDS.DATE_PREFERENCE]
          }, `;
        }
      }

      prompt += `Activity type: ${info[TRAVEL_INFO_FIELDS.EVENT_TYPE]}, `;
      prompt += `Time preference: ${
        info[TRAVEL_INFO_FIELDS.TIME_PREFERENCE]
      }, `;

      if (
        info[TRAVEL_INFO_FIELDS.BUDGET] &&
        !info[TRAVEL_INFO_FIELDS.BUDGET].includes("Skip")
      ) {
        prompt += `Budget: ${info[TRAVEL_INFO_FIELDS.BUDGET]}, `;
      }

      if (
        info[TRAVEL_INFO_FIELDS.NUMBER_OF_PEOPLE] &&
        !info[TRAVEL_INFO_FIELDS.NUMBER_OF_PEOPLE].includes("Skip")
      ) {
        prompt += `Group size: ${info[TRAVEL_INFO_FIELDS.NUMBER_OF_PEOPLE]}, `;
      }

      if (info[TRAVEL_INFO_FIELDS.ACTIVITY_PREFERENCES]) {
        prompt += `Specific preferences: ${
          info[TRAVEL_INFO_FIELDS.ACTIVITY_PREFERENCES]
        }, `;
      }

      prompt += `Please provide 3-5 specific recommendations with brief descriptions. For each attraction, restaurant, or activity, include relevant website links or official pages where available. When including links, please format them as plain URLs on separate lines after each recommendation (e.g., "Website: https://example.com").`;

      const response = await fetch(
        `${RECOMMENDATION_AI_CONFIG.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.recommendationApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: RECOMMENDATION_AI_CONFIG.model,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            max_tokens: RECOMMENDATION_AI_CONFIG.maxTokens,
            temperature: RECOMMENDATION_AI_CONFIG.temperature,
            stream: false,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data = await response.json();
      let recommendations = data.choices[0].message.content;

      // Process the recommendations to make links clickable
      recommendations = this.processRecommendationLinks(recommendations);

      // Store recommendations for bucket list processing
      this.lastRecommendations = recommendations;

      // Store trip context for "get more" requests
      this.lastTripContext = {
        originalPrompt: prompt,
        tripName:
          info.selectedTripDetails?.name ||
          info[TRAVEL_INFO_FIELDS.TRIP] ||
          info[TRAVEL_INFO_FIELDS.DESTINATION],
        destination:
          info.selectedTripDetails?.destination ||
          info[TRAVEL_INFO_FIELDS.DESTINATION],
        activityType: info[TRAVEL_INFO_FIELDS.EVENT_TYPE],
        timePreference: info[TRAVEL_INFO_FIELDS.TIME_PREFERENCE],
        budget: info[TRAVEL_INFO_FIELDS.BUDGET],
        groupSize: info[TRAVEL_INFO_FIELDS.NUMBER_OF_PEOPLE],
        preferences: info[TRAVEL_INFO_FIELDS.ACTIVITY_PREFERENCES],
        timestamp: new Date(),
      };

      // Reset gathering state
      this.gatheringInfo = null;

      return {
        message: `🎯 Here are my recommendations for you:\n\n${recommendations}\n\nWould you like to save any of these activities to your bucket list?`,
        options: [
          "💾 Save to Bucket List",
          "🎯 Get more travel advice",
          "📅 Check my calendar",
          "🐄 About Moo",
        ],
        recommendations: recommendations, // Store recommendations for bucket list processing
      };
    } catch (error) {
      this.gatheringInfo = null;

      await this.addThinkingDelay("error");
      return {
        message:
          "Sorry, I had trouble getting recommendations right now. 😅 Would you like to try again?",
        options: PREDEFINED_RESPONSES.TRAVEL_ADVICE_START.options,
      };
    }
  }

  // Handle calendar information requests
  async handleCalendarInfo(userMessage, userTrips, userEvents) {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes("trip")) {
      return await this.getTripsInfo(userTrips);
    } else if (lowerMessage.includes("event")) {
      return await this.getEventsInfo(userEvents);
    } else if (lowerMessage.includes("summary")) {
      return await this.getCalendarSummary(userTrips, userEvents);
    } else {
      await this.addThinkingDelay("calendar");
      return {
        message: PREDEFINED_RESPONSES.CALENDAR_INFO.content,
        options: PREDEFINED_RESPONSES.CALENDAR_INFO.options,
      };
    }
  }

  // Get trips information
  async getTripsInfo(userTrips) {
    await this.addThinkingDelay("calendar");

    if (!userTrips || userTrips.length === 0) {
      return {
        message:
          "🧳 You don't have any trips saved yet!\n\nWould you like me to help you plan a new trip?",
        options: [
          "🎯 Get travel advice",
          "➕ Create new trip",
          "🏠 Back to main menu",
        ],
      };
    }

    let message = "🧳 Here are your saved trips:\n\n";
    userTrips.forEach((trip, index) => {
      message += `${index + 1}. **${trip.name}**\n`;
      message += `   📅 ${this.formatDateRange(
        trip.startDate,
        trip.endDate
      )}\n`;
      message += `   📍 ${trip.destination}\n\n`;
    });

    return {
      message: message + "What would you like to do next?",
      options: [
        "📋 Check my events",
        "🎯 Get travel advice",
        "🏠 Back to main menu",
      ],
    };
  }

  // Get events information
  async getEventsInfo(userEvents) {
    await this.addThinkingDelay("calendar");

    if (!userEvents || userEvents.length === 0) {
      return {
        message:
          "📋 You don't have any events scheduled yet!\n\nWould you like me to help you plan some activities?",
        options: [
          "🎯 Get travel advice",
          "➕ Create new event",
          "🏠 Back to main menu",
        ],
      };
    }

    let message = "📋 Here are your upcoming events:\n\n";
    userEvents.slice(0, 5).forEach((event, index) => {
      message += `${index + 1}. **${event.name}**\n`;
      message += `   📅 ${new Date(event.startTime).toLocaleDateString()}\n`;
      message += `   🕐 ${new Date(event.startTime).toLocaleTimeString()}\n`;
      if (event.location) message += `   📍 ${event.location}\n`;
      message += `\n`;
    });

    if (userEvents.length > 5) {
      message += `... and ${userEvents.length - 5} more events\n\n`;
    }

    return {
      message: message + "What would you like to do next?",
      options: [
        "🧳 Check my trips",
        "🎯 Get travel advice",
        "🏠 Back to main menu",
      ],
    };
  }

  // Get calendar summary
  async getCalendarSummary(userTrips, userEvents) {
    await this.addThinkingDelay("calendar");

    const tripCount = userTrips ? userTrips.length : 0;
    const eventCount = userEvents ? userEvents.length : 0;

    let message = "📊 **Your Calendar Summary**\n\n";
    message += `🧳 **Trips:** ${tripCount}\n`;
    message += `📋 **Events:** ${eventCount}\n\n`;

    if (tripCount > 0) {
      const nextTrip = userTrips.find(
        (trip) => new Date(trip.startDate) > new Date()
      );
      if (nextTrip) {
        message += `🎯 **Next Trip:** ${nextTrip.name}\n`;
        message += `📅 **Departure:** ${nextTrip.startDate}\n\n`;
      }
    }

    return {
      message: message + "What would you like to explore?",
      options: [
        "🧳 View all trips",
        "📋 View all events",
        "🎯 Get travel advice",
      ],
    };
  }

  // Handle questions about Moo
  async handleAboutMoo(userMessage) {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes("more") || lowerMessage.includes("tell me")) {
      await this.addThinkingDelay("aboutMoo");
      return {
        message: `${MOO_STORY.PERSONALITY}\n\n${MOO_STORY.PURPOSE}\n\n${MOO_STORY.CAPABILITIES}`,
        options: [
          "🎯 Get travel advice",
          "📅 Check my calendar",
          "🤔 Ask something else",
        ],
      };
    } else {
      await this.addThinkingDelay("aboutMoo");
      return {
        message: PREDEFINED_RESPONSES.ABOUT_MOO.content,
        options: PREDEFINED_RESPONSES.ABOUT_MOO.options,
      };
    }
  }

  // Handle create trip requests
  async handleCreateTrip(userMessage) {
    await this.addThinkingDelay("predefined");

    const isEvent = userMessage.toLowerCase().includes("create new event");

    if (isEvent) {
      return {
        message:
          "📋 I'd love to help you create a new event!\n\nTo create an event, you can use the Events panel on the right side of the screen. Click the '+ Add Event' button to get started.\n\nOnce you have some events, I can help you with recommendations and planning!",
        options: [
          "🎯 Get travel advice",
          "📅 Check my calendar",
          "🏠 Back to main menu",
        ],
      };
    } else {
      return {
        message:
          "🧳 I'd love to help you create a new trip!\n\nTo create a trip, you can use the Trips panel on the right side of the screen. Click the '+ Add Trip' button to get started.\n\nOnce you have a trip set up, I can provide personalized recommendations for your destination!",
        options: [
          "🎯 Get travel advice",
          "📅 Check my calendar",
          "🏠 Back to main menu",
        ],
      };
    }
  }

  // Handle bucket list requests
  async handleBucketList(userMessage, lastRecommendations) {
    await this.addThinkingDelay("aiResponse");

    if (!lastRecommendations) {
      return {
        message:
          "I don't have any recent recommendations to save. Would you like me to get some travel advice first?",
        options: [
          "🎯 Get travel advice",
          "📅 Check my calendar",
          "🏠 Back to main menu",
        ],
      };
    }

    try {
      // STEP 1: Use Controller AI to extract activities from Perplexity recommendations
      const extractPrompt = `Parse this text and extract places/activities as JSON array:

${lastRecommendations}

Return format:
[{"name":"Place Name","type":"restaurant","description":"Brief description"}]

Types: restaurant, attraction, activity, shopping, entertainment, cultural, outdoor, other

JSON only:`;

      const response = await fetch(
        `${CONTROLLER_AI_CONFIG.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.controllerApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: CONTROLLER_AI_CONFIG.model,
            messages: [
              {
                role: "user",
                content: extractPrompt,
              },
            ],
            max_tokens: 1000,
            temperature: 0.1,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Controller AI error: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      let extractedContent = data.choices[0].message.content.trim();

      // More robust JSON cleaning
      extractedContent = extractedContent
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .replace(/^[^[{]*/, "")
        .replace(/[^}\]]*$/, "")
        .replace(/,\s*}/g, "}") // Remove trailing commas before }
        .replace(/,\s*]/g, "]"); // Remove trailing commas before ]

      let activities;
      try {
        activities = JSON.parse(extractedContent);
      } catch (parseError) {
        // IMPROVED FALLBACK: Extract activities manually from the recommendations text
        activities = this.manuallyExtractActivities(lastRecommendations);
      }

      if (!Array.isArray(activities) || activities.length === 0) {
        throw new Error("No valid activities extracted");
      }

      // Store extracted activities for later processing
      this.extractedActivities = activities;

      // STEP 2: Present activities to user for selection
      let message = `🎯 Great! I found ${activities.length} recommendations to save:\n\n`;
      activities.forEach((activity, index) => {
        message += `${index + 1}. **${activity.name}**\n`;
        if (activity.description) {
          message += `   ${activity.description.substring(0, 80)}${
            activity.description.length > 80 ? "..." : ""
          }\n`;
        }
        message += `\n`;
      });

      message += `Which ones would you like to save to your bucket list?\n\nYou can:\n• Type numbers (e.g., "1, 3, 5")\n• Type "all" to save everything\n• Type "cancel" to skip`;

      return {
        message: message,
        options: [], // Allow free text input for selection
        extractedActivities: activities,
      };
    } catch (error) {
      // FALLBACK: Create a simple activity from the recommendations text
      try {
        // Simple fallback: create one generic activity from the recommendations
        const fallbackActivities = [
          {
            name: "Travel Recommendations",
            type: "activity",
            description:
              lastRecommendations.substring(0, 200) +
              (lastRecommendations.length > 200 ? "..." : ""),
          },
        ];

        this.extractedActivities = fallbackActivities;

        return {
          message: `I found some recommendations to save! Since I had trouble parsing the details, I've created a general item:\n\n1. **Travel Recommendations**\n   ${fallbackActivities[0].description}\n\nWould you like to save this to your bucket list?\n\nType "1" to save it, or "cancel" to skip.`,
          options: [],
          extractedActivities: fallbackActivities,
        };
      } catch (fallbackError) {
        return {
          message:
            "Sorry, I had trouble processing the recommendations. The format might be unexpected. Would you like to try getting new recommendations?",
          options: [
            "🎯 Get travel advice",
            "📅 Check my calendar",
            "🏠 Back to main menu",
          ],
        };
      }
    }
  }

  // Validate processed data quality
  validateProcessedData(data, activityName) {
    // Check if essential fields are present and not generic
    const hasValidDescription =
      data.description &&
      data.description !== "Not specified" &&
      data.description.length > 10; // More lenient length requirement

    const hasValidLocation =
      (data.country && data.country !== "Not specified") ||
      (data.city && data.city !== "Not specified") ||
      (data.location && data.location !== "Not specified");

    const hasValidCost =
      data.estimatedCost &&
      data.estimatedCost !== "Not specified" &&
      data.estimatedCost !== "Cost varies";

    const hasValidHours =
      data.openHours &&
      data.openHours !== "Not specified" &&
      data.openHours !== "Hours vary";

    const hasValidLink = data.link && data.link.startsWith("http");

    // At least 2 out of 5 key fields should be valid (more lenient)
    const validFields = [
      hasValidDescription,
      hasValidLocation,
      hasValidCost,
      hasValidHours,
      hasValidLink,
    ].filter(Boolean).length;
    const isValid = validFields >= 2;

    return isValid;
  }

  // Extract cost rating from Controller AI response text
  extractCostFromText(text) {
    // Look for star patterns
    const starMatch = text.match(/[★☆]{5}/);
    if (starMatch) {
      return starMatch[0];
    }

    // Look for price ranges and convert to stars
    if (text.match(/under.*\$20|very.*budget|cheap/i)) {
      return "★☆☆☆☆";
    } else if (text.match(/\$20.*40|budget/i)) {
      return "★★☆☆☆";
    } else if (text.match(/\$40.*80|moderate/i)) {
      return "★★★☆☆";
    } else if (text.match(/\$80.*150|expensive/i)) {
      return "★★★★☆";
    } else if (text.match(/over.*\$150|very.*expensive|luxury/i)) {
      return "★★★★★";
    }

    return "★★★☆☆"; // Default to 3 stars
  }

  // Extract hours from Perplexity text
  extractHoursFromText(text) {
    // Find all time patterns (e.g., 7:00 AM, 11:00 PM, 12:00, etc.)
    const timeMatches = text.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?/g);

    if (timeMatches && timeMatches.length >= 2) {
      // Convert times to 24-hour format for comparison
      const convertTo24Hour = (timeStr) => {
        let [time, period] = timeStr.split(/\s*(AM|PM|am|pm)/);
        let [hours, minutes] = time.split(":");
        hours = parseInt(hours);
        minutes = parseInt(minutes) || 0;

        if (period && period.toLowerCase() === "pm" && hours !== 12) {
          hours += 12;
        } else if (period && period.toLowerCase() === "am" && hours === 12) {
          hours = 0;
        }

        return hours * 60 + minutes; // Return minutes since midnight
      };

      const timeValues = timeMatches.map((t) => ({
        original: t,
        minutes: convertTo24Hour(t),
      }));

      // Find earliest and latest times
      const earliest = timeValues.reduce((min, curr) =>
        curr.minutes < min.minutes ? curr : min
      );
      const latest = timeValues.reduce((max, curr) =>
        curr.minutes > max.minutes ? curr : max
      );

      // Format back to readable format
      const formatTime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, "0")}:${mins
          .toString()
          .padStart(2, "0")}`;
      };

      return `Open Hour: ${formatTime(
        earliest.minutes
      )}; Close Hour: ${formatTime(latest.minutes)} (reference only)`;
    }

    return "Not specified";
  }

  // Get the current trip destination from gathering info
  getCurrentDestination() {
    const destination =
      this.gatheringInfo?.destination ||
      this.gatheringInfo?.selectedTripDetails?.destination;

    if (!destination) {
      return { country: "Not specified", city: "Not specified" };
    }

    return this.parseDestination(destination);
  }

  // Enhanced destination parsing that can work with activity names and locations
  parseDestination(text) {
    if (!text) {
      return { country: "Not specified", city: "Not specified" };
    }

    // Parse common destinations
    const lowerText = text.toLowerCase();

    if (lowerText.includes("hong kong")) {
      return { country: "Hong Kong", city: "Hong Kong" };
    } else if (lowerText.includes("singapore")) {
      return { country: "Singapore", city: "Singapore" };
    } else if (lowerText.includes("tokyo")) {
      return { country: "Japan", city: "Tokyo" };
    } else if (lowerText.includes("seoul")) {
      return { country: "South Korea", city: "Seoul" };
    } else if (lowerText.includes("bangkok")) {
      return { country: "Thailand", city: "Bangkok" };
    } else if (lowerText.includes("kuala lumpur")) {
      return { country: "Malaysia", city: "Kuala Lumpur" };
    } else if (lowerText.includes("manila")) {
      return { country: "Philippines", city: "Manila" };
    } else if (lowerText.includes("jakarta")) {
      return { country: "Indonesia", city: "Jakarta" };
    } else if (
      lowerText.includes("vietnam") ||
      lowerText.includes("ho chi minh")
    ) {
      return { country: "Vietnam", city: "Ho Chi Minh City" };
    } else if (lowerText.includes("hanoi")) {
      return { country: "Vietnam", city: "Hanoi" };
    } else if (lowerText.includes("macau") || lowerText.includes("macao")) {
      return { country: "Macau", city: "Macau" };
    } else if (lowerText.includes("taiwan") || lowerText.includes("taipei")) {
      return { country: "Taiwan", city: "Taipei" };
    } else if (lowerText.includes("shanghai")) {
      return { country: "China", city: "Shanghai" };
    } else if (lowerText.includes("beijing")) {
      return { country: "China", city: "Beijing" };
    } else if (lowerText.includes("osaka")) {
      return { country: "Japan", city: "Osaka" };
    } else if (lowerText.includes("kyoto")) {
      return { country: "Japan", city: "Kyoto" };
    } else if (lowerText.includes("busan")) {
      return { country: "South Korea", city: "Busan" };
    } else {
      // For other destinations, use the destination as both country and city
      return { country: text, city: text };
    }
  }

  // Extract country and city from activity name and location
  extractLocationFromActivity(activityName, location) {
    // Combine activity name and location for parsing
    const combinedText = `${activityName} ${location || ""}`;

    // Try to parse from the combined text
    const parsed = this.parseDestination(combinedText);

    // If we got something other than the raw text, return it
    if (parsed.country !== combinedText && parsed.country !== "Not specified") {
      return parsed;
    }

    // Fallback: try just the location
    if (location) {
      const locationParsed = this.parseDestination(location);
      if (
        locationParsed.country !== location &&
        locationParsed.country !== "Not specified"
      ) {
        return locationParsed;
      }
    }

    // Final fallback
    return { country: "Not specified", city: "Not specified" };
  }

  // Extract data from text when JSON parsing fails
  extractDataFromText(text, activityName) {
    // Clean citation numbers and asterisks from the entire text first
    const cleanText = text.replace(/\[\d+\]/g, "").replace(/\*\*/g, "");

    const data = {};

    // Extract description - look for various patterns
    let descMatch = cleanText.match(
      /is an?\s+([^.]*(?:restaurant|buffet|hotel|attraction|place)[^.]*\.)/i
    );

    if (!descMatch) {
      // Try to find description starting with the place name
      const escapedActivityName = activityName.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      descMatch = cleanText.match(
        new RegExp(`${escapedActivityName}[^.]*is[^.]*\\.`, "i")
      );
    }

    if (!descMatch) {
      // Look for any descriptive sentence about the place
      descMatch = cleanText.match(
        /[^.]*(?:restaurant|buffet|hotel|attraction|center|mall|market|temple|museum)[^.]*\./i
      );
    }

    if (descMatch) {
      data.description = descMatch[0].trim();
    }

    // Extract pricing - look for various pricing patterns
    let pricingMatch =
      cleanText.match(
        /(moderate|expensive|cheap|affordable|budget|high-end|luxury|premium).*?pricing/i
      ) ||
      cleanText.match(/(inexpensive|costly|reasonable|fair).*?price/i) ||
      cleanText.match(
        /price.*?(moderate|expensive|cheap|affordable|budget|high-end|luxury|premium)/i
      );

    if (pricingMatch) {
      data.estimatedCost = pricingMatch[0].trim();
    } else {
      // Try to find specific pricing
      const dinnerMatch = cleanText.match(/Dinner buffet:\s*HK\$(\d+)/i);
      const lunchAdultMatch = cleanText.match(
        /Lunch buffet:\s*HK\$(\d+)\s*\(adult\)/i
      );
      const lunchChildMatch = cleanText.match(/HK\$(\d+)\s*\(child\)/i);
      const brunchWithMatch = cleanText.match(
        /Sunday Grand Brunch:\s*HK\$(\d+)\s*with/i
      );
      const brunchWithoutMatch = cleanText.match(/HK\$(\d+)\s*without/i);

      if (dinnerMatch && lunchAdultMatch && brunchWithMatch) {
        const dinner = dinnerMatch[1];
        const lunchAdult = lunchAdultMatch[1];
        const lunchChild = lunchChildMatch ? lunchChildMatch[1] : "";
        const brunchWith = brunchWithMatch[1];
        const brunchWithout = brunchWithoutMatch ? brunchWithoutMatch[1] : "";

        data.estimatedCost = `Dinner: ${dinner}; Lunch: ${lunchAdult}${
          lunchChild ? "/" + lunchChild : ""
        }; Sunday Brunch: ${brunchWith}${
          brunchWithout ? "/" + brunchWithout : ""
        }`;
      }
    }

    // Extract operating hours - look for various hour patterns
    let hoursMatch = cleanText.match(
      /Daily from ([\d:]+\s*[AP]M) to ([\d:]+\s*[AP]M)/i
    );

    if (hoursMatch) {
      data.openHours = `Daily from ${hoursMatch[1]} to ${hoursMatch[2]}`;
    } else {
      // Try to find structured hours data
      const mondayFridayMatch = cleanText.match(
        /Monday to Friday:\s*-\s*Lunch:\s*([\d:]+)\s*-\s*([\d:]+)\s*-\s*Dinner:\s*([\d:]+)\s*-\s*([\d:]+)/i
      );
      const weekendMatch = cleanText.match(
        /Saturday, Sunday, and Public Holidays:\s*-\s*Lunch:\s*([\d:]+)\s*-\s*([\d:]+)\s*-\s*Afternoon session:\s*([\d:]+)\s*-\s*([\d:]+)\s*-\s*Dinner:\s*([\d:]+)\s*-\s*([\d:]+)/i
      );

      if (mondayFridayMatch && weekendMatch) {
        const mfLunchStart = mondayFridayMatch[1];
        const mfLunchEnd = mondayFridayMatch[2];
        const mfDinnerStart = mondayFridayMatch[3];
        const mfDinnerEnd = mondayFridayMatch[4];

        const weLunchStart = weekendMatch[1];
        const weLunchEnd = weekendMatch[2];
        const weAfternoonStart = weekendMatch[3];
        const weAfternoonEnd = weekendMatch[4];
        const weDinnerStart = weekendMatch[5];
        const weDinnerEnd = weekendMatch[6];

        data.openHours = `Mon-Fri: ${mfLunchStart}-${mfLunchEnd}, ${mfDinnerStart}-${mfDinnerEnd}; Weekend/Public Holiday: ${weLunchStart}-${weLunchEnd}, ${weAfternoonStart}-${weAfternoonEnd}, ${weDinnerStart}-${weDinnerEnd}`;
      }
    }

    // Extract website URL - improved pattern to capture various URL formats
    let website = "";

    // Try multiple patterns to capture URLs (excluding commas)
    const urlPatterns = [
      /https?:\/\/[^\s\],]+/i, // Standard http/https URLs (stop at space, ], or comma)
      /www\.[^\s\],]+/i, // URLs starting with www. (stop at space, ], or comma)
    ];

    for (const pattern of urlPatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        website = match[0]
          .replace(/[[\d\]]+$/, "") // Remove trailing [D] citations
          .replace(/[.*,]+$/, "") // Remove trailing dots, asterisks, and commas (commas never appear in URLs)
          .trim();

        // If www. URL, add https:// prefix
        if (website.startsWith("www.") && !website.startsWith("http")) {
          website = "https://" + website;
        }

        data.link = website;
        break; // Use the first URL found
      }
    }

    // Extract address/location - look for various address patterns
    const locationMatch =
      cleanText.match(/\d+[^\n,]*floor[^,]*,[^,]*[^,]*Hong Kong/i) ||
      cleanText.match(/\d+\/F[^,]*,[^,]*,[^,]*Hong Kong/i) ||
      cleanText.match(
        /\d+\s+[^,]+(?:Road|Street|Avenue|Lane|Drive)[^,]*,[^,]*Hong Kong/i
      ) ||
      cleanText.match(
        /[^,]*(?:Centre|Center|Building|Tower|Plaza|Mall)[^,]*,[^,]*Hong Kong/i
      ) ||
      cleanText.match(/[^,]*,[^,]*Hong Kong/i);
    if (locationMatch) {
      data.location = locationMatch[0].trim();
    }

    // Extract country and city from activity name first, then fallback to context
    const extractedLocation = this.extractLocationFromActivity(
      activityName,
      ""
    );
    const currentDestination = this.getCurrentDestination();

    data.country =
      extractedLocation.country !== "Not specified"
        ? extractedLocation.country
        : currentDestination.country;
    data.city =
      extractedLocation.city !== "Not specified"
        ? extractedLocation.city
        : currentDestination.city;

    // If we found some data, use it
    if (Object.keys(data).length > 2) {
      // More than just country/city
      return data;
    }
    return {
      country: currentDestination.country,
      city: currentDestination.city,
      description: `Information about ${activityName}`,
      estimatedCost: "Cost varies",
      openHours: "Hours vary",
      link: "",
      location: "Location not specified",
    };
  }

  // Get more recommendations for the same trip without re-asking questions
  async getMoreRecommendationsForSameTrip() {
    try {
      if (!this.lastTripContext) {
        throw new Error("No previous trip context found");
      }

      // Use the same trip context but ask for different/additional recommendations
      const enhancedPrompt = `${this.lastTripContext.originalPrompt}

Please provide 3-4 DIFFERENT recommendations from your previous suggestions. Focus on:
- Alternative attractions or activities
- Hidden gems or local favorites  
- Different types of experiences (if previous were museums, suggest outdoor activities, etc.)
- Different areas or neighborhoods to explore

Format your response exactly like before with numbered items and brief descriptions.`;

      const recommendations = await this.fetchRecommendationsWithPrompt(
        enhancedPrompt
      );

      // Store the new recommendations
      this.lastRecommendations = recommendations;

      // Keep the trip context for future "get more" requests

      // Extract activities from the new recommendations
      const activities = this.manuallyExtractActivities(recommendations);

      if (activities && activities.length > 0) {
        // Store for bucket list processing
        this.lastExtractedActivities = activities;

        return {
          message: `🎯 Here are some different recommendations for your ${this.lastTripContext.tripName}:\n\n${recommendations}\n\nWould you like to save any of these activities to your bucket list?`,
          options: [
            "💾 Save to Bucket List",
            "🎯 Get more travel advice",
            "📅 Check my calendar",
            "🐄 About Moo",
          ],
        };
      } else {
        throw new Error("Could not extract activities from recommendations");
      }
    } catch (error) {
      console.error("Error getting more recommendations:", error);

      // Fallback to normal flow
      this.gatheringInfo = null;
      return {
        message:
          "I'd love to help you with more travel advice! 🗺️\n\nTo give you the best recommendations, I need some information about your trip.",
        options: ["📍 Choose from my trips", "🌍 Plan for a new destination"],
      };
    }
  }

  // Fetch recommendations from Perplexity with a custom prompt
  async fetchRecommendationsWithPrompt(prompt) {
    try {
      const response = await fetch(
        `${RECOMMENDATION_AI_CONFIG.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.recommendationApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: RECOMMENDATION_AI_CONFIG.model,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            max_tokens: RECOMMENDATION_AI_CONFIG.maxTokens,
            temperature: RECOMMENDATION_AI_CONFIG.temperature,
            stream: false,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data = await response.json();
      let recommendations = data.choices[0].message.content;

      // Process the recommendations to make links clickable
      recommendations = this.processRecommendationLinks(recommendations);

      return recommendations;
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      throw error;
    }
  }

  // Manual extraction fallback when AI parsing fails
  manuallyExtractActivities(recommendationsText) {
    const activities = [];

    // Common patterns to identify activities/places
    const patterns = [
      // Pattern 1: Numbered items like "1. **Victoria Peak & Peak Tram**"
      /(?:^|\n)\d+\.\s*\*\*([^*]+)\*\*/g,
      // Pattern 2: **Name** that appears after a number (more specific)
      /\d+\.\s*\*\*([^*]+)\*\*/g,
      // Pattern 3: ### Name or ## Name (headers)
      /#{2,3}\s*([^\n]+)/g,
      // Pattern 4: Bullet points with **Name**
      /(?:^|\n)[-*]\s*\*\*([^*]+)\*\*/g,
    ];

    const foundNames = new Set();

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(recommendationsText)) !== null) {
        let name = match[1].trim();

        // Clean the name by removing asterisks and other formatting
        name = name.replace(/\*+/g, "").trim();

        // Skip if name is empty after cleaning
        if (!name) continue;

        // Filter out common non-place words and trip descriptions
        const lowerName = name.toLowerCase();
        if (
          name.length > 3 &&
          name.length < 100 && // Skip very long descriptions
          !lowerName.includes("recommendation") &&
          !lowerName.includes("conclusion") &&
          !lowerName.includes("summary") &&
          !lowerName.includes("day") && // Skip "7-day" descriptions
          !lowerName.includes("trip") && // Skip trip descriptions
          !lowerName.includes("budget") && // Skip budget descriptions
          !lowerName.includes("solo") && // Skip travel style descriptions
          !lowerName.includes("sightseeing") && // Skip activity type descriptions
          !lowerName.includes("focused on") && // Skip descriptive phrases
          !lowerName.includes("here are") && // Skip intro phrases
          !lowerName.includes("for a") && // Skip context phrases
          !foundNames.has(name)
        ) {
          foundNames.add(name);

          // Skip if this looks like a trip description rather than a specific place
          if (
            (lowerName.includes("from") && lowerName.includes("to")) ||
            lowerName.includes("september") ||
            lowerName.includes("2025") ||
            lowerName.match(/\d+[\s-]day/) || // Match "7-day", "3 day", etc.
            (lowerName.includes("hong kong island") && lowerName.length > 50)
          ) {
            continue;
          }

          // Determine type based on keywords
          let type = "attraction";
          if (
            lowerName.includes("restaurant") ||
            lowerName.includes("food") ||
            lowerName.includes("dining")
          ) {
            type = "restaurant";
          } else if (
            lowerName.includes("shop") ||
            lowerName.includes("market")
          ) {
            type = "shopping";
          } else if (
            lowerName.includes("museum") ||
            lowerName.includes("temple") ||
            lowerName.includes("cultural")
          ) {
            type = "cultural";
          }

          activities.push({
            name: name,
            type: type,
            description: `${name} - recommended ${type} from travel advice`,
          });
        }
      }
    });

    // If no activities found, create a generic one
    if (activities.length === 0) {
      activities.push({
        name: "Travel Recommendations",
        type: "activity",
        description: "Collection of travel recommendations from Moo AI",
      });
    }
    return activities;
  }

  // STEP 3: Process user's selection and enrich with Google Places data
  async processBucketListSelection(
    userMessage,
    extractedActivities,
    useDirectGooglePlaces = false
  ) {
    try {
      let selectedIndices = [];
      const lowerMessage = userMessage.toLowerCase();

      if (lowerMessage.includes("all")) {
        selectedIndices = extractedActivities.map((_, index) => index);
      } else if (lowerMessage.includes("cancel")) {
        return {
          message:
            "No problem! Your recommendations are still available if you change your mind.",
          options: [
            "🎯 Get more travel advice",
            "📅 Check my calendar",
            "🐄 About Moo",
          ],
        };
      } else {
        // Parse numbers from user input
        const numbers = userMessage.match(/\d+/g);
        if (numbers) {
          selectedIndices = numbers
            .map((num) => parseInt(num) - 1)
            .filter(
              (index) => index >= 0 && index < extractedActivities.length
            );
        }
      }

      if (selectedIndices.length === 0) {
        return {
          message:
            'I didn\'t understand your selection. Please try again with numbers (e.g., "1, 3"), "all", or "cancel".',
          options: [],
        };
      }

      const selectedActivities = selectedIndices.map(
        (index) => extractedActivities[index]
      );

      // STEP 4: Enrich each selected activity with the best approach
      let enrichedActivities;

      if (useDirectGooglePlaces) {
        // Direct Google Places only (fast but limited info)
        enrichedActivities =
          await this.enrichActivitiesDirectlyWithGooglePlaces(
            selectedActivities
          );
      } else {
        // Hybrid approach: Perplexity + Google Places (comprehensive)
        enrichedActivities = await this.enrichActivitiesWithHybridApproach(
          selectedActivities
        );
      }

      return {
        message: `Perfect! I've added ${enrichedActivities.length} ${
          enrichedActivities.length === 1 ? "activity" : "activities"
        } to your bucket list with detailed information from Google Places!\n\n${enrichedActivities
          .map((activity) => `✅ ${activity.name}`)
          .join("\n")}\n\nWhat would you like to do next?`,
        options: [
          "🎯 Get more travel advice",
          "📅 Check my calendar",
          "🐄 About Moo",
        ],
        bucketListItems: enrichedActivities,
      };
    } catch (error) {
      return {
        message:
          "Sorry, I had trouble processing your selection. Please try again.",
        options: [
          "🎯 Get travel advice",
          "📅 Check my calendar",
          "🏠 Back to main menu",
        ],
      };
    }
  }

  // STEP 5: Enrich activities with Perplexity first, then Google Places for location
  async enrichActivitiesWithGooglePlaces(activities) {
    const enrichedActivities = [];
    const currentDestination = this.getCurrentDestination();

    for (const activity of activities) {
      try {
        // Create base bucket item with minimal data
        const bucketItem = {
          id: Date.now() + Math.random(),
          name: activity.name,
          description: `Activity in ${currentDestination.city}, ${currentDestination.country}`,
          category: "Activity",
          estimatedCost: "Cost varies",
          openHours: "Hours vary",
          location: "Location not specified",
          country: currentDestination.country,
          city: currentDestination.city,
          link: "",
          imgUrl: "",
          placeId: "",
          isCompleted: false,
          dateAdded: new Date().toISOString(),
        };

        // Get Google Places data directly with proper API loading
        try {
          // Ensure Google Maps API is loaded
          if (!isGoogleMapsLoaded()) {
            await loadGoogleMaps();
          }

          if (!window.google?.maps?.places) {
            throw new Error("Google Places API not available");
          }
        } catch (loadError) {
          // Continue without Google Places data
          enrichedActivities.push(bucketItem);
          continue;
        }

        if (window.google?.maps?.places) {
          try {
            const service = new window.google.maps.places.PlacesService(
              document.createElement("div")
            );

            const searchQuery = `${activity.name} ${currentDestination.city} ${currentDestination.country}`;

            const request = {
              query: searchQuery,
              fields: [
                "name",
                "formatted_address",
                "place_id",
                "photos",
                "opening_hours",
                "price_level",
                "rating",
                "types",
                "geometry",
              ],
            };

            const searchResult = await new Promise((resolve) => {
              service.findPlaceFromQuery(request, (results, status) => {
                if (
                  status === window.google.maps.places.PlacesServiceStatus.OK &&
                  results?.[0]
                ) {
                  resolve(results[0]);
                } else {
                  resolve(null);
                }
              });
            });

            if (searchResult) {
              // Enrich with Google Places data
              bucketItem.location =
                searchResult.formatted_address || bucketItem.location;
              bucketItem.placeId = searchResult.place_id || "";
              bucketItem.link = searchResult.website || "";

              // Get image from Google Places
              if (searchResult.photos?.[0]) {
                try {
                  bucketItem.imgUrl = searchResult.photos[0].getUrl({
                    maxWidth: 400,
                    maxHeight: 300,
                  });
                } catch (photoError) {}
              }

              // Get opening hours if available
              if (searchResult.opening_hours?.weekday_text) {
                bucketItem.openHours =
                  searchResult.opening_hours.weekday_text.join(", ");
              }

              // Extract country and city from address
              if (searchResult.formatted_address) {
                const addressParts = searchResult.formatted_address.split(", ");
                if (addressParts.length >= 2) {
                  bucketItem.city =
                    addressParts[addressParts.length - 3] ||
                    currentDestination.city;
                  bucketItem.country =
                    addressParts[addressParts.length - 1] ||
                    currentDestination.country;
                }
              }
            } else {
            }
          } catch (placesError) {}
        } else {
        }

        enrichedActivities.push(bucketItem);
      } catch (error) {
        // Add basic item even if enrichment fails
        enrichedActivities.push({
          id: Date.now() + Math.random(),
          name: activity.name,
          description: `Activity in ${currentDestination.city}`,
          category: "Activity",
          estimatedCost: "Cost varies",
          openHours: "Hours vary",
          location: "Location not specified",
          country: currentDestination.country,
          city: currentDestination.city,
          link: "",
          imgUrl: "",
          placeId: "",
          isCompleted: false,
          dateAdded: new Date().toISOString(),
        });
      }
    }

    return enrichedActivities;
  }

  // NEW: Direct Google Places enrichment (bypasses Controller AI and Perplexity)
  async enrichActivitiesDirectlyWithGooglePlaces(activities) {
    const enrichedActivities = [];
    const currentDestination = this.getCurrentDestination();

    for (const activity of activities) {
      try {
        // Extract location from activity name first
        const extractedLocation = this.extractLocationFromActivity(
          activity.name,
          ""
        );
        const useExtracted = extractedLocation.country !== "Not specified";

        // Create base bucket item with minimal data
        const bucketItem = {
          id: Date.now() + Math.random(),
          name: activity.name,
          description: `Activity in ${
            useExtracted ? extractedLocation.city : currentDestination.city
          }, ${
            useExtracted
              ? extractedLocation.country
              : currentDestination.country
          }`,
          category: "Activity",
          type: "Activity", // Add type field for UI compatibility
          estimatedCost: "Cost varies",
          openHours: "Hours vary",
          location: "Location not specified",
          country: useExtracted
            ? extractedLocation.country
            : currentDestination.country,
          city: useExtracted ? extractedLocation.city : currentDestination.city,
          link: "",
          imgUrl: "",
          placeId: "",
          isCompleted: false,
          dateAdded: new Date().toISOString(),
        };

        // Get Google Places data directly with proper API loading
        try {
          // Ensure Google Maps API is loaded
          if (!isGoogleMapsLoaded()) {
            await loadGoogleMaps();
          }

          if (!window.google?.maps?.places) {
            throw new Error("Google Places API not available");
          }
        } catch (loadError) {
          // Continue without Google Places data
          enrichedActivities.push(bucketItem);
          continue;
        }

        if (window.google?.maps?.places) {
          try {
            const service = new window.google.maps.places.PlacesService(
              document.createElement("div")
            );

            const searchQuery = `${activity.name} ${currentDestination.city} ${currentDestination.country}`;

            const request = {
              query: searchQuery,
              fields: [
                "name",
                "formatted_address",
                "place_id",
                "photos",
                "opening_hours",
                "price_level",
                "rating",
                "types",
                "geometry",
              ],
            };

            const searchResult = await new Promise((resolve) => {
              service.findPlaceFromQuery(request, (results, status) => {
                if (
                  status === window.google.maps.places.PlacesServiceStatus.OK &&
                  results?.[0]
                ) {
                  resolve(results[0]);
                } else {
                  resolve(null);
                }
              });
            });

            if (searchResult) {
              // Enrich with Google Places data
              bucketItem.location =
                searchResult.formatted_address || bucketItem.location;
              bucketItem.placeId = searchResult.place_id || "";
              bucketItem.link = searchResult.website || "";

              // Get image from Google Places
              if (searchResult.photos?.[0]) {
                try {
                  bucketItem.imgUrl = searchResult.photos[0].getUrl({
                    maxWidth: 400,
                    maxHeight: 300,
                  });
                } catch (photoError) {}
              }

              // Get opening hours if available
              if (searchResult.opening_hours?.weekday_text) {
                bucketItem.openHours =
                  searchResult.opening_hours.weekday_text.join(", ");
              }

              // Extract country and city from address
              if (searchResult.formatted_address) {
                const addressParts = searchResult.formatted_address.split(", ");
                if (addressParts.length >= 2) {
                  bucketItem.city =
                    addressParts[addressParts.length - 3] ||
                    currentDestination.city;
                  bucketItem.country =
                    addressParts[addressParts.length - 1] ||
                    currentDestination.country;
                }
              }
            } else {
            }
          } catch (placesError) {}
        } else {
        }

        enrichedActivities.push(bucketItem);
      } catch (error) {
        // Add basic item even if enrichment fails
        enrichedActivities.push({
          id: Date.now() + Math.random(),
          name: activity.name,
          description: `Activity in ${currentDestination.city}`,
          category: "Activity",
          estimatedCost: "Cost varies",
          openHours: "Hours vary",
          location: "Location not specified",
          country: currentDestination.country,
          city: currentDestination.city,
          link: "",
          imgUrl: "",
          placeId: "",
          isCompleted: false,
          dateAdded: new Date().toISOString(),
        });
      }
    }

    return enrichedActivities;
  }

  // Utility function: Get Google Places data for a single activity name
  async getGooglePlacesDataForActivity(activityName, destination = null) {
    try {
      // Ensure Google Maps API is loaded
      if (!isGoogleMapsLoaded()) {
        await loadGoogleMaps();
      }

      if (!window.google?.maps?.places) {
        return null;
      }
    } catch (error) {
      return null;
    }

    const currentDestination = destination || this.getCurrentDestination();
    const searchQuery = `${activityName} ${currentDestination.city} ${currentDestination.country}`;

    try {
      const service = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );

      const request = {
        query: searchQuery,
        fields: [
          "name",
          "formatted_address",
          "place_id",
          "photos",
          "opening_hours",
          "price_level",
          "rating",
          "types",
          "geometry",
        ],
      };

      const result = await new Promise((resolve) => {
        service.findPlaceFromQuery(request, (results, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            results?.[0]
          ) {
            resolve(results[0]);
          } else {
            resolve(null);
          }
        });
      });

      if (result) {
        // Format the data for easy use
        const placesData = {
          name: result.name,
          address: result.formatted_address,
          placeId: result.place_id,
          // website: result.website, // Not available in findPlaceFromQuery
          website: null,
          rating: result.rating,
          priceLevel: result.price_level,
          types: result.types,
          coordinates: result.geometry?.location
            ? {
                lat: result.geometry.location.lat(),
                lng: result.geometry.location.lng(),
              }
            : null,
          openingHours: result.opening_hours?.weekday_text || null,
          imageUrl: result.photos?.[0]
            ? result.photos[0].getUrl({
                maxWidth: 400,
                maxHeight: 300,
              })
            : null,
        };

        return placesData;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Quick method: Add activities with comprehensive information (Perplexity + Google Places)
  async addActivitiesWithHybridEnrichment(activityNames, destination = null) {
    // Convert activity names to activity objects
    const activities = activityNames.map((name) => ({ name }));

    // Use hybrid enrichment (Perplexity + Google Places)
    const enrichedActivities = await this.enrichActivitiesWithHybridApproach(
      activities
    );

    // Add to bucket list
    if (enrichedActivities.length > 0) {
      // Get current bucket list
      const currentBucketList = JSON.parse(
        localStorage.getItem("bucketList") || "[]"
      );

      // Add new activities
      const updatedBucketList = [...currentBucketList, ...enrichedActivities];

      // Save to localStorage
      localStorage.setItem("bucketList", JSON.stringify(updatedBucketList));

      return {
        success: true,
        message: `Added ${enrichedActivities.length} ${
          enrichedActivities.length === 1 ? "activity" : "activities"
        } with detailed information from Perplexity and Google Places!`,
        activities: enrichedActivities,
      };
    } else {
      return {
        success: false,
        message:
          "No activities could be added. Please check the activity names and try again.",
        activities: [],
      };
    }
  }

  // Quick method: Add activities directly using Google Places only (fast but limited)
  async addActivitiesDirectlyWithGooglePlaces(
    activityNames,
    destination = null
  ) {
    // Convert activity names to activity objects
    const activities = activityNames.map((name) => ({ name }));

    // Use direct Google Places enrichment
    const enrichedActivities =
      await this.enrichActivitiesDirectlyWithGooglePlaces(activities);

    // Add to bucket list
    if (enrichedActivities.length > 0) {
      // Get current bucket list
      const currentBucketList = JSON.parse(
        localStorage.getItem("bucketList") || "[]"
      );

      // Add new activities
      const updatedBucketList = [...currentBucketList, ...enrichedActivities];

      // Save to localStorage
      localStorage.setItem("bucketList", JSON.stringify(updatedBucketList));

      return {
        success: true,
        message: `Added ${enrichedActivities.length} ${
          enrichedActivities.length === 1 ? "activity" : "activities"
        } to your bucket list using Google Places data!`,
        activities: enrichedActivities,
      };
    } else {
      return {
        success: false,
        message:
          "No activities could be added. Please check the activity names and try again.",
        activities: [],
      };
    }
  }

  // ENHANCED: Hybrid enrichment - Perplexity for details + Google Places for location/images
  async enrichActivitiesWithHybridApproach(activities) {
    const enrichedActivities = [];
    const currentDestination = this.getCurrentDestination();

    for (const activity of activities) {
      try {
        // STEP 1: Get detailed information from Perplexity
        let perplexityData = await this.getPerplexityDataForActivity(
          activity.name,
          currentDestination
        );

        // STEP 2: Get location and images from Google Places
        let googlePlacesData = await this.getGooglePlacesDataForActivity(
          activity.name,
          currentDestination
        );

        // STEP 3: Extract country and city from activity name and location
        const extractedLocation = this.extractLocationFromActivity(
          activity.name,
          googlePlacesData?.address || perplexityData.location
        );

        // STEP 4: Combine the best of both
        const bucketItem = {
          id: Date.now() + Math.random(),
          name: activity.name,
          description:
            perplexityData.description ||
            `${activity.name} - recommended activity`,
          category: perplexityData.category || "Activity",
          type: perplexityData.category || "Activity", // Add type field for UI compatibility
          estimatedCost: perplexityData.estimatedCost || "Cost varies",
          openHours:
            perplexityData.openHours ||
            googlePlacesData?.openingHours?.join(", ") ||
            "Hours vary",
          location:
            googlePlacesData?.address ||
            perplexityData.location ||
            "Location not specified",
          // Use extracted location first, then fallback to other sources
          country:
            extractedLocation.country !== "Not specified"
              ? extractedLocation.country
              : perplexityData.country || currentDestination.country,
          city:
            extractedLocation.city !== "Not specified"
              ? extractedLocation.city
              : perplexityData.city || currentDestination.city,
          link: perplexityData.website || "",
          imgUrl: googlePlacesData?.imageUrl || "",
          placeId: googlePlacesData?.placeId || "",
          coordinates: googlePlacesData?.coordinates || null,
          rating: googlePlacesData?.rating || null,
          priceLevel: googlePlacesData?.priceLevel || null,
          isCompleted: false,
          dateAdded: new Date().toISOString(),
        };
        enrichedActivities.push(bucketItem);
      } catch (error) {
        // Fallback to basic item
        enrichedActivities.push({
          id: Date.now() + Math.random(),
          name: activity.name,
          description: `${activity.name} - recommended activity`,
          category: "Activity",
          type: "Activity", // Add type field for UI compatibility
          estimatedCost: "Cost varies",
          openHours: "Hours vary",
          location: "Location not specified",
          country: currentDestination.country,
          city: currentDestination.city,
          link: "",
          imgUrl: "",
          placeId: "",
          isCompleted: false,
          dateAdded: new Date().toISOString(),
        });
      }
    }

    return enrichedActivities;
  }

  // Get detailed information from Perplexity for a specific activity
  async getPerplexityDataForActivity(activityName, destination) {
    try {
      if (!this.perplexityApiKey) {
        return {};
      }

      const prompt = `Provide detailed information about "${activityName}" in ${destination.city}, ${destination.country}.

Please provide:
1. A brief description (2-3 sentences about what this place is)
2. Current estimated costs or pricing (be specific if possible)
3. Typical operating hours or when it's open
4. Official website URL if available
5. What category this belongs to (restaurant, attraction, museum, etc.)

Format your response as factual information without citations or references.`;

      const response = await fetch(
        "https://api.perplexity.ai/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.perplexityApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 400,
            temperature: 0.2,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();

      // Parse the Perplexity response
      const parsedData = this.parsePerplexityResponse(
        content,
        activityName,
        destination
      );
      return parsedData;
    } catch (error) {
      return {};
    }
  }

  // Parse Perplexity response into structured data
  parsePerplexityResponse(content, activityName, destination) {
    const data = {
      description: "",
      estimatedCost: "Cost varies",
      openHours: "Hours vary",
      website: "",
      category: "Activity",
      country: destination.country,
      city: destination.city,
      location: "",
    };

    try {
      // Extract description (first few sentences) and clean formatting
      const sentences = content
        .split(/[.!?]+/)
        .filter((s) => s.trim().length > 10);
      if (sentences.length > 0) {
        data.description = sentences.slice(0, 2).join(". ").trim() + ".";
        // Clean markdown formatting
        data.description = data.description
          .replace(/\*\*/g, "") // Remove ** bold markers
          .replace(/\*/g, "") // Remove * italic markers
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Convert [text](url) to text
          .trim();
      }

      // Extract cost information
      const costPatterns = [
        /(?:cost|price|fee|admission)[s]?[:\s]*([^.\n]+)/i,
        /\$[\d,]+(?:\.\d{2})?/g,
        /NT\$[\d,]+/g,
        /free|no charge|complimentary/i,
      ];

      for (const pattern of costPatterns) {
        const match = content.match(pattern);
        if (match) {
          data.estimatedCost = match[0].trim();
          break;
        }
      }

      // Extract hours
      const hourPatterns = [
        /(?:open|hours?)[:\s]*([^.\n]*(?:AM|PM|am|pm)[^.\n]*)/i,
        /(?:daily|monday|tuesday|wednesday|thursday|friday|saturday|sunday)[^.\n]*(?:\d{1,2}:\d{2})[^.\n]*/i,
      ];

      for (const pattern of hourPatterns) {
        const match = content.match(pattern);
        if (match) {
          data.openHours = match[0].trim();
          break;
        }
      }

      // Extract website
      const urlMatch = content.match(/https?:\/\/[^\s\n]+/);
      if (urlMatch) {
        data.website = urlMatch[0].replace(/[.,;:!?]+$/, "");
      }

      // Extract category with comprehensive patterns
      const categoryPatterns = [
        // Pattern 1: "is a/an [type]"
        /(?:is a|is an)\s+([^,.\n]*(?:restaurant|cafe|museum|temple|market|attraction|park|building|center|mall|hotel|memorial|tower|observatory|shopping|dining|cultural|historical|entertainment|recreational))/i,

        // Pattern 2: Direct type mentions
        /(restaurant|cafe|museum|temple|market|attraction|park|building|center|mall|hotel|memorial|tower|observatory|shopping|dining|cultural|historical|entertainment|recreational)\s+(?:located|situated|found|in)/i,

        // Pattern 3: Activity type descriptions
        /(?:dining|eating|shopping|sightseeing|cultural|historical|entertainment|recreational)\s+(?:experience|destination|venue|location)/i,

        // Pattern 4: Simple type words
        /(restaurant|cafe|museum|temple|market|attraction|park|building|center|mall|hotel|memorial|tower|observatory)/i,
      ];

      for (const pattern of categoryPatterns) {
        const match = content.match(pattern);
        if (match) {
          let category = match[1] ? match[1].trim() : match[0].trim();

          // Normalize category names
          category = category.toLowerCase();
          if (category.includes("restaurant") || category.includes("dining")) {
            data.category = "Restaurant";
          } else if (category.includes("cafe")) {
            data.category = "Cafe";
          } else if (category.includes("museum")) {
            data.category = "Museum";
          } else if (category.includes("temple")) {
            data.category = "Temple";
          } else if (category.includes("market")) {
            data.category = "Market";
          } else if (category.includes("park")) {
            data.category = "Park";
          } else if (category.includes("memorial")) {
            data.category = "Memorial";
          } else if (
            category.includes("tower") ||
            category.includes("observatory")
          ) {
            data.category = "Tower";
          } else if (
            category.includes("mall") ||
            category.includes("shopping")
          ) {
            data.category = "Shopping";
          } else if (category.includes("hotel")) {
            data.category = "Hotel";
          } else if (
            category.includes("cultural") ||
            category.includes("historical")
          ) {
            data.category = "Cultural";
          } else if (
            category.includes("entertainment") ||
            category.includes("recreational")
          ) {
            data.category = "Entertainment";
          } else {
            // Capitalize first letter of the matched category
            data.category =
              category.charAt(0).toUpperCase() + category.slice(1);
          }
          break;
        }
      }
    } catch (parseError) {}

    return data;
  }

  // Handle main menu requests
  async handleMainMenu() {
    await this.addThinkingDelay("predefined");

    // Reset any ongoing conversation state
    this.gatheringInfo = null;

    return {
      message:
        "🏠 Welcome back to the main menu!\n\nI can help you with:\n• Travel advice and recommendations\n• Your calendar and trips\n• Questions about me\n\nWhat would you like to explore?",
      options: ["🎯 Get travel advice", "📅 Check my calendar", "🐄 About Moo"],
    };
  }

  // Handle unknown requests
  async handleUnknownRequest(userMessage) {
    await this.addThinkingDelay("predefined");
    return {
      message:
        "I'd love to help! 🐄\n\nI can assist you with:\n• Travel advice and recommendations\n• Your calendar and trips\n• Questions about me\n\nWhat would you like to explore?",
      options: ["🎯 Get travel advice", "📅 Check my calendar", "🐄 About Moo"],
    };
  }

  // Process recommendations to make links clickable
  processRecommendationLinks(text) {
    // Handle different URL patterns more carefully

    // First, handle "Website: URL" patterns
    text = text.replace(/Website:\s*(https?:\/\/[^\s\n]+)/gi, (match, url) => {
      const cleanUrl = url.replace(/[.,;:!?]+$/, "");
      return `🔗 [Visit Website](${cleanUrl})`;
    });

    // Then handle standalone URLs that aren't already in markdown format
    text = text.replace(
      /(^|[^[\]()])(https?:\/\/[^\s[\]()]+)/g,
      (match, prefix, url) => {
        const cleanUrl = url.replace(/[.,;:!?]+$/, "");
        const punctuation = url.slice(cleanUrl.length);

        return `${prefix}🔗 [Visit Website](${cleanUrl})${punctuation}`;
      }
    );

    return text;
  }

  // Reset conversation state
  resetConversation() {
    this.conversationHistory = [];
    this.gatheringInfo = null;
    this.lastRecommendations = null;
    this.lastTripContext = null; // Clear trip context on full reset
  }

  // Soft reset - keeps trip context for "get more" functionality
  softResetConversation() {
    this.conversationHistory = [];
    this.gatheringInfo = null;
    // Keep lastRecommendations and lastTripContext for "get more" functionality
  }

  // Debug method to check conversation state
  getConversationState() {
    return {
      hasGatheringInfo: !!this.gatheringInfo,
      currentField: this.gatheringInfo?.currentField,
      gatheringInfo: this.gatheringInfo,
      hasRecommendations: !!this.lastRecommendations,
    };
  }

  // Test connections (simplified)
  async testConnections() {
    const googleMapsTest = await this.testGoogleMapsConnection();

    return {
      controller: { success: true, message: "Controller AI ready" },
      recommendation: { success: true, message: "Recommendation AI ready" },
      googleMaps: googleMapsTest,
    };
  }

  // Test Google Maps API connection
  async testGoogleMapsConnection() {
    try {
      // Check if API is already loaded
      if (isGoogleMapsLoaded()) {
        // Test Places API functionality
        try {
          new window.google.maps.places.PlacesService(
            document.createElement("div")
          );

          return {
            success: true,
            message: "Google Maps API and Places API fully functional",
          };
        } catch (serviceError) {
          return {
            success: false,
            message: `Places API not functional: ${serviceError.message}`,
          };
        }
      }

      // Try to load the API
      await loadGoogleMaps();

      if (isGoogleMapsLoaded()) {
        // Test Places API functionality
        try {
          new window.google.maps.places.PlacesService(
            document.createElement("div")
          );

          return {
            success: true,
            message: "Google Maps API loaded and Places API functional",
          };
        } catch (serviceError) {
          return {
            success: false,
            message: `API loaded but Places API not functional: ${serviceError.message}`,
          };
        }
      } else {
        return {
          success: false,
          message: "Google Maps API failed to load after loading attempt",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Google Maps API error: ${error.message}`,
      };
    }
  }
}

const mooAgentService = new MooAgentService();
export default mooAgentService;
