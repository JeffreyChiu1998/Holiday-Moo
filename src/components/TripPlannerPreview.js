import { useState } from "react";

const TripPlannerPreview = ({ itinerary, onConfirm, onCancel }) => {
  const [selectedDay, setSelectedDay] = useState(0);

  if (!itinerary || !itinerary.days) {
    return (
      <div className="trip-planner-preview">
        <div className="loading-state">
          <p>Loading itinerary preview...</p>
        </div>
      </div>
    );
  }

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const getEventIcon = (type) => {
    const iconMap = {
      dining: "🍽️",
      shopping: "🛍️",
      sightseeing: "🏛️",
      transport: "🚗",
      accommodation: "🏨",
      activity: "🎯",
      entertainment: "🎭",
      relaxation: "🧘",
      break: "☕",
      other: "📝",
    };
    return iconMap[type] || "📍";
  };

  const getLocationDisplay = (location) => {
    if (typeof location === "object" && location !== null) {
      return location.name || location.address || "Location";
    }
    return location || "Location";
  };

  const getEventName = (event) => {
    // Use the event name (now properly set in the detailed service)
    return (
      event.name || event.type.charAt(0).toUpperCase() + event.type.slice(1)
    );
  };

  const formatDayDescription = (description) => {
    if (!description) return null;

    // Split by common time periods and format them
    const timePatterns = /(Morning:|Afternoon:|Evening:)/g;
    const parts = description.split(timePatterns);

    return (
      <div className="formatted-description">
        {parts.map((part, index) => {
          if (part.match(timePatterns)) {
            return (
              <div key={index} className="time-period-header">
                <strong>{part}</strong>
              </div>
            );
          } else if (part.trim()) {
            return (
              <div key={index} className="time-period-content">
                {part.trim()}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  const getTotalStats = () => {
    const totalEvents = itinerary.days.reduce(
      (total, day) => total + day.events.length,
      0
    );
    const totalDays = itinerary.days.length;

    const eventsByType = {};
    itinerary.days.forEach((day) => {
      day.events.forEach((event) => {
        eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      });
    });

    return { totalEvents, totalDays, eventsByType };
  };

  const stats = getTotalStats();

  return (
    <div className="trip-planner-preview">
      <div className="preview-header">
        <div className="preview-title">
          <h3>🎯 Your Detailed Itinerary</h3>
          <p>Review your complete day-by-day travel plan</p>
        </div>

        <div className="preview-stats">
          <div className="stat-item">
            <strong>{stats.totalDays}</strong>
            <span>Days</span>
          </div>
          <div className="stat-item">
            <strong>{stats.totalEvents}</strong>
            <span>Events</span>
          </div>
          <div className="stat-item">
            <strong>{stats.eventsByType.dining || 0}</strong>
            <span>Meals</span>
          </div>
        </div>
      </div>

      <div className="preview-content">
        {/* Day Navigation - Top Tabs */}
        <div className="day-tabs-navigation">
          {itinerary.days.map((day, index) => (
            <button
              key={index}
              className={`day-tab-button ${
                selectedDay === index ? "active" : ""
              }`}
              onClick={() => setSelectedDay(index)}
            >
              Day {index + 1}
            </button>
          ))}
        </div>

        {/* Selected Day Details */}
        <div className="day-details">
          {itinerary.days[selectedDay] && (
            <div className="day-content">
              <div className="day-header-vertical">
                <h3 className="day-title">
                  Day {selectedDay + 1}: {itinerary.days[selectedDay].topic}
                </h3>
                <p className="day-date">
                  {formatDate(itinerary.days[selectedDay].date)}
                </p>
                <div className="day-description-formatted">
                  {formatDayDescription(
                    itinerary.days[selectedDay].description
                  )}
                </div>
              </div>

              <div className="day-timeline">
                {itinerary.days[selectedDay].events
                  .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                  .map((event, eventIndex) => (
                    <div key={event.id} className="timeline-event">
                      <div className="event-time">
                        <div className="start-time">
                          {formatTime(event.startTime)}
                        </div>
                        <div className="end-time">
                          {formatTime(event.endTime)}
                        </div>
                      </div>

                      <div className="event-connector">
                        <div
                          className="event-dot"
                          style={{ backgroundColor: event.color }}
                        />
                        {eventIndex <
                          itinerary.days[selectedDay].events.length - 1 && (
                          <div className="event-line" />
                        )}
                      </div>

                      <div className="event-details">
                        <div className="event-header">
                          <span className="event-icon">
                            {getEventIcon(event.type)}
                          </span>
                          <h5 className="event-name">{getEventName(event)}</h5>
                          <span
                            className="event-type-badge"
                            style={{ backgroundColor: event.color }}
                          >
                            {event.type}
                          </span>
                        </div>

                        <div className="event-location">
                          📍 {getLocationDisplay(event.location)}
                        </div>

                        {event.remark && (
                          <div className="event-description">
                            {event.remark}
                          </div>
                        )}

                        {event.cost && (
                          <div className="event-cost">💰 {event.cost}</div>
                        )}

                        <div className="event-duration">
                          ⏱️{" "}
                          {Math.round(
                            (new Date(event.endTime) -
                              new Date(event.startTime)) /
                              (1000 * 60)
                          )}{" "}
                          minutes
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event Type Summary */}
      <div className="preview-summary">
        <h4>Event Summary</h4>
        <div className="event-type-grid">
          {Object.entries(stats.eventsByType).map(([type, count]) => (
            <div key={type} className="event-type-summary">
              <span className="type-icon">{getEventIcon(type)}</span>
              <span className="type-name">{type}</span>
              <span className="type-count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Generation Info */}
      <div className="preview-info">
        <div className="info-row">
          <span className="info-label">Destination:</span>
          <span className="info-value">{itinerary.destination}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Generated:</span>
          <span className="info-value">
            {new Date(itinerary.generatedAt).toLocaleString()}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">Total Events:</span>
          <span className="info-value">{itinerary.totalEvents}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="preview-actions">
        <button onClick={onCancel} className="cancel-button">
          ← Back to Planning
        </button>
        <button onClick={onConfirm} className="confirm-button">
          ✅ Add to Calendar
        </button>
      </div>

      <div className="preview-note">
        <p>
          <strong>Note:</strong> This itinerary will be added to your calendar
          as individual events. You can edit, move, or delete events after
          they're added.
        </p>
      </div>
    </div>
  );
};

export default TripPlannerPreview;
