// No React import needed for this component

const TripPlannerConfirmation = ({ itinerary, onConfirm, onCancel }) => {
  if (!itinerary) {
    return (
      <div className="trip-planner-confirmation">
        <div className="loading-state">
          <p>Loading confirmation...</p>
        </div>
      </div>
    );
  }

  const totalActivities = itinerary.days.reduce(
    (total, day) => total + day.activities.length,
    0
  );
  const totalDays = itinerary.days.length;

  return (
    <div className="trip-planner-confirmation">
      <div className="confirmation-header">
        <div className="warning-icon">⚠️</div>
        <h3>Confirm Trip Plan</h3>
      </div>

      <div className="confirmation-content">
        <div className="warning-message">
          <p>
            <strong>
              This action will replace existing activities in your calendar!
            </strong>
          </p>
          <p>
            Your new AI-generated trip plan will be added to your calendar, and
            any existing events during these dates may be overwritten or merged.
          </p>
        </div>

        <div className="confirmation-summary">
          <h4>What will be added:</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-number">{totalDays}</div>
              <div className="summary-label">Days</div>
            </div>
            <div className="summary-item">
              <div className="summary-number">{totalActivities}</div>
              <div className="summary-label">Activities</div>
            </div>
            <div className="summary-item">
              <div className="summary-number">
                {itinerary.days.reduce(
                  (total, day) =>
                    total +
                    day.activities.filter((a) => a.type === "meal").length,
                  0
                )}
              </div>
              <div className="summary-label">Meals</div>
            </div>
          </div>
        </div>

        <div className="date-range-info">
          <h4>Date Range:</h4>
          <p>
            {new Date(itinerary.days[0].date).toLocaleDateString()} -{" "}
            {new Date(
              itinerary.days[itinerary.days.length - 1].date
            ).toLocaleDateString()}
          </p>
        </div>

        <div className="backup-notice">
          <div className="notice-icon">💡</div>
          <div className="notice-content">
            <strong>Tip:</strong> You can always edit individual events later
            from your calendar, or use the trip planner again to generate a new
            plan.
          </div>
        </div>
      </div>

      <div className="confirmation-actions">
        <button onClick={onCancel} className="cancel-button">
          ← Back to Review
        </button>
        <button onClick={onConfirm} className="confirm-button">
          ✅ Yes, Add to Calendar
        </button>
      </div>
    </div>
  );
};

export default TripPlannerConfirmation;
