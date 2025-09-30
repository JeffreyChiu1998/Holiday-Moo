import { useContext, useState, useRef } from "react";
import { UndoRedoContext } from "./Calendar";
import MooChatbot from "./MooChatbot";
import BucketListModal from "./BucketListModal";
import BucketListButton from "./BucketListButton";
import ChecklistModal from "./ChecklistModal";
import ChecklistButton from "./ChecklistButton";
import PaymentCalculator from "./PaymentCalculator";
import TripPlannerModal from "./TripPlannerModal";
import "../styles/MooChatbot.css";
import "../styles/TripPlanner.css";

const ToolPanel = ({
  onReturnDefaultView,
  trips = [],
  events = [],
  bucketList = [],
  checklistItems = [],
  onBucketListChange,
  onChecklistChange,
  onCreateEventFromBucket,
  onUpdateTrip,
  onEventsGenerated,
  showExportModal = false,
}) => {
  const undoRedoContext = useContext(UndoRedoContext);
  const [chatbotState, setChatbotState] = useState("closed"); // 'closed', 'open', 'minimized'

  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const [showBucketListModal, setShowBucketListModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showPaymentCalculator, setShowPaymentCalculator] = useState(false);
  const [showTripPlannerModal, setShowTripPlannerModal] = useState(false);
  const paymentCalculatorRef = useRef(null);

  const handleBucketListRequest = (activities) => {
    // Handle both single items and arrays
    const itemsToAdd = Array.isArray(activities) ? activities : [activities];
    const newList = [...bucketList, ...itemsToAdd];
    onBucketListChange(newList);
  };

  const handleDeleteBucketItem = (itemId) => {
    const newList = bucketList.filter((item) => item.id !== itemId);
    onBucketListChange(newList);
  };

  const handleUpdateChecklistItems = (updatedItems) => {
    onChecklistChange(updatedItems);
  };

  const handleAddToCalendar = (bucketItem) => {
    if (onCreateEventFromBucket) {
      onCreateEventFromBucket(bucketItem);
    }
  };

  return (
    <div className="tool-panel-container">
      <div className="tool-panel">
        <div className="tool-panel-content">
          {/* Moo Chatbot Icon - Left Side */}
          <div className="moo-chatbot-section">
            <div className="icon-with-label">
              <button
                className={`moo-chatbot-icon`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (chatbotState === "closed") {
                    setChatbotState("open");
                    setHasUnreadMessages(false);
                  } else if (chatbotState === "minimized") {
                    setChatbotState("open");
                    setHasUnreadMessages(false);
                  } else {
                    setChatbotState("minimized");
                  }
                }}
                title="Chat with Moo - AI Travel Assistant"
              >
                <img
                  src="/img/chatbot.png"
                  alt="Moo"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
                <div className="moo-icon-fallback" style={{ display: "none" }}>
                  🐄
                </div>
                {hasUnreadMessages && <div className="unread-badge">!</div>}
              </button>
              <div className="icon-label">Moo AI</div>
            </div>

            {/* Bucket List Button - Next to Chatbot */}
            <div className="icon-with-label">
              <BucketListButton
                bucketListCount={bucketList.length}
                onClick={() => setShowBucketListModal(true)}
              />
              <div className="icon-label">Bucket List</div>
            </div>
            <div className="icon-with-label">
              <button
                className="trip-planner-icon"
                onClick={() => setShowTripPlannerModal(true)}
                title="AI Trip Planner - Generate complete itineraries"
              >
                <img
                  src="/img/memo.png"
                  alt="Trip Planner"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
                <div
                  className="trip-planner-icon-fallback"
                  style={{ display: "none" }}
                >
                  📍
                </div>
              </button>
              <div className="icon-label">Trip Planner</div>
            </div>
          </div>

          <div className="tool-buttons">
            <button
              onClick={() => {
                if (undoRedoContext?.handleUndo) {
                  undoRedoContext.handleUndo();
                }
              }}
              disabled={!undoRedoContext?.canUndo}
              className={`tool-button ${
                !undoRedoContext?.canUndo ? "disabled" : ""
              }`}
              title="Undo last action"
            >
              ↶ Undo
            </button>

            <button
              onClick={onReturnDefaultView}
              className="tool-button"
              title="Return to current week view"
            >
              🏠 Default View
            </button>

            <button
              onClick={() => {
                if (undoRedoContext?.handleRedo) {
                  undoRedoContext.handleRedo();
                }
              }}
              disabled={!undoRedoContext?.canRedo}
              className={`tool-button ${
                !undoRedoContext?.canRedo ? "disabled" : ""
              }`}
              title="Redo last action"
            >
              ↷ Redo
            </button>
          </div>

          {/* Trip Planner Button - Right Side */}
          <div className="trip-planner-section"></div>

          {/* Payment Calculator Button - Right Side */}
          <div className="payment-calculator-section">
            {/* Checklist Button - Next to Bucket List */}
            <div className="icon-with-label">
              <ChecklistButton
                checklistItems={checklistItems}
                onClick={() => setShowChecklistModal(true)}
              />
              <div className="icon-label">Checklist</div>
            </div>
            <div className="icon-with-label">
              <button
                className="payment-calculator-icon"
                onClick={() => setShowPaymentCalculator(true)}
                title="Payment Calculator"
              >
                <img
                  src="/img/calculator.png"
                  alt="Calculator"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
                <div
                  className="calculator-icon-fallback"
                  style={{ display: "none" }}
                >
                  💰
                </div>
              </button>
              <div className="icon-label">Payments</div>
            </div>
          </div>
        </div>
      </div>

      {/* Moo Chatbot Window */}
      {(chatbotState === "open" || chatbotState === "minimized") && (
        <MooChatbot
          isOpen={chatbotState === "open"}
          isMinimized={chatbotState === "minimized"}
          onClose={() => setChatbotState("closed")}
          onMinimize={() => setChatbotState("minimized")}
          onMaximize={() => {
            setChatbotState("open");
            setHasUnreadMessages(false);
          }}
          onNewMessage={() => {
            if (chatbotState === "minimized") {
              setHasUnreadMessages(true);
            }
          }}
          userTrips={trips}
          userEvents={events}
          onBucketListRequest={handleBucketListRequest}
          isHiddenByModal={
            showBucketListModal ||
            showChecklistModal ||
            showExportModal ||
            showTripPlannerModal ||
            showPaymentCalculator
          }
        />
      )}

      {/* Bucket List Modal */}
      <BucketListModal
        isOpen={showBucketListModal}
        bucketList={bucketList}
        onClose={() => setShowBucketListModal(false)}
        onDeleteItem={handleDeleteBucketItem}
        onAddItem={handleBucketListRequest}
        onAddToCalendar={handleAddToCalendar}
        onBucketListChange={onBucketListChange}
      />

      {/* Checklist Modal */}
      <ChecklistModal
        isOpen={showChecklistModal}
        checklistItems={checklistItems}
        onClose={() => setShowChecklistModal(false)}
        onUpdateItems={handleUpdateChecklistItems}
      />

      {/* Payment Calculator Modal */}
      {showPaymentCalculator && (
        <div
          className="modal-overlay payment-calculator-overlay"
          onClick={(e) => {
            // Only close if clicking on the overlay itself, not the modal content
            if (e.target === e.currentTarget) {
              if (paymentCalculatorRef.current) {
                paymentCalculatorRef.current.handleClose();
              } else {
                setShowPaymentCalculator(false);
              }
            }
          }}
        >
          <div className="modal-content payment-calculator-modal">
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="checklist-modal-icon">
                  <img
                    src="/img/calculator.png"
                    alt="Payment Calculator"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                  <div
                    className="calculator-icon-fallback"
                    style={{ display: "none" }}
                  >
                    💰
                  </div>
                </div>
                <h2>Payment Calculator</h2>
              </div>
              <button
                className="close-button"
                onClick={() => {
                  if (paymentCalculatorRef.current) {
                    paymentCalculatorRef.current.handleClose();
                  } else {
                    setShowPaymentCalculator(false);
                  }
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <PaymentCalculator
                ref={paymentCalculatorRef}
                trips={trips}
                onUpdateTrip={onUpdateTrip}
                onClose={() => setShowPaymentCalculator(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Trip Planner Modal */}
      <TripPlannerModal
        isOpen={showTripPlannerModal}
        onClose={() => setShowTripPlannerModal(false)}
        userTrips={trips}
        bucketList={bucketList}
        onBucketListChange={onBucketListChange}
        onEventsGenerated={onEventsGenerated}
      />
    </div>
  );
};

export default ToolPanel;
