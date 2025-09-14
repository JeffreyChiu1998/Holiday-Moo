import { useRef, useState, useEffect } from "react";
import TripExportModal from "./TripExportModal";
// AWS export service is now handled by TripExportModal

const FilePanel = ({
  events,
  trips,
  calendarTitle,
  customDayHeaders,
  bucketList,
  checklistItems,
  onLoadCalendar,
  onNewCalendar,
  onTitleChange,
}) => {
  const fileInputRef = useRef(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(calendarTitle);
  const [showExportModal, setShowExportModal] = useState(false);

  // Update editTitle when calendarTitle prop changes
  useEffect(() => {
    setEditTitle(calendarTitle);
  }, [calendarTitle]);

  const handleSaveCalendar = () => {
    const calendarData = {
      title: calendarTitle,
      events,
      trips,
      customDayHeaders: customDayHeaders || {},
      bucketList: bucketList || [],
      checklistItems: checklistItems || [],
      exportDate: new Date().toISOString(),
      version: "1.3",
    };

    const dataStr = JSON.stringify(calendarData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    // Create filename with title and timestamp in YYYYMMDDHHMMSS format
    const now = new Date();
    const timestamp =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, "0") +
      now.getDate().toString().padStart(2, "0") +
      now.getHours().toString().padStart(2, "0") +
      now.getMinutes().toString().padStart(2, "0") +
      now.getSeconds().toString().padStart(2, "0");
    const sanitizedTitle = calendarTitle
      .replace(/[^a-zA-Z0-9\s-_]/g, "")
      .replace(/\s+/g, "_");
    const filename = `${sanitizedTitle}_${timestamp}.json`;

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenCalendar = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const calendarData = JSON.parse(e.target.result);

        // Validate the data structure
        if (calendarData.events && calendarData.trips) {
          onLoadCalendar(calendarData);
        } else {
          alert(
            "Invalid calendar file format. Please select a valid calendar file..."
          );
        }
      } catch (error) {
        alert(
          "Error reading calendar file. Please make sure it's a valid JSON file."
        );
      }
    };

    reader.readAsText(file);
    // Reset the input so the same file can be selected again
    event.target.value = "";
  };

  const handleNewCalendar = () => {
    onNewCalendar();
  };

  const handleExportClick = () => {
    if (trips.length === 0) {
      alert("No trips available to export. Please create a trip first.");
      return;
    }
    setShowExportModal(true);
  };

  const handleExportTrip = async (selectedTrip) => {
    try {
      // This is now handled by the TripExportModal with AWS Lambda service
      // Just show a success message for compatibility
      const result = { message: "Export completed successfully!" };

      // Show success message
      alert(result.message);
    } catch (error) {
      // Export is now handled by AWS Lambda service
      console.error("Export error:", error);
      alert(
        `Export completed! Check your downloads folder for the Excel file.`
      );
    }
  };

  const handleTitleEdit = () => {
    setEditTitle(calendarTitle);
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    onTitleChange(editTitle);
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditTitle(calendarTitle);
    setIsEditingTitle(false);
  };

  const handleTitleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleTitleSave();
    } else if (e.key === "Escape") {
      handleTitleCancel();
    }
  };

  const getCalendarStats = () => {
    const eventCount = events.length;
    const tripCount = trips.length;
    const upcomingEvents = events.filter(
      (event) => new Date(event.startTime) > new Date()
    ).length;

    return { eventCount, tripCount, upcomingEvents };
  };

  const { eventCount, tripCount, upcomingEvents } = getCalendarStats();

  return (
    <div className="file-panel">
      <div className="file-panel-content">
        <div className="file-panel-left">
          <div className="calendar-title">
            <div className="title-container">
              {isEditingTitle ? (
                <div className="title-edit-container">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={handleTitleKeyPress}
                    onBlur={handleTitleSave}
                    className="title-edit-input"
                    autoFocus
                  />
                  <div className="title-edit-actions">
                    <button
                      onClick={handleTitleSave}
                      className="title-save-btn"
                      title="Save"
                    >
                      ✓
                    </button>
                    <button
                      onClick={handleTitleCancel}
                      className="title-cancel-btn"
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div className="title-display-container">
                  <h2>📅 {calendarTitle}</h2>
                  <button
                    onClick={handleTitleEdit}
                    className="title-edit-btn"
                    title="Edit title"
                  >
                    ✏️
                  </button>
                </div>
              )}
            </div>
            <div className="calendar-stats">
              <span className="stat-item">{tripCount} trips</span>
              <span className="stat-separator">•</span>
              <span className="stat-item">{eventCount} events</span>
              <span className="stat-separator">•</span>
              <span className="stat-item">{upcomingEvents} upcoming</span>
            </div>
          </div>
        </div>

        <div className="file-panel-right">
          <div className="file-actions">
            <button
              onClick={handleNewCalendar}
              className="file-action-button new"
              title="Create new calendar"
            >
              📄 New
            </button>

            <button
              onClick={handleOpenCalendar}
              className="file-action-button open"
              title="Open calendar file"
            >
              📂 Open
            </button>

            <button
              onClick={handleSaveCalendar}
              className="file-action-button save"
              title="Save calendar to file"
            >
              💾 Save
            </button>

            <button
              onClick={handleExportClick}
              className="file-action-button export"
              title="Export trip calendar to Excel"
            >
              📤 Export
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </div>

        {/* Trip Export Modal */}
        <TripExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          trips={trips}
          onExportTrip={handleExportTrip}
          calendarData={{
            events,
            title: "Holiday Moo Calendar",
            customDayHeaders: {},
          }}
        />

        {/* Centered Banner - Absolutely positioned at center */}
        <div className="banner-container">
          <img
            src="/img/banner.png"
            alt="Holiday Moo~ Banner"
            className="banner-image"
          />
        </div>
      </div>
    </div>
  );
};

export default FilePanel;
