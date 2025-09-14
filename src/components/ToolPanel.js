import { useContext, useState } from "react";
import { UndoRedoContext } from "./Calendar";
import MooChatbot from "./MooChatbot";
import BucketListModal from "./BucketListModal";
import BucketListButton from "./BucketListButton";
import ChecklistModal from "./ChecklistModal";
import ChecklistButton from "./ChecklistButton";
import "../styles/MooChatbot.css";

const ToolPanel = ({
  onReturnDefaultView,
  trips = [],
  events = [],
  bucketList = [],
  checklistItems = [],
  onBucketListChange,
  onChecklistChange,
  onCreateEventFromBucket,
}) => {
  const undoRedoContext = useContext(UndoRedoContext);
  const [chatbotState, setChatbotState] = useState("closed"); // 'closed', 'open', 'minimized'
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const [showBucketListModal, setShowBucketListModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);

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
                className={`moo-chatbot-icon ${
                  hasUnreadMessages ? "has-unread bouncing" : ""
                }`}
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

            {/* Checklist Button - Next to Bucket List */}
            <div className="icon-with-label">
              <ChecklistButton
                checklistItems={checklistItems}
                onClick={() => setShowChecklistModal(true)}
              />
              <div className="icon-label">Checklist</div>
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
        </div>
      </div>

      {/* Moo Chatbot Window */}
      {(chatbotState === "open" || chatbotState === "minimized") &&
        !showBucketListModal &&
        !showChecklistModal && (
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
    </div>
  );
};

export default ToolPanel;
