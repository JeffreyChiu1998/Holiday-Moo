import React, { useState } from "react";
import { createPortal } from "react-dom";
import AddBucketItemModal from "./AddBucketItemModal";
import BucketListMapModal from "./BucketListMapModal";

const BucketListModal = ({
  isOpen,
  bucketList,
  onClose,
  onDeleteItem,
  onAddItem,
  onAddToCalendar,
  onBucketListChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedMapItem, setSelectedMapItem] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Advanced filter states
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [filterBeenTo, setFilterBeenTo] = useState("all");

  // Generate dynamic activity types based on existing bucket list items
  const activityTypes = React.useMemo(() => {
    const existingTypes = new Set();

    bucketList.forEach((item) => {
      if (item.type) {
        existingTypes.add(item.type.toLowerCase());
      }
    });

    // Convert to array and sort, with "all" first
    const sortedTypes = ["all", ...Array.from(existingTypes).sort()];

    return sortedTypes;
  }, [bucketList]);

  const filteredItems = bucketList.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.location &&
        (typeof item.location === "string"
          ? item.location.toLowerCase().includes(searchTerm.toLowerCase())
          : (item.location.address || item.location.name || "")
              .toLowerCase()
              .includes(searchTerm.toLowerCase())));

    const matchesType =
      filterType === "all" || item.type?.toLowerCase() === filterType;

    // Country filter - use dedicated field or fallback to parsing
    let itemCountry = item.country || "";
    if (!itemCountry && item.location) {
      const itemLocation =
        typeof item.location === "string"
          ? item.location
          : item.location?.address || item.location?.name || "";
      const locationParts = itemLocation.split(",").map((part) => part.trim());
      itemCountry =
        locationParts.length >= 2
          ? locationParts[locationParts.length - 1]
          : "";
    }
    const matchesCountry =
      filterCountry === "all" || itemCountry === filterCountry;

    // City filter - use dedicated field or fallback to parsing
    let itemCity = item.city || "";
    if (!itemCity && item.location) {
      const itemLocation =
        typeof item.location === "string"
          ? item.location
          : item.location?.address || item.location?.name || "";
      const locationParts = itemLocation.split(",").map((part) => part.trim());
      itemCity = locationParts.length >= 1 ? locationParts[0] : "";
    }
    const matchesCity = filterCity === "all" || itemCity === filterCity;

    // Been to filter
    const matchesBeenTo =
      filterBeenTo === "all" ||
      (filterBeenTo === "visited" && item.beenTo) ||
      (filterBeenTo === "not-visited" && !item.beenTo);

    return (
      matchesSearch &&
      matchesType &&
      matchesCountry &&
      matchesCity &&
      matchesBeenTo
    );
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Reset to first page when filters change
  const resetPagination = () => {
    setCurrentPage(1);
  };

  // Reset pagination when filters change
  React.useEffect(() => {
    resetPagination();
  }, [searchTerm, filterType, filterCountry, filterCity, filterBeenTo]);

  const handleDeleteItem = (itemId) => {
    if (
      window.confirm(
        "Are you sure you want to remove this item from your bucket list?"
      )
    ) {
      onDeleteItem(itemId);
    }
  };

  const handleAddToCalendar = (item) => {
    if (onAddToCalendar) {
      onAddToCalendar(item);
      // Close the bucket list modal when adding to calendar
      onClose();
    }
  };

  const handleBeenToToggle = (itemId) => {
    const updatedList = bucketList.map((item) =>
      item.id === itemId ? { ...item, beenTo: !item.beenTo } : item
    );
    onBucketListChange(updatedList);
  };

  const handleItemSelect = (itemId) => {
    // Toggle selection - if clicking the same item, deselect it
    if (selectedItemId === itemId) {
      setSelectedItemId(null);
    } else {
      setSelectedItemId(itemId);
    }
  };

  const handleEditItem = () => {
    if (selectedItemId) {
      const item = bucketList.find((item) => item.id === selectedItemId);
      setEditingItem(item);
      setShowEditItemModal(true);
    }
  };

  const handleUpdateItem = (updatedItem) => {
    const updatedList = bucketList.map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    );
    onBucketListChange(updatedList);
    setSelectedItemId(null);
    setEditingItem(null);
  };

  // Extract unique countries and cities from bucket list
  const getUniqueLocations = () => {
    const countries = new Set();
    const cities = new Set();

    bucketList.forEach((item) => {
      // Use dedicated country and city fields if available
      if (item.country) {
        countries.add(item.country);
      }
      if (item.city) {
        cities.add(item.city);
      }

      // Fallback: extract from location string for older items
      if ((!item.country || !item.city) && item.location) {
        const locationStr =
          typeof item.location === "string"
            ? item.location
            : item.location.address || item.location.name || "";

        const parts = locationStr.split(",").map((part) => part.trim());
        if (!item.country && parts.length >= 2) {
          countries.add(parts[parts.length - 1]);
        }
        if (!item.city && parts.length >= 1) {
          cities.add(parts[0]);
        }
      }
    });

    return {
      countries: Array.from(countries).sort(),
      cities: Array.from(cities).sort(),
    };
  };

  const { countries, cities } = getUniqueLocations();

  const handleClose = () => {
    const hasInteraction = searchTerm || filterType !== "all";

    if (hasInteraction) {
      const confirmed = window.confirm(
        "You have active filters or search terms. Are you sure you want to close?"
      );
      if (confirmed) {
        setSearchTerm("");
        setFilterType("all");
        onClose();
      }
    } else {
      onClose();
    }
  };

  const formatCost = (cost) => {
    if (!cost || cost === "N/A") return "Cost not specified";
    return cost.startsWith("$") ? cost : `$${cost}`;
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="modal-overlay bucket-list-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="modal-content bucket-list-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-content">
            <div className="bucket-modal-icon">
              <img
                src="/img/bucket.png"
                alt="Bucket List"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
              <div className="bucket-icon-fallback" style={{ display: "none" }}>
                🪣
              </div>
            </div>
            <h2>My Bucket List</h2>
          </div>
          <button className="close-button" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="bucket-list-content">
          {/* Search and Filter */}
          <div className="bucket-list-controls">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bucket-search-input"
              />
            </div>
            <div className="add-item-container">
              <button
                onClick={() => setShowAddItemModal(true)}
                className="add-item-button"
                title="Add new activity to bucket list"
              >
                ➕ Add Item
              </button>
              <button
                onClick={handleEditItem}
                disabled={!selectedItemId}
                className="edit-item-button"
                title="Edit selected item"
              >
                ✏️ Edit Item
              </button>
            </div>
          </div>

          {/* Advanced Filter Bar */}
          <div className="bucket-advanced-filters">
            <div className="filter-group">
              <label>Country:</label>
              <select
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                className="advanced-filter-select"
              >
                <option value="all">All Countries</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>City:</label>
              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="advanced-filter-select"
              >
                <option value="all">All Cities</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Type:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="advanced-filter-select"
              >
                {activityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === "all"
                      ? "All Types"
                      : type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Status:</label>
              <select
                value={filterBeenTo}
                onChange={(e) => setFilterBeenTo(e.target.value)}
                className="advanced-filter-select"
              >
                <option value="all">All Items</option>
                <option value="visited">✅ Visited</option>
                <option value="not-visited">📍 Not Visited</option>
              </select>
            </div>

            <div className="filter-group">
              <button
                onClick={() => {
                  setFilterCountry("all");
                  setFilterCity("all");
                  setFilterBeenTo("all");
                  setFilterType("all");
                  setSearchTerm("");
                  setSelectedItemId(null);
                  setCurrentPage(1);
                }}
                className="clear-filters-button"
                title="Clear all filters"
              >
                🔄 Clear Filters
              </button>
            </div>
          </div>

          {/* Bucket List Items */}
          <div className="bucket-list-items">
            {filteredItems.length === 0 ? (
              <div className="no-bucket-items">
                {bucketList.length === 0 ? (
                  <div>
                    <h3>Your bucket list is empty</h3>
                    <p>
                      Ask Moo for travel recommendations and save activities
                      you'd like to try!
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3>No items match your search</h3>
                    <p>Try adjusting your search terms or filter.</p>
                  </div>
                )}
              </div>
            ) : (
              paginatedItems.map((item) => (
                <div
                  key={item.id}
                  className={`bucket-list-item ${
                    selectedItemId === item.id ? "selected" : ""
                  }`}
                  onClick={() => handleItemSelect(item.id)}
                >
                  <div className="bucket-item-header">
                    <div className="bucket-item-title-content">
                      <h4 title={item.name}>{item.name}</h4>
                      <span className="bucket-item-type">{item.type}</span>
                      <label
                        className={`bucket-item-status-badge ${
                          item.beenTo ? "visited" : "not-visited"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={item.beenTo || false}
                          onChange={() => handleBeenToToggle(item.id)}
                        />
                        {item.beenTo ? "✅ Visited" : "📍 Want to Visit"}
                      </label>
                    </div>
                    <div className="bucket-item-actions">
                      {item.coordinates && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMapItem(item);
                            setShowMapModal(true);
                          }}
                          className="bucket-map-button"
                          title="View on map"
                        >
                          🗺️
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCalendar(item);
                        }}
                        className="bucket-calendar-button"
                        title="Add to calendar"
                      >
                        📅
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem(item.id);
                        }}
                        className="bucket-item-delete"
                        title="Remove from bucket list"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="bucket-item-content">
                    {/* Image Preview */}
                    {item.imgUrl && (
                      <div className="bucket-item-image">
                        <img
                          src={item.imgUrl}
                          alt={item.name}
                          className="bucket-image-preview"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      </div>
                    )}

                    <div className="bucket-item-details">
                      {item.location &&
                        item.location !== "Location not specified" && (
                          <div
                            className="bucket-item-location"
                            title={item.location}
                          >
                            📍 {item.location}
                          </div>
                        )}

                      <div className="bucket-item-info-row">
                        {item.estimatedCost &&
                          item.estimatedCost !== "Cost not specified" && (
                            <div
                              className="bucket-item-cost"
                              title={`Cost: ${formatCost(item.estimatedCost)}`}
                            >
                              💰 {formatCost(item.estimatedCost)}
                            </div>
                          )}
                        {item.openHours &&
                          item.openHours !== "Hours not specified" && (
                            <div
                              className="bucket-item-hours"
                              title={`Hours: ${item.openHours}`}
                            >
                              🕐 {item.openHours}
                            </div>
                          )}
                      </div>

                      {item.description && (
                        <div
                          className="bucket-item-description"
                          title={item.description}
                        >
                          {item.description}
                        </div>
                      )}

                      {(item.link || item.dateAdded) && (
                        <div className="bucket-item-link-date-row">
                          {item.link && (
                            <div className="bucket-item-link">
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bucket-link"
                              >
                                🔗 Visit Website
                              </a>
                            </div>
                          )}

                          {item.dateAdded && (
                            <div className="bucket-item-date">
                              Added:{" "}
                              {new Date(item.dateAdded).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        {filteredItems.length > itemsPerPage && (
          <div className="bucket-list-pagination">
            <button
              className="pagination-button"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            <div className="page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    className={`page-number ${
                      page === currentPage ? "active" : ""
                    }`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                )
              )}
            </div>

            <button
              className="pagination-button"
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
            >
              Next
            </button>

            <div className="pagination-info">
              Page {currentPage} of {totalPages} ({filteredItems.length} items)
            </div>
          </div>
        )}

        <div className="bucket-list-actions">
          <div className="bucket-list-stats">
            {bucketList.length > 0 && (
              <span>
                Showing {startIndex + 1}-
                {Math.min(endIndex, filteredItems.length)} of{" "}
                {filteredItems.length} items
                {searchTerm || filterType !== "all" ? " (filtered)" : ""}
              </span>
            )}
          </div>
          <button onClick={handleClose} className="close-bucket-button">
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(modalContent, document.body)}
      <AddBucketItemModal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        onAddItem={(item) => {
          onAddItem(item);
          setShowAddItemModal(false);
        }}
      />
      <AddBucketItemModal
        isOpen={showEditItemModal}
        onClose={() => {
          setShowEditItemModal(false);
          setEditingItem(null);
        }}
        onAddItem={(item) => {
          handleUpdateItem(item);
          setShowEditItemModal(false);
        }}
        editingItem={editingItem}
        isEditing={true}
      />
      <BucketListMapModal
        isOpen={showMapModal}
        onClose={() => {
          setShowMapModal(false);
          setSelectedMapItem(null);
        }}
        bucketItem={selectedMapItem}
      />
    </>
  );
};

export default BucketListModal;
