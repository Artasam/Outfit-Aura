import React from "react";
import "./work.css";
import { FaSearch, FaCommentMedical, FaCheckCircle, FaUpload, FaMicroscope,  FaXRay } from "react-icons/fa";

const Work = () => {
  return (
    <div className="work-container" id="how-it-works">
      <h2>How It Works?</h2>
      <p className="subheading">Get instant virtual try-on results and outfit recommendations using AI.</p>
      
     

      {/* X-ray Upload Workflow */}
      <h3 className="section-title">AI-Powered Virtual Try-On </h3>
      <div className="steps">
        <div className="step">
          <FaUpload className="icon" />
          <h3 className="icon-text">Step 1: Upload Your Images</h3>
          <p className="icon-p">Choose and upload an image of the model you want to try clothes on, along with the garment image.</p>
        </div>
        <div className="step">
          <FaMicroscope className="icon" />
          <h3 className="icon-text">Step 2: AI Processes the Images</h3>
          <p className="icon-p">Our AI model performs pose estimation and garment alignment to ensure a realistic virtual fit.</p>
        </div>
        <div className="step">
          <FaCheckCircle className="icon" />
          <h3 className="icon-text">Step 3: : Get Your Virtual Try-On Result </h3>
          <p className="icon-p">See how the selected clothing fits on the model with accurate positioning and natural blending</p>
        </div>
      </div>
       {/* Chatbot Workflow */}
       <h3 className="section-title">Chatbot Assistance</h3>
      <div className="steps">
        <div className="step">
          <FaSearch className="icon" />
          <h3 className="icon-text">Step 1: Ask Your Query</h3>
          <p className="icon-p">Type your virtual try-on or fashion-related question in the chatbot. </p>
        </div>
        <div className="step">
          <FaCommentMedical className="icon" />
          <h3 className="icon-text">Step 2: Get Instant Guidance</h3>
          <p className="icon-p">The chatbot provides quick responses with outfit suggestions, styling tips, and troubleshooting help.</p>
        </div>
      </div>

      {/* Call to Action - Chat Now Button */}
      <button className="detect-fracture-btn">
  <FaXRay /> Try-On
</button>

      

     
    </div>
  );
};

export default Work;
