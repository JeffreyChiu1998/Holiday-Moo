import React, { useState, useRef, useEffect } from "react";
import tripPlannerServiceV2 from "../services/tripPlannerServiceV2";

const TripPlannerMooChat = ({
  isOpen,
  onClose,
  currentPlan,
  onPlanUpdate,
  onMinimize,
  isMinimized = false,
}) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize conversation when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initializeConversation();
    }
  }, [isOpen, messages.length]);

  // Clear messages when chat is closed
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setInputValue("");
      setIsValidating(false);
      setIsUpdating(false);
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initializeConversation = () => {
    const welcomeMessage = {
      id: Date.now(),
      sender: "moo",
      content: `Hi! I'm your Trip Planning Assistant. I can help you refine your current trip plan. You can ask me to:

• Move activities to different days
• Add more dining options  
• Replace activities with alternatives
• Adjust timing or pace
• Add specific interests or requirements

What would you like to change about your trip?`,
      timestamp: new Date(),
      options: [
        "More relaxing",
        "Add food spots",
        "Cultural focus",
        "Adjust timing",
      ],
    };

    setMessages([welcomeMessage]);
  };

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim() || isValidating || isUpdating) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      sender: "user",
      content: messageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    try {
      // Step 1: Validate message
      setIsValidating(true);

      const validation = await tripPlannerServiceV2.validateUserMessage(
        messageText
      );

      setIsValidating(false);

      if (!validation.isValid) {
        // Show clarification request
        const clarificationMessage = {
          id: Date.now() + 1,
          sender: "moo",
          content:
            validation.clarificationRequest ||
            "Could you please be more specific about what you'd like to change?",
          timestamp: new Date(),
          options: [
            "More relaxing",
            "Add activities",
            "Change types",
            "Adjust themes",
          ],
        };
        setMessages((prev) => [...prev, clarificationMessage]);
        return;
      }

      // Step 2: Modify plan with validated request
      setIsUpdating(true);

      const updatedPlan = await tripPlannerServiceV2.modifyPlan(
        validation.interpretedRequest
      );

      setIsUpdating(false);

      // Update the plan in parent component
      if (onPlanUpdate) {
        onPlanUpdate(updatedPlan);
      }

      // Show success message
      const successMessage = {
        id: Date.now() + 2,
        sender: "moo",
        content: `Great! I've updated your trip plan based on your request. The changes have been applied to your itinerary.

Is there anything else you'd like to adjust?`,
        timestamp: new Date(),
        options: [
          "Another change",
          "Add activities",
          "Different day",
          "Looks good!",
        ],
      };
      setMessages((prev) => [...prev, successMessage]);
    } catch (error) {
      setIsValidating(false);
      setIsUpdating(false);

      console.error("Error processing message:", error);

      const errorMessage = {
        id: Date.now() + 3,
        sender: "moo",
        content:
          error?.message ||
          "Sorry, I had trouble processing that request. Could you try rephrasing it or be more specific about what you'd like to change?",
        timestamp: new Date(),
        options: ["Try again", "Be specific", "Start over", "Help me"],
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleInputSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const isLoading = isValidating || isUpdating;
  const loadingText = isValidating
    ? "Checking your request..."
    : "Updating your plan...";

  if (!isOpen && !isMinimized) return null;

  return (
    <div className={`trip-planner-moo-chat ${isMinimized ? "minimized" : ""}`}>
      {/* Header */}
      <div
        className="chat-header"
        style={{ display: !isMinimized ? "flex" : "none" }}
      >
        <div className="chat-header-left">
          <div className="moo-avatar-container">
            <img
              src="/img/chatbot.png"
              alt="Moo"
              className="moo-avatar-header"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
            <div className="moo-avatar-fallback" style={{ display: "none" }}>
              🐄
            </div>
          </div>
          <div className="chat-header-text">
            <h3>Moo AI</h3>
            <span className="chat-status">Trip Planning Assistant</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      {!isMinimized && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <div
            className="moo-messages-container"
            style={{ height: "610px", overflowY: "auto" }}
          >
            {messages.map((message) => (
              <div key={message.id} className={`moo-message ${message.sender}`}>
                {message.sender === "moo" && (
                  <img
                    src="/img/chatbot.png"
                    alt="Moo"
                    className="moo-avatar-message"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                )}
                {message.sender === "moo" && (
                  <div
                    className="moo-avatar-fallback-message"
                    style={{ display: "none" }}
                  >
                    🐄
                  </div>
                )}
                <div className="moo-message-content">
                  <div className="moo-message-text">
                    {(message.content || "").split("\n").map((line, index) => (
                      <React.Fragment key={index}>
                        {line}
                        {index <
                          (message.content || "").split("\n").length - 1 && (
                          <br />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="moo-message-time">
                    {message.timestamp
                      ? message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="moo-message moo">
                <img
                  src="/img/chatbot.png"
                  alt="Moo"
                  className="moo-avatar-message"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
                <div
                  className="moo-avatar-fallback-message"
                  style={{ display: "none" }}
                >
                  🐄
                </div>
                <div className="moo-message-content">
                  <div className="moo-typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="moo-input-container">
            <form onSubmit={handleInputSubmit}>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  isLoading
                    ? loadingText
                    : "Tell me what you'd like to change..."
                }
                disabled={isLoading}
                className="moo-input"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="moo-send-button"
              >
                {isLoading ? "..." : "Send"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripPlannerMooChat;
