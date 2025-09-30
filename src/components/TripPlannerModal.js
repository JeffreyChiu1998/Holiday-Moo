import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import TripPlannerForm from "./TripPlannerForm";
import TripPlannerLoading from "./TripPlannerLoading";
import TripPlannerHighLevel from "./TripPlannerHighLevel";
import TripPlannerMooChat from "./TripPlannerMooChat";
import TripPlannerProgress from "./TripPlannerProgress";
import TripPlannerPreview from "./TripPlannerPreview";
import TripPlannerFinalConfirmation from "./TripPlannerFinalConfirmation";
import tripPlannerServiceV2 from "../services/tripPlannerServiceV2";
import tripPlannerDetailedService from "../services/tripPlannerDetailedService";

const TripPlannerModal = ({
  isOpen,
  onClose,
  userTrips = [],
  bucketList = [],
  onEventsGenerated,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [hasFormData, setHasFormData] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [generatedItinerary, setGeneratedItinerary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMooChat, setShowMooChat] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [formData, setFormData] = useState(null);
  const [generationProgress, setGenerationProgress] = useState({
    currentDay: 0,
    totalDays: 0,
    isGenerating: false,
    error: null,
  });

  const handleClose = useCallback(() => {
    // Check if user has made progress that would be lost
    let confirmationMessage = "";
    let needsConfirmation = false;

    if (currentStep === 1 && hasFormData) {
      // User has started filling the form
      confirmationMessage =
        "You have unsaved form data. Are you sure you want to close and lose your progress?";
      needsConfirmation = true;
    } else if (currentStep === 2) {
      // User is generating high-level plan - this should be blocked
      alert(
        "Please wait for the high-level plan generation to complete before closing."
      );
      return;
    } else if (currentStep === 3) {
      // User has generated an itinerary
      confirmationMessage =
        "You have a generated trip plan. Are you sure you want to close without saving it?";
      needsConfirmation = true;
    } else if (currentStep === 4) {
      // User is generating detailed plan - this should be blocked
      alert(
        "Please wait for the detailed plan generation to complete before closing."
      );
      return;
    } else if (currentStep === 5) {
      // User is at preview
      confirmationMessage =
        "You have a generated detailed itinerary. Are you sure you want to close without saving it?";
      needsConfirmation = true;
    } else if (currentStep === 6) {
      // User is at final confirmation
      confirmationMessage =
        "You are about to finalize your trip plan. Are you sure you want to close without completing it?";
      needsConfirmation = true;
    }

    if (needsConfirmation) {
      const confirmed = window.confirm(confirmationMessage);
      if (!confirmed) return;
    }

    // Clear all chat history and reset service state
    tripPlannerServiceV2.reset();
    setShowMooChat(false);
    setIsChatMinimized(false);

    onClose();
  }, [currentStep, hasFormData, onClose]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setHasFormData(false);
      setGeneratedPlan(null);
      setGeneratedItinerary(null);
      setIsGenerating(false);
      setShowMooChat(false);
      setIsChatMinimized(false);
      setFormData(null);
      setGenerationProgress({
        currentDay: 0,
        totalDays: 0,
        isGenerating: false,
        error: null,
      });
      // Reset the services
      tripPlannerServiceV2.reset();
      tripPlannerDetailedService.reset();
    }
  }, [isOpen]);

  // Auto-close Moo AI chat when leaving step 3 (high-level plan)
  useEffect(() => {
    if (currentStep !== 3 && showMooChat) {
      setShowMooChat(false);
      setIsChatMinimized(false);
    }
  }, [currentStep, showMooChat]);

  // Handle Escape key
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
      return () => document.removeEventListener("keydown", handleEscapeKey);
    }
  }, [isOpen, handleClose]);

  const handleFormSubmit = async (data) => {
    setIsGenerating(true);
    setFormData(data); // Store form data for later use
    setCurrentStep(2); // Move to loading step

    try {
      // Call AI service to generate high-level plan
      const plan = await tripPlannerServiceV2.generateHighLevelPlan(data);
      console.log("Generated plan:", plan); // Debug logging
      setGeneratedPlan(plan);
      setCurrentStep(3); // Move to high-level plan step
    } catch (error) {
      console.error("Error generating high-level plan:", error);
      alert("Failed to generate trip plan. Please try again.");
      setCurrentStep(1); // Go back to form
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFormDataChange = (hasData) => {
    setHasFormData(hasData);
  };

  const handleEditRequest = () => {
    if (showMooChat && !isChatMinimized) {
      // Chat is open, close it
      setShowMooChat(false);
      setIsChatMinimized(false);
    } else {
      // Chat is closed, open it
      setShowMooChat(true);
      setIsChatMinimized(false);
    }
  };

  const handlePlanUpdate = (updatedPlan) => {
    setGeneratedPlan(updatedPlan);
  };

  const handleContinueToDetailed = async () => {
    if (!generatedPlan || !formData) {
      alert("Missing plan or form data. Please try again.");
      return;
    }

    setCurrentStep(4); // Move to progress step

    try {
      // Start detailed generation
      const detailedItinerary =
        await tripPlannerDetailedService.generateDetailedItinerary(
          generatedPlan,
          formData,
          setGenerationProgress
        );

      setGeneratedItinerary(detailedItinerary);

      // Wait 0.5s after completion before moving to preview
      setTimeout(() => {
        setCurrentStep(5); // Move to preview step
      }, 500);
    } catch (error) {
      console.error("Error generating detailed itinerary:", error);
      alert("Failed to generate detailed itinerary. Please try again.");
      setCurrentStep(3); // Go back to high-level plan
    }
  };

  const handlePreviewConfirm = () => {
    setCurrentStep(6); // Move to final confirmation
  };

  const handlePreviewCancel = () => {
    setCurrentStep(3); // Go back to high-level plan
  };

  const handleFinalConfirm = (events) => {
    // Add events to calendar
    onEventsGenerated(events);
    onClose();
  };

  const handleFinalCancel = () => {
    setCurrentStep(5); // Go back to preview
  };

  const handleProgressComplete = () => {
    // This will be called when progress reaches 100%
    // The actual step change is handled in handleContinueToDetailed
  };

  const handleProgressError = (error) => {
    console.error("Progress error:", error);
    alert(`Generation failed: ${error}`);
    setCurrentStep(2); // Go back to high-level plan
  };

  const handleCloseMooChat = () => {
    setShowMooChat(false);
    setIsChatMinimized(false);
  };

  const handleMinimizeMooChat = () => {
    setIsChatMinimized(true);
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="modal-overlay trip-planner-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className={`modal-content trip-planner-modal ${
          showMooChat && !isChatMinimized ? "chat-open" : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-content">
            <div className="checklist-modal-icon">
              <img
                src="/img/memo.png"
                alt="Trip Planner"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
              <div
                className="checklist-icon-fallback"
                style={{ display: "none" }}
              >
                📝
              </div>
            </div>
            <h2>Trip Planner</h2>
          </div>
          <button className="close-button" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="trip-planner-content">
          {/* Step 1: Requirements Form */}
          {currentStep === 1 && (
            <TripPlannerForm
              userTrips={userTrips}
              bucketList={bucketList}
              onSubmit={handleFormSubmit}
              onFormDataChange={handleFormDataChange}
              isGenerating={isGenerating}
            />
          )}

          {/* Step 2: Loading - High-Level Plan Generation */}
          {currentStep === 2 && (
            <TripPlannerLoading message="Creating daily themes and activities based on your preferences..." />
          )}

          {/* Step 3: High-Level Plan Display */}
          {currentStep === 3 && (
            <TripPlannerHighLevel
              plan={generatedPlan}
              formData={formData}
              onPlanUpdate={handlePlanUpdate}
              isGenerating={isGenerating}
              onEditRequest={handleEditRequest}
              onContinueToDetailed={handleContinueToDetailed}
              isChatOpen={showMooChat && !isChatMinimized}
            />
          )}

          {/* Step 4: Progress - Day-by-Day Generation */}
          {currentStep === 4 && (
            <TripPlannerProgress
              progress={generationProgress}
              onComplete={handleProgressComplete}
              onError={handleProgressError}
              highLevelPlan={generatedPlan}
              formData={formData}
            />
          )}

          {/* Step 5: Preview - Review Generated Itinerary */}
          {currentStep === 5 && (
            <TripPlannerPreview
              itinerary={generatedItinerary}
              onConfirm={handlePreviewConfirm}
              onCancel={handlePreviewCancel}
            />
          )}

          {/* Step 6: Final Confirmation */}
          {currentStep === 6 && (
            <TripPlannerFinalConfirmation
              itinerary={generatedItinerary}
              onConfirm={handleFinalConfirm}
              onCancel={handleFinalCancel}
            />
          )}
        </div>

        {/* Specialized Moo AI Chat for Trip Planning */}
        <TripPlannerMooChat
          isOpen={showMooChat}
          onClose={handleCloseMooChat}
          currentPlan={generatedPlan}
          onPlanUpdate={handlePlanUpdate}
          onMinimize={handleMinimizeMooChat}
          isMinimized={isChatMinimized}
        />
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TripPlannerModal;
