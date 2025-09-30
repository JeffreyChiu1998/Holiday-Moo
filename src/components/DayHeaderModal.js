import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const DayHeaderModal = ({ date, existingHeader, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: "",
    location: "",
  });
  const [initialData, setInitialData] = useState({
    title: "",
    location: "",
  });

  useEffect(() => {
    const initial = {
      title: existingHeader?.title || "",
      location: existingHeader?.location || "",
    };
    setFormData(initial);
    setInitialData(initial);
  }, [existingHeader]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // If both fields are empty, remove the custom header
    if (!formData.title.trim() && !formData.location.trim()) {
      onSave(null);
    } else {
      const headerData = {
        title: formData.title.trim(),
        location: formData.location.trim(),
      };
      onSave(headerData);
    }

    onClose();
  };

  const handleClear = () => {
    setFormData({ title: "", location: "" });
  };

  const hasChanges = () => {
    return (
      formData.title.trim() !== initialData.title.trim() ||
      formData.location.trim() !== initialData.location.trim()
    );
  };

  const handleClose = () => {
    if (hasChanges()) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to close without saving?"
      );
      if (confirmed) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleOverlayClick = () => {
    const confirmed = window.confirm(
      "Are you sure you want to close the Edit Day Header window?"
    );
    if (confirmed) {
      onClose();
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const modalContent = (
    <div
      className="modal-overlay day-header-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleOverlayClick();
        }
      }}
    >
      <div
        className="modal-content day-header-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Edit Day Header</h2>
          <button className="close-button" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="day-header-form-content">
          <div className="selected-date-display">
            <h3>{formatDate(date)}</h3>
            <p>Customize how this day appears in the calendar</p>
          </div>

          <form onSubmit={handleSubmit} className="day-header-form">
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Wedding Day, Conference, Vacation"
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Paris, Hotel Marriott, Office"
                maxLength={30}
              />
            </div>

            <div className="form-info">
              <p>
                <strong>Note:</strong> Leave both fields empty to return to
                default view. Hover over the day in calendar to see the original
                date format.
              </p>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={handleClear}
                className="clear-button"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="cancel-button"
              >
                Cancel
              </button>
              <button type="submit" className="save-button">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DayHeaderModal;
