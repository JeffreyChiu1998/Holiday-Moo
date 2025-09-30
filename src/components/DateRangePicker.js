import { useState, useEffect, useRef } from "react";

const DateRangePicker = ({ startDate, endDate, onChange }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStart, setSelectedStart] = useState(
    startDate ? new Date(startDate) : null
  );
  const [selectedEnd, setSelectedEnd] = useState(
    endDate ? new Date(endDate) : null
  );
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

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

  useEffect(() => {
    if (startDate) {
      // Parse date string as local date to avoid timezone issues
      const [year, month, day] = startDate.split("-").map(Number);
      const start = new Date(year, month - 1, day);
      setSelectedStart(start);
      setCurrentMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    }
    if (endDate) {
      // Parse date string as local date to avoid timezone issues
      const [year, month, day] = endDate.split("-").map(Number);
      const end = new Date(year, month - 1, day);
      setSelectedEnd(end);
    }
  }, [startDate, endDate]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDate = (date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.toDateString() === date2.toDateString();
  };

  const isInRange = (date) => {
    if (!selectedStart || !selectedEnd) return false;
    const start = selectedStart < selectedEnd ? selectedStart : selectedEnd;
    const end = selectedStart < selectedEnd ? selectedEnd : selectedStart;
    return date >= start && date <= end;
  };

  const isRangeStart = (date) => {
    if (!selectedStart) return false;
    if (!selectedEnd) return isSameDate(date, selectedStart);
    const start = selectedStart < selectedEnd ? selectedStart : selectedEnd;
    return isSameDate(date, start);
  };

  const isRangeEnd = (date) => {
    if (!selectedEnd) return false;
    const end = selectedStart < selectedEnd ? selectedEnd : selectedStart;
    return isSameDate(date, end);
  };

  const handleDateClick = (date) => {
    // Create full day dates - start at 00:00:00 and end at 23:59:59
    const clickedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
      0 // Start of day: 00:00:00.000
    );

    if (!selectedStart || (selectedStart && selectedEnd)) {
      // Start new selection - always start at beginning of day
      setSelectedStart(clickedDate);
      setSelectedEnd(null);
    } else if (selectedStart && !selectedEnd) {
      // Complete the range - end date should include the full day
      const endOfDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        59,
        999 // End of day: 23:59:59.999
      );

      setSelectedEnd(endOfDay);

      // Determine correct start and end order
      let start, end;
      if (clickedDate < selectedStart) {
        start = clickedDate; // Start of clicked day
        end = new Date(
          selectedStart.getFullYear(),
          selectedStart.getMonth(),
          selectedStart.getDate(),
          23,
          59,
          59,
          999
        ); // End of originally selected day
      } else {
        start = selectedStart; // Keep original start
        end = endOfDay; // End of clicked day
      }

      // Call onChange with the completed range (full days)
      onChange(start, end);

      // Close the picker after selection
      setTimeout(() => setIsOpen(false), 100);
    }
  };

  const handleInputClick = () => {
    setIsOpen(!isOpen);
  };

  const handleClearSelection = () => {
    setSelectedStart(null);
    setSelectedEnd(null);
    onChange(null, null);
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Previous month's trailing days
    const prevMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 1,
      0
    );
    const daysInPrevMonth = prevMonth.getDate();

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        day
      );
      days.push(
        <div
          key={`prev-${day}`}
          className="calendar-day other-month"
          onClick={() => handleDateClick(date)}
        >
          {day}
        </div>
      );
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      );
      let className = "calendar-day";

      if (isToday(date)) className += " today";
      if (isRangeStart(date)) className += " range-start";
      if (isRangeEnd(date)) className += " range-end";
      if (isInRange(date) && !isRangeStart(date) && !isRangeEnd(date))
        className += " in-range";

      days.push(
        <div
          key={day}
          className={className}
          onClick={() => handleDateClick(date)}
        >
          {day}
        </div>
      );
    }

    // Next month's leading days
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (firstDay + daysInMonth);

    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        day
      );
      days.push(
        <div
          key={`next-${day}`}
          className="calendar-day other-month"
          onClick={() => handleDateClick(date)}
        >
          {day}
        </div>
      );
    }

    return days;
  };

  const formatDateRange = () => {
    if (!selectedStart && !selectedEnd) return "Select trip dates";
    if (selectedStart && !selectedEnd)
      return `${selectedStart.toLocaleDateString()} - Select end date`;
    if (selectedStart && selectedEnd) {
      const start = selectedStart < selectedEnd ? selectedStart : selectedEnd;
      const end = selectedStart < selectedEnd ? selectedEnd : selectedStart;
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    }
    return "Select trip dates";
  };

  return (
    <div
      className={`date-range-picker ${isOpen ? "calendar-open" : ""}`}
      ref={containerRef}
    >
      <div className="date-range-display">
        <input
          type="text"
          value={formatDateRange()}
          onClick={handleInputClick}
          readOnly
          className="date-range-input"
          placeholder="Click to select trip dates"
        />
      </div>

      {isOpen && (
        <div className="calendar-widget calendar-widget-absolute">
          <div className="calendar-header">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              className="nav-btn"
            >
              ‹
            </button>
            <div className="month-year">
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button
              type="button"
              onClick={() => navigateMonth(1)}
              className="nav-btn"
            >
              ›
            </button>
          </div>

          <div className="calendar-grid">
            {daysOfWeek.map((day) => (
              <div key={day} className="calendar-day-header">
                {day}
              </div>
            ))}
            {renderCalendarDays()}
          </div>

          <div className="range-picker-footer">
            <div className="picker-instructions">
              {!selectedStart
                ? "Click a date to start selection"
                : !selectedEnd
                ? "Click another date to complete range"
                : "Range selected"}
            </div>
            <button
              type="button"
              onClick={handleClearSelection}
              className="clear-range-btn"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
