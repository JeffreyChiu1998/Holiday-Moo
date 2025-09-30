import { useState } from "react";

const TripPlannerFinalConfirmation = ({ itinerary, onConfirm, onCancel }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!itinerary || !itinerary.days) {
    return (
      <div className="trip-planner-final-confirmation">
        <div className="loading-state">
          <p>Loading confirmation...</p>
        </div>
      </div>
    );
  }

  const handleConfirm = async () => {
    setIsProcessing(true);

    try {
      // Convert itinerary to calendar events format
      const calendarEvents = [];

      itinerary.days.forEach((day) => {
        day.events.forEach((event) => {
          calendarEvents.push({
            id: event.id,
            name: event.name,
            type: event.type,
            tripId: event.tripId,
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.location,
            coordinates: event.coordinates,
            placeId: event.placeId,
            remark: event.remark,
            tags: event.tags,
            contact: event.contact,
            cost: event.cost,
            documents: event.documents,
            isPrepaid: event.isPrepaid,
            color: event.color,
          });
        });
      });

      // Call the parent's confirm handler with the events
      await onConfirm(calendarEvents);
    } catch (error) {
      console.error("Error adding events to calendar:", error);
      alert("Failed to add events to calendar. Please try again.");
    } finally {
      setIsProcessing(false);
    }
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

    const eventsWithLocations = itinerary.days.reduce(
      (total, day) =>
        total +
        day.events.filter(
          (event) =>
            event.location &&
            typeof event.location === "object" &&
            event.location.placeId
        ).length,
      0
    );

    const eventsWithCosts = itinerary.days.reduce(
      (total, day) =>
        total +
        day.events.filter(
          (event) =>
            event.cost &&
            (typeof event.cost === "string" ? event.cost.trim() : event.cost)
        ).length,
      0
    );

    return {
      totalEvents,
      totalDays,
      eventsByType,
      eventsWithLocations,
      eventsWithCosts,
    };
  };

  const stats = getTotalStats();

  return (
    <div className="trip-planner-final-confirmation">
      <div className="confirmation-header">
        <div className="confirmation-icon">
          <img
            src="/img/memo.png"
            alt="Confirmation"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
          <div
            className="confirmation-icon-fallback"
            style={{ display: "none" }}
          >
            ✅
          </div>
        </div>
        <h3>Ready to Add to Calendar</h3>
        <p>Your detailed itinerary is ready to be added to your calendar</p>
      </div>

      <div className="confirmation-content">
        <div className="confirmation-summary">
          <h4>📊 Itinerary Summary</h4>

          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-number">{stats.totalDays}</div>
              <div className="summary-label">Days Planned</div>
            </div>

            <div className="summary-card">
              <div className="summary-number">{stats.totalEvents}</div>
              <div className="summary-label">Total Events</div>
            </div>

            <div className="summary-card">
              <div className="summary-number">{stats.eventsWithLocations}</div>
              <div className="summary-label">With Locations</div>
            </div>

            <div className="summary-card">
              <div className="summary-number">{stats.eventsWithCosts}</div>
              <div className="summary-label">With Cost Info</div>
            </div>
          </div>
        </div>

        <div className="confirmation-details">
          <h4>🎯 What Will Be Added</h4>

          <div className="details-list">
            <div className="detail-item">
              <span className="detail-icon">📅</span>
              <div className="detail-content">
                <strong>Calendar Events</strong>
                <p>
                  All {stats.totalEvents} events will be added to your calendar
                  with proper timing and details
                </p>
              </div>
            </div>

            <div className="detail-item">
              <span className="detail-icon">🗺️</span>
              <div className="detail-content">
                <strong>Location Data</strong>
                <p>
                  {stats.eventsWithLocations} events include precise location
                  data from Google Places
                </p>
              </div>
            </div>

            <div className="detail-item">
              <span className="detail-icon">🧳</span>
              <div className="detail-content">
                <strong>Trip Association</strong>
                <p>
                  All events will be linked to your selected trip for easy
                  management
                </p>
              </div>
            </div>

            <div className="detail-item">
              <span className="detail-icon">✏️</span>
              <div className="detail-content">
                <strong>Editable Events</strong>
                <p>
                  You can modify, move, or delete any event after it's added to
                  your calendar
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="confirmation-breakdown">
          <h4>📋 Event Breakdown</h4>

          <div className="breakdown-grid">
            {Object.entries(stats.eventsByType).map(([type, count]) => {
              const getTypeIcon = (type) => {
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

              return (
                <div key={type} className="breakdown-item">
                  <span className="breakdown-icon">{getTypeIcon(type)}</span>
                  <span className="breakdown-type">{type}</span>
                  <span className="breakdown-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="confirmation-info">
          <div className="info-box">
            <h5>ℹ️ Important Notes</h5>
            <ul>
              <li>
                Events will be added to your existing calendar alongside current
                events
              </li>
              <li>
                You can use the calendar's undo feature (Ctrl+Z) if needed
              </li>
              <li>All events are fully editable after being added</li>
              <li>Location data includes coordinates for map integration</li>
              <li>Trip association allows for easy filtering and management</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="confirmation-actions">
        <button
          onClick={onCancel}
          className="cancel-button"
          disabled={isProcessing}
        >
          ← Back to Preview
        </button>

        <button
          onClick={handleConfirm}
          className="confirm-button"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <span className="loading-spinner">⏳</span>
              Adding to Calendar...
            </>
          ) : (
            <>✅ Add {stats.totalEvents} Events to Calendar</>
          )}
        </button>
      </div>

      <div className="confirmation-footer">
        <p className="footer-note">
          This action will add all events to your calendar. You can always edit
          or remove them later.
        </p>
      </div>
    </div>
  );
};

export default TripPlannerFinalConfirmation;
