import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import DateRangePicker from "./DateRangePicker";

const TripModal = ({ editingTrip, existingTrips = [], onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: "",
    destination: "",
    startDate: "",
    endDate: "",
    budget: "",
    description: "",
    travelers: "",
    activities: "",
  });

  const formatDateForInput = (date) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (editingTrip) {
      setFormData({
        name: editingTrip.name || "",
        destination: editingTrip.destination || "",
        startDate: editingTrip.startDate
          ? formatDateForInput(new Date(editingTrip.startDate))
          : "",
        endDate: editingTrip.endDate
          ? formatDateForInput(new Date(editingTrip.endDate))
          : "",
        budget: editingTrip.budget || "",
        description: editingTrip.description || "",
        travelers: editingTrip.travelers || "",
        activities: editingTrip.activities || "",
      });
    }
  }, [editingTrip]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateRangeChange = (startDate, endDate) => {
    setFormData((prev) => ({
      ...prev,
      startDate: formatDateForInput(startDate),
      endDate: formatDateForInput(endDate),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Please enter a trip name...");
      return;
    }

    if (!formData.destination.trim()) {
      alert("Please enter a destination...");
      return;
    }

    // Check for duplicate trip names
    const trimmedName = formData.name.trim();
    const isDuplicate = existingTrips.some(
      (trip) =>
        trip.name.toLowerCase() === trimmedName.toLowerCase() &&
        trip.id !== editingTrip?.id
    );

    if (isDuplicate) {
      alert(`A trip with the name "${trimmedName}" already exists.`);
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      alert("Please select start and end dates...");
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      alert("End date must be after start date");
      return;
    }

    const tripData = {
      ...formData,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
    };

    onSave(tripData);
  };

  const modalContent = (
    <div
      className="modal-overlay trip-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-content trip-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingTrip ? "Edit Trip" : "Create New Trip"}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="trip-form">
          <div className="form-row">
            <div className="form-group">
              <label>Trip Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Summer Vacation 2024"
                required
              />
            </div>

            <div className="form-group">
              <label>Destination *</label>
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleInputChange}
                placeholder="e.g., Paris, France"
                required
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label>Trip Dates *</label>
            <DateRangePicker
              startDate={formData.startDate}
              endDate={formData.endDate}
              onChange={handleDateRangeChange}
            />
          </div>

          <div className="form-group full-width">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Trip overview, notes, special occasions"
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="save-button">
              {editingTrip ? "Update Trip" : "Create Trip"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TripModal;