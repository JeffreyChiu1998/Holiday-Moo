import { useState, useEffect } from "react";

const TripPlannerProgress = ({
  progress,
  onComplete,
  onError,
  highLevelPlan,
  formData,
}) => {
  const [currentMessage, setCurrentMessage] = useState("");
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(null);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (progress && progress.isGenerating) {
      if ((progress.currentDay || 0) === 0) {
        setCurrentMessage("Initializing detailed planning...");
      } else {
        const daysArray = highLevelPlan.days || highLevelPlan.tripPlan || [];
        const dayInfo = daysArray[(progress.currentDay || 1) - 1];
        const taskMessage = progress.currentTaskMessage || "Processing...";
        setCurrentMessage(
          `Day ${progress.currentDay || 1}: ${
            dayInfo?.topic || dayInfo?.theme || "Planning"
          } - ${taskMessage}`
        );

        // Calculate estimated time remaining based on completed tasks
        if (progress.completedTasks > 0) {
          const elapsed = Date.now() - startTime;
          const avgTimePerTask = elapsed / progress.completedTasks;
          const remainingTasks = progress.totalTasks - progress.completedTasks;
          const estimatedRemaining = Math.ceil(
            (avgTimePerTask * remainingTasks) / 1000
          );
          setEstimatedTimeRemaining(estimatedRemaining);
        }
      }
    } else if (progress.error) {
      setCurrentMessage("Generation failed");
      if (onError) {
        onError(progress.error);
      }
    } else if (
      progress.completedTasks === progress.totalTasks &&
      progress.totalTasks > 0
    ) {
      setCurrentMessage("Finalizing itinerary...");
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 500); // Wait 0.5s as requested
    }
  }, [progress, highLevelPlan, formData, startTime, onComplete, onError]);

  // Safety check for undefined progress (after all hooks)
  if (!progress) {
    return (
      <div className="trip-planner-progress">
        <div className="progress-header">
          <h3>Initializing...</h3>
          <p>Setting up detailed planning...</p>
        </div>
      </div>
    );
  }

  const progressPercentage =
    (progress.totalTasks || 0) > 0
      ? Math.round(
          ((progress.completedTasks || 0) / (progress.totalTasks || 1)) * 100
        )
      : 0;

  const formatTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="trip-planner-progress">
      <div className="progress-header">
        <div className="progress-icon">
          <img
            src="/img/memo.png"
            alt="Generating"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
          <div className="progress-icon-fallback" style={{ display: "none" }}>
            🤖
          </div>
        </div>
        <h3>Generating Detailed Itinerary</h3>
        <p>Creating your personalized day-by-day travel plan...</p>
      </div>

      <div className="progress-content">
        <div className="progress-status">
          <div className="progress-message">
            {currentMessage}
            {currentMessage.startsWith("Day ") && (
              <span className="progress-dots">
                <span></span>
                <span></span>
                <span></span>
              </span>
            )}
          </div>

          <div className="progress-stats">
            <span className="progress-fraction">
              Task {progress.completedTasks || 0} of {progress.totalTasks || 0}
            </span>
            {estimatedTimeRemaining && (
              <span className="progress-eta">
                ~{formatTime(estimatedTimeRemaining)} remaining
              </span>
            )}
          </div>
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="progress-percentage">{progressPercentage}%</div>
        </div>

        <div className="progress-details">
          <div className="progress-steps">
            {(highLevelPlan.days || highLevelPlan.tripPlan || []).map(
              (day, index) => {
                const dayNumber = index + 1;
                const dayTasks = (progress.taskStatus || []).filter(
                  (task) => task && task.day === dayNumber
                );
                const completedDayTasks = dayTasks.filter(
                  (task) => task.completed && task.success
                ).length;
                const failedDayTasks = dayTasks.filter(
                  (task) => task.completed && !task.success
                ).length;

                let stepStatus = "pending";
                if (dayNumber < progress.currentDay) {
                  stepStatus = "completed";
                } else if (dayNumber === progress.currentDay) {
                  stepStatus = "active";
                }

                return (
                  <div key={index} className={`progress-step ${stepStatus}`}>
                    <div className="step-number">
                      {stepStatus === "completed" ? "✓" : dayNumber}
                    </div>
                    <div className="step-info">
                      <div className="step-title">Day {dayNumber}</div>
                      <div className="step-subtitle">{day.topic}</div>
                      <div className="step-tasks">
                        {completedDayTasks > 0 && (
                          <span className="task-success">
                            ✅ {completedDayTasks}
                          </span>
                        )}
                        {failedDayTasks > 0 && (
                          <span className="task-failed">
                            ❌ {failedDayTasks}
                          </span>
                        )}
                        {stepStatus === "active" && (
                          <span className="task-progress">
                            Task {progress.currentTask}/3
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        <div className="progress-info">
          <div className="info-item">
            <span className="info-icon">🤖</span>
            <span>Using Perplexity AI for real-time recommendations</span>
          </div>
          <div className="info-item">
            <span className="info-icon">🗺️</span>
            <span>Enriching locations with Google Places data</span>
          </div>
          <div className="info-item">
            <span className="info-icon">📅</span>
            <span>Creating detailed timeline for each day</span>
          </div>
        </div>

        {progress.error && (
          <div className="progress-error">
            <div className="error-icon">⚠️</div>
            <div className="error-message">
              <strong>Generation Error:</strong> {progress.error}
            </div>
            <div className="error-actions">
              <button
                className="retry-button"
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="progress-footer">
        <p className="progress-note">
          This may take a few minutes as we create a comprehensive itinerary
          with real-time data and location details.
        </p>
      </div>
    </div>
  );
};

export default TripPlannerProgress;
