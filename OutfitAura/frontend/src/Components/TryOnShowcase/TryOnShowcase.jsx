import React, { useState } from "react";
import "./TryOnShowcase.css";
import "./VirtualTryOnShowcase.css";
import beforeImg from "../../assets/before.png";
import afterImg from "../../assets/after.png";
import femaleVto from "../../assets/female_vto.png";
import maleVto from "../../assets/male_vto.png";
import kidsVto from "../../assets/kids_vto.png";
import { Link } from "react-scroll";
import { Link as RouterLink } from "react-router-dom";



const TryOnShowcase = () => (
  <>
    <section className="tryon-showcase">
      <div className="tryon-images">
        <div className="tryon-image-container">
          <img src={beforeImg} alt="Before" />
        </div>
        <div className="tryon-image-container">
          <img src={afterImg} alt="After" />
        </div>
      </div>
      <div className="tryon-content">
        <h2>Virtual Try on Clothes With AI Magic</h2>
        <p>
        Step into the future of styling with our <b><u>AI Fashion Try-On & Assistant</u></b>. Powered by advanced computer vision and natural language processing, our system lets you upload outfits and see how they look on you — instantly. Chat with our smart assistant for personalized clothing suggestions, and experience virtual try-ons without stepping out of your home.
        </p>
        <Link to="try-it-now" smooth={true} duration={500}>
          <button className="tryon-btn">Try on Clothes</button>
        </Link>
      </div>
    </section>

    <section className="virtual-tryon-showcase">
      <div className="virtual-tryon-header">
        <h2 className="virtual-tryon-title">Best AI Clothes Virtual Try on Tool for Everyone</h2>
        <p className="virtual-tryon-description">
        Our outfit visualizer allows everyone to try on the looks they want within just a few seconds. From casual styles to creative themed outfits, our AI-powered try-on tool makes the entire virtual dressing experience simple and possible.
        </p>
        
      </div>

      <div className="virtual-tryon-examples">
        <div className="virtual-tryon-row">
          {/* Female Section */}
          <div className="tryon-example-section">
            <div className="tryon-example-image-wrapper">
              <img src={femaleVto} alt="Female virtual try-on example" />
              <h3 className="tryon-example-label">Female Virtual Clothes Try-On</h3>
            </div>
          </div>

          {/* Male Section */}
          <div className="tryon-example-section">
            <div className="tryon-example-image-wrapper">
              <img src={maleVto} alt="Male virtual try-on example" />
              <h3 className="tryon-example-label">Male Virtual Clothes Try-On</h3>
            </div>
          </div>

          {/* Kids Section */}
          <div className="tryon-example-section">
            <div className="tryon-example-image-wrapper">
              <img src={kidsVto} alt="Kids virtual try-on example" />
              <h3 className="tryon-example-label">Kids Virtual Clothes Try-On</h3>
            </div>
          </div>
        </div>
      </div>
    </section>
  </>
);




export default TryOnShowcase; 