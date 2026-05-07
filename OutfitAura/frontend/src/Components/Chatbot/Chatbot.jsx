import React, { useState, useRef, useEffect } from "react";
import { FaTimes, FaPaperPlane, FaTshirt } from "react-icons/fa";
import axios from "axios";
import "./chatbot.css";

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hello! Ask me anything about OutfitAura.", sender: "bot" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const sendMessage = async () => {
    if (input.trim() === "" || isLoading) return;

    const userMessage = input;
    setInput("");
    setIsLoading(true);

    // Add user's message
    setMessages(prev => [...prev, { text: userMessage, sender: "user" }]);

    try {
      const res = await axios.post("http://localhost:8001/chat", {
        message: userMessage
      });

      const botResponse = res.data.response;
      setMessages(prev => [...prev, { text: botResponse, sender: "bot" }]);
    } catch (error) {
      console.error("Error fetching bot response:", error);
      setMessages(prev => [...prev, { 
        text: "Sorry, I'm having trouble connecting to the fashion database. Please try again later.", 
        sender: "bot" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot-container">
      <button className="chatbot-toggle" onClick={toggleChat}>
        <div className="chat-icon">
          <FaTshirt style={{ color: '#FF6B6B', fontSize: '24px' }} />
        </div>
      </button>

      <div className={`chat-window ${isOpen ? 'open' : ''}`}>
        <div className="chat-header">
          <h3>OutfitAura Chatbot</h3>
          <button onClick={toggleChat} className="close-btn">
            <FaTimes />
          </button>
        </div>

        <div className="chat-body">
          {messages.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.sender}`}>
              {msg.text}
            </div>
          ))}
          {isLoading && (
            <div className="chat-message bot">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-footer">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about outfits..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            disabled={isLoading}
          />
          <button onClick={sendMessage} disabled={isLoading}>
            <FaPaperPlane />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
