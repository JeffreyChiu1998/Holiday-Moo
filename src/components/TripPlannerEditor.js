import { useState, useRef, useEffect, Fragment } from "react";
import TripPlannerSummary from "./TripPlannerSummary";
import tripPlannerService from "../services/tripPlannerService";

const TripPlannerEditor = ({ itinerary, onItineraryUpdate, onConfirm }) => {
  const [chatMessages, setChatMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentItinerary, setCurrentItinerary] = useState(itinerary);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize chat with welcome message
  useEffect(() => {
    const welcomeMessage = {
      id: Date.now(),
      sender: "moo",
      content:
        "Hi! I'm here to help you refine your trip plan. You can ask me to:\n\n• Move activities to different days\n• Add more dining options\n• Replace activities with alternatives\n• Adjust timing or pace\n• Add specific interests or requirements\n\nWhat would you like to change?",
      timestamp: new Date(),
    };
    setChatMessages([welcomeMessage]);
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputValue.trim() || isLoading) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      sender: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Call AI service to process the edit request
      const result = await tripPlannerService.editItinerary(
        currentItinerary,
        userMessage.content
      );

      // Add AI response to chat
      const aiResponse = {
        id: Date.now() + 1,
        sender: "moo",
        content:
          result.aiResponse ||
          `I've updated your itinerary based on your request. The changes have been applied to your trip plan on the left. Is there anything else you'd like to adjust?`,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, aiResponse]);

      // Update itinerary
      setCurrentItinerary(result.itinerary);
      onItineraryUpdate(result.itinerary);
    } catch (error) {
      console.error("Error processing edit request:", error);

      const errorMessage = {
        id: Date.now() + 1,
        sender: "moo",
        content:
          "Sorry, I had trouble processing that request. Could you try rephrasing it or be more specific about what you'd like to change?",
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Refocus input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div className="trip-planner-editor">
      <div className="editor-layout">
        {/* Left Side - Updated Itinerary */}
        <div className="editor-itinerary">
          <div className="itinerary-header">
            <h3>📝 Updated Itinerary</h3>
            <p>Changes are applied in real-time as you chat with Moo AI</p>
          </div>

          <div className="itinerary-wrapper">
            <TripPlannerSummary
              itinerary={currentItinerary}
              onEdit={() => {}} // Disable edit button in this context
              onConfirm={handleConfirm}
            />
          </div>
        </div>

        {/* Right Side - Chat Interface */}
        <div className="editor-chat">
          <div className="chat-header">
            <h3>💬 Chat with Moo AI</h3>
            <p>Tell me what you'd like to change about your trip</p>
          </div>

          <div className="chat-messages">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`chat-message ${message.sender}`}
              >
                {message.sender === "moo" && (
                  <div className="message-avatar">
                    <img
                      src="/img/chatbot.png"
                      alt="Moo"
                      className="moo-avatar-small"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                    <div
                      className="moo-avatar-fallback-small"
                      style={{ display: "none" }}
                    >
                      🐄
                    </div>
                  </div>
                )}

                <div className="message-content">
                  <div className="message-text">
                    {message.content.split("\n").map((line, index) => (
                      <Fragment key={index}>
                        {line}
                        {index < message.content.split("\n").length - 1 && (
                          <br />
                        )}
                      </Fragment>
                    ))}
                  </div>
                  <div className="message-time">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="chat-message moo">
                <div className="message-avatar">
                  <img
                    src="/img/chatbot.png"
                    alt="Moo"
                    className="moo-avatar-small"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                  <div
                    className="moo-avatar-fallback-small"
                    style={{ display: "none" }}
                  >
                    🐄
                  </div>
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            <form onSubmit={handleSendMessage}>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  isLoading
                    ? "Moo is updating your plan..."
                    : "Tell me what you'd like to change..."
                }
                disabled={isLoading}
                className="chat-input"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="chat-send-button"
              >
                {isLoading ? "..." : "Send"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripPlannerEditor;
