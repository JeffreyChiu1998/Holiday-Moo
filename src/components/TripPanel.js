import React, { useState } from "react";
import TripModal from "./TripModal";

const TripPanel = ({
  trips,
  onCreateTrip,
  onEditTrip,
  onDeleteTrip,
  onSelectTrip,
  selectedTrip,
}) => {
  const [showTripModal, setShowTripModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [showPastTrips, setShowPastTrips] = useState(false);

  const handleCreateTrip = () => {
    setEditingTrip(null);
    setShowTripModal(true);
  };

  const handleEditTrip = (trip) => {
    setEditingTrip(trip);
    setShowTripModal(true);
  };

  const handleTripSave = (tripData) => {
    if (editingTrip) {
      onEditTrip({ ...tripData, id: editingTrip.id });
    } else {
      onCreateTrip({ ...tripData, id: Date.now().toString() });
    }
    setShowTripModal(false);
    setEditingTrip(null);
  };

  const handleDeleteTrip = (tripId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this trip? All associated events will remain but lose their trip association."
      )
    ) {
      onDeleteTrip(tripId);
    }
  };

  const formatDateRange = (startDate, endDate) => {
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
    return `${startStr} - ${endStr}`;
  };

  const getDaysUntilTrip = (startDate) => {
    const today = new Date();
    const start = new Date(startDate);
    const diffTime = start - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "In progress";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `${diffDays} days`;
  };

  const getTripStatus = (startDate, endDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (today < start) return "upcoming";
    if (today >= start && today <= end) return "active";
    return "past";
  };

  const categorizeTrips = () => {
    const upcomingTrips = [];
    const pastTrips = [];

    trips.forEach((trip) => {
      const status = getTripStatus(trip.startDate, trip.endDate);
      if (status === "past") {
        pastTrips.push(trip);
      } else {
        upcomingTrips.push(trip);
      }
    });

    // Sort upcoming trips by start date (earliest first)
    upcomingTrips.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    // Sort past trips by end date (most recent first)
    pastTrips.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));

    return { upcomingTrips, pastTrips };
  };

  const renderTripCard = (trip) => {
    const status = getTripStatus(trip.startDate, trip.endDate);
    const isSelected = selectedTrip?.id === trip.id;

    return (
      <div
        key={trip.id}
        className={`trip-card ${status} ${isSelected ? "selected" : ""}`}
        onClick={() => onSelectTrip(trip)}
      >
        <div className="trip-card-header">
          <h4 className="trip-name">{trip.name}</h4>
          <div className="trip-actions">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditTrip(trip);
              }}
              className="trip-action-button edit"
            >
              ✏️
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteTrip(trip.id);
              }}
              className="trip-action-button delete"
            >
              🗑️
            </button>
          </div>
        </div>

        <div className="trip-details">
          <div className="trip-dates">
            📅 {formatDateRange(trip.startDate, trip.endDate)}
          </div>

          {trip.destination && (
            <div className="trip-destination">📍 {trip.destination}</div>
          )}

          <div className="trip-status-info">
            <span className={`trip-status ${status}`}>
              {status === "upcoming" && getDaysUntilTrip(trip.startDate)}
              {status === "active" && "In Progress"}
              {status === "past" && "Completed"}
            </span>
          </div>

          {trip.budget && (
            <div className="trip-budget">💰 Budget: {trip.budget}</div>
          )}
        </div>

        {trip.description && (
          <div className="trip-description">{trip.description}</div>
        )}
      </div>
    );
  };

  const { upcomingTrips, pastTrips } = categorizeTrips();

  return (
    <div className="trip-panel">
      <div className="trip-panel-header">
        <h3>Trips</h3>
        <button onClick={handleCreateTrip} className="create-trip-button">
          + New Trip
        </button>
      </div>

      <div className="trip-list">
        {trips.length === 0 ? (
          <div className="no-trips">
            <p>No trips planned</p>
            <button onClick={handleCreateTrip} className="create-first-trip">
              Create your first trip...
            </button>
          </div>
        ) : (
          <>
            {/* Upcoming & Active Trips */}
            {upcomingTrips.length > 0 && (
              <div className="trip-section">
                <div className="trip-section-header">
                  <h4>Upcoming & Active Trips</h4>
                  <span className="trip-count">({upcomingTrips.length})</span>
                </div>
                <div className="trip-section-content">
                  {upcomingTrips.map(renderTripCard)}
                </div>
              </div>
            )}

            {/* Past Trips */}
            {pastTrips.length > 0 && (
              <div className="trip-section">
                <div
                  className="trip-section-header clickable"
                  onClick={() => setShowPastTrips(!showPastTrips)}
                >
                  <h4>Past Trips</h4>
                  <div className="section-controls">
                    <span className="trip-count">({pastTrips.length})</span>
                    <span
                      className={`expand-icon ${
                        showPastTrips ? "expanded" : ""
                      }`}
                    >
                      ▼
                    </span>
                  </div>
                </div>
                {showPastTrips && (
                  <div className="trip-section-content">
                    {pastTrips.map(renderTripCard)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showTripModal && (
        <TripModal
          editingTrip={editingTrip}
          existingTrips={trips}
          onSave={handleTripSave}
          onClose={() => {
            setShowTripModal(false);
            setEditingTrip(null);
          }}
        />
      )}
    </div>
  );
};

export default TripPanel;
