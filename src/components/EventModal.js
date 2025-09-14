import { useState, useEffect, useContext, useCallback } from "react";
import { createPortal } from "react-dom";
import LocationPicker from "./LocationPicker";
import TripModal from "./TripModal";
import DocumentPreview from "./DocumentPreview";
import { UndoRedoContext } from "./Calendar";
import { TRAVEL_EVENT_TYPES, DEFAULT_EVENT_TYPE } from "../config/events";

const EventModal = ({
  selectedTimeSlot,
  selectedDate,
  editingEvent,
  selectedTrip,
  trips = [],
  onSave,
  onClose,
  onTripCreate,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    type: DEFAULT_EVENT_TYPE,
    tripId: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    coordinates: null,
    placeId: "",
    remark: "",
    tags: "",
    contact: "",
    cost: "",
    documents: [],
    isPrepaid: false,
  });

  const [showTripModal, setShowTripModal] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);

  // Get undo/redo functions from context
  // eslint-disable-next-line no-unused-vars
  const undoRedoContext = useContext(UndoRedoContext);

  const eventTypes = TRAVEL_EVENT_TYPES;

  const formatDateForInput = (date) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Auto-select a trip based on priority
  const getAutoSelectedTrip = useCallback(
    (eventDate) => {
      if (!trips || trips.length === 0) return "";

      // If there's a selectedTrip, use it
      if (selectedTrip?.id) return selectedTrip.id;

      // If event date is provided, prefer trips that include this date
      if (eventDate) {
        const date = new Date(eventDate);
        date.setHours(12, 0, 0, 0);

        const tripsForDate = trips.filter((trip) => {
          const tripStart = new Date(trip.startDate);
          const tripEnd = new Date(trip.endDate);
          tripStart.setHours(0, 0, 0, 0);
          tripEnd.setHours(23, 59, 59, 999);

          return date >= tripStart && date <= tripEnd;
        });

        if (tripsForDate.length > 0) {
          return tripsForDate[0].id; // Return first matching trip
        }
      }

      // Otherwise, return the first available trip
      return trips[0]?.id || "";
    },
    [trips, selectedTrip]
  );

  useEffect(() => {
    if (editingEvent) {
      const startTime = new Date(editingEvent.startTime);
      const endTime = new Date(editingEvent.endTime);

      const dateStr = formatDateForInput(startTime);
      setFormData({
        name: editingEvent.name || "",
        type: editingEvent.type || DEFAULT_EVENT_TYPE,
        tripId: editingEvent.tripId || getAutoSelectedTrip(dateStr),
        date: dateStr,
        startTime: `${startTime
          .getHours()
          .toString()
          .padStart(2, "0")}:${startTime
          .getMinutes()
          .toString()
          .padStart(2, "0")}`,
        endTime: `${endTime.getHours().toString().padStart(2, "0")}:${endTime
          .getMinutes()
          .toString()
          .padStart(2, "0")}`,
        location: editingEvent.location || "",
        coordinates: editingEvent.coordinates || null,
        placeId: editingEvent.placeId || "",
        remark: editingEvent.remark || "",
        tags: editingEvent.tags || "",
        contact: editingEvent.contact || "",
        cost: editingEvent.cost || "",
        documents: editingEvent.documents || [],
        isPrepaid: editingEvent.isPrepaid || false,
      });
    } else if (selectedTimeSlot) {
      const startTime = selectedTimeSlot.startTime;
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour duration

      const dateStr = formatDateForInput(selectedTimeSlot.date);
      setFormData({
        name: "",
        type: DEFAULT_EVENT_TYPE,
        tripId: getAutoSelectedTrip(dateStr),
        date: dateStr,
        startTime: `${startTime
          .getHours()
          .toString()
          .padStart(2, "0")}:${startTime
          .getMinutes()
          .toString()
          .padStart(2, "0")}`,
        endTime: `${endTime.getHours().toString().padStart(2, "0")}:${endTime
          .getMinutes()
          .toString()
          .padStart(2, "0")}`,
        location: "",
        coordinates: null,
        placeId: "",
        remark: "",
        tags: "",
        contact: "",
        cost: "",
        documents: [],
        isPrepaid: false,
      });
    } else if (selectedDate) {
      // New event for a specific date
      const dateStr = formatDateForInput(selectedDate);
      setFormData({
        name: "",
        type: DEFAULT_EVENT_TYPE,
        tripId: getAutoSelectedTrip(dateStr),
        date: dateStr,
        startTime: "09:00",
        endTime: "10:00",
        location: "",
        coordinates: null,
        placeId: "",
        remark: "",
        tags: "",
        contact: "",
        cost: "",
        documents: [],
        isPrepaid: false,
      });
    }
  }, [
    selectedTimeSlot,
    selectedDate,
    editingEvent,
    selectedTrip,
    trips,
    getAutoSelectedTrip,
  ]);

  // Get all available trips (no date filtering)
  const getAvailableTrips = () => {
    return trips || [];
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Handle "Create New Trip" option
    if (name === "tripId" && value === "CREATE_NEW") {
      setShowTripModal(true);
      return;
    }

    // If date changes and no trip is selected, auto-select one
    if (name === "date" && value && !formData.tripId) {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        tripId: getAutoSelectedTrip(value),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Please enter an event name...");
      return;
    }

    if (!formData.date) {
      alert("Please select a date...");
      return;
    }

    // Use the date from the form
    const baseDate = new Date(formData.date);

    const [startHour, startMinute] = formData.startTime.split(":").map(Number);
    const [endHour, endMinute] = formData.endTime.split(":").map(Number);

    const startDateTime = new Date(baseDate);
    startDateTime.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(baseDate);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    if (endDateTime <= startDateTime) {
      alert("End time must be after start time");
      return;
    }

    const eventData = {
      ...formData,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      color:
        eventTypes.find((type) => type.value === formData.type)?.color ||
        "#3b82f6",
    };

    onSave(eventData);
  };

  const modalContent = (
    <div
      className="modal-overlay event-modal-overlay"
      onClick={() => onClose()}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingEvent?.id ? "Edit Event" : "Create New Event"}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-group full-width">
            <label>Event Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter event name..."
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Event Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
              >
                {eventTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Associated Trip</label>
              <select
                name="tripId"
                value={formData.tripId}
                onChange={handleInputChange}
              >
                <option value="">Select a trip...</option>
                {getAvailableTrips().map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.name}
                  </option>
                ))}
                <option value="CREATE_NEW">➕ Create New Trip</option>
              </select>
            </div>
          </div>

          <div className="form-group full-width">
            <label>Event Date *</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Time *</label>
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>End Time *</label>
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label>Location</label>
            <LocationPicker
              value={formData.location}
              onChange={(locationData) => setFormData(prev => ({...prev, location: locationData}))}
              placeholder="Search for a location..."
            />
          </div>

          <div className="form-group full-width">
            <label>Remark</label>
            <textarea
              name="remark"
              value={formData.remark}
              onChange={handleInputChange}
              placeholder="Additional notes..."
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="save-button">
              {editingEvent?.id ? "Update Event" : "Create Event"}
            </button>
          </div>
        </form>
      </div>

      {showTripModal && (
        <TripModal
          existingTrips={trips}
          onSave={(tripData) => {
            const newTrip = onTripCreate(tripData);
            if (newTrip?.id) {
              setFormData(prev => ({...prev, tripId: newTrip.id}));
            }
            setShowTripModal(false);
          }}
          onClose={() => setShowTripModal(false)}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default EventModal;