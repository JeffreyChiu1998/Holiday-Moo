import { useState, useRef, useEffect, useCallback, createContext } from "react";
import EventModal from "./EventModal";
import EventDetailModal from "./EventDetailModal";
import EventBlock from "./EventBlock";
import TripPanel from "./TripPanel";
import EventsPanel from "./EventsPanel";
import FilePanel from "./FilePanel";
import ToolPanel from "./ToolPanel";
import DayHeaderModal from "./DayHeaderModal";

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
  // Current time state removed
  const [calendarTitle, setCalendarTitle] = useState("Moo's Calendar");
  const [customDayHeaders, setCustomDayHeaders] = useState({});
  const [showDayHeaderModal, setShowDayHeaderModal] = useState(false);
  const [editingDayHeader, setEditingDayHeader] = useState(null);
  const [hoveredDate, setHoveredDate] = useState(null);

  // Export modal state (to hide chatbot when export is open)
  const [showExportModal, setShowExportModal] = useState(false);

  // Bucket list and checklist state (session-only)
  const [bucketList, setBucketList] = useState([]);
  const [checklistItems, setChecklistItems] = useState(() => [
    {
      id: 1,
      text: "Passport",
      packed: false,
      disabled: false,
      isCustom: false,
    },
    {
      id: 2,
      text: "Visa (if required)",
      packed: false,
      disabled: false,
      isCustom: false,
    },
    {
      id: 3,
      text: "Flight tickets",
      packed: false,
      disabled: false,
      isCustom: false,
    },
    {
      id: 4,
      text: "Hotel reservations",
      packed: false,
      disabled: false,
      isCustom: false,
    },
    {
      id: 5,
      text: "Travel insurance",
      packed: false,
      disabled: false,
      isCustom: false,
    },
    {
      id: 6,
      text: "Credit cards",
      packed: false,
      disabled: false,
      isCustom: false,
    },
    {
      id: 7,
      text: "Local currency",
      packed: false,
      disabled: false,
      isCustom: false,
    },
    {
      id: 8,
      text: "Power bank",
      packed: false,
      disabled: false,
      isCustom: false,
    },
    {
      id: 9,
      text: "Phone charger",
      packed: false,
      disabled: false,
      isCustom: false,
    },
    {
      id: 10,
      text: "Universal adapter",
      packed: false,
      disabled: false,
      isCustom: false,
    },
    {
      id: 11,
      text: "Clothes",
      packed: false,
      disabled: false,
      isCustom: false,
    },
    {
      id: 12,
      text: "Underwear",
      packed: false,
      disabled: false,
      isCustom: false,
    },
    { id: 13, text: "Socks", packed: false, disabled: false, isCustom: false },
    { id: 14, text: "Shoes", packed: false, disabled: false, isCustom: false },
    {
      id: 15,
      text: "Toiletries",
      packed: false,
      disabled: false,
      isCustom: false,
    },
    { id: 16, text: "Towel", packed: false, disabled: false, isCustom: false },
    {
      id: 17,
      text: "Medications",
      packed: false,
      disabled: false,
      isCustom: false,
    },
    {
      id: 18,
      text: "Sunglasses",
      packed: false,
      disabled: false,
      isCustom: false,
    },
    {
      id: 19,
      text: "Sunscreen",
      packed: false,
      disabled: false,
      isCustom: false,
    },
    { id: 20, text: "Camera", packed: false, disabled: false, isCustom: false },
  ]);
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

  // Current time update removed

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

  // Current time position calculation removed

  // Current time cell removed per user request

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

    if (editingEvent?.id) {
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

      // Load custom day headers
      if (
        calendarData.customDayHeaders &&
        typeof calendarData.customDayHeaders === "object"
      ) {
        setCustomDayHeaders(calendarData.customDayHeaders);
      }

      // Load bucket list
      if (calendarData.bucketList && Array.isArray(calendarData.bucketList)) {
        setBucketList(calendarData.bucketList);
      }

      // Load checklist
      if (
        calendarData.checklistItems &&
        Array.isArray(calendarData.checklistItems)
      ) {
        setChecklistItems(calendarData.checklistItems);
      }

      // Reset selections
      setSelectedTrip(null);
      setSelectedDate(null);
      setEditingEvent(null);
      setShowEventModal(false);

      const additionalData = [];
      if (
        calendarData.customDayHeaders &&
        Object.keys(calendarData.customDayHeaders).length > 0
      ) {
        additionalData.push(
          `${
            Object.keys(calendarData.customDayHeaders).length
          } custom day headers`
        );
      }
      if (calendarData.bucketList && calendarData.bucketList.length > 0) {
        additionalData.push(
          `${calendarData.bucketList.length} bucket list items`
        );
      }
      if (
        calendarData.checklistItems &&
        calendarData.checklistItems.length > 0
      ) {
        additionalData.push(
          `${calendarData.checklistItems.length} checklist items`
        );
      }

      const additionalInfo =
        additionalData.length > 0
          ? ` Also imported: ${additionalData.join(", ")}.`
          : "";

      alert(
        `Calendar loaded successfully! Imported ${
          calendarData.events?.length || 0
        } events and ${calendarData.trips?.length || 0} trips.${additionalInfo}`
      );
    } catch (error) {
      alert("Error loading calendar data. Please try again.");
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

    // Check if there's any data to clear
    const hasCustomHeaders = Object.keys(customDayHeaders).length > 0;
    const hasBucketList = bucketList.length > 0;
    const hasChecklist = checklistItems.length > 0;

    // Confirm clearing current calendar
    if (
      events.length > 0 ||
      trips.length > 0 ||
      hasCustomHeaders ||
      hasBucketList ||
      hasChecklist
    ) {
      const dataTypes = [];
      if (events.length > 0) dataTypes.push("events");
      if (trips.length > 0) dataTypes.push("trips");
      if (hasCustomHeaders) dataTypes.push("custom day headers");
      if (hasBucketList) dataTypes.push("bucket list items");
      if (hasChecklist) dataTypes.push("checklist items");

      const confirmed = window.confirm(
        `Creating a new calendar will remove all current ${dataTypes.join(
          ", "
        )}. Are you sure you want to continue?`
      );
      if (!confirmed) {
        return;
      }
    }

    // Clear calendar and set new title
    setEvents([]);
    setTrips([]);
    setCustomDayHeaders({});
    setBucketList([]);
    setChecklistItems([
      {
        id: 1,
        text: "Passport",
        packed: false,
        disabled: false,
        isCustom: false,
      },
      {
        id: 2,
        text: "Visa (if required)",
        packed: false,
        disabled: false,
        isCustom: false,
      },
      {
        id: 3,
        text: "Flight tickets",
        packed: false,
        disabled: false,
        isCustom: false,
      },
      {
        id: 4,
        text: "Hotel reservations",
        packed: false,
        disabled: false,
        isCustom: false,
      },
      {
        id: 5,
        text: "Travel insurance",
        packed: false,
        disabled: false,
        isCustom: false,
      },
      {
        id: 6,
        text: "Credit cards",
        packed: false,
        disabled: false,
        isCustom: false,
      },
      {
        id: 7,
        text: "Local currency",
        packed: false,
        disabled: false,
        isCustom: false,
      },
      {
        id: 8,
        text: "Power bank",
        packed: false,
        disabled: false,
        isCustom: false,
      },
      {
        id: 9,
        text: "Phone charger",
        packed: false,
        disabled: false,
        isCustom: false,
      },
      {
        id: 10,
        text: "Universal adapter",
        packed: false,
        disabled: false,
        isCustom: false,
      },
      {
        id: 11,
        text: "Clothes",
        packed: false,
        disabled: false,
        isCustom: false,
      },
      {
        id: 12,
        text: "Underwear",
        packed: false,
        disabled: false,
        isCustom: false,
      },
      {
        id: 13,
        text: "Socks",
        packed: false,
        disabled: false,
        isCustom: false,
      },
      {
        id: 14,
        text: "Shoes",
        packed: false,
        disabled: false,
        isCustom: false,
      },
      {
        id: 15,
        text: "Toiletries",
        packed: false,
        disabled: false,
        isCustom: false,
      },
      {
        id: 16,
        text: "Towel",
        packed: false,
        disabled: false,
        isCustom: false,
      },
      {
        id: 17,
        text: "Medications",
        packed: false,
        disabled: false,
        isCustom: false,
      },
      {
        id: 18,
        text: "Sunglasses",
        packed: false,
        disabled: false,
        isCustom: false,
      },
      {
        id: 19,
        text: "Sunscreen",
        packed: false,
        disabled: false,
        isCustom: false,
      },
      {
        id: 20,
        text: "Camera",
        packed: false,
        disabled: false,
        isCustom: false,
      },
    ]);
    setSelectedTrip(null);
    setSelectedDate(null);
    setEditingEvent(null);
    setShowEventModal(false);
    setCalendarTitle(newTitle.trim() || "Holiday Moo~");
  };

  const handleTitleChange = (newTitle) => {
    setCalendarTitle(newTitle.trim() || "Holiday Moo~");
  };

  const handleCreateEventFromBucket = (bucketItem) => {
    // Create default start time at 10:00 AM today
    const startTime = new Date();
    startTime.setHours(10, 0, 0, 0);

    // Create default end time at 12:00 PM (2 hours later)
    const endTime = new Date();
    endTime.setHours(12, 0, 0, 0);

    // Map bucket list item type to event type
    const mapBucketTypeToEventType = (bucketType) => {
      const typeMap = {
        restaurant: "dining",
        attraction: "sightseeing",
        activity: "activity",
        shopping: "shopping",
        entertainment: "entertainment",
        cultural: "sightseeing",
        outdoor: "activity",
        other: "other",
      };
      return typeMap[bucketType] || "sightseeing";
    };

    const mappedType = mapBucketTypeToEventType(bucketItem.type);

    // Create a new event template based on the bucket list item (without ID to indicate it's new)
    const newEventTemplate = {
      name: bucketItem.name,
      type: mappedType,
      remark: bucketItem.description || "",
      location: bucketItem.location || "",
      coordinates: bucketItem.coordinates || null,
      placeId: bucketItem.placeId || "",
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      cost: bucketItem.estimatedCost || "",
      isPrepaid: false,
      tripId: selectedTrip?.id || null,
    };

    // Set the event template for creating a new event (not editing)
    setEditingEvent(newEventTemplate);
    setShowEventModal(true);
  };

  const handleEventsGenerated = (generatedEvents) => {
    // Add generated events to the calendar
    const eventsWithIds = generatedEvents.map((event) => ({
      ...event,
      id: event.id || `generated-${Date.now()}-${Math.random()}`,
    }));

    // Save to history for undo/redo functionality
    saveToHistory("add_generated_events", {
      addedEvents: eventsWithIds,
    });

    // Add events to the calendar
    setEvents((prevEvents) => [...prevEvents, ...eventsWithIds]);
  };

  // Day header management functions
  const handleEditDayHeader = (date) => {
    setEditingDayHeader(date);
    setShowDayHeaderModal(true);
  };

  const handleDayHeaderSave = (headerData) => {
    const dateKey = editingDayHeader.toDateString();

    // Save to history for undo/redo functionality
    saveToHistory(
      headerData === null ? "remove_day_header" : "edit_day_header",
      {
        date: editingDayHeader,
        dateKey: dateKey,
        oldHeader: customDayHeaders[dateKey] || null,
        newHeader: headerData,
      }
    );

    setCustomDayHeaders((prev) => {
      const updated = { ...prev };
      if (headerData === null) {
        // Remove custom header
        delete updated[dateKey];
      } else {
        // Add/update custom header
        updated[dateKey] = headerData;
      }
      return updated;
    });

    setShowDayHeaderModal(false);
    setEditingDayHeader(null);
  };

  const handleDayHeaderClose = () => {
    setShowDayHeaderModal(false);
    setEditingDayHeader(null);
  };

  const handleDayHover = (date) => {
    setHoveredDate(date);
  };

  const handleDayLeave = () => {
    setHoveredDate(null);
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

  // Check if two events overlap
  const eventsOverlap = (event1, event2) => {
    const start1 = new Date(event1.startTime);
    const end1 = new Date(event1.endTime);
    const start2 = new Date(event2.startTime);
    const end2 = new Date(event2.endTime);

    return start1 < end2 && start2 < end1;
  };

  // Calculate maximum concurrent events at any point in time for a group
  const calculateMaxConcurrentEvents = (eventGroup) => {
    // Create a list of all time points (start and end times)
    const timePoints = [];
    eventGroup.forEach((eventData) => {
      const start = new Date(eventData.event.startTime);
      const end = new Date(eventData.event.endTime);
      timePoints.push({ time: start, type: "start", event: eventData });
      timePoints.push({ time: end, type: "end", event: eventData });
    });

    // Sort time points by time
    timePoints.sort((a, b) => a.time - b.time);

    let currentCount = 0;
    let maxCount = 0;

    // Sweep through time points to find maximum concurrent events
    timePoints.forEach((point) => {
      if (point.type === "start") {
        currentCount++;
        maxCount = Math.max(maxCount, currentCount);
      } else {
        currentCount--;
      }
    });

    return maxCount;
  };

  // Assign positions to events based on their overlaps using lane assignment
  const assignEventPositions = (eventGroup, maxConcurrentEvents) => {
    const positions = new Array(eventGroup.length);
    const lanes = new Array(maxConcurrentEvents).fill(null);

    // Sort events by start time for consistent positioning
    const sortedEvents = [...eventGroup].sort(
      (a, b) => new Date(a.event.startTime) - new Date(b.event.startTime)
    );

    sortedEvents.forEach((eventData, index) => {
      const start = new Date(eventData.event.startTime);
      const end = new Date(eventData.event.endTime);

      // Find the first available lane
      let assignedLane = -1;
      for (let lane = 0; lane < maxConcurrentEvents; lane++) {
        if (lanes[lane] === null || lanes[lane] <= start) {
          assignedLane = lane;
          break;
        }
      }

      // If no lane found, use the first one (shouldn't happen with correct max calculation)
      if (assignedLane === -1) assignedLane = 0;

      // Find original index in the group
      const originalIndex = eventGroup.findIndex(
        (e) => e.event.id === eventData.event.id
      );
      positions[originalIndex] = assignedLane;
      lanes[assignedLane] = end;
    });

    return positions;
  };

  // Calculate layout for overlapping events
  const calculateEventLayout = (dayEvents) => {
    const sortedEvents = [...dayEvents].sort(
      (a, b) => new Date(a.startTime) - new Date(b.startTime)
    );

    const eventGroups = [];

    sortedEvents.forEach((event) => {
      const position = calculateEventPosition(event);

      // Find existing group that this event overlaps with
      let assignedGroup = null;
      for (let group of eventGroups) {
        const overlapsWithGroup = group.some((groupEvent) =>
          eventsOverlap(event, groupEvent.event)
        );
        if (overlapsWithGroup) {
          assignedGroup = group;
          break;
        }
      }

      // If no overlapping group found, create new group
      if (!assignedGroup) {
        assignedGroup = [];
        eventGroups.push(assignedGroup);
      }

      assignedGroup.push({ event, position });
    });

    // Calculate final positions for each event
    const eventLayouts = [];

    eventGroups.forEach((group) => {
      const groupSize = group.length;

      if (groupSize === 1) {
        // Single event - full width
        eventLayouts.push({
          ...group[0],
          width: 100,
          left: 0,
          isOverlapping: false,
        });
      } else {
        // Multiple overlapping events - use max concurrent events instead of total group size
        const maxConcurrentEvents = calculateMaxConcurrentEvents(group);
        const positions = assignEventPositions(group, maxConcurrentEvents);

        group.forEach((eventData, index) => {
          const width = Math.floor(100 / maxConcurrentEvents);
          const left = positions[index] * width;

          eventLayouts.push({
            ...eventData,
            width,
            left,
            isOverlapping: true,
            overlapCount: maxConcurrentEvents,
            overlapIndex: positions[index],
          });
        });
      }
    });

    return eventLayouts;
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
          {timeSlots.map((slot, index) => (
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
              } ${
                customDayHeaders[date.toDateString()] ? "custom-header" : ""
              } ${
                customDayHeaders[date.toDateString()] &&
                selectedDate &&
                selectedDate.toDateString() === date.toDateString()
                  ? "custom-header-selected"
                  : ""
              } ${
                customDayHeaders[date.toDateString()] &&
                selectedTrip &&
                isDateInTripPeriod(date)
                  ? "custom-header-trip-selected"
                  : ""
              }`}
              onClick={() => handleDateSelect(date)}
              onMouseEnter={() => handleDayHover(date)}
              onMouseLeave={handleDayLeave}
            >
              {customDayHeaders[date.toDateString()] &&
              hoveredDate?.toDateString() !== date.toDateString() ? (
                <div className="custom-day-header">
                  <div className="custom-day-date">
                    <span className="custom-day-number">{date.getDate()}</span>
                    <span className="custom-day-weekday">
                      {daysOfWeek[dayIndex]}
                    </span>
                  </div>
                  {customDayHeaders[date.toDateString()].title && (
                    <div className="custom-day-title">
                      {customDayHeaders[date.toDateString()].title}
                    </div>
                  )}
                  {customDayHeaders[date.toDateString()].location && (
                    <div className="custom-day-location">
                      📍 {customDayHeaders[date.toDateString()].location}
                    </div>
                  )}
                </div>
              ) : (
                <div className="default-day-header">
                  <div className="day-name">{daysOfWeek[dayIndex]}</div>
                  <div className="day-number">{date.getDate()}</div>
                </div>
              )}
            </div>

            <div className="day-content no-padding">
              {/* Time slots for clicking */}
              {timeSlots.map((slot, slotIndex) => (
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
              {calculateEventLayout(getEventsForDay(dayIndex)).map(
                (eventLayout) => {
                  const {
                    event,
                    position,
                    width,
                    left,
                    isOverlapping,
                    overlapCount,
                    overlapIndex,
                  } = eventLayout;
                  return (
                    <div
                      key={event.id}
                      className={`event-block-spanning ${
                        isOverlapping ? "overlapping" : ""
                      }`}
                      style={{
                        top: `${position.top}px`,
                        height: `${position.height}px`,
                        width: `${width}%`,
                        left: `${left}%`,
                        backgroundColor: event.color,
                        zIndex:
                          overlapIndex !== undefined && overlapIndex !== null
                            ? 10 + overlapIndex
                            : 100,
                      }}
                      title={
                        isOverlapping
                          ? `${overlapIndex + 1} of ${overlapCount} events`
                          : ""
                      }
                    >
                      <EventBlock
                        event={event}
                        onView={handleEventView}
                        onEdit={() => handleEventEdit(event)}
                        onDelete={() => handleEventDelete(event.id)}
                        isOverlapping={isOverlapping}
                        overlapCount={overlapCount}
                      />
                    </div>
                  );
                }
              )}
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
        customDayHeaders={customDayHeaders}
        bucketList={bucketList}
        checklistItems={checklistItems}
        onLoadCalendar={handleLoadCalendar}
        onNewCalendar={handleNewCalendar}
        onTitleChange={handleTitleChange}
        showExportModal={showExportModal}
        onExportModalChange={setShowExportModal}
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

          {showDayHeaderModal && editingDayHeader && (
            <DayHeaderModal
              date={editingDayHeader}
              existingHeader={customDayHeaders[editingDayHeader.toDateString()]}
              onSave={handleDayHeaderSave}
              onClose={handleDayHeaderClose}
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
            onEditDayHeader={handleEditDayHeader}
            onDateChange={setSelectedDate}
          />
        </div>
      </div>

      {/* Tool Panel */}
      <div onClick={handlePanelClick}>
        <UndoRedoContext.Provider
          value={{ handleUndo, handleRedo, canUndo, canRedo }}
        >
          <ToolPanel
            onReturnDefaultView={handleReturnDefaultView}
            trips={trips}
            events={events}
            bucketList={bucketList}
            checklistItems={checklistItems}
            onBucketListChange={setBucketList}
            onChecklistChange={setChecklistItems}
            onCreateEventFromBucket={handleCreateEventFromBucket}
            onUpdateTrip={handleEditTrip}
            onEventsGenerated={handleEventsGenerated}
            showExportModal={showExportModal}
          />
        </UndoRedoContext.Provider>
      </div>
    </div>
  );
};

export default Calendar;
