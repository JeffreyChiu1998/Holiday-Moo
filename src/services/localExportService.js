/**
 * Local Export Service for Holiday Moo
 * Communicates with local Python server for beautiful Excel generation
 */

const LOCAL_EXPORT_URL = "http://localhost:5001";

class LocalExportService {
  constructor() {
    this.baseUrl = LOCAL_EXPORT_URL;
    this.timeout = 30000; // 30 seconds for Excel generation
  }

  /**
   * Check if the local export service is available
   */
  async checkServiceHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.status === "healthy";
    } catch (error) {
      console.log("Local export service not available:", error.message);
      return false;
    }
  }

  /**
   * Export trip to Excel using local Python service
   */
  async exportTripToExcel(calendarData, tripData) {
    try {
      // Check if service is available first
      const isHealthy = await this.checkServiceHealth();
      if (!isHealthy) {
        throw new Error(
          "Local export service is not available. Please start the Python service:\n\n" +
            "python src/services/localExportService.py"
        );
      }

      // Prepare data for export
      const exportData = {
        calendarData: {
          title: calendarData.title || "Holiday Moo Calendar",
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

      console.log("🧪 Sending data to local export service...");
      console.log("Trip:", tripData.name);
      console.log("Events:", exportData.calendarData.events.length);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // Send export request
      const response = await fetch(`${this.baseUrl}/export-trip`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(exportData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Export failed with status ${response.status}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Export failed");
      }

      console.log("✅ Local export completed successfully!");
      console.log("File:", result.filename);
      console.log("Size:", (result.size / 1024).toFixed(1) + " KB");

      // Download the file
      this.downloadExcelFile(result.filename, result.data);

      return {
        success: true,
        filename: result.filename,
        message: `Beautiful Excel dashboard "${result.filename}" has been downloaded! 📊`,
        size: result.size,
      };
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error(
          "Export request timed out. The Excel generation is taking longer than expected."
        );
      }

      console.error("Local export service error:", error);
      throw error;
    }
  }

  /**
   * Download Excel file from base64 data
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
   * Get service status and setup instructions
   */
  async getServiceInfo() {
    try {
      const isHealthy = await this.checkServiceHealth();
      return {
        available: isHealthy,
        url: this.baseUrl,
        status: isHealthy
          ? "Local service is running"
          : "Local service is not available",
        setupInstructions: this.getSetupInstructions(),
      };
    } catch (error) {
      return {
        available: false,
        url: this.baseUrl,
        status: "Service check failed",
        error: error.message,
        setupInstructions: this.getSetupInstructions(),
      };
    }
  }

  /**
   * Get setup instructions for the local service
   */
  getSetupInstructions() {
    return {
      title: "Local Excel Export Service Setup",
      instructions: [
        "1. Install Python dependencies:",
        "   pip install flask flask-cors openpyxl",
        "",
        "2. Run the local export service:",
        "   python src/services/localExportService.py",
        "",
        "3. The service will be available at:",
        "   http://localhost:5001",
        "",
        "4. Features:",
        "   📅 Calendar-focused dashboard layout",
        "   📊 Professional charts and statistics",
        "   🎨 Beautiful color-coded event types",
        "   📋 Detailed events list and trip summary",
        "",
        "5. Try the test export once the service is running!",
      ],
      serviceFile: "src/services/localExportService.py",
    };
  }

  /**
   * Health check method
   */
  async healthCheck() {
    const isHealthy = await this.checkServiceHealth();
    return {
      status: isHealthy ? "healthy" : "error",
      message: isHealthy
        ? "Local export service is ready"
        : "Local export service is not running",
    };
  }
}

// Create singleton instance
const localExportService = new LocalExportService();

export default localExportService;
