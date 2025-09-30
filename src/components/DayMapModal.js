import { useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import DayEventsMap from "./DayEventsMap";

const DayMapModal = ({ date, allEvents, trips, onClose, onDateChange }) => {
  const [displayMap, setDisplayMap] = useState(false);
  const [mapError, setMapError] = useState(null);

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handlePreviousDay = () => {
    const previousDay = new Date(date);
    previousDay.setDate(previousDay.getDate() - 1);
    if (onDateChange) {
      onDateChange(previousDay);
    }
  };

  const handleNextDay = () => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    if (onDateChange) {
      onDateChange(nextDay);
    }
  };

  // Filter events for the current date
  const getEventsForDate = useCallback(
    (targetDate) => {
      if (!allEvents || !Array.isArray(allEvents) || !targetDate) return [];

      return allEvents
        .filter((event) => {
          const eventDate = new Date(event.startTime);
          return eventDate.toDateString() === targetDate.toDateString();
        })
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    },
    [allEvents]
  );

  // Get events for current date - use useMemo to ensure recalculation on date change
  const events = useMemo(
    () => getEventsForDate(date),
    [date, getEventsForDate]
  );

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const getLocationName = useCallback((location) => {
    if (typeof location === "object") {
      return location.name || location.address || "Event Location";
    }
    return location || "Event Location";
  }, []);

  const hasValidCoordinates = useCallback((event) => {
    // Check for coordinates directly on the event object (from bucket list items)
    if (event.coordinates && typeof event.coordinates === "object") {
      const coords = event.coordinates;
      return (
        coords &&
        typeof coords.lat === "number" &&
        typeof coords.lng === "number"
      );
    }
    // Check for coordinates nested in location object (legacy format)
    if (typeof event.location === "object" && event.location?.coordinates) {
      const coords = event.location.coordinates;
      return (
        coords &&
        typeof coords.lat === "number" &&
        typeof coords.lng === "number"
      );
    }
    return false;
  }, []);

  // Handle map error from child component
  const handleMapError = useCallback((error) => {
    setMapError(error);
    setDisplayMap(false);
  }, []);

  // Determine what to display based on events
  const eventsWithLocations = events.filter((event) => event.location);
  const eventsWithValidCoordinates = events.filter((event) =>
    hasValidCoordinates(event)
  );
  const dayEvents = events; // Include all events for the legend

  // Explicit boolean conditions for clearer logic
  const hasNoEvents =
    !dayEvents || !Array.isArray(dayEvents) || dayEvents.length === 0;
  const hasNoLocations = !hasNoEvents && eventsWithLocations.length === 0;
  const hasNoValidCoordinates =
    !hasNoEvents && !hasNoLocations && eventsWithValidCoordinates.length === 0;

  // Update displayMap based on events
  useMemo(() => {
    if (hasNoEvents || hasNoLocations || hasNoValidCoordinates) {
      setDisplayMap(false);
    } else {
      setDisplayMap(true);
      setMapError(null); // Clear any previous errors
    }
  }, [hasNoEvents, hasNoLocations, hasNoValidCoordinates]);

  const modalContent = (
    <div
      className="modal-overlay day-map-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="modal-content day-map-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Day Events Map</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="day-map-content">
          <div className="day-map-info">
            <button
              className="day-nav-button day-nav-prev"
              onClick={handlePreviousDay}
              title="Previous day"
            >
              ◀
            </button>
            <div className="day-map-info-content">
              <h3>{formatDate(date)}</h3>
              <p>
                {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}{" "}
                total
                {eventsWithLocations.length > 0 && (
                  <span>
                    {" "}
                    • {eventsWithLocations.length} with location
                    {eventsWithLocations.length !== 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
            <button
              className="day-nav-button day-nav-next"
              onClick={handleNextDay}
              title="Next day"
            >
              ▶
            </button>
          </div>

          <div className="day-map-layout">
            {hasNoEvents ? (
              <div className="map-error">
                <div className="map-error-content">
                  <h4>📅 No Events</h4>
                  <p>There are no events scheduled for this day.</p>
                  <p>
                    Use the navigation buttons above to browse other dates or
                    create new events in the calendar.
                  </p>
                </div>
              </div>
            ) : hasNoLocations ? (
              <div className="map-error">
                <div className="map-error-content">
                  <h4>📍 No Locations to Show</h4>
                  <p>
                    None of the events for this day have location information.
                  </p>
                  <div className="events-list-fallback">
                    <h5>Events for this day:</h5>
                    {dayEvents.map((event, index) => (
                      <div key={event.id} className="event-fallback-item">
                        <strong>
                          {index + 1}. {event.name}
                        </strong>
                        <div>
                          🕐 {formatTime(event.startTime)} -{" "}
                          {formatTime(event.endTime)}
                        </div>
                        <div style={{ color: "#6b7280", fontStyle: "italic" }}>
                          📍 No location specified
                        </div>
                      </div>
                    ))}
                  </div>
                  <p
                    style={{
                      marginTop: "16px",
                      fontSize: "14px",
                      color: "#6b7280",
                    }}
                  >
                    Add location information to events to see them on the map.
                  </p>
                </div>
              </div>
            ) : hasNoValidCoordinates ? (
              <div className="map-error">
                <div className="map-error-content">
                  <h4>🗺️ Unable to Show Map</h4>
                  <p>
                    Events have location information, but none have valid
                    coordinates for mapping.
                  </p>
                  <div className="events-list-fallback">
                    <h5>Events for this day:</h5>
                    {eventsWithLocations.map((event, index) => (
                      <div key={event.id} className="event-fallback-item">
                        <strong>
                          {index + 1}. {event.name}
                        </strong>
                        <div>
                          🕐 {formatTime(event.startTime)} -{" "}
                          {formatTime(event.endTime)}
                        </div>
                        <div style={{ color: "#f59e0b", fontStyle: "italic" }}>
                          📍 {getLocationName(event.location)} (coordinates
                          needed)
                        </div>
                      </div>
                    ))}
                  </div>
                  <p
                    style={{
                      marginTop: "16px",
                      fontSize: "14px",
                      color: "#6b7280",
                    }}
                  >
                    Edit events to add precise location coordinates for map
                    display.
                  </p>
                </div>
              </div>
            ) : mapError ? (
              <div className="map-error">
                <div className="map-error-content">
                  <h4>📍 {mapError}</h4>
                  <div className="events-list-fallback">
                    <h5>Events for this day:</h5>
                    {eventsWithLocations.map((event, index) => (
                      <div key={event.id} className="event-fallback-item">
                        <strong>
                          {index + 1}. {event.name}
                        </strong>
                        <div>📍 {getLocationName(event.location)}</div>
                        <div>
                          🕐 {formatTime(event.startTime)} -{" "}
                          {formatTime(event.endTime)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {displayMap && (
                  <DayEventsMap
                    key={date.toDateString()}
                    events={eventsWithValidCoordinates}
                    onMapError={handleMapError}
                  />
                )}

                {dayEvents.length > 0 && (
                  <div className="day-map-legend">
                    <h4>Day Schedule:</h4>
                    <div className="legend-items">
                      {dayEvents
                        .sort(
                          (a, b) =>
                            new Date(a.startTime) - new Date(b.startTime)
                        )
                        .map((event, index) => {
                          const hasLocation = !!event.location;
                          const hasValidCoords = hasValidCoordinates(event);
                          const mapIndex = hasValidCoords
                            ? eventsWithValidCoordinates
                                .sort(
                                  (a, b) =>
                                    new Date(a.startTime) -
                                    new Date(b.startTime)
                                )
                                .findIndex((e) => e.id === event.id) + 1
                            : null;

                          return (
                            <div
                              key={event.id}
                              className={`legend-item ${
                                !hasLocation
                                  ? "legend-item-no-location"
                                  : !hasValidCoords
                                  ? "legend-item-invalid-coords"
                                  : ""
                              }`}
                            >
                              <span
                                className={`legend-number ${
                                  !hasLocation
                                    ? "legend-number-no-location"
                                    : !hasValidCoords
                                    ? "legend-number-invalid-coords"
                                    : ""
                                }`}
                              >
                                {mapIndex || "—"}
                              </span>
                              <div className="legend-details">
                                <strong>{event.name}</strong>
                                <div className="legend-time">
                                  {formatTime(event.startTime)} -{" "}
                                  {formatTime(event.endTime)}
                                </div>
                                {!hasLocation ? (
                                  <div className="legend-no-location">
                                    📍 No location specified
                                  </div>
                                ) : !hasValidCoords ? (
                                  <div className="legend-invalid-coords">
                                    📍 {getLocationName(event.location)}{" "}
                                    (coordinates needed)
                                  </div>
                                ) : (
                                  <div className="legend-location">
                                    📍 {getLocationName(event.location)}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="day-map-actions">
          <button onClick={onClose} className="close-map-button">
            Close Map
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DayMapModal;
