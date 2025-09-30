import React, { useState } from "react";

const TripPlannerHighLevel = ({
  plan,
  formData,
  isGenerating = false,
  onEditRequest,
  onContinueToDetailed,
  isChatOpen = false,
}) => {
  const [isModifying] = useState(false);

  // Debug logging
  console.log("TripPlannerHighLevel - plan:", plan);
  console.log("TripPlannerHighLevel - formData:", formData);

  if (!plan) {
    return (
      <div className="trip-planner-high-level">
        <div className="no-plan-message">
          <h3>🎯 Your AI-Generated Trip Plan</h3>
          <p>
            Complete the survey to generate your personalized high-level trip
            plan.
          </p>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="trip-planner-high-level">
        <div className="generating-message">
          <div className="loading-spinner"></div>
          <h3>🤖 Creating Your Trip Plan</h3>
          <p>
            AI is generating a personalized high-level plan based on your
            preferences...
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    console.log("formatDate received:", dateString);
    if (!dateString) return "Invalid Date";

    const date = new Date(dateString);
    console.log("Parsed date:", date);

    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const formatTextWithPlaces = (text) => {
    if (!text || typeof text !== "string") return text;

    // Extract all place names in brackets and remove them from text
    const placeMatches = text.match(/\[[^\]]+\]/g) || [];
    const cleanText = text.replace(/\[[^\]]+\]/g, "").trim();

    // Clean up extra spaces and punctuation
    const finalText = cleanText
      .replace(/\s+/g, " ")
      .replace(/\s+([,.!?])/g, "$1");

    return (
      <>
        {finalText}
        {placeMatches.length > 0 && (
          <>
            {" "}
            {placeMatches.map((match, index) => {
              const placesString = match.slice(1, -1); // Remove brackets
              // Split by comma and trim each place
              const places = placesString
                .split(",")
                .map((place) => place.trim());

              return places.map((placeName, placeIndex) => (
                <span
                  key={`place-${index}-${placeIndex}-${placeName}`}
                  className="place-names district-name"
                  style={{ marginRight: "4px", marginLeft: "2px" }}
                >
                  📍 {placeName}
                </span>
              ));
            })}
          </>
        )}
      </>
    );
  };

  const formatDescription = (description) => {
    // Safety check for undefined or null description
    if (!description) {
      return [
        <li key="no-description" className="description-item">
          No description available
        </li>,
      ];
    }

    // Handle object description with morning/afternoon/evening properties
    if (typeof description === "object" && !Array.isArray(description)) {
      const formattedItems = [];

      if (description.morning) {
        formattedItems.push(
          <li key="morning" className="time-period-item">
            <strong>Morning:</strong>{" "}
            {formatTextWithPlaces(description.morning)}
          </li>
        );
      }

      if (description.afternoon) {
        formattedItems.push(
          <li key="afternoon" className="time-period-item">
            <strong>Afternoon:</strong>{" "}
            {formatTextWithPlaces(description.afternoon)}
          </li>
        );
      }

      if (description.evening) {
        formattedItems.push(
          <li key="evening" className="time-period-item">
            <strong>Evening:</strong>{" "}
            {formatTextWithPlaces(description.evening)}
          </li>
        );
      }

      return formattedItems.length > 0
        ? formattedItems
        : [
            <li key="no-description" className="description-item">
              No description available
            </li>,
          ];
    }

    // Handle string description (fallback for other formats)
    if (typeof description !== "string") {
      return [
        <li key="no-description" className="description-item">
          No description available
        </li>,
      ];
    }

    // Split description by time periods and format as bullet points
    const timePatterns = [
      { pattern: /Morning:\s*/gi, label: "Morning" },
      { pattern: /Afternoon:\s*/gi, label: "Afternoon" },
      { pattern: /Evening:\s*/gi, label: "Evening" },
    ];

    // Split the description by sentences first
    const sentences = description.split(/\.\s+/);
    const formattedItems = [];

    sentences.forEach((sentence, index) => {
      if (!sentence.trim()) return;

      // Check if this sentence contains a time period
      let matchedPattern = null;
      timePatterns.forEach(({ pattern, label }) => {
        if (pattern.test(sentence)) {
          matchedPattern = { pattern, label };
        }
      });

      if (matchedPattern) {
        // Extract the content after the time period
        let content = sentence.replace(matchedPattern.pattern, "").trim();

        formattedItems.push(
          <li key={index} className="time-period-item">
            <strong>{matchedPattern.label}:</strong>{" "}
            {formatTextWithPlaces(content)}
          </li>
        );
      } else {
        // Use formatTextWithPlaces for consistent place parsing
        let content = sentence.trim();
        formattedItems.push(
          <li key={index} className="description-item">
            {formatTextWithPlaces(content)}
          </li>
        );
      }
    });

    return formattedItems;
  };

  const handleEditClick = () => {
    if (onEditRequest) {
      onEditRequest();
    }
  };

  return (
    <div className="trip-planner-high-level">
      {/* Header */}
      <div className="plan-header">
        <div className="plan-title-section">
          <h3>🎯 Your AI-Generated Trip Plan</h3>
          <p className="plan-subtitle">
            High-level daily themes for{" "}
            {plan.destination ||
              plan.tripDestination ||
              formData?.selectedTrip?.destination ||
              "your destination"}{" "}
            • {plan.totalDays || 0} days
          </p>
        </div>
        <div className="plan-actions">
          <button
            className="edit-plan-button"
            onClick={handleEditClick}
            disabled={isModifying}
          >
            {isModifying
              ? "Modifying..."
              : isChatOpen
              ? "❌ Close Moo AI"
              : "✏️ Chat with Moo AI"}
          </button>
        </div>
      </div>

      <div style={{ height: "68%", overflowY: "scroll" }}>
        {/* Plan Summary */}
        <div className="plan-summary">
          <div className="summary-item">
            <span className="summary-label">Destination:</span>
            <span className="summary-value">
              {plan.destination ||
                plan.tripDestination ||
                formData?.selectedTrip?.destination ||
                "Your Destination"}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Duration:</span>
            <span className="summary-value">{plan.totalDays || 0} days</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Generated:</span>
            <span className="summary-value">
              {plan.generatedAt
                ? new Date(plan.generatedAt).toLocaleDateString()
                : "Unknown"}
            </span>
          </div>
        </div>

        {/* Daily Plans */}
        <div className="daily-plans">
          {plan.days && plan.days.length > 0 ? (
            plan.days.map((day) => {
              return (
                <div key={day.date} className="day-card">
                  <div className="day-header">
                    <div className="day-title-trip">
                      Day {day.dayNumber} - {day.topic}
                    </div>
                    <div className="day-date-trip">{formatDate(day.date)}</div>
                  </div>

                  <div className="day-content">
                    <div className="day-description">
                      <ul className="description-list">
                        {formatDescription(day.description)}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-days-message">
              <p>
                ⚠️ No daily plans available. Please try generating the plan
                again.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="plan-footer">
        <div className="footer-info">
          <span style={{ paddingRight: "5px" }}>💡</span>
          <p className="footer-note">
            This is a high-level overview. Use the chat to refine your plan,
            then proceed to detailed planning for specific activities and
            bookings.
          </p>
        </div>

        <div className="footer-actions">
          <button className="primary-button" onClick={onContinueToDetailed}>
            ➡️ Continue to Detailed Planning
          </button>
        </div>
      </div>

      {/* Modification Status */}
      {isModifying && (
        <div className="modification-overlay">
          <div className="modification-status">
            <div className="loading-spinner small"></div>
            <span>Updating your plan...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripPlannerHighLevel;
