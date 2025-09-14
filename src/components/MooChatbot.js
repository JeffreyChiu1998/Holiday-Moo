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
  const [lastRecommendations, setLastRecommendations] = useState(null);
  const [extractedActivities, setExtractedActivities] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Focus input helper function
  const focusInput = useCallback(() => {
    // Focus the input after a short delay to ensure it's not disabled
    setTimeout(() => {
      if (inputRef.current && !isLoading) {
        inputRef.current.focus();
      }
    }, 100);
  }, [isLoading]);

  // Force reset loading state if it gets stuck
  const resetLoadingState = useCallback(() => {
    setIsLoading(false);
    focusInput();
  }, [focusInput]);

  // Auto-reset loading state if it's been stuck for too long
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        resetLoadingState();
      }, 10000); // Reset after 10 seconds

      return () => clearTimeout(timeout);
    }
  }, [isLoading, resetLoadingState]);

  // Helper function to render message content with clickable links
  const renderMessageWithLinks = (content) => {
    // Convert markdown-style links [text](url) to clickable links
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      // Add the clickable link
      const linkText = match[1];
      let linkUrl = match[2].trim();

      // Validate and clean URL
      try {
        // Ensure URL has protocol
        if (!linkUrl.startsWith("http://") && !linkUrl.startsWith("https://")) {
          linkUrl = `https://${linkUrl}`;
        }

        // Test if URL is valid
        new URL(linkUrl);

        parts.push(
          <a
            key={`link-${match.index}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="moo-message-link"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {linkText}
          </a>
        );
      } catch (error) {
        // If URL is invalid, just show the text
        parts.push(`${linkText} (Invalid URL: ${match[2]})`);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after the last link
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    // Return processed content with proper keys
    return (
      <>
        {parts.map((part, index) =>
          typeof part === "string" ? (
            <span key={`text-${index}`}>{part}</span>
          ) : (
            <React.Fragment key={`link-${index}`}>{part}</React.Fragment>
          )
        )}
      </>
    );
  };

  // Initialize conversation when opened for the first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initializeConversation();
    }
    // Focus input when chat is opened
    if (isOpen && !isMinimized) {
      focusInput();
    }
  }, [isOpen, messages.length, isMinimized, focusInput]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Notify parent when new message arrives while minimized
  useEffect(() => {
    if (messages.length > 0 && isMinimized) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === "moo") {
        onNewMessage();
      }
    }
  }, [messages, isMinimized, onNewMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initializeConversation = () => {
    const welcomeMessage = {
      id: Date.now(),
      sender: "moo",
      content: CHATBOT_UI_CONFIG.welcomeMessage.content,
      timestamp: new Date(),
      options: CHATBOT_UI_CONFIG.welcomeMessage.options,
    };

    setMessages([welcomeMessage]);
    setCurrentOptions(welcomeMessage.options);
  };

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim() || isLoading) return;

    // Handle bucket list requests
    if (
      messageText.toLowerCase().includes("💾 save to bucket list") ||
      messageText.toLowerCase().includes("🪣 save to bucket list") ||
      messageText.toLowerCase().includes("save to bucket list")
    ) {
      // Add user message first
      const userMessage = {
        id: Date.now(),
        sender: "user",
        content: messageText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setCurrentOptions([]);

      return await handleBucketListRequest();
    }

    // Handle activity selection for bucket list
    if (extractedActivities && messageText.match(/^\d+\./)) {
      // Add user message first
      const userMessage = {
        id: Date.now(),
        sender: "user",
        content: messageText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setCurrentOptions([]);

      return await handleActivitySelection(messageText);
    }

    // Handle "Add All" for bucket list
    if (extractedActivities && messageText.includes("✅ Add All")) {
      // Add user message first
      const userMessage = {
        id: Date.now(),
        sender: "user",
        content: messageText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setCurrentOptions([]);

      return await handleAddAllActivities();
    }

    // Handle "Cancel" for bucket list
    if (extractedActivities && messageText.includes("❌ Cancel")) {
      // Add user message first
      const userMessage = {
        id: Date.now(),
        sender: "user",
        content: messageText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setCurrentOptions([]);

      setExtractedActivities(null);
      const cancelMessage = {
        id: Date.now() + 1,
        sender: "moo",
        content: "No problem! What else can I help you with?",
        timestamp: new Date(),
        options: [
          "🎯 Get more travel advice",
          "📅 Check my calendar",
          "🐄 About Moo",
        ],
      };
      setMessages((prev) => [...prev, cancelMessage]);
      setCurrentOptions(cancelMessage.options);
      return;
    }

    // Let the service handle the complete conversation flow including "Get more travel advice"

    // Add user message for regular conversations
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
      // Validate input
      if (!messageText || messageText.trim().length === 0) {
        throw new Error("Empty message");
      }

      // Get conversation history for context (limit to last 5 messages)
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

      // Validate response
      if (!response || !response.message) {
        throw new Error("Invalid response from service");
      }

      // Store recommendations for bucket list processing
      if (response.recommendations) {
        setLastRecommendations(response.recommendations);
      }

      // Store extracted activities if provided
      if (response.extractedActivities) {
        setExtractedActivities(response.extractedActivities);
      }

      // Handle bucket list items - add them to the user's bucket list
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
        options: Array.isArray(response.options)
          ? response.options.slice(0, 4)
          : [],
      };

      setMessages((prev) => [...prev, mooMessage]);
      setCurrentOptions(mooMessage.options);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        sender: "moo",
        content:
          "Sorry, I had trouble with that. Let me help you get started! 🐄",
        timestamp: new Date(),
        options: [
          "🎯 Get travel advice",
          "📅 Check my calendar",
          "🐄 About Moo",
        ],
      };
      setMessages((prev) => [...prev, errorMessage]);
      setCurrentOptions(errorMessage.options);
    } finally {
      setIsLoading(false);
      focusInput(); // Focus input after message is processed
    }
  };

  const handleOptionClick = (option) => {
    // Simply treat option clicks as regular messages
    // This allows the smart conversation handling in handleSendMessage to take over
    handleSendMessage(option);
    // Focus input after option click for better UX
    focusInput();
  };

  const handleInputSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleCloseClick = () => {
    // Close directly without confirmation for now
    handleClose();
  };

  const handleBucketListRequest = async () => {
    if (!lastRecommendations) {
      const errorMessage = {
        id: Date.now(),
        sender: "moo",
        content:
          "I don't have any recent recommendations to save. Would you like me to get some travel advice first?",
        timestamp: new Date(),
        options: [
          "🎯 Get travel advice",
          "📅 Check my calendar",
          "🐄 About Moo",
        ],
      };
      setMessages((prev) => [...prev, errorMessage]);
      setCurrentOptions(errorMessage.options);
      return;
    }

    setIsLoading(true);
    try {
      const response = await mooAgentService.handleBucketList(
        "",
        lastRecommendations
      );

      if (response.extractedActivities) {
        setExtractedActivities(response.extractedActivities);
      }

      const mooMessage = {
        id: Date.now(),
        sender: "moo",
        content: response.message,
        timestamp: new Date(),
        options: response.options || [],
      };

      setMessages((prev) => [...prev, mooMessage]);
      setCurrentOptions(mooMessage.options);
    } catch (error) {
      const errorMessage = {
        id: Date.now(),
        sender: "moo",
        content: "Sorry, I had trouble processing that. Please try again.",
        timestamp: new Date(),
        options: [
          "🎯 Get travel advice",
          "📅 Check my calendar",
          "🐄 About Moo",
        ],
      };
      setMessages((prev) => [...prev, errorMessage]);
      setCurrentOptions(errorMessage.options);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivitySelection = async (messageText) => {
    const match = messageText.match(/^(\d+)\./);
    if (!match || !extractedActivities) return;

    const activityIndex = parseInt(match[1]) - 1;
    if (activityIndex < 0 || activityIndex >= extractedActivities.length)
      return;

    const selectedActivity = extractedActivities[activityIndex];
    await saveActivityToBucketList([selectedActivity]);
  };

  const handleAddAllActivities = async () => {
    if (!extractedActivities) return;
    await saveActivityToBucketList(extractedActivities);
  };

  const saveActivityToBucketList = async (activities) => {
    try {
      // Add unique IDs and timestamps to activities
      const activitiesWithIds = activities.map((activity) => ({
        ...activity,
        id: Date.now() + Math.random(),
        dateAdded: new Date().toISOString(),
      }));

      // Call the parent component's bucket list handler
      if (onBucketListRequest) {
        onBucketListRequest(activitiesWithIds);
      }

      setExtractedActivities(null);

      const successMessage = {
        id: Date.now(),
        sender: "moo",
        content: `Great! I've added ${activities.length} ${
          activities.length === 1 ? "activity" : "activities"
        } to your bucket list. You can view and manage your saved activities anytime!`,
        timestamp: new Date(),
        options: [
          "🎯 Get more travel advice",
          "📅 Check my calendar",
          "🐄 About Moo",
        ],
      };

      setMessages((prev) => [...prev, successMessage]);
      setCurrentOptions(successMessage.options);
    } catch (error) {
      const errorMessage = {
        id: Date.now(),
        sender: "moo",
        content:
          "Sorry, I had trouble saving to your bucket list. Please try again.",
        timestamp: new Date(),
        options: [
          "🎯 Get travel advice",
          "📅 Check my calendar",
          "🐄 About Moo",
        ],
      };
      setMessages((prev) => [...prev, errorMessage]);
      setCurrentOptions(errorMessage.options);
    }
  };

  const handleClose = () => {
    setMessages([]);
    setCurrentOptions([]);
    setInputValue("");
    setLastRecommendations(null);
    setExtractedActivities(null);

    mooAgentService.softResetConversation();
    onClose();
  };

  // eslint-disable-next-line no-unused-vars
  const handleCancelClose = () => {
    // Close confirmation functionality disabled for now
    // setShowCloseConfirmation(false);
  };

  // Don't render if closed
  if (!isOpen && !isMinimized) return null;

  return (
    <div className={`moo-chatbot-window ${isMinimized ? "minimized" : ""}`}>
      {/* Header - only show when open */}
      {!isMinimized && (
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
            <button
              className="moo-minimize-button"
              onClick={onMinimize}
              title="Minimize chat"
            >
              <span>−</span>
            </button>
            <button
              className="moo-close-button"
              onClick={handleCloseClick}
              title="Close chat"
            >
              <span>×</span>
            </button>
          </div>
        </div>
      )}

      {/* Content - only show when not minimized */}
      {!isMinimized && (
        <>
          {/* Messages */}
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
                  <div
                    className="moo-avatar-fallback-message"
                    style={{ display: "none" }}
                  >
                    🐄
                  </div>
                )}
                <div className="moo-message-content">
                  <div className="moo-message-text">
                    {renderMessageWithLinks(message.content)}
                  </div>
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

          {/* Options */}
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
              {currentOptions.length > 4 && (
                <div className="moo-options-note">
                  Showing 4 of {currentOptions.length} options
                </div>
              )}
            </div>
          )}

          {/* Input */}
          <div className="moo-input-container">
            <form onSubmit={handleInputSubmit}>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                }}
                onFocus={() => focusInput()}
                placeholder={
                  isLoading
                    ? "Moo is thinking..."
                    : currentOptions.length > 0
                    ? "Choose an option above or type your message..."
                    : "Ask Moo for travel advice..."
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
        </>
      )}
    </div>
  );
};

export default MooChatbot;
