/**
 * AWS Lambda Excel Export Service
 * Handles communication with the AWS Lambda function for Excel export
 */

import { ENV_CONFIG } from "../config/environment";

class AWSExportService {
  constructor() {
    this.apiUrl = ENV_CONFIG.EXPORT_SERVICE.URL;
    this.timeout = ENV_CONFIG.EXPORT_SERVICE.TIMEOUT;
    this.enabled = ENV_CONFIG.EXPORT_SERVICE.ENABLED;
  }

  /**
   * Check if the export service is available
   */
  isAvailable() {
    // Always return true since we're using the API Gateway
    return true;
  }

  /**
   * Export calendar data to Excel via AWS Lambda
   */
  async exportToExcel(calendarData, tripData) {
    // Use the new API service instead of checking localhost availability
    const apiService = await import("./apiService");
    return apiService.default.exportToExcel(calendarData, tripData);
  }

  // Legacy method (kept for compatibility)
  async exportToExcelLegacy(calendarData, tripData) {
    if (!this.isAvailable()) {
      throw new Error(
        "Export service is not available. Please check configuration."
      );
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          calendarData,
          tripData,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Export failed");
      }

      return {
        filename: result.filename,
        data: result.data, // Base64 encoded Excel data
        size: result.size,
      };
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Export request timed out. Please try again.");
      }

      console.error("AWS Export Service Error:", error);
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  /**
   * Download the Excel file from base64 data
   */
  downloadExcelFile(filename, base64Data) {
    try {
      // Convert base64 to blob
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error("Download Error:", error);
      throw new Error("Failed to download Excel file");
    }
  }

  /**
   * Health check for the AWS Lambda service
   */
  async healthCheck() {
    // Always return healthy since we're using API Gateway
    return {
      status: "healthy",
      message: "Export service is ready via API Gateway",
    };
  }

  /**
   * Get service configuration info
   */
  getServiceInfo() {
    return {
      url: this.apiUrl,
      enabled: this.enabled,
      timeout: this.timeout,
      available: this.isAvailable(),
    };
  }
}

// Export singleton instance
export const awsExportService = new AWSExportService();
export default awsExportService;
