/**
 * Export Service for Travel Calendar
 * Handles communication with Python Excel export service
 */

const EXPORT_SERVICE_URL = "http://localhost:5001";

class ExportService {
  /**
   * Check if the export service is available
   */
  async checkServiceHealth() {
    try {
      const response = await fetch(`${EXPORT_SERVICE_URL}/health`);
      const data = await response.json();
      return data.status === "healthy";
    } catch (error) {
      return false;
    }
  }

  /**
   * Export a trip as Excel file
   * @param {Object} calendarData - Complete calendar data
   * @param {Object} tripData - Selected trip data
   * @returns {Promise<void>}
   */
  async exportTripToExcel(calendarData, tripData) {
    try {
      // Check if service is available
      const isHealthy = await this.checkServiceHealth();
      if (!isHealthy) {
        throw new Error(
          "Export service is not available. Please make sure the Python service is running."
        );
      }

      // Prepare data for export
      const exportData = {
        calendarData: {
          title: calendarData.title || "Travel Calendar",
          events: calendarData.events || [],
          trips: calendarData.trips || [],
          customDayHeaders: calendarData.customDayHeaders || {},
          bucketList: calendarData.bucketList || [],
          checklistItems: calendarData.checklistItems || [],
        },
        tripData: {
          id: tripData.id,
          name: tripData.name,
          startDate: tripData.startDate,
          endDate: tripData.endDate,
          destination: tripData.destination || "",
          description: tripData.description || "",
        },
      };

      // Send export request
      const response = await fetch(`${EXPORT_SERVICE_URL}/export-trip`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(exportData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Export failed with status ${response.status}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Export failed");
      }

      // Convert base64 to blob and download
      const binaryString = atob(result.data);
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
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return {
        success: true,
        filename: result.filename,
        message: `Excel file "${result.filename}" has been downloaded successfully!`,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get service status and information
   */
  async getServiceInfo() {
    try {
      const isHealthy = await this.checkServiceHealth();
      return {
        available: isHealthy,
        url: EXPORT_SERVICE_URL,
        status: isHealthy ? "Service is running" : "Service is not available",
      };
    } catch (error) {
      return {
        available: false,
        url: EXPORT_SERVICE_URL,
        status: "Service check failed",
        error: error.message,
      };
    }
  }

  /**
   * Show service setup instructions
   */
  getSetupInstructions() {
    return {
      title: "Excel Export Service Setup",
      instructions: [
        "1. Install Python dependencies:",
        "   pip install openpyxl flask flask-cors",
        "",
        "2. Run the export service:",
        "   python src/services/excelExportService.py",
        "",
        "3. The service will be available at:",
        "   http://localhost:5001",
        "",
        "4. Try the export feature again once the service is running.",
      ],
      serviceFile: "src/services/excelExportService.py",
    };
  }
}

// Create singleton instance
const exportService = new ExportService();

export default exportService;
