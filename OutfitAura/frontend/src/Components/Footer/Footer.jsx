import React from "react";
import "./footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="logo">OutfitAura </div>
        <p className="disclaimer">
          This AI tool is for visualization only and does not guarantee the actual fit. Always refer to size
          guides for accuracy.
        </p>
        <p className="copyright">© 2025 OutfitAura. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
