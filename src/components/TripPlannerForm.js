import { useState, useEffect } from "react";
import BucketListSidebar from "./BucketListSidebar";
import DualRangeSlider from "./DualRangeSlider";
import { tripPlannerService } from "../services/tripPlannerService";

const TripPlannerForm = ({
  userTrips,
  bucketList,
  onSubmit,
  onFormDataChange,
  isGenerating,
}) => {
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedDateRange, setSelectedDateRange] = useState({
    startDay: 1,
    endDay: 8,
  });
  const [preferences, setPreferences] = useState({
    // Accommodation Preferences
    accommodationType: "",
    accommodationTypeOther: "",
    roomSetup: "",
    roomSetupOther: "",

    // Food & Dietary Needs
    dietaryRestrictions: [],
    dietaryRestrictionsOther: "",
    cuisineInterests: [],
    cuisineInterestsOther: "",
    snackingHabits: "",

    // Activities & Interests
    tripType: "",
    tripTypeOther: "",
    preferredExperiences: [],
    preferredExperiencesOther: "",
    socialPreference: "",
    itineraryStyle: "",
    specialInterests: "",

    // Daily Rhythm & Meal Habits
    wakeUpTime: "",
    preparationTime: "",
    returnTime: "",
    mealsPerDay: "",
    breakfastTime: "",
    lunchTime: "",
    dinnerTime: "",

    // Break Preferences
    needBreaks: "",
    breakDuration: "",
    breakActivities: [],
    breakActivitiesOther: "",

    // Shopping Preferences
    shoppingInterest: "",
    shoppingCategories: [],
    shoppingCategoriesOther: "",
    shoppingStyle: "",

    // Additional Notes
    additionalNotes: "",
  });
  const [selectedBucketItems, setSelectedBucketItems] = useState([]);
  const [showBucketSidebar, setShowBucketSidebar] = useState(false);

  // Track form data changes to enable exit confirmation
  useEffect(() => {
    const hasData =
      selectedTrip ||
      Object.values(preferences).some((value) =>
        Array.isArray(value) ? value.length > 0 : value !== ""
      ) ||
      selectedBucketItems.length > 0;

    onFormDataChange?.(hasData);
  }, [selectedTrip, preferences, selectedBucketItems, onFormDataChange]);

  const handleTripChange = (e) => {
    const tripId = e.target.value;
    const trip = userTrips.find((t) => t.id === tripId);
    setSelectedTrip(trip);

    // Reset date range when trip changes
    if (trip) {
      const totalDays = getTripDays(trip);
      const maxDays = tripPlannerService.getMaxTripDays();
      // Default to planning the full trip or max allowed days
      const endDay = Math.min(totalDays, maxDays);
      setSelectedDateRange({ startDay: 1, endDay });
    }
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleBucketItemToggle = (item) => {
    setSelectedBucketItems((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists) {
        return prev.filter((i) => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedTrip) {
      alert("Please select a trip first.");
      return;
    }

    // Validate required fields
    const requiredFields = [
      { field: "accommodationType", label: "Accommodation Type" },
      { field: "roomSetup", label: "Room Setup" },
      { field: "tripType", label: "Trip Type" },
      { field: "wakeUpTime", label: "Morning Start Time" },
      { field: "returnTime", label: "Return Time" },
      { field: "mealsPerDay", label: "Meals Per Day" },
      { field: "needBreaks", label: "Break Preferences" },
      { field: "shoppingInterest", label: "Shopping Interest" },
    ];

    for (const { field, label } of requiredFields) {
      if (!preferences[field]) {
        alert(`Please select ${label}.`);
        return;
      }
    }

    // Validate "Other" fields when selected
    const otherValidations = [
      {
        condition: preferences.accommodationType === "other",
        field: "accommodationTypeOther",
        label: "accommodation type",
      },
      {
        condition: preferences.roomSetup === "other",
        field: "roomSetupOther",
        label: "room setup",
      },
      {
        condition: preferences.tripType === "other",
        field: "tripTypeOther",
        label: "trip type",
      },
      {
        condition: preferences.dietaryRestrictions.includes("Other"),
        field: "dietaryRestrictionsOther",
        label: "dietary restrictions",
      },
      {
        condition: preferences.cuisineInterests.includes("Other"),
        field: "cuisineInterestsOther",
        label: "cuisine interests",
      },
      {
        condition: preferences.preferredExperiences.includes("Other"),
        field: "preferredExperiencesOther",
        label: "preferred experiences",
      },
      {
        condition: preferences.breakActivities.includes("Other"),
        field: "breakActivitiesOther",
        label: "break activities",
      },
      {
        condition: preferences.shoppingCategories.includes("Other"),
        field: "shoppingCategoriesOther",
        label: "shopping categories",
      },
    ];

    for (const { condition, field, label } of otherValidations) {
      if (condition && !preferences[field]?.trim()) {
        alert(`Please specify ${label} since you selected "Other".`);
        return;
      }
    }

    // Validate at least one preferred experience is selected
    if (preferences.preferredExperiences.length === 0) {
      alert("Please select at least one preferred experience.");
      return;
    }

    const formData = {
      selectedTrip,
      preferences,
      selectedBucketItems,
      selectedDateRange,
    };

    onSubmit(formData);
  };

  const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return "No dates set";

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate the actual checkout/departure date (end date + 1 day)
    const checkoutDate = new Date(end);
    checkoutDate.setDate(checkoutDate.getDate() + 1);

    // Calculate number of days (nights stayed)
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Format dates with time
    const formatDateTime = (date) => {
      return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}/${String(date.getDate()).padStart(2, "0")} 00:00`;
    };

    return `${formatDateTime(start)} - ${formatDateTime(
      checkoutDate
    )} (${days} days)`;
  };

  const getTripDays = (trip) => {
    if (!trip || !trip.startDate || !trip.endDate) return 0;
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  const getSelectedDateRangeText = (trip, range) => {
    if (!trip || !trip.startDate) return "";

    const tripStart = new Date(trip.startDate);
    const selectedStart = new Date(tripStart);
    selectedStart.setDate(selectedStart.getDate() + range.startDay - 1);

    const selectedEnd = new Date(tripStart);
    selectedEnd.setDate(selectedEnd.getDate() + range.endDay - 1);

    const selectedDays = range.endDay - range.startDay;

    // Format dates with time (same as formatDateRange)
    const formatDateTime = (date) => {
      return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}/${String(date.getDate()).padStart(2, "0")} 00:00`;
    };

    return `${formatDateTime(selectedStart)} - ${formatDateTime(
      selectedEnd
    )} (${selectedDays} days)`;
  };

  const handleDateRangeChange = (startDay, endDay) => {
    setSelectedDateRange({ startDay, endDay });
  };

  return (
    <div className="trip-planner-form">
      <form onSubmit={handleSubmit}>
        {/* Trip Selection Section */}
        <div className="form-section">
          <h3>Select Trip</h3>
          <div className="form-group">
            <label>Choose an existing trip:</label>
            <select
              value={selectedTrip?.id || ""}
              onChange={handleTripChange}
              required
              className="trip-select"
            >
              <option value="">Select a trip...</option>
              {userTrips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.name}
                </option>
              ))}
            </select>
          </div>

          {/* Trip Info Display */}
          {selectedTrip && (
            <div className="trip-info-display">
              <div className="trip-info-item">
                <strong>Destination:</strong> {selectedTrip.destination}
              </div>
              <div className="trip-info-item">
                <strong>Full Trip Dates:</strong>{" "}
                {formatDateRange(selectedTrip.startDate, selectedTrip.endDate)}
              </div>
              {selectedTrip.budget && (
                <div className="trip-info-item">
                  <strong>Budget:</strong> ${selectedTrip.budget}
                </div>
              )}
              {selectedTrip.travelers && selectedTrip.travelers.length > 0 && (
                <div className="trip-info-item">
                  <strong>Travelers:</strong>{" "}
                  {selectedTrip.travelers.map((t) => t.name).join(", ")}
                </div>
              )}

              {/* Date Range Selection */}
              {(() => {
                const totalDays = getTripDays(selectedTrip);
                const maxDays = tripPlannerService.getMaxTripDays();

                return (
                  <div className="date-range-selector">
                    {totalDays > maxDays && (
                      <div className="trip-length-notice">
                        ⚠️ <strong>Trip Length Notice:</strong> Your trip is{" "}
                        {totalDays} days, but we can plan a maximum of {maxDays}{" "}
                        days at once.
                      </div>
                    )}

                    <div className="date-range-controls">
                      <label className="date-range-label">
                        Select Planning Period:
                      </label>

                      <div className="range-inputs">
                        <div className="range-input-group">
                          <label>Start Day:</label>
                          <div className="datetime-input-wrapper">
                            <input
                              type="number"
                              min="1"
                              max={Math.max(1, totalDays)}
                              value={selectedDateRange.startDay}
                              onChange={(e) => {
                                const startDay = Math.min(
                                  parseInt(e.target.value),
                                  selectedDateRange.endDay - 1
                                );
                                handleDateRangeChange(
                                  startDay,
                                  selectedDateRange.endDay
                                );
                              }}
                              className="range-datetime-input"
                            />
                            <div className="datetime-overlay">
                              {(() => {
                                const tripStart = new Date(
                                  selectedTrip.startDate
                                );
                                const startDate = new Date(tripStart);
                                startDate.setDate(
                                  startDate.getDate() +
                                    selectedDateRange.startDay -
                                    1
                                );
                                return `${startDate.getFullYear()}/${String(
                                  startDate.getMonth() + 1
                                ).padStart(2, "0")}/${String(
                                  startDate.getDate()
                                ).padStart(2, "0")} 00:00`;
                              })()}
                            </div>
                          </div>
                        </div>

                        <div className="range-input-group">
                          <label>End Day:</label>
                          <div className="datetime-input-wrapper">
                            <input
                              type="number"
                              min={selectedDateRange.startDay + 1}
                              max={totalDays + 1}
                              value={selectedDateRange.endDay}
                              onChange={(e) => {
                                const endDay = Math.max(
                                  parseInt(e.target.value),
                                  selectedDateRange.startDay + 1
                                );
                                handleDateRangeChange(
                                  selectedDateRange.startDay,
                                  endDay
                                );
                              }}
                              className="range-datetime-input"
                            />
                            <div className="datetime-overlay">
                              {(() => {
                                const tripStart = new Date(
                                  selectedTrip.startDate
                                );
                                const endDate = new Date(tripStart);
                                endDate.setDate(
                                  endDate.getDate() +
                                    selectedDateRange.endDay -
                                    1
                                );
                                return `${endDate.getFullYear()}/${String(
                                  endDate.getMonth() + 1
                                ).padStart(2, "0")}/${String(
                                  endDate.getDate()
                                ).padStart(2, "0")} 00:00`;
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>

                      <DualRangeSlider
                        min={1}
                        max={totalDays + 1}
                        value={[
                          selectedDateRange.startDay,
                          selectedDateRange.endDay,
                        ]}
                        onChange={(newRange) => {
                          handleDateRangeChange(newRange[0], newRange[1]);
                        }}
                        maxRange={maxDays}
                        getAriaLabel={() => "Trip planning date range"}
                        getAriaValueText={(value) => {
                          const tripStart = new Date(selectedTrip.startDate);
                          const targetDate = new Date(tripStart);
                          targetDate.setDate(targetDate.getDate() + value - 1);
                          return `${targetDate.getFullYear()}/${String(
                            targetDate.getMonth() + 1
                          ).padStart(2, "0")}/${String(
                            targetDate.getDate()
                          ).padStart(2, "0")} 00:00`;
                        }}
                        getMinLabel={(min) => {
                          const tripStart = new Date(selectedTrip.startDate);
                          const startDate = new Date(tripStart);
                          startDate.setDate(startDate.getDate() + min - 1);
                          return `${startDate.getFullYear()}/${String(
                            startDate.getMonth() + 1
                          ).padStart(2, "0")}/${String(
                            startDate.getDate()
                          ).padStart(2, "0")} 00:00`;
                        }}
                        getMaxLabel={(max) => {
                          const tripStart = new Date(selectedTrip.startDate);
                          const endDate = new Date(tripStart);
                          endDate.setDate(endDate.getDate() + max - 1);
                          return `${endDate.getFullYear()}/${String(
                            endDate.getMonth() + 1
                          ).padStart(2, "0")}/${String(
                            endDate.getDate()
                          ).padStart(2, "0")} 00:00`;
                        }}
                        valueLabelDisplay="auto"
                      />

                      <div className="selected-range-display">
                        <strong>Planning Period:</strong>{" "}
                        {getSelectedDateRangeText(
                          selectedTrip,
                          selectedDateRange
                        )}
                      </div>

                      {totalDays > maxDays && (
                        <div className="range-info">
                          💡 You can plan additional days separately after
                          completing this period.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* 1. Accommodation & Stay */}
        <div className="form-section compact">
          <h3>🏨 Accommodation & Stay</h3>

          <div className="form-row">
            <div className="form-group">
              <label>
                Accommodation Type <span className="required">*</span>
              </label>
              <select
                value={preferences.accommodationType}
                onChange={(e) =>
                  handlePreferenceChange("accommodationType", e.target.value)
                }
                required
              >
                <option value="">Select type...</option>
                <option value="hotel">Hotel</option>
                <option value="resort">Resort</option>
                <option value="airbnb">Airbnb</option>
                <option value="hostel">Hostel</option>
                <option value="other">Other</option>
              </select>
              {preferences.accommodationType === "other" && (
                <input
                  type="text"
                  value={preferences.accommodationTypeOther}
                  onChange={(e) =>
                    handlePreferenceChange(
                      "accommodationTypeOther",
                      e.target.value
                    )
                  }
                  placeholder="Please specify accommodation type..."
                  className="other-input"
                />
              )}
            </div>

            <div className="form-group">
              <label>
                Room Setup <span className="required">*</span>
              </label>
              <select
                value={preferences.roomSetup}
                onChange={(e) =>
                  handlePreferenceChange("roomSetup", e.target.value)
                }
                required
              >
                <option value="">Select setup...</option>
                <option value="single">Single</option>
                <option value="double">Double</option>
                <option value="suite">Suite</option>
                <option value="family">Family-style</option>
                <option value="other">Other</option>
              </select>
              {preferences.roomSetup === "other" && (
                <input
                  type="text"
                  value={preferences.roomSetupOther}
                  onChange={(e) =>
                    handlePreferenceChange("roomSetupOther", e.target.value)
                  }
                  placeholder="Please specify room setup..."
                  className="other-input"
                />
              )}
            </div>
          </div>
        </div>

        {/* 2. Travel Style & Logistics */}
        <div className="form-section compact">
          <h3>⚙️ Travel Style & Logistics</h3>

          <div className="form-row">
            <div className="form-group">
              <label>
                Trip Type <span className="required">*</span>
              </label>
              <select
                value={preferences.tripType}
                onChange={(e) =>
                  handlePreferenceChange("tripType", e.target.value)
                }
                required
              >
                <option value="">Select type...</option>
                <option value="leisure">Leisure & relaxation</option>
                <option value="adventure">Adventure & exploration</option>
                <option value="cultural">Cultural & historical</option>
                <option value="food">Food-focused</option>
                <option value="nature">Nature & outdoors</option>
                <option value="wellness">Wellness & self-care</option>
                <option value="family">Family vacation</option>
                <option value="romantic">Romantic getaway</option>
                <option value="solo">Solo recharge</option>
                <option value="other">Other</option>
              </select>
              {preferences.tripType === "other" && (
                <input
                  type="text"
                  value={preferences.tripTypeOther}
                  onChange={(e) =>
                    handlePreferenceChange("tripTypeOther", e.target.value)
                  }
                  placeholder="Please specify trip type..."
                  className="other-input"
                />
              )}
            </div>

            <div className="form-group">
              <label>Social Preference</label>
              <select
                value={preferences.socialPreference}
                onChange={(e) =>
                  handlePreferenceChange("socialPreference", e.target.value)
                }
              >
                <option value="">Select preference...</option>
                <option value="solo">Solo/quiet time</option>
                <option value="small">Small group</option>
                <option value="open">Meet new people</option>
                <option value="group">Group tours</option>
              </select>
            </div>

            <div className="form-group">
              <label>Itinerary Style</label>
              <select
                value={preferences.itineraryStyle}
                onChange={(e) =>
                  handlePreferenceChange("itineraryStyle", e.target.value)
                }
              >
                <option value="">Select style...</option>
                <option value="planned">Fully planned</option>
                <option value="flexible">Flexible structure</option>
                <option value="spontaneous">Spontaneous</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Daily Schedule & Rhythm */}
        <div className="form-section compact">
          <h3>🕐 Daily Schedule & Rhythm</h3>

          <div className="form-row form-row-3col">
            <div className="form-group">
              <label>
                Morning Start Time <span className="required">*</span>
              </label>
              <select
                value={preferences.wakeUpTime}
                onChange={(e) =>
                  handlePreferenceChange("wakeUpTime", e.target.value)
                }
                required
              >
                <option value="">Select time...</option>
                <option value="before7">Before 7 AM</option>
                <option value="7to8">7-8 AM</option>
                <option value="8to9">8-9 AM</option>
                <option value="after9">After 9 AM</option>
              </select>
            </div>

            <div className="form-group">
              <label>
                Return Time <span className="required">*</span>
              </label>
              <select
                value={preferences.returnTime}
                onChange={(e) =>
                  handlePreferenceChange("returnTime", e.target.value)
                }
                required
              >
                <option value="">Select time...</option>
                <option value="before6">Before 6 PM</option>
                <option value="6to8">6-8 PM</option>
                <option value="8to10">8-10 PM</option>
                <option value="after10">After 10 PM</option>
              </select>
            </div>

            <div className="form-group">
              <label>
                Meals Per Day <span className="required">*</span>
              </label>
              <select
                value={preferences.mealsPerDay}
                onChange={(e) =>
                  handlePreferenceChange("mealsPerDay", e.target.value)
                }
                required
              >
                <option value="">Select meals...</option>
                <option value="3meals">3 meals (B/L/D)</option>
                <option value="skipBreakfast">2 meals (no breakfast)</option>
                <option value="skipLunch">2 meals (no lunch)</option>
                <option value="skipDinner">2 meals (no dinner)</option>
                <option value="1meal">1 meal only</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>
          </div>

          <div className="form-row form-row-3col">
            <div className="form-group">
              <label>Breakfast Time</label>
              <select
                value={preferences.breakfastTime}
                onChange={(e) =>
                  handlePreferenceChange("breakfastTime", e.target.value)
                }
              >
                <option value="">Select time...</option>
                <option value="early">Early (6-8 AM)</option>
                <option value="normal">Normal (8-10 AM)</option>
                <option value="late">Late (10-12 PM)</option>
                <option value="skip">Skip breakfast</option>
              </select>
            </div>

            <div className="form-group">
              <label>Lunch Time</label>
              <select
                value={preferences.lunchTime}
                onChange={(e) =>
                  handlePreferenceChange("lunchTime", e.target.value)
                }
              >
                <option value="">Select time...</option>
                <option value="early">Early (11 AM-12 PM)</option>
                <option value="normal">Normal (12-2 PM)</option>
                <option value="late">Late (2-4 PM)</option>
                <option value="skip">Skip lunch</option>
              </select>
            </div>

            <div className="form-group">
              <label>Dinner Time</label>
              <select
                value={preferences.dinnerTime}
                onChange={(e) =>
                  handlePreferenceChange("dinnerTime", e.target.value)
                }
              >
                <option value="">Select time...</option>
                <option value="early">Early (5-6 PM)</option>
                <option value="normal">Normal (6-8 PM)</option>
                <option value="late">Late (8-10 PM)</option>
                <option value="skip">Skip dinner</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. Breaks & Recharge */}
        <div className="form-section compact">
          <h3>⏸️ Breaks & Recharge</h3>

          <div className="form-row">
            <div className="form-group">
              <label>
                Need Breaks? <span className="required">*</span>
              </label>
              <select
                value={preferences.needBreaks}
                onChange={(e) =>
                  handlePreferenceChange("needBreaks", e.target.value)
                }
                required
              >
                <option value="">Select...</option>
                <option value="regularly">Yes, regularly</option>
                <option value="occasionally">Occasionally</option>
                <option value="tired">Only if tired</option>
                <option value="none">No breaks needed</option>
              </select>
            </div>

            <div className="form-group">
              <label>Break Duration</label>
              <select
                value={preferences.breakDuration}
                onChange={(e) =>
                  handlePreferenceChange("breakDuration", e.target.value)
                }
              >
                <option value="">Select duration...</option>
                <option value="short">Short (10-15 min)</option>
                <option value="medium">Medium (30-45 min)</option>
                <option value="long">Long (1+ hour)</option>
              </select>
            </div>
          </div>

          {preferences.needBreaks && preferences.needBreaks !== "none" && (
            <div className="form-group">
              <label>Break Activities</label>
              <div className="checkbox-group compact">
                {[
                  "Coffee/tea stop",
                  "Rest at hotel",
                  "Park or scenic spot",
                  "Shopping break",
                  "Other",
                ].map((option) => (
                  <label key={option} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={preferences.breakActivities.includes(option)}
                      onChange={(e) => {
                        const newActivities = e.target.checked
                          ? [...preferences.breakActivities, option]
                          : preferences.breakActivities.filter(
                              (a) => a !== option
                            );
                        handlePreferenceChange(
                          "breakActivities",
                          newActivities
                        );
                      }}
                    />
                    {option}
                  </label>
                ))}
              </div>
              {preferences.breakActivities.includes("Other") && (
                <input
                  type="text"
                  value={preferences.breakActivitiesOther}
                  onChange={(e) =>
                    handlePreferenceChange(
                      "breakActivitiesOther",
                      e.target.value
                    )
                  }
                  placeholder="Please specify other break activities..."
                  className="other-input"
                />
              )}
            </div>
          )}
        </div>

        {/* 5. Food & Dining */}
        <div className="form-section compact">
          <h3>🍽️ Food & Dining</h3>

          <div className="form-group">
            <label>Dietary Restrictions</label>
            <div className="checkbox-group compact">
              {[
                "None",
                "Vegetarian",
                "Vegan",
                "Halal",
                "Gluten-free",
                "Other",
              ].map((option) => (
                <label key={option} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={preferences.dietaryRestrictions.includes(option)}
                    onChange={(e) => {
                      const newRestrictions = e.target.checked
                        ? [...preferences.dietaryRestrictions, option]
                        : preferences.dietaryRestrictions.filter(
                            (r) => r !== option
                          );
                      handlePreferenceChange(
                        "dietaryRestrictions",
                        newRestrictions
                      );
                    }}
                  />
                  <div className="checkbox-label-text">{option}</div>
                </label>
              ))}
            </div>
            {preferences.dietaryRestrictions.includes("Other") && (
              <input
                type="text"
                value={preferences.dietaryRestrictionsOther}
                onChange={(e) =>
                  handlePreferenceChange(
                    "dietaryRestrictionsOther",
                    e.target.value
                  )
                }
                placeholder="Please specify dietary restrictions..."
                className="other-input"
              />
            )}
          </div>

          <div className="form-group">
            <label>Cuisine Interests</label>
            <div className="checkbox-group compact">
              {[
                "Local specialties",
                "Fine dining",
                "Street food",
                "International cuisine",
                "Vegetarian/Vegan options",
                "Other",
              ].map((option) => (
                <label key={option} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={preferences.cuisineInterests.includes(option)}
                    onChange={(e) => {
                      const newInterests = e.target.checked
                        ? [...preferences.cuisineInterests, option]
                        : preferences.cuisineInterests.filter(
                            (i) => i !== option
                          );
                      handlePreferenceChange("cuisineInterests", newInterests);
                    }}
                  />
                  {option}
                </label>
              ))}
            </div>
            {preferences.cuisineInterests.includes("Other") && (
              <input
                type="text"
                value={preferences.cuisineInterestsOther}
                onChange={(e) =>
                  handlePreferenceChange(
                    "cuisineInterestsOther",
                    e.target.value
                  )
                }
                placeholder="Please specify cuisine interests..."
                className="other-input"
              />
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Snacking Habits</label>
              <select
                value={preferences.snackingHabits}
                onChange={(e) =>
                  handlePreferenceChange("snackingHabits", e.target.value)
                }
              >
                <option value="">Select preference...</option>
                <option value="frequent">Frequent snacker</option>
                <option value="occasional">Occasional snacker</option>
                <option value="none">No snacks needed</option>
              </select>
            </div>
          </div>
        </div>

        {/* 6. Activities & Experiences */}
        <div className="form-section">
          <h3>🎯 Activities & Experiences</h3>

          <div className="form-group">
            <label>
              Preferred Experiences <span className="required">*</span>
            </label>
            <div className="checkbox-group compact">
              {[
                "Iconic landmarks & sightseeing",
                "Local markets & shopping",
                "Hiking, biking, or nature walks",
                "Water activities (beach, snorkeling, kayaking)",
                "Cultural tours (temples, museums, heritage sites)",
                "Food tours or cooking classes",
                "Nightlife & entertainment",
                "Spa, massage, or wellness retreats",
                "Festivals or seasonal events",
                "Animal encounters (zoos, safaris, aquariums)",
                "Photography spots",
                "Family-friendly attractions",
                "Off-the-beaten-path adventures",
                "Other",
              ].map((option) => (
                <label key={option} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={preferences.preferredExperiences.includes(option)}
                    onChange={(e) => {
                      const newExperiences = e.target.checked
                        ? [...preferences.preferredExperiences, option]
                        : preferences.preferredExperiences.filter(
                            (exp) => exp !== option
                          );
                      handlePreferenceChange(
                        "preferredExperiences",
                        newExperiences
                      );
                    }}
                  />
                  {option}
                </label>
              ))}
            </div>
            {preferences.preferredExperiences.includes("Other") && (
              <input
                type="text"
                value={preferences.preferredExperiencesOther}
                onChange={(e) =>
                  handlePreferenceChange(
                    "preferredExperiencesOther",
                    e.target.value
                  )
                }
                placeholder="Please specify other preferred experiences..."
                className="other-input"
              />
            )}
          </div>

          <div className="form-group">
            <label>Special Interests or Themes</label>
            <textarea
              value={preferences.specialInterests}
              onChange={(e) =>
                handlePreferenceChange("specialInterests", e.target.value)
              }
              placeholder="Any specific themes, hobbies, or interests you'd like to incorporate..."
              rows="2"
            />
          </div>
        </div>

        {/* 7. Shopping & Leisure */}
        <div className="form-section compact">
          <h3>🛍️ Shopping & Leisure</h3>

          <div className="form-row">
            <div className="form-group">
              <label>
                Shopping Interest <span className="required">*</span>
              </label>
              <select
                value={preferences.shoppingInterest}
                onChange={(e) =>
                  handlePreferenceChange("shoppingInterest", e.target.value)
                }
                required
              >
                <option value="">Select interest level...</option>
                <option value="very-interested">Very interested</option>
                <option value="somewhat-interested">Somewhat interested</option>
                <option value="not-interested">Not interested</option>
              </select>
            </div>

            <div className="form-group">
              <label>Shopping Style</label>
              <select
                value={preferences.shoppingStyle}
                onChange={(e) =>
                  handlePreferenceChange("shoppingStyle", e.target.value)
                }
              >
                <option value="">Select style...</option>
                <option value="casual-browsing">Casual browsing</option>
                <option value="planned-visits">
                  Planned visits to specific stores
                </option>
                <option value="guided-tours">Guided shopping tours</option>
                <option value="only-if-catches-eye">
                  Only if something catches my eye
                </option>
              </select>
            </div>
          </div>

          {preferences.shoppingInterest &&
            preferences.shoppingInterest !== "not-interested" && (
              <div className="form-group">
                <label>Shopping Categories You Enjoy</label>
                <div className="checkbox-group compact">
                  {[
                    "Fashion & clothing",
                    "Local crafts & souvenirs",
                    "Electronics & gadgets",
                    "Beauty & skincare",
                    "Food & snacks",
                    "Home decor",
                    "Art & design",
                    "Other",
                  ].map((option) => (
                    <label key={option} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={preferences.shoppingCategories.includes(
                          option
                        )}
                        onChange={(e) => {
                          const newCategories = e.target.checked
                            ? [...preferences.shoppingCategories, option]
                            : preferences.shoppingCategories.filter(
                                (c) => c !== option
                              );
                          handlePreferenceChange(
                            "shoppingCategories",
                            newCategories
                          );
                        }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
                {preferences.shoppingCategories.includes("Other") && (
                  <input
                    type="text"
                    value={preferences.shoppingCategoriesOther}
                    onChange={(e) =>
                      handlePreferenceChange(
                        "shoppingCategoriesOther",
                        e.target.value
                      )
                    }
                    placeholder="Please specify other shopping categories..."
                    className="other-input"
                  />
                )}
              </div>
            )}
        </div>

        {/* 8. Special Requests */}
        <div className="form-section">
          <h3>📝 Special Requests</h3>

          <div className="form-group">
            <label>
              Anything else you'd like me to know to make your trip perfect?
            </label>
            <textarea
              value={preferences.additionalNotes}
              onChange={(e) =>
                handlePreferenceChange("additionalNotes", e.target.value)
              }
              placeholder="Share any additional preferences, accessibility needs, special occasions, or other details that would help create the perfect itinerary for you..."
              rows="4"
            />
          </div>

          <div className="bucket-list-section">
            <h4>Add from Bucket List</h4>
            <button
              type="button"
              onClick={() => setShowBucketSidebar(true)}
              className="add-bucket-button"
            >
              ➕ Add Activities from Bucket List
            </button>

            {selectedBucketItems.length > 0 && (
              <div className="selected-bucket-items">
                <h4>Selected Activities ({selectedBucketItems.length}):</h4>
                <div className="selected-items-list">
                  {selectedBucketItems.map((item) => (
                    <div key={item.id} className="selected-bucket-item">
                      <span>{item.name}</span>
                      <button
                        type="button"
                        onClick={() => handleBucketItemToggle(item)}
                        className="remove-item-button"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            disabled={isGenerating || !selectedTrip}
            className="generate-button"
          >
            {isGenerating
              ? "🤖 Generating Itinerary..."
              : "🚀 Generate Trip Plan"}
          </button>
        </div>
      </form>

      {/* Bucket List Sidebar */}
      {showBucketSidebar && (
        <BucketListSidebar
          bucketList={bucketList}
          selectedItems={selectedBucketItems}
          onItemToggle={handleBucketItemToggle}
          onClose={() => setShowBucketSidebar(false)}
        />
      )}
    </div>
  );
};

export default TripPlannerForm;
