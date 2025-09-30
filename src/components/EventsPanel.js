import { useState, useEffect } from "react";
import DayMapModal from "./DayMapModal";

const EventsPanel = ({
  selectedDate,
  selectedTrip,
  events,
  trips,
  onEditEvent,
  onDeleteEvent,
  onCreateEvent,
  onEditDayHeader,
  onDateChange,
}) => {
  const [selectedTripIds, setSelectedTripIds] = useState(new Set());
  const [showDayMapModal, setShowDayMapModal] = useState(false);

  // Initialize all trips as selected when date changes
  useEffect(() => {
    if (selectedDate) {
      const tripsForDate = trips.filter((trip) => {
        const checkDate = new Date(selectedDate);
        checkDate.setHours(0, 0, 0, 0);

        const tripStart = new Date(trip.startDate);
        tripStart.setHours(0, 0, 0, 0);

        const tripEnd = new Date(trip.endDate);
        tripEnd.setHours(23, 59, 59, 999);

        return checkDate >= tripStart && checkDate <= tripEnd;
      });
      setSelectedTripIds(new Set(tripsForDate.map((trip) => trip.id)));
    }
  }, [selectedDate, trips]);

  const handleTripToggle = (tripId) => {
    const newSelectedTripIds = new Set(selectedTripIds);
    if (newSelectedTripIds.has(tripId)) {
      newSelectedTripIds.delete(tripId);
    } else {
      newSelectedTripIds.add(tripId);
    }
    setSelectedTripIds(newSelectedTripIds);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const getDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return diffMinutes > 0
        ? `${diffHours}h ${diffMinutes}m`
        : `${diffHours}h`;
    }
    return `${diffMinutes}m`;
  };

  const getTripsForDate = (date) => {
    if (!date) return [];

    return trips.filter((trip) => {
      const tripStart = new Date(trip.startDate);
      const tripEnd = new Date(trip.endDate);
      const checkDate = new Date(date);

      tripStart.setHours(0, 0, 0, 0);
      tripEnd.setHours(23, 59, 59, 999);
      checkDate.setHours(0, 0, 0, 0);

      return checkDate >= tripStart && checkDate <= tripEnd;
    });
  };

  const formatTripDateRange = (trip) => {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
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
    return `${startStr} - ${endStr}`;
  };

  // Get events for selected trip (all dates)
  const getTripEvents = () => {
    if (!selectedTrip) return [];

    return events
      .filter((event) => event.tripId === selectedTrip.id)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  };

  // Get events for selected date (filtered by trip checkboxes)
  const getEventsGroupedByTrip = () => {
    if (!selectedDate) return { tripGroups: [], noTripEvents: [] };

    const dayEvents = events
      .filter((event) => {
        const eventDate = new Date(event.startTime);
        return eventDate.toDateString() === selectedDate.toDateString();
      })
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    const tripsForDate = getTripsForDate(selectedDate);
    const tripGroups = [];
    const noTripEvents = [];

    // Group events by trip (only for selected trips)
    tripsForDate.forEach((trip) => {
      if (selectedTripIds.has(trip.id)) {
        const tripEvents = dayEvents.filter(
          (event) => event.tripId === trip.id
        );
        if (tripEvents.length > 0) {
          tripGroups.push({
            trip,
            events: tripEvents,
          });
        }
      }
    });

    // Events without trip association
    const eventsWithoutTrip = dayEvents.filter((event) => !event.tripId);
    if (eventsWithoutTrip.length > 0) {
      noTripEvents.push(...eventsWithoutTrip);
    }

    return { tripGroups, noTripEvents };
  };

  const handleCreateEvent = () => {
    if (selectedDate) {
      const startTime = new Date(selectedDate);
      startTime.setHours(9, 0, 0, 0);

      onCreateEvent({
        date: selectedDate,
        startTime: startTime,
        hour: 9,
        minute: 0,
      });
    } else if (selectedTrip) {
      // Create event for trip start date
      const startTime = new Date(selectedTrip.startDate);
      startTime.setHours(9, 0, 0, 0);

      onCreateEvent({
        date: new Date(selectedTrip.startDate),
        startTime: startTime,
        hour: 9,
        minute: 0,
      });
    }
  };

  const handleLocationClick = (event) => {
    if (!event.location) return;

    // Check if location has coordinates
    if (typeof event.location === "object" && event.location?.coordinates) {
      const coords = event.location.coordinates;
      const url = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
      window.open(url, "_blank");
    } else {
      // If no coordinates, search by location name/address
      const locationQuery =
        typeof event.location === "object"
          ? event.location.address || event.location.name
          : event.location;

      if (locationQuery) {
        const encodedQuery = encodeURIComponent(locationQuery);
        const url = `https://www.google.com/maps/search/${encodedQuery}`;
        window.open(url, "_blank");
      }
    }
  };

  const renderEventItem = (event, showDate = false) => (
    <div key={event.id} className="event-item">
      <div className="event-item-header">
        <div
          className="event-color-indicator"
          style={{ backgroundColor: event.color }}
        ></div>
        <div className="event-item-info">
          <h5 className="event-item-name">{event.name}</h5>
          <div className="event-item-time">
            {showDate && (
              <span className="event-date">
                {new Date(event.startTime).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}{" "}
                -
              </span>
            )}
            {formatTime(event.startTime)} - {formatTime(event.endTime)}
            <span className="event-duration">
              ({getDuration(event.startTime, event.endTime)})
            </span>
          </div>
        </div>
        <div className="event-item-actions">
          <button
            onClick={() => onEditEvent(event)}
            className="event-item-action edit"
          >
            ✏️
          </button>
          <button
            onClick={() => onDeleteEvent(event.id)}
            className="event-item-action delete"
          >
            🗑️
          </button>
        </div>
      </div>

      {event.location && (
        <div className="event-item-location">
          📍{" "}
          <button
            onClick={() => handleLocationClick(event)}
            style={{
              background: "none",
              border: "none",
              color: "#2563eb",
              textDecoration: "underline",
              cursor: "pointer",
              fontSize: "inherit",
              padding: 0,
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => (e.target.style.color = "#1d4ed8")}
            onMouseLeave={(e) => (e.target.style.color = "#2563eb")}
            title="Click to open in Google Maps"
          >
            {typeof event.location === "object"
              ? event.location.name || event.location.address || "Location"
              : event.location}
          </button>
        </div>
      )}

      {event.remark && <div className="event-item-remark">{event.remark}</div>}

      {event.tags && (
        <div className="event-item-tags">
          {event.tags.split(",").map((tag, index) => (
            <span key={index} className="event-item-tag">
              {tag.trim()}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  // Determine which mode we're in
  const isDateMode = selectedDate && !selectedTrip;
  const isTripMode = selectedTrip && !selectedDate;

  if (isTripMode) {
    // Trip mode: Show all events for the selected trip grouped by past/upcoming
    const tripEvents = getTripEvents();
    const now = new Date();

    const pastEvents = tripEvents.filter(
      (event) => new Date(event.endTime) < now
    );
    const upcomingEvents = tripEvents.filter(
      (event) => new Date(event.startTime) >= now
    );

    return (
      <div className="events-panel">
        <div className="events-panel-header">
          <h3>Trip Events</h3>
          <button onClick={handleCreateEvent} className="create-event-button">
            + New Event
          </button>
        </div>

        <div className="events-panel-content">
          <div className="selected-trip-info">
            <h4>🧳 {selectedTrip.name}</h4>
            <p>{formatTripDateRange(selectedTrip)}</p>
            <p>
              {tripEvents.length} event{tripEvents.length !== 1 ? "s" : ""} (
              {upcomingEvents.length} upcoming, {pastEvents.length} past)
            </p>
          </div>

          <div className="events-list">
            {tripEvents.length === 0 ? (
              <div className="no-events">
                <p>No events for this trip...</p>
                <button
                  onClick={handleCreateEvent}
                  className="create-first-event"
                >
                  Create your first event...
                </button>
              </div>
            ) : (
              <>
                {/* Upcoming Events Section */}
                {upcomingEvents.length > 0 && (
                  <div className="trip-events-group">
                    <div className="trip-group-header upcoming">
                      <h5 className="trip-group-title">🔮 Upcoming Events</h5>
                      <span className="trip-event-count">
                        {upcomingEvents.length} event
                        {upcomingEvents.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="trip-events-list">
                      {upcomingEvents.map((event) =>
                        renderEventItem(event, true)
                      )}
                    </div>
                  </div>
                )}

                {/* Past Events Section */}
                {pastEvents.length > 0 && (
                  <div className="trip-events-group">
                    <div className="trip-group-header past">
                      <h5 className="trip-group-title">📚 Past Events</h5>
                      <span className="trip-event-count">
                        {pastEvents.length} event
                        {pastEvents.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="trip-events-list">
                      {pastEvents.map((event) => renderEventItem(event, true))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isDateMode) {
    // Date mode: Show events for the selected date with trip filtering
    const { tripGroups, noTripEvents } = getEventsGroupedByTrip();
    const totalEvents =
      tripGroups.reduce((sum, group) => sum + group.events.length, 0) +
      noTripEvents.length;
    const actualTotalEvents = events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === selectedDate.toDateString();
    }).length;

    return (
      <div className="events-panel">
        <div className="events-panel-header">
          <h3>Day Events</h3>
          <button onClick={handleCreateEvent} className="create-event-button">
            + New Event
          </button>
        </div>

        <div className="events-panel-content">
          <div className="selected-date-info">
            <div className="date-header-with-edit">
              <h4>{formatDate(selectedDate)}</h4>
              <div className="date-header-buttons">
                <button
                  onClick={() => onEditDayHeader(selectedDate)}
                  className="edit-day-header-button-inline"
                  title="Edit day header"
                >
                  ✏️
                </button>
                <button
                  onClick={() => setShowDayMapModal(true)}
                  className="map-day-button-inline"
                  title="View events on map"
                >
                  🗺️
                </button>
              </div>
            </div>
            <p>
              {actualTotalEvents} event{actualTotalEvents !== 1 ? "s" : ""}
            </p>

            {/* Show active trips for this date */}
            {getTripsForDate(selectedDate).length > 0 && (
              <div className="active-trips-info">
                <h5>Active Trips:</h5>
                {getTripsForDate(selectedDate).map((trip) => (
                  <div key={trip.id} className="trip-info-item">
                    <label className="trip-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedTripIds.has(trip.id)}
                        onChange={() => handleTripToggle(trip.id)}
                        className="trip-checkbox"
                      />
                      <span className="trip-name">🧳 {trip.name}</span>
                      <span className="trip-dates">
                        ({formatTripDateRange(trip)})
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="events-list">
            {actualTotalEvents === 0 ? (
              <div className="no-events">
                <p>No events scheduled...</p>
                <button
                  onClick={handleCreateEvent}
                  className="create-first-event"
                >
                  Create your first event...
                </button>
              </div>
            ) : totalEvents === 0 ? (
              <div className="no-events">
                <p>All events are filtered out</p>
                <p className="filter-hint">
                  Check trip boxes above to show events
                </p>
              </div>
            ) : (
              <>
                {/* Trip-grouped events */}
                {tripGroups.map(({ trip, events }) => (
                  <div key={trip.id} className="trip-events-group">
                    <div className="trip-group-header">
                      <h5 className="trip-group-title">🧳 {trip.name}</h5>
                      <span className="trip-group-dates">
                        {formatTripDateRange(trip)}
                      </span>
                      <span className="trip-event-count">
                        {events.length} event{events.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="trip-events-list">
                      {events.map((event) => renderEventItem(event))}
                    </div>
                  </div>
                ))}

                {/* Events without trip */}
                {noTripEvents.length > 0 && (
                  <div className="trip-events-group">
                    <div className="trip-group-header no-trip">
                      <h5 className="trip-group-title">📅 Personal Events</h5>
                      <span className="trip-event-count">
                        {noTripEvents.length} event
                        {noTripEvents.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="trip-events-list">
                      {noTripEvents.map((event) => renderEventItem(event))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Day Map Modal */}
        {showDayMapModal && (
          <DayMapModal
            date={selectedDate}
            allEvents={events}
            trips={trips}
            onClose={() => setShowDayMapModal(false)}
            onDateChange={onDateChange}
          />
        )}
      </div>
    );
  }

  // Default state: No selection
  return (
    <div className="events-panel">
      <div className="events-panel-header">
        <h3>Events</h3>
      </div>
      <div className="events-panel-content">
        <div className="no-selection">
          <p>Select a trip or click on a date to view events...</p>
        </div>
      </div>
    </div>
  );
};

export default EventsPanel;
