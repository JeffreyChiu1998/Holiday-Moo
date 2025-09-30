/**
 * Date utilities for timezone-naive date handling
 * Removes timezone conversion throughout Holiday Moo
 */

/**
 * Format a Date object as local datetime string without timezone
 * @param {Date} date - Date object
 * @returns {string} - Format: "2025-10-04T10:30:00" (no Z)
 */
export const formatLocalDateTime = (date) => {
  if (!date || !(date instanceof Date)) {
    return new Date().toISOString().slice(0, 19); // Fallback without Z
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

/**
 * Format a Date object as local date string without timezone
 * @param {Date} date - Date object
 * @returns {string} - Format: "2025-10-04"
 */
export const formatLocalDate = (date) => {
  if (!date || !(date instanceof Date)) {
    return new Date().toISOString().slice(0, 10); // Fallback
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Get current local datetime string without timezone
 * @returns {string} - Format: "2025-10-04T10:30:00" (no Z)
 */
export const getCurrentLocalDateTime = () => {
  return formatLocalDateTime(new Date());
};

/**
 * Get current local date string without timezone
 * @returns {string} - Format: "2025-10-04"
 */
export const getCurrentLocalDate = () => {
  return formatLocalDate(new Date());
};

/**
 * Parse a local datetime string to Date object
 * @param {string} dateTimeString - Format: "2025-10-04T10:30:00"
 * @returns {Date} - Date object
 */
export const parseLocalDateTime = (dateTimeString) => {
  if (!dateTimeString) return new Date();

  // Remove any timezone indicators
  const cleanString =
    dateTimeString
      .replace("Z", "")
      .split("+")[0]
      .split("-")
      .slice(0, 3)
      .join("-") +
      "T" +
      dateTimeString.split("T")[1]?.split("+")[0]?.split("Z")[0] || "00:00:00";

  return new Date(cleanString);
};

/**
 * Parse a local date string to Date object
 * @param {string} dateString - Format: "2025-10-04"
 * @returns {Date} - Date object
 */
export const parseLocalDate = (dateString) => {
  if (!dateString) return new Date();

  const [year, month, day] = dateString.split("-");
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};
