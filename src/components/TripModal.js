import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import DateRangePicker from "./DateRangePicker";
import DocumentPreview from "./DocumentPreview";
import GooglePlacesAutocomplete from "./GooglePlacesAutocomplete";

const TripModal = ({ editingTrip, existingTrips = [], onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: "",
    destination: "",
    destinationData: null, // Store Google Places data
    startDate: "",
    endDate: "",
    budget: "",
    description: "",
    travelers: [],
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
      // Handle backward compatibility for travelers field
      let travelersArray = [];
      if (editingTrip.travelers) {
        if (Array.isArray(editingTrip.travelers)) {
          travelersArray = editingTrip.travelers;
        } else if (typeof editingTrip.travelers === "string") {
          // Convert old string format to array
          travelersArray = editingTrip.travelers
            .split(",")
            .map((name) => ({ name: name.trim() }))
            .filter((t) => t.name);
        }
      }

      setFormData({
        name: editingTrip.name || "",
        destination: editingTrip.destination || "",
        destinationData: editingTrip.destinationData || null,
        startDate: editingTrip.startDate
          ? formatDateForInput(new Date(editingTrip.startDate))
          : "",
        endDate: editingTrip.endDate
          ? formatDateForInput(new Date(editingTrip.endDate))
          : "",
        budget: editingTrip.budget || "",
        description: editingTrip.description || "",
        travelers: travelersArray,
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

  const handleDestinationChange = (placeData) => {
    setFormData((prev) => ({
      ...prev,
      destination: placeData ? placeData.address : "",
      destinationData: placeData,
    }));
  };

  const handleAddTraveler = () => {
    setFormData((prev) => ({
      ...prev,
      travelers: [...prev.travelers, { name: "" }],
    }));
  };

  const handleTravelerNameChange = (index, name) => {
    setFormData((prev) => ({
      ...prev,
      travelers: prev.travelers.map((traveler, i) =>
        i === index ? { ...traveler, name } : traveler
      ),
    }));
  };

  const handleRemoveTraveler = (index) => {
    setFormData((prev) => ({
      ...prev,
      travelers: prev.travelers.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Please enter a trip name...");
      return;
    }

    if (!formData.destination.trim()) {
      alert("Please select a destination from the suggestions...");
      return;
    }

    if (!formData.destinationData) {
      alert(
        "Please select a valid destination from Google Places suggestions..."
      );
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
        formData.destinationData !== editingTrip.destinationData ||
        formData.startDate !== editingTrip.startDate ||
        formData.endDate !== editingTrip.endDate ||
        formData.budget !== editingTrip.budget ||
        formData.description !== editingTrip.description ||
        JSON.stringify(formData.travelers) !==
          JSON.stringify(editingTrip.travelers || [])
      : formData.name ||
        formData.destination ||
        formData.destinationData ||
        formData.startDate ||
        formData.endDate ||
        formData.budget ||
        formData.description ||
        formData.travelers.length > 0 ||
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
      onMouseDown={(e) => {
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
              <GooglePlacesAutocomplete
                value={formData.destination}
                onChange={handleDestinationChange}
                placeholder="Search for a destination..."
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Trip Dates *</label>
              <DateRangePicker
                startDate={formData.startDate}
                endDate={formData.endDate}
                onChange={handleDateRangeChange}
              />
            </div>

            <div className="form-group">
              <label>Budget</label>
              <input
                type="text"
                name="budget"
                value={formData.budget}
                onChange={handleBudgetChange}
                placeholder="$ 0.00"
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

          <div className="form-group full-width">
            <div className="travelers-section">
              <div className="travelers-header">
                <label>Travelers</label>
                <button
                  type="button"
                  onClick={handleAddTraveler}
                  className="add-traveler-button"
                >
                  + Add Traveler
                </button>
              </div>

              {formData.travelers.length === 0 ? (
                <div className="no-travelers">
                  <p>No travelers added yet. Click "Add Traveler" to start.</p>
                </div>
              ) : (
                <div className="travelers-list">
                  {formData.travelers.map((traveler, index) => (
                    <div key={index} className="traveler-item">
                      <input
                        type="text"
                        value={traveler.name}
                        onChange={(e) =>
                          handleTravelerNameChange(index, e.target.value)
                        }
                        placeholder="Traveler Name"
                        className="traveler-name-input"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveTraveler(index)}
                        className="remove-traveler-button"
                        title="Remove traveler"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
