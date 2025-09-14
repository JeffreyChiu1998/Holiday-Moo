import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import DateRangePicker from "./DateRangePicker";
import DocumentPreview from "./DocumentPreview";

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
    documents: [],
  });

  const [showDocumentPreview, setShowDocumentPreview] = useState(false);

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
        documents: editingTrip.documents || [],
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

  const handleBudgetChange = (e) => {
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
      budget: formattedValue,
    }));
  };

  // eslint-disable-next-line no-unused-vars
  const formatBudgetDisplay = (value) => {
    if (!value) return "";
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value;
    return `$${numValue.toFixed(2)}`;
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

    // Check for duplicate trip names (excluding current trip when editing)
    const trimmedName = formData.name.trim();
    const isDuplicate = existingTrips.some(
      (trip) =>
        trip.name.toLowerCase() === trimmedName.toLowerCase() &&
        trip.id !== editingTrip?.id
    );

    if (isDuplicate) {
      alert(
        `A trip with the name "${trimmedName}" already exists. Please choose a different name.`
      );
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

  const handleOverlayClick = () => {
    const hasChanges = editingTrip
      ? formData.name !== editingTrip.name ||
        formData.destination !== editingTrip.destination ||
        formData.startDate !== editingTrip.startDate ||
        formData.endDate !== editingTrip.endDate ||
        formData.budget !== editingTrip.budget ||
        formData.description !== editingTrip.description ||
        formData.travelers !== editingTrip.travelers ||
        formData.activities !== editingTrip.activities
      : formData.name ||
        formData.destination ||
        formData.startDate ||
        formData.endDate ||
        formData.budget ||
        formData.description ||
        formData.travelers ||
        formData.activities ||
        formData.documents;

    if (hasChanges) {
      const message = editingTrip
        ? "You have unsaved changes. Are you sure you want to close without saving?"
        : "You have started creating a new trip. Are you sure you want to close without saving?";
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
      className="modal-overlay trip-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleOverlayClick();
        }
      }}
    >
      <div
        className="modal-content trip-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{editingTrip ? "Edit Trip" : "Create New Trip"}</h2>
          <button className="close-button" onClick={handleOverlayClick}>
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

          <div className="form-row">
            <div className="form-group">
              <label>Budget</label>
              <div style={{ position: "relative" }}>
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
                  name="budget"
                  value={formData.budget}
                  onChange={handleBudgetChange}
                  placeholder="0.00"
                  style={{ paddingLeft: "20px" }}
                  onBlur={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, "");
                    if (value && !isNaN(parseFloat(value))) {
                      setFormData((prev) => ({
                        ...prev,
                        budget: parseFloat(value).toFixed(2),
                      }));
                    }
                  }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Travelers</label>
              <input
                type="text"
                name="travelers"
                value={formData.travelers}
                onChange={handleInputChange}
                placeholder="e.g., 2 adults, 1 child"
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label>Activities</label>
            <textarea
              name="activities"
              value={formData.activities}
              onChange={handleInputChange}
              placeholder="Planned activities, tours, restaurants"
              rows="3"
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

          <div className="form-group full-width">
            <label>Trip Documents</label>
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
            <button
              type="button"
              onClick={handleOverlayClick}
              className="cancel-button"
            >
              Cancel
            </button>
            <button type="submit" className="save-button">
              {editingTrip ? "Update Trip" : "Create Trip"}
            </button>
          </div>
        </form>
      </div>

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

export default TripModal;
