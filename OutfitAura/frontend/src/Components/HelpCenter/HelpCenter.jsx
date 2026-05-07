import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import "./helpcenter.css";

const HelpCenter = () => {
  const [feedback, setFeedback] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email);
      } else {
        setUserEmail("");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!feedback.trim()) {
      alert("Please enter feedback.");
      return;
    }

    if (!userEmail) {
      alert("You must be logged in to submit feedback.");
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackRef = collection(db, "feedbacks");
      await addDoc(feedbackRef, {
        email: userEmail,
        message: feedback,
        timestamp: Timestamp.fromDate(new Date()),
      });

      alert("Feedback submitted successfully!");
      setFeedback("");
    } catch (error) {
      console.error("Error adding feedback: ", error);
      alert("Something went wrong. Please try again later.");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="help-center" id="contact">
      <h2>Help Center</h2>

      <div className="help-grid">
        <div className="section troubleshooting">
          <h3>Troubleshooting Guide</h3>
          <ul>
            <li>Ensure the uploaded images are in JPG or PNG format.</li>
            <li>Check that the file size is within the allowed limit.</li>
            <li>If the upload fails, try refreshing the page and re-uploading.</li>
            <li>For the best results, use high-quality images with clear garment details.</li>
          </ul>
        </div>

        <div className="section disclaimer">
          <h3>AI Disclaimer & Usage Advisory</h3>
          <p>
            Our AI-powered Virtual Try-On system provides a realistic preview of how garments fit.
            However, it is for visualization purposes only and does not guarantee the actual fit or fabric feel.
            Always refer to the brand’s size guide and material details before making a purchase.
          </p>
        </div>
      </div>

      <div className="faq-section">
        <h3>Frequently Asked Questions</h3>
        <details>
          <summary>How does the Virtual Try-On system work?</summary>
          <p>
            Our AI-powered system uses deep learning to overlay selected clothing on your image. It analyzes your pose and aligns the garment for a realistic preview.
          </p>
        </details>
        <details>
          <summary>What types of clothing can I try on?</summary>
          <p>
            Currently, the system supports upper-body garments like tops, shirts, and jackets for women. Future updates may expand to other clothing categories.
          </p>
        </details>
        <details>
          <summary>Do I need a specific image format to upload?</summary>
          <p>
            Yes, images should be in JPG or PNG format with clear visibility of your upper body for accurate results.
          </p>
        </details>
        <details>
          <summary>Can I use this tool to check my actual clothing size?</summary>
          <p>
            No, our system provides a visual representation only. It does not measure body dimensions, so refer to the brand’s size chart for accurate sizing.
          </p>
        </details>
        <details>
          <summary>Is the Virtual Try-On result 100% accurate?</summary>
          <p>
            While our AI ensures a realistic preview, slight variations may occur. The tool is designed to give a close visual approximation rather than an exact fit.
          </p>
        </details>
      </div>

      <div className="feedback">
        <h3>User Feedback & Improvements</h3>
        <p>
          Help us enhance your Virtual Try-On experience! Share feedback or report issues to improve garment alignment and accuracy.
        </p>

        {/* Show user email only if logged in */}
        {userEmail && (
          <p style={{ fontStyle: "italic", marginBottom: "10px" }}>
            Submitting as: <strong>{userEmail}</strong>
          </p>
        )}

        <textarea
          placeholder="Write your feedback here..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !userEmail}
        >
          {isSubmitting ? "Submitting..." : "Submit Feedback"}
        </button>
      </div>
    </div>
  );
};

export default HelpCenter;
