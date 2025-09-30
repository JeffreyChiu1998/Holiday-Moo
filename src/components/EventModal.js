import { useState, useEffect, useContext, useCallback } from "react";
import { createPortal } from "react-dom";
import LocationPicker from "./LocationPicker";
import TripModal from "./TripModal";
import DocumentPreview from "./DocumentPreview";
import { UndoRedoContext } from "./Calendar";
import { TRAVEL_EVENT_TYPES, DEFAULT_EVENT_TYPE } from "../config/events";
import { formatLocalDateTime } from "../utils/dateUtils";

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

  const handleCostChange = (e) => {
    const { value } = e.target;

    // Remove dollar sign and any non-numeric characters except decimal point
    const numericValue = value.replace(/[$,]/g, "").replace(/[^0-9.]/g, "");

    // Ensure only one decimal point
    const parts = numericValue.split(".");
    let formattedValue = parts[0];
    if (parts.length > 1) {
      formattedValue += "." + parts[1].slice(0, 2); // Limit to 2 decimal places
    }

    // Update the form data with raw numeric value
    setFormData((prev) => ({
      ...prev,
      cost: formattedValue,
    }));
  };

  // eslint-disable-next-line no-unused-vars
  const formatCostDisplay = (value) => {
    if (!value) return "";
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value;
    return `$${numValue.toFixed(2)}`;
  };

  const handleLocationChange = (locationData) => {
    setFormData((prev) => ({
      ...prev,
      location: locationData, // Save the entire location object (with coordinates if available)
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData((prev) => ({
      ...prev,
      documents: [...prev.documents, ...files],
    }));
    // Reset the input so the same files can be selected again
    e.target.value = "";
  };

  const handleRemoveDocument = (index) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
  };

  const handleTripCreate = (tripData) => {
    // Call the parent's trip creation handler
    if (onTripCreate) {
      const newTrip = onTripCreate(tripData);
      // Auto-select the newly created trip
      if (newTrip && newTrip.id) {
        setFormData((prev) => ({
          ...prev,
          tripId: newTrip.id,
        }));
      }
    }
    setShowTripModal(false);
  };

  const handleTripModalClose = () => {
    setShowTripModal(false);
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

    // Trip association is optional - events can exist without trips

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
      startTime: formatLocalDateTime(startDateTime),
      endTime: formatLocalDateTime(endDateTime),
      color:
        eventTypes.find((type) => type.value === formData.type)?.color ||
        "#3b82f6",
    };

    onSave(eventData);
  };

  const selectedEventType = eventTypes.find(
    (type) => type.value === formData.type
  );

  const handleOverlayClick = () => {
    const hasChanges = editingEvent?.id
      ? formData.name !== editingEvent.name ||
        formData.startTime !== editingEvent.startTime ||
        formData.endTime !== editingEvent.endTime ||
        formData.location !== editingEvent.location ||
        formData.remark !== editingEvent.remark ||
        formData.contact !== editingEvent.contact ||
        formData.cost !== editingEvent.cost ||
        formData.tags !== editingEvent.tags ||
        formData.type !== editingEvent.type ||
        formData.tripId !== editingEvent.tripId
      : formData.name ||
        formData.location ||
        formData.remark ||
        formData.contact ||
        formData.cost ||
        formData.tags ||
        formData.type !== DEFAULT_EVENT_TYPE ||
        formData.tripId ||
        formData.documents.length > 0 ||
        (formData.startTime &&
          formData.startTime !== selectedTimeSlot?.startTime) ||
        (formData.endTime && formData.endTime !== selectedTimeSlot?.endTime);

    if (hasChanges) {
      const message = editingEvent?.id
        ? "You have unsaved changes. Are you sure you want to close without saving?"
        : "You have started creating a new event. Are you sure you want to close without saving?";
      const confirmed = window.confirm(message);
      if (confirmed) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="modal-overlay event-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleOverlayClick();
        }
      }}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingEvent?.id ? "Edit Event" : "Create New Event"}</h2>
          <button className="close-button" onClick={handleOverlayClick}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="event-form">
          {formData.tripId && (
            <div className="trip-association-info">
              🧳 This event will be associated with:{" "}
              <strong>
                {trips.find((trip) => trip.id === formData.tripId)?.name ||
                  "Selected Trip"}
              </strong>
            </div>
          )}

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
                style={{ borderLeft: `4px solid ${selectedEventType?.color}` }}
              >
                {eventTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Associated Trip *</label>
              <select
                name="tripId"
                value={formData.tripId}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a trip...</option>
                {getAvailableTrips().map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.name}
                  </option>
                ))}
                <option
                  value="CREATE_NEW"
                  style={{ fontWeight: "bold", color: "#2563eb" }}
                >
                  ➕ Create New Trip
                </option>
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

          <div className="form-row">
            <div className="form-group">
              <label>Tags</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="e.g., family, business, adventure, romantic"
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <LocationPicker
                value={formData.location}
                onChange={handleLocationChange}
                placeholder="Search for a location or enter manually..."
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Contact</label>
              <input
                type="text"
                name="contact"
                value={formData.contact}
                onChange={handleInputChange}
                placeholder="Phone, email, or contact person"
              />
            </div>

            <div className="form-group">
              <label>Cost</label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                }}
              >
                <div
                  style={{ position: "relative", minWidth: "120px", flex: "1" }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#666",
                      pointerEvents: "none",
                    }}
                  >
                    $
                  </span>
                  <input
                    type="text"
                    name="cost"
                    value={formData.cost}
                    onChange={handleCostChange}
                    placeholder="0.00"
                    style={{ paddingLeft: "20px", width: "100%" }}
                    onBlur={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, "");
                      if (value && !isNaN(parseFloat(value))) {
                        setFormData((prev) => ({
                          ...prev,
                          cost: parseFloat(value).toFixed(2),
                        }));
                      }
                    }}
                  />
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    margin: 0,
                    whiteSpace: "nowrap",
                    fontSize: "14px",
                  }}
                >
                  <input
                    type="checkbox"
                    name="isPrepaid"
                    checked={formData.isPrepaid}
                    onChange={handleInputChange}
                    style={{ marginRight: "6px" }}
                  />
                  Pre-paid ✓
                </label>
              </div>
            </div>
          </div>

          <div className="form-group full-width">
            <label>Remark</label>
            <textarea
              name="remark"
              value={formData.remark}
              onChange={handleInputChange}
              placeholder="Additional notes or description"
              rows="3"
            />
          </div>

          <div className="form-group full-width">
            <label>Reservation Document</label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              multiple
            />
            {formData.documents.length > 0 && (
              <div className="documents-list">
                <p className="documents-count">
                  {formData.documents.length} document
                  {formData.documents.length !== 1 ? "s" : ""} selected:
                </p>
                {formData.documents.map((doc, index) => (
                  <div key={index} className="document-item">
                    <button
                      type="button"
                      onClick={() => setShowDocumentPreview(doc)}
                      className="document-name-button"
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
                    >
                      {doc.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument(index)}
                      className="remove-document-button"
                      title="Remove document"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
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

      {/* Trip Creation Modal */}
      {showTripModal && (
        <TripModal
          existingTrips={trips}
          onSave={handleTripCreate}
          onClose={handleTripModalClose}
        />
      )}

      {/* Document Preview Modal */}
      {showDocumentPreview && (
        <DocumentPreview
          document={showDocumentPreview}
          onClose={() => setShowDocumentPreview(false)}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default EventModal;
