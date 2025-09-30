import { useState, useEffect } from "react";

const processingSteps = [
  "🤖 Parsing AI-generated itinerary...",
  "📅 Creating calendar events...",
  "🏷️ Adding event details and categories...",
  "🔗 Linking events to your trip...",
  "✨ Finalizing your schedule...",
];

const TripPlannerProcessing = ({ itinerary, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const processItinerary = async () => {
      try {
        // Simulate processing steps
        for (let i = 0; i < processingSteps.length; i++) {
          setCurrentStep(i);
          setProgress(((i + 1) / processingSteps.length) * 100);

          // Simulate processing time for each step
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 + Math.random() * 1000)
          );
        }

        // Convert itinerary to calendar events
        const events = convertItineraryToEvents(itinerary);

        // Complete processing
        setTimeout(() => {
          onComplete(events);
        }, 500);
      } catch (error) {
        console.error("Error processing itinerary:", error);
        // Handle error - could show error state or retry
      }
    };

    processItinerary();
  }, [itinerary, onComplete]);

  const convertItineraryToEvents = (itinerary) => {
    const events = [];

    itinerary.days.forEach((day) => {
      day.activities.forEach((activity) => {
        const eventDate = new Date(day.date);
        const [hours, minutes] = activity.time.split(":");
        eventDate.setHours(parseInt(hours), parseInt(minutes));

        const event = {
          id: `ai-generated-${Date.now()}-${Math.random()}`,
          title: activity.title,
          date: eventDate.toISOString(),
          location: activity.location || "",
          description: activity.description || "",
          type: activity.type || "activity",
          tripId: itinerary.tripId,
          estimatedCost: activity.estimatedCost || "",
          duration: activity.duration || "",
          isAIGenerated: true,
          generatedAt: new Date().toISOString(),
        };

        events.push(event);
      });
    });

    return events;
  };

  return (
    <div className="trip-planner-processing">
      <div className="processing-header">
        <h3>🚀 Adding Your Trip to Calendar</h3>
        <p>Please wait while we process your AI-generated itinerary...</p>
      </div>

      <div className="processing-content">
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="progress-text">{Math.round(progress)}% Complete</div>
        </div>

        <div className="processing-steps">
          {processingSteps.map((step, index) => (
            <div
              key={index}
              className={`processing-step ${
                index < currentStep
                  ? "completed"
                  : index === currentStep
                  ? "active"
                  : "pending"
              }`}
            >
              <div className="step-icon">
                {index < currentStep
                  ? "✅"
                  : index === currentStep
                  ? "⏳"
                  : "⏸️"}
              </div>
              <div className="step-text">{step}</div>
            </div>
          ))}
        </div>

        <div className="processing-animation">
          <div className="spinner"></div>
          <p>This may take a few moments...</p>
        </div>

        <div className="processing-stats">
          <div className="stat-item">
            <strong>{itinerary.days.length}</strong>
            <span>Days to process</span>
          </div>
          <div className="stat-item">
            <strong>
              {itinerary.days.reduce(
                (total, day) => total + day.activities.length,
                0
              )}
            </strong>
            <span>Events to create</span>
          </div>
        </div>
      </div>

      <div className="processing-footer">
        <div className="success-preview">
          <div className="preview-icon">🎉</div>
          <div className="preview-text">
            <strong>Almost done!</strong>
            <br />
            Your personalized trip plan will appear in your calendar shortly.
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripPlannerProcessing;
