import React from "react";

const TripPlannerLoading = ({ message = "Generating your trip plan..." }) => {
  return (
    <div className="trip-planner-loading">
      <div className="loading-content">
        <div className="loading-icon">
          <img
            src="/img/memo.png"
            alt="Loading"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
          <div className="loading-icon-fallback" style={{ display: "none" }}>
            🤖
          </div>
        </div>

        <h3>Creating Your High-Level Plan</h3>
        <p>{message}</p>

        <div className="simple-loading-spinner">
          <div className="spinner-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <div className="loading-info">
          <p>
            Using AI to create daily themes and activities based on your
            preferences...
          </p>
        </div>
      </div>
    </div>
  );
};

export default TripPlannerLoading;
