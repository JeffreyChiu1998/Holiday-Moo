import { useState } from "react";
import { createPortal } from "react-dom";

const ChecklistModal = ({ isOpen, checklistItems, onClose, onUpdateItems }) => {
  const [newItemText, setNewItemText] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const handleToggleItem = (itemId) => {
    const updatedItems = checklistItems.map((item) =>
      item.id === itemId ? { ...item, packed: !item.packed } : item
    );
    onUpdateItems(updatedItems);
  };

  const handleToggleDisabled = (itemId) => {
    const updatedItems = checklistItems.map((item) =>
      item.id === itemId
        ? { ...item, disabled: !item.disabled, packed: false }
        : item
    );
    onUpdateItems(updatedItems);
  };

  const handleDeleteItem = (itemId) => {
    if (
      window.confirm(
        "Are you sure you want to remove this item from your checklist?"
      )
    ) {
      const updatedItems = checklistItems.filter((item) => item.id !== itemId);
      onUpdateItems(updatedItems);
    }
  };

  const handleClearAll = () => {
    if (
      window.confirm(
        "Are you sure you want to unpack all items? This will clear all checkmarks."
      )
    ) {
      const updatedItems = checklistItems.map((item) => ({
        ...item,
        packed: false,
      }));
      onUpdateItems(updatedItems);
    }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    const newItem = {
      id: Date.now() + Math.random(),
      text: newItemText.trim(),
      packed: false,
      isCustom: true,
      dateAdded: new Date().toISOString(),
    };

    onUpdateItems([...checklistItems, newItem]);
    setNewItemText("");
    setShowAddForm(false);
  };

  const handleClose = () => {
    const hasUnfinishedAdd = showAddForm && newItemText.trim();

    if (hasUnfinishedAdd) {
      const confirmed = window.confirm(
        "You have an unsaved item. Are you sure you want to close without adding it?"
      );
      if (confirmed) {
        setNewItemText("");
        setShowAddForm(false);
        onClose();
      }
    } else {
      setNewItemText("");
      setShowAddForm(false);
      onClose();
    }
  };

  const enabledItems = checklistItems.filter((item) => !item.disabled);
  const totalItems = enabledItems.length;
  const packedItems = enabledItems.filter((item) => item.packed).length;
  const packedPercentage =
    totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 100;

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="modal-overlay checklist-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="modal-content checklist-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-content">
            <div className="checklist-modal-icon">
              <img
                src="/img/clipboard.png"
                alt="Travel Checklist"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
              <div
                className="checklist-icon-fallback"
                style={{ display: "none" }}
              >
                📝
              </div>
            </div>
            <h2>Travel Checklist</h2>
          </div>
          <button className="close-button" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="checklist-content">
          {/* Progress Summary */}
          <div className="checklist-progress">
            <div className="progress-info">
              <h3>Packing Progress</h3>
              <div className="progress-stats">
                <span className="packed-count">
                  {packedItems} of {totalItems} items packed
                </span>
                <span className="packed-percentage">({packedPercentage}%)</span>
              </div>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${packedPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Add New Item */}
          <div className="add-item-section">
            {!showAddForm ? (
              <div className="add-item-buttons">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="add-item-button"
                >
                  ➕ Add Custom Item
                </button>
                <button
                  onClick={handleClearAll}
                  className="clear-all-button"
                  disabled={packedItems === 0}
                >
                  🗑️ Clear All
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddItem} className="add-item-form">
                <input
                  type="text"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder="Enter item name..."
                  className="add-item-input"
                  autoFocus
                />
                <div className="add-item-actions">
                  <button type="submit" className="add-confirm-button">
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewItemText("");
                      setShowAddForm(false);
                    }}
                    className="add-cancel-button"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Checklist Items */}
          <div className="checklist-items">
            {checklistItems.length === 0 ? (
              <div className="no-items">
                <h3>Your checklist is empty</h3>
                <p>Add some items to start packing!</p>
              </div>
            ) : (
              checklistItems.map((item) => (
                <div
                  key={item.id}
                  className={`checklist-item ${item.packed ? "packed" : ""} ${
                    item.disabled ? "disabled" : ""
                  }`}
                >
                  <label className="checklist-item-label">
                    <input
                      type="checkbox"
                      checked={item.packed}
                      onChange={() => handleToggleItem(item.id)}
                      className="checklist-checkbox"
                      disabled={item.disabled}
                    />
                    <span className="checkbox-custom"></span>
                    <span className="item-text">{item.text}</span>
                  </label>
                  <div className="item-actions">
                    {item.isCustom && (
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="delete-item-button"
                        title="Remove item"
                      >
                        🗑️
                      </button>
                    )}
                    <label
                      className="disable-switch"
                      title={item.disabled ? "Enable item" : "Disable item"}
                    >
                      <input
                        type="checkbox"
                        checked={item.disabled || false}
                        onChange={() => handleToggleDisabled(item.id)}
                        className="disable-checkbox"
                      />
                      <span className="disable-slider"></span>
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="checklist-actions">
          <div className="checklist-stats">
            {totalItems > 0 && (
              <span>
                {packedItems} packed, {totalItems - packedItems} remaining
              </span>
            )}
          </div>
          <button onClick={handleClose} className="close-checklist-button">
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ChecklistModal;
