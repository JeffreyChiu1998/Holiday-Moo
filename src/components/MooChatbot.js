import React, { useState, useRef, useEffect, useCallback } from "react";
import mooAgentService from "../services/mooAgentService";
import { CHATBOT_UI_CONFIG } from "../config/chatbot";

const MooChatbot = ({
  isOpen,
  isMinimized,
  onClose,
  onMinimize,
  onMaximize,
  onNewMessage,
  userTrips = [],
  userEvents = [],
  onBucketListRequest,
}) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentOptions, setCurrentOptions] = useState([]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize conversation when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage = {
        id: Date.now(),
        sender: "moo",
        content: CHATBOT_UI_CONFIG.welcomeMessage.content,
        timestamp: new Date(),
        options: CHATBOT_UI_CONFIG.welcomeMessage.options,
      };
      setMessages([welcomeMessage]);
      setCurrentOptions(welcomeMessage.options);
    }
  }, [isOpen, messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      sender: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setCurrentOptions([]);

    try {
      const conversationHistory = messages.slice(-5).map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
      }));

      const response = await mooAgentService.processUserMessage(
        messageText.trim(),
        conversationHistory,
        userTrips,
        userEvents
      );

      if (response.bucketListItems && response.bucketListItems.length > 0) {
        if (onBucketListRequest) {
          onBucketListRequest(response.bucketListItems);
        }
      }

      const mooMessage = {
        id: Date.now() + 1,
        sender: "moo",
        content: response.message,
        timestamp: new Date(),
        options: Array.isArray(response.options) ? response.options.slice(0, 4) : [],
      };

      setMessages((prev) => [...prev, mooMessage]);
      setCurrentOptions(mooMessage.options);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        sender: "moo",
        content: "Sorry, I had trouble with that. Let me help you get started! 🐄",
        timestamp: new Date(),
        options: ["🎯 Get travel advice", "📅 Check my calendar", "🐄 About Moo"],
      };
      setMessages((prev) => [...prev, errorMessage]);
      setCurrentOptions(errorMessage.options);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionClick = (option) => {
    handleSendMessage(option);
  };

  const handleInputSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  if (!isOpen && !isMinimized) return null;

  return (
    <div className={`moo-chatbot-window ${isMinimized ? "minimized" : ""}`}>
      {!isMinimized && (
        <>
          <div className="moo-chatbot-header">
            <div className="moo-header-left">
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
              <div className="moo-header-text">
                <h3 className="moo-title">Moo AI</h3>
                <span className="moo-status">Travel Assistant</span>
              </div>
            </div>
            <div className="moo-header-actions">
              <button className="moo-minimize-button" onClick={onMinimize}>
                <span>−</span>
              </button>
              <button className="moo-close-button" onClick={onClose}>
                <span>×</span>
              </button>
            </div>
          </div>

          <div className="moo-messages-container">
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
                  <div className="moo-avatar-fallback-message" style={{ display: "none" }}>
                    🐄
                  </div>
                )}
                <div className="moo-message-content">
                  <div className="moo-message-text">{message.content}</div>
                  <div className="moo-message-time">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="moo-message moo">
                <div className="moo-typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {currentOptions.length > 0 && !isLoading && (
            <div className="moo-options-container">
              {currentOptions.slice(0, 4).map((option, index) => (
                <button
                  key={index}
                  className="moo-option-button"
                  onClick={() => handleOptionClick(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          <div className="moo-input-container">
            <form onSubmit={handleInputSubmit}>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isLoading ? "Moo is thinking..." : "Ask Moo for travel advice..."}
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
        </>
      )}
    </div>
  );
};

export default MooChatbot;