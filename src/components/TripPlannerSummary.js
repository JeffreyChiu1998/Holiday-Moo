// No React imports needed for this component

const TripPlannerSummary = ({ itinerary, onEdit, onConfirm }) => {
  if (!itinerary) {
    return (
      <div className="trip-planner-summary">
        <div className="loading-state">
          <p>Loading itinerary...</p>
        </div>
      </div>
    );
  }

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "meal":
        return "🍽️";
      case "activity":
        return "🎯";
      case "transport":
        return "🚗";
      case "accommodation":
        return "🏨";
      case "shopping":
        return "🛍️";
      case "culture":
        return "🏛️";
      case "nature":
        return "🌿";
      default:
        return "📍";
    }
  };

  return (
    <div className="trip-planner-summary">
      <div className="summary-header">
        <h3>🤖 Your AI-Generated Trip Plan</h3>
        <p>
          Review your personalized itinerary below. You can edit it or confirm
          to add to your calendar.
        </p>
      </div>

      <div className="itinerary-content">
        {itinerary.days.map((day, dayIndex) => (
          <div key={dayIndex} className="day-section">
            <div className="trip-summary-day-header">
              <h4 className="trip-day-title">Day {dayIndex + 1}</h4>
              <span className="trip-day-date">{formatDate(day.date)}</span>
            </div>

            <div className="day-activities">
              {day.activities.map((activity, activityIndex) => (
                <div key={activityIndex} className="activity-item">
                  <div className="activity-time">
                    {formatTime(activity.time)}
                  </div>

                  <div className="activity-content">
                    <div className="activity-header">
                      <span className="activity-icon">
                        {getActivityIcon(activity.type)}
                      </span>
                      <h5>{activity.title}</h5>
                    </div>

                    {activity.location && (
                      <div className="activity-location">
                        📍 {activity.location}
                      </div>
                    )}

                    {activity.description && (
                      <div className="activity-description">
                        {activity.description}
                      </div>
                    )}

                    {activity.estimatedCost && (
                      <div className="activity-cost">
                        💰 {activity.estimatedCost}
                      </div>
                    )}

                    {activity.duration && (
                      <div className="activity-duration">
                        ⏱️ {activity.duration}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="summary-stats">
        <div className="stat-item">
          <strong>{itinerary.days.length}</strong>
          <span>Days</span>
        </div>
        <div className="stat-item">
          <strong>
            {itinerary.days.reduce(
              (total, day) => total + day.activities.length,
              0
            )}
          </strong>
          <span>Activities</span>
        </div>
        <div className="stat-item">
          <strong>
            {itinerary.days.reduce(
              (total, day) =>
                total + day.activities.filter((a) => a.type === "meal").length,
              0
            )}
          </strong>
          <span>Meals</span>
        </div>
      </div>

      <div className="summary-actions">
        <button onClick={onEdit} className="edit-button">
          ✏️ Edit with Moo AI
        </button>
        <button onClick={onConfirm} className="confirm-button">
          ✅ Confirm & Add to Calendar
        </button>
      </div>
    </div>
  );
};

export default TripPlannerSummary;
