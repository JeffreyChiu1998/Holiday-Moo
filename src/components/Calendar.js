import { useState, useRef, useEffect, useCallback, createContext } from "react";
import EventModal from "./EventModal";
import EventDetailModal from "./EventDetailModal";
import EventBlock from "./EventBlock";
import TripPanel from "./TripPanel";
import EventsPanel from "./EventsPanel";
import FilePanel from "./FilePanel";
import ToolPanel from "./ToolPanel";

// Create context for undo/redo functionality
export const UndoRedoContext = createContext();

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [events, setEvents] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEventDetailModal, setShowEventDetailModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [viewingEvent, setViewingEvent] = useState(null);
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [calendarTitle, setCalendarTitle] = useState("Moo's Calendar");
  const appContainerRef = useRef(null);
  const calendarContentRef = useRef(null);

  // Undo/Redo functionality
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);

  // Handle clicks on blank areas to unselect everything
  const handleBackgroundClick = (event) => {
    // Check if click is on background areas (not on panels or interactive elements)
    const isOnPanel = event.target.closest(
      ".trip-panel, .events-panel, .file-panel, .tool-panel"
    );
    const isOnModal = event.target.closest(".modal-overlay");
    const isOnDatePicker = event.target.closest(".calendar-widget");
    const isOnButton = event.target.closest("button");
    const isOnInput = event.target.closest("input, select, textarea");
    const isOnEventBlock = event.target.closest(".event-block");
    const isOnTimeSlot = event.target.closest(".time-slot");
    const isOnCalendarDay = event.target.closest(".calendar-day");
    const isOnDayHeaderCell = event.target.closest(".day-header-cell");

    if (
      !isOnPanel &&
      !isOnModal &&
      !isOnDatePicker &&
      !isOnButton &&
      !isOnInput &&
      !isOnEventBlock &&
      !isOnTimeSlot &&
      !isOnCalendarDay &&
      !isOnDayHeaderCell
    ) {
      setSelectedTrip(null);
      setSelectedDate(null);
    }
  };

  // Prevent event bubbling from panels
  const handlePanelClick = (event) => {
    event.stopPropagation();
  };

  // Handle clicks within calendar container - allow background clicks but prevent bubbling from interactive elements
  const handleCalendarClick = (event) => {
    // Only stop propagation if clicking on interactive elements, not on blank areas
    const isOnInteractiveElement = event.target.closest(
      "button, input, select, textarea, .event-block, .day-header-cell, .time-slot"
    );

    if (isOnInteractiveElement) {
      // Let interactive elements handle their own clicks
      return;
    }

    // For blank areas in calendar, allow the background click to work
    // Don't stop propagation so it reaches handleBackgroundClick
  };

  // Save current state to history
  const saveToHistory = useCallback(
    (action, data, currentEvents = events, currentTrips = trips) => {
      if (isUndoRedoAction) return; // Don't save undo/redo actions to history

      const newHistoryEntry = {
        timestamp: Date.now(),
        action,
        data,
        events: [...currentEvents],
        trips: [...currentTrips],
      };

      // Remove any history after current index (when user makes new action after undo)
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newHistoryEntry);

      // Keep only last 50 actions to prevent memory issues
      if (newHistory.length > 50) {
        newHistory.shift();
      } else {
        setHistoryIndex(historyIndex + 1);
      }

      setHistory(newHistory);
    },
    [isUndoRedoAction, events, trips, history, historyIndex]
  );

  // Undo last action
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;

    setIsUndoRedoAction(true);
    const previousState = history[historyIndex - 1];

    setEvents([...previousState.events]);
    setTrips([...previousState.trips]);
    setHistoryIndex(historyIndex - 1);

    setTimeout(() => setIsUndoRedoAction(false), 100);
  }, [historyIndex, history]);

  // Redo next action
  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;

    setIsUndoRedoAction(true);
    const nextState = history[historyIndex + 1];

    setEvents([...nextState.events]);
    setTrips([...nextState.trips]);
    setHistoryIndex(historyIndex + 1);

    setTimeout(() => setIsUndoRedoAction(false), 100);
  }, [historyIndex, history]);

  // Check if undo/redo is available
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Initialize history with current state
  useEffect(() => {
    if (history.length === 0) {
      const initialState = {
        timestamp: Date.now(),
        action: "INITIAL_STATE",
        data: {},
        events: [...events],
        trips: [...trips],
      };
      setHistory([initialState]);
      setHistoryIndex(0);
    }
  }, [events, trips, history.length]);

  // Scroll to 10 AM on component mount
  useEffect(() => {
    const scrollTo10AM = () => {
      if (calendarContentRef.current) {
        // Each time slot is 30px high, 2 slots per hour
        // 10 AM = 10 hours × 2 slots × 30px = 600px
        // Add some offset to account for the header (60px)
        const scrollPosition = 10 * 2 * 30 - 60; // 540px

        calendarContentRef.current.scrollTop = scrollPosition;
      }
    };

    // Use setTimeout to ensure the component is fully rendered
    const timer = setTimeout(scrollTo10AM, 100);

    return () => clearTimeout(timer);
  }, [currentDate]); // Re-scroll when week changes

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check if user is typing in an input field
      const isTyping =
        event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA" ||
        event.target.contentEditable === "true";

      if (isTyping) return;

      if (event.ctrlKey || event.metaKey) {
        if (event.key === "z" && !event.shiftKey) {
          event.preventDefault();
          handleUndo();
        } else if (event.key === "y" || (event.key === "z" && event.shiftKey)) {
          event.preventDefault();
          handleRedo();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Get current time line position
  const getCurrentTimeLinePosition = () => {
    const now = currentTime;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if current time is in the displayed week
    const weekDates = getWeekDates();
    const todayIndex = weekDates.findIndex(
      (date) => date.toDateString() === today.toDateString()
    );

    if (todayIndex === -1) return null; // Current day not in view

    // Calculate position
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    // Each time slot is 30px, header is 60px
    const topPosition = 60 + (totalMinutes / 30) * 30;

    return {
      top: topPosition,
      dayIndex: todayIndex,
    };
  };

  const renderCurrentTimeCell = () => {
    const position = getCurrentTimeLinePosition();
    if (!position) return null;

    const now = new Date();
    const timeString = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // Calculate column width (100% / 7 days)
    const columnWidth = 100 / 7;
    const leftPosition = 80 + position.dayIndex * columnWidth + "%";

    return (
      <div
        className="current-time-cell"
        style={{
          position: "absolute",
          top: `${position.top - 15}px`, // Center on the time
          left: leftPosition,
          transform: "translateX(-50%)",
          background: "#ef4444",
          color: "white",
          padding: "4px 8px",
          borderRadius: "12px",
          fontSize: "11px",
          fontWeight: "600",
          boxShadow: "0 2px 8px rgba(239, 68, 68, 0.4)",
          zIndex: 1000,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          border: "2px solid white",
        }}
      >
        {timeString}
      </div>
    );
  };

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction * 7);
    setCurrentDate(newDate);
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isDateInTripPeriod = (date) => {
    if (!selectedTrip) return false;

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const tripStart = new Date(selectedTrip.startDate);
    tripStart.setHours(0, 0, 0, 0);

    const tripEnd = new Date(selectedTrip.endDate);
    tripEnd.setHours(23, 59, 59, 999);

    return checkDate >= tripStart && checkDate <= tripEnd;
  };

  const getWeekDates = () => {
    const weekStart = getWeekStart(currentDate);
    const weekDates = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      weekDates.push(date);
    }

    return weekDates;
  };

  const getWeekRange = () => {
    const weekDates = getWeekDates();
    const startDate = weekDates[0];
    const endDate = weekDates[6];

    if (startDate.getMonth() === endDate.getMonth()) {
      return `${
        months[startDate.getMonth()]
      } ${startDate.getDate()} - ${endDate.getDate()}, ${startDate.getFullYear()}`;
    } else {
      return `${months[startDate.getMonth()]} ${startDate.getDate()} - ${
        months[endDate.getMonth()]
      } ${endDate.getDate()}, ${startDate.getFullYear()}`;
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        const displayTime =
          hour === 0 && minute === 0
            ? "12:00 AM"
            : hour === 0 && minute === 30
            ? "12:30 AM"
            : hour < 12
            ? `${hour}:${minute.toString().padStart(2, "0")} AM`
            : hour === 12
            ? `12:${minute.toString().padStart(2, "0")} PM`
            : `${hour - 12}:${minute.toString().padStart(2, "0")} PM`;
        slots.push({ hour, minute, timeString, displayTime });
      }
    }
    return slots;
  };

  const handleTimeSlotClick = (dayIndex, hour, minute) => {
    const weekDates = getWeekDates();
    const selectedDate = weekDates[dayIndex];
    const startTime = new Date(selectedDate);
    startTime.setHours(hour, minute, 0, 0);

    setSelectedTimeSlot({
      dayIndex,
      hour,
      minute,
      date: selectedDate,
      startTime,
    });
    setEditingEvent(null);
    setShowEventModal(true);
  };

  const handleEventSave = (eventData) => {
    // Use the tripId from the form data, or fall back to selectedTrip if not specified
    const eventWithTrip = {
      ...eventData,
      tripId: eventData.tripId || selectedTrip?.id || null,
    };

    if (editingEvent) {
      const updatedEvents = events.map((event) =>
        event.id === editingEvent.id
          ? { ...eventWithTrip, id: editingEvent.id }
          : event
      );
      setEvents(updatedEvents);

      // Save to history with updated state
      saveToHistory(
        "UPDATE_EVENT",
        {
          eventId: editingEvent.id,
          oldData: editingEvent,
          newData: eventWithTrip,
        },
        updatedEvents,
        trips
      );
    } else {
      const newEvent = {
        ...eventWithTrip,
        id: Date.now().toString(),
      };
      const updatedEvents = [...events, newEvent];
      setEvents(updatedEvents);

      // Save to history with updated state
      saveToHistory("CREATE_EVENT", { event: newEvent }, updatedEvents, trips);
    }
    setShowEventModal(false);
    setEditingEvent(null);
  };

  const handleEventView = (event) => {
    setViewingEvent(event);
    setShowEventDetailModal(true);
  };

  const handleEventEdit = (event) => {
    setEditingEvent(event);
    setShowEventModal(true);
    setShowEventDetailModal(false);
  };

  const handleEventDelete = (eventId) => {
    const eventToDelete = events.find((event) => event.id === eventId);
    if (eventToDelete) {
      const updatedEvents = events.filter((event) => event.id !== eventId);
      setEvents(updatedEvents);

      // Save to history with updated state
      saveToHistory(
        "DELETE_EVENT",
        { event: eventToDelete },
        updatedEvents,
        trips
      );
    }
  };

  // Trip management functions
  const handleCreateTrip = (tripData) => {
    const newTrip = { ...tripData, id: Date.now().toString() };
    const updatedTrips = [...trips, newTrip];
    setTrips(updatedTrips);

    // Save to history with updated state
    saveToHistory("CREATE_TRIP", { trip: newTrip }, events, updatedTrips);

    return newTrip; // Return the created trip so EventModal can auto-select it
  };

  const handleEditTrip = (tripData) => {
    const oldTrip = trips.find((trip) => trip.id === tripData.id);
    const updatedTrips = trips.map((trip) =>
      trip.id === tripData.id ? tripData : trip
    );
    setTrips(updatedTrips);

    if (oldTrip) {
      // Save to history with updated state
      saveToHistory(
        "UPDATE_TRIP",
        {
          tripId: tripData.id,
          oldData: oldTrip,
          newData: tripData,
        },
        events,
        updatedTrips
      );
    }
  };

  const handleDeleteTrip = (tripId) => {
    const tripToDelete = trips.find((trip) => trip.id === tripId);
    const affectedEvents = events.filter((event) => event.tripId === tripId);

    // Update state first
    const updatedTrips = trips.filter((trip) => trip.id !== tripId);
    const updatedEvents = events.map((event) =>
      event.tripId === tripId ? { ...event, tripId: null } : event
    );

    setTrips(updatedTrips);
    setEvents(updatedEvents);

    if (selectedTrip?.id === tripId) {
      setSelectedTrip(null);
    }

    if (tripToDelete) {
      // Save to history with updated state
      saveToHistory(
        "DELETE_TRIP",
        {
          trip: tripToDelete,
          affectedEvents: affectedEvents,
          wasSelected: selectedTrip?.id === tripId,
        },
        updatedEvents,
        updatedTrips
      );
    }
  };

  const getEarliestActiveWeekForTrip = (trip) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tripStart = new Date(trip.startDate);
    tripStart.setHours(0, 0, 0, 0);

    // If trip starts in the future or today, use trip start date
    if (tripStart >= today) {
      return tripStart;
    }

    // If trip started in the past, use current week (today)
    // This ensures we show the earliest "active" week (current week or later)
    return today;
  };

  const handleSelectTrip = (trip) => {
    const newSelectedTrip = selectedTrip?.id === trip.id ? null : trip;
    setSelectedTrip(newSelectedTrip);

    // Clear date selection when trip is selected
    if (newSelectedTrip) {
      setSelectedDate(null);

      // Change calendar view to the earliest active week of the selected trip
      const earliestActiveDate = getEarliestActiveWeekForTrip(newSelectedTrip);
      setCurrentDate(earliestActiveDate);
    }
  };

  const handleReturnDefaultView = () => {
    // Return to current week
    const today = new Date();
    setCurrentDate(today);

    // Clear selections
    setSelectedTrip(null);
    setSelectedDate(null);
  };

  const handleDateSelect = (date) => {
    // Toggle date selection - if same date is clicked, unselect it
    if (selectedDate && selectedDate.toDateString() === date.toDateString()) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
      // Clear trip selection when date is selected
      setSelectedTrip(null);
    }
  };

  const handleCreateEventFromPanel = (timeSlotData) => {
    setSelectedTimeSlot(timeSlotData);
    setEditingEvent(null);
    setShowEventModal(true);
  };

  // File management functions
  const handleLoadCalendar = (calendarData) => {
    try {
      // Load events
      if (calendarData.events && Array.isArray(calendarData.events)) {
        setEvents(calendarData.events);
      }

      // Load trips
      if (calendarData.trips && Array.isArray(calendarData.trips)) {
        setTrips(calendarData.trips);
      }

      // Load calendar title
      if (calendarData.title && typeof calendarData.title === "string") {
        setCalendarTitle(calendarData.title);
      }

      // Reset selections
      setSelectedTrip(null);
      setSelectedDate(null);
      setEditingEvent(null);
      setShowEventModal(false);

      alert(
        `Calendar loaded successfully! Imported ${
          calendarData.events?.length || 0
        } events and ${calendarData.trips?.length || 0} trips.`
      );
    } catch (error) {
      alert("Error loading calendar data. Please try again.");
      console.error("Error loading calendar:", error);
    }
  };

  const handleNewCalendar = () => {
    // Ask for new title
    const newTitle = prompt(
      "Enter a title for your new calendar...",
      "Holiday Moo~"
    );

    if (newTitle === null) {
      // User cancelled
      return;
    }

    // Confirm clearing current calendar
    if (events.length > 0 || trips.length > 0) {
      const confirmed = window.confirm(
        "Creating a new calendar will remove all current events and trips. Are you sure you want to continue?"
      );
      if (!confirmed) {
        return;
      }
    }

    // Clear calendar and set new title
    setEvents([]);
    setTrips([]);
    setSelectedTrip(null);
    setSelectedDate(null);
    setEditingEvent(null);
    setShowEventModal(false);
    setCalendarTitle(newTitle.trim() || "Holiday Moo~");
  };

  const handleTitleChange = (newTitle) => {
    setCalendarTitle(newTitle.trim() || "Holiday Moo~");
  };

  const getEventsForDay = (dayIndex) => {
    const weekDates = getWeekDates();
    const dayDate = weekDates[dayIndex];

    let dayEvents = events.filter((event) => {
      const eventStart = new Date(event.startTime);
      return eventStart.toDateString() === dayDate.toDateString();
    });

    // Filter by selected trip if one is selected
    if (selectedTrip) {
      dayEvents = dayEvents.filter((event) => event.tripId === selectedTrip.id);
    }

    return dayEvents;
  };

  const calculateEventPosition = (event) => {
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);

    // Calculate start position (in 30-minute slots from midnight)
    const startSlot =
      startTime.getHours() * 2 + (startTime.getMinutes() >= 30 ? 1 : 0);

    // Calculate duration in 30-minute slots
    const durationMs = endTime - startTime;
    const durationSlots = Math.ceil(durationMs / (30 * 60 * 1000));

    return {
      top: startSlot * 30, // 30px per slot
      height: durationSlots * 30,
      startSlot,
      durationSlots,
    };
  };

  // Current time functions removed - using floating indicator instead

  const renderTimeGrid = () => {
    const weekDates = getWeekDates();
    const timeSlots = generateTimeSlots();

    return (
      <div className="time-grid">
        {/* Time labels column */}
        <div className="time-labels">
          <div className="time-header"></div>
          {timeSlots.map((slot) => (
            <div
              key={`${slot.hour}-${slot.minute}`}
              className={`time-label ${slot.hour < 6 ? "early-hours" : ""} ${
                slot.minute === 30 ? "half-hour" : ""
              }`}
            >
              {slot.minute === 0 ? slot.displayTime : ""}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDates.map((date, dayIndex) => (
          <div key={dayIndex} className="day-column">
            <div
              className={`day-header-cell ${isToday(date) ? "today" : ""} ${
                isDateInTripPeriod(date) ? "trip-period" : ""
              } ${
                selectedDate &&
                selectedDate.toDateString() === date.toDateString()
                  ? "selected-date"
                  : ""
              }`}
              onClick={() => handleDateSelect(date)}
            >
              <div className="day-name">{daysOfWeek[dayIndex]}</div>
              <div className="day-number">{date.getDate()}</div>
            </div>

            <div className="day-content">
              {/* Time slots for clicking */}
              {timeSlots.map((slot) => (
                <div
                  key={`${dayIndex}-${slot.hour}-${slot.minute}`}
                  className={`time-slot ${slot.hour < 6 ? "early-hours" : ""} ${
                    slot.minute === 30 ? "half-hour" : ""
                  }`}
                  onClick={() =>
                    handleTimeSlotClick(dayIndex, slot.hour, slot.minute)
                  }
                />
              ))}

              {/* Events as spanning blocks */}
              {getEventsForDay(dayIndex).map((event) => {
                const position = calculateEventPosition(event);
                return (
                  <div
                    key={event.id}
                    className="event-block-spanning"
                    style={{
                      top: `${position.top}px`,
                      height: `${position.height}px`,
                      backgroundColor: event.color,
                    }}
                  >
                    <EventBlock
                      event={event}
                      onView={handleEventView}
                      onEdit={() => handleEventEdit(event)}
                      onDelete={() => handleEventDelete(event.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="app-wrapper" onClick={handleBackgroundClick}>
      <FilePanel
        events={events}
        trips={trips}
        calendarTitle={calendarTitle}
        onLoadCalendar={handleLoadCalendar}
        onNewCalendar={handleNewCalendar}
        onTitleChange={handleTitleChange}
      />

      <div
        className="app-container"
        ref={appContainerRef}
        onClick={handleBackgroundClick}
      >
        <div onClick={handlePanelClick}>
          <UndoRedoContext.Provider
            value={{ handleUndo, handleRedo, canUndo, canRedo }}
          >
            <TripPanel
              trips={trips}
              onCreateTrip={handleCreateTrip}
              onEditTrip={handleEditTrip}
              onDeleteTrip={handleDeleteTrip}
              onSelectTrip={handleSelectTrip}
              selectedTrip={selectedTrip}
            />
          </UndoRedoContext.Provider>
        </div>

        <div className="calendar-container" onClick={handleCalendarClick}>
          <div className="calendar-header">
            <div className="calendar-nav-left">
              <button
                className="nav-button"
                onClick={() => navigateWeek(-1)}
                title="Previous week"
              >
                &lt; Previous
              </button>
            </div>

            <div className="month-year">{getWeekRange()}</div>

            <div className="calendar-nav-right">
              <button
                className="nav-button"
                onClick={() => navigateWeek(1)}
                title="Next week"
              >
                Next &gt;
              </button>
            </div>
          </div>

          <div className="calendar-content" ref={calendarContentRef}>
            {renderTimeGrid()}
            {renderCurrentTimeCell()}
          </div>

          {showEventModal && (
            <UndoRedoContext.Provider
              value={{ handleUndo, handleRedo, canUndo, canRedo }}
            >
              <EventModal
                selectedTimeSlot={selectedTimeSlot}
                selectedDate={selectedDate}
                editingEvent={editingEvent}
                selectedTrip={selectedTrip}
                trips={trips}
                onSave={handleEventSave}
                onTripCreate={handleCreateTrip}
                onClose={() => {
                  setShowEventModal(false);
                  setEditingEvent(null);
                }}
              />
            </UndoRedoContext.Provider>
          )}

          {showEventDetailModal && viewingEvent && (
            <EventDetailModal
              event={viewingEvent}
              trip={trips.find((trip) => trip.id === viewingEvent.tripId)}
              onEdit={() => handleEventEdit(viewingEvent)}
              onDelete={() => handleEventDelete(viewingEvent.id)}
              onClose={() => {
                setShowEventDetailModal(false);
                setViewingEvent(null);
              }}
            />
          )}
        </div>

        <div onClick={handlePanelClick}>
          <EventsPanel
            selectedDate={selectedDate}
            selectedTrip={selectedTrip}
            events={events}
            trips={trips}
            onEditEvent={handleEventEdit}
            onDeleteEvent={handleEventDelete}
            onCreateEvent={handleCreateEventFromPanel}
          />
        </div>
      </div>

      {/* Tool Panel */}
      <div onClick={handlePanelClick}>
        <UndoRedoContext.Provider
          value={{ handleUndo, handleRedo, canUndo, canRedo }}
        >
          <ToolPanel onReturnDefaultView={handleReturnDefaultView} />
        </UndoRedoContext.Provider>
      </div>
    </div>
  );
};

export default Calendar;