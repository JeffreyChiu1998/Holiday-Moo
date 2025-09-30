import React from "react";

const EventBlock = React.memo(
  ({ event, onView, isOverlapping, overlapCount }) => {
    const formatTime = (timeString) => {
      const date = new Date(timeString);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
    };

    const getDuration = () => {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      const diffMs = end - start;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffHours > 0) {
        return diffMinutes > 0
          ? `${diffHours}h ${diffMinutes}m`
          : `${diffHours}h`;
      }
      return `${diffMinutes}m`;
    };

    const isShortEvent = () => {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      const diffMs = end - start;
      return diffMs <= 30 * 60 * 1000; // 30 minutes or less
    };

    const handleClick = (e) => {
      e.stopPropagation();
      onView(event);
    };

    // Determine if we should use compact layout
    const useCompactLayout =
      isShortEvent() || (isOverlapping && overlapCount > 2);

    return (
      <div
        className={`event-block ${
          useCompactLayout ? "event-block-short" : ""
        } ${isOverlapping ? "event-block-overlapping" : ""}`}
        onClick={handleClick}
      >
        <div className="event-content">
          <div className="event-name" title={event.name}>
            {event.name}
            {event.isPrepaid && <span className="prepaid-indicator">✓</span>}
            {isOverlapping && overlapCount > 1 && (
              <span className="overlap-indicator">+{overlapCount - 1}</span>
            )}
          </div>

          {useCompactLayout ? (
            // Compact layout for short events or overlapping events
            <div className="event-time-compact">
              {formatTime(event.startTime)}
              {!isOverlapping && ` (${getDuration()})`}
              {event.location && !isOverlapping && (
                <span className="event-location-inline">
                  {" "}
                  📍{" "}
                  {typeof event.location === "object"
                    ? event.location.name ||
                      event.location.address ||
                      "Location"
                    : event.location}
                </span>
              )}
            </div>
          ) : (
            // Full layout for longer events with consistent time format
            <>
              <div className="event-time">
                {formatTime(event.startTime)} ({getDuration()})
              </div>

              {event.location && (
                <div className="event-location">
                  📍{" "}
                  {typeof event.location === "object"
                    ? event.location.name ||
                      event.location.address ||
                      "Location"
                    : event.location}
                </div>
              )}

              {event.tags && !isOverlapping && (
                <div className="event-tags">
                  {event.tags.split(",").map((tag, index) => (
                    <span key={index} className="event-tag">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
);

export default EventBlock;
