import { useState, useMemo } from "react";

const BucketListSidebar = ({
  bucketList,
  selectedItems,
  onItemToggle,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Get unique countries
  const countries = useMemo(() => {
    const countrySet = new Set();
    bucketList.forEach((item) => {
      if (item.location) {
        const location =
          typeof item.location === "string"
            ? item.location
            : item.location.address || item.location.name;
        // Extract country from location (assuming it's the last part after comma)
        const parts = location.split(",");
        if (parts.length > 0) {
          const country = parts[parts.length - 1].trim();
          countrySet.add(country);
        }
      }
    });
    return ["all", ...Array.from(countrySet).sort()];
  }, [bucketList]);

  // Get unique cities
  const cities = useMemo(() => {
    const citySet = new Set();
    bucketList.forEach((item) => {
      if (item.location) {
        const location =
          typeof item.location === "string"
            ? item.location
            : item.location.address || item.location.name;
        // Extract city from location (assuming it's the first part or second part)
        const parts = location.split(",");
        if (parts.length > 1) {
          const city = parts[0].trim();
          citySet.add(city);
        }
      }
    });
    return ["all", ...Array.from(citySet).sort()];
  }, [bucketList]);

  // Get unique activity types
  const activityTypes = useMemo(() => {
    const types = new Set();
    bucketList.forEach((item) => {
      if (item.type) {
        types.add(item.type.toLowerCase());
      }
    });
    return ["all", ...Array.from(types).sort()];
  }, [bucketList]);

  // Status options
  const statusOptions = ["all", "selected", "unselected"];

  // Filter bucket list items
  const filteredItems = bucketList.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCountry =
      filterCountry === "all" ||
      (item.location &&
        (typeof item.location === "string"
          ? item.location
          : item.location.address || item.location.name
        )
          .split(",")
          .pop()
          .trim() === filterCountry);

    const matchesCity =
      filterCity === "all" ||
      (item.location &&
        (typeof item.location === "string"
          ? item.location
          : item.location.address || item.location.name
        )
          .split(",")[0]
          .trim() === filterCity);

    const matchesType =
      filterType === "all" ||
      (item.type && item.type.toLowerCase() === filterType);

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "selected" && isSelected(item)) ||
      (filterStatus === "unselected" && !isSelected(item));

    return (
      matchesSearch &&
      matchesCountry &&
      matchesCity &&
      matchesType &&
      matchesStatus
    );
  });

  const isSelected = (item) => {
    return selectedItems.some((selected) => selected.id === item.id);
  };

  return (
    <div className="bucket-list-sidebar-overlay">
      <div className="bucket-list-sidebar">
        <div className="sidebar-header">
          <h3>📄 Select from Bucket List</h3>
          <button onClick={onClose} className="close-sidebar-button">
            ×
          </button>
        </div>

        <div className="sidebar-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sidebar-search"
            />
          </div>

          <div className="filters-grid">
            <div className="filter-group">
              <label className="filter-label">COUNTRY:</label>
              <select
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                className="sidebar-filter"
              >
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country === "all" ? "All Countries" : country}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">CITY:</label>
              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="sidebar-filter"
              >
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city === "all" ? "All Cities" : city}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">TYPE:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="sidebar-filter"
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
              <label className="filter-label">STATUS:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="sidebar-filter"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === "all"
                      ? "All Items"
                      : status === "selected"
                      ? "Selected"
                      : "Unselected"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="sidebar-content">
          {filteredItems.length === 0 ? (
            <div className="no-items">
              {bucketList.length === 0 ? (
                <p>Your bucket list is empty. Add some activities first!</p>
              ) : (
                <p>No items match your search criteria.</p>
              )}
            </div>
          ) : (
            <div className="bucket-items-list">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`bucket-sidebar-item ${
                    isSelected(item) ? "selected" : ""
                  }`}
                  onClick={() => onItemToggle(item)}
                >
                  <div className="item-checkbox">
                    <input
                      type="checkbox"
                      checked={isSelected(item)}
                      onChange={() => onItemToggle(item)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="item-content">
                    <div className="item-header">
                      <h4>{item.name}</h4>
                      {item.type && (
                        <span className="item-type">{item.type}</span>
                      )}
                    </div>

                    {item.location && (
                      <div className="item-location">
                        📍{" "}
                        {typeof item.location === "string"
                          ? item.location
                          : item.location.address || item.location.name}
                      </div>
                    )}

                    {item.description && (
                      <div className="item-description">
                        {item.description.length > 100
                          ? `${item.description.substring(0, 100)}...`
                          : item.description}
                      </div>
                    )}

                    <div className="item-details">
                      {item.estimatedCost &&
                        item.estimatedCost !== "Cost not specified" && (
                          <span className="item-cost">
                            💰 {item.estimatedCost}
                          </span>
                        )}
                      {item.openHours &&
                        item.openHours !== "Hours not specified" && (
                          <span className="item-hours">
                            🕐 {item.openHours}
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="selection-count">
            {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""}{" "}
            selected
          </div>
          <button onClick={onClose} className="done-button">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default BucketListSidebar;
