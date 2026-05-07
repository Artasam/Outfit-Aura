import React, { useState } from "react";
import "./home.css";
import heroImg from "../../assets/home_before_after.png";
import { FaCamera, FaTshirt, FaMagic, FaDownload } from "react-icons/fa";

const Home = () => {
  const [modelImage, setModelImage] = useState(null);
  const [modelFile, setModelFile] = useState(null);
  const [garmentImage, setGarmentImage] = useState(null);
  const [garmentFile, setGarmentFile] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleModelUpload = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    setModelFile(file);
    setModelImage(URL.createObjectURL(file));
  };

  const handleGarmentUpload = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    setGarmentFile(file);
    setGarmentImage(URL.createObjectURL(file));
  };

  const convertSrcToFile = async (src, filenamePrefix) => {
    const response = await fetch(src);
    const blob = await response.blob();
    const extension = blob.type.split("/")[1] || "png";
    return new File([blob], `${filenamePrefix}.${extension}`, { type: blob.type });
  };

  const handleDrop = async (event, type) => {
    event.preventDefault();
    const imageSrc = event.dataTransfer.getData("imageSrc");
    if (imageSrc) {
      if (type === "model") {
        const file = await convertSrcToFile(imageSrc, "model-example");
        setModelFile(file);
        setModelImage(URL.createObjectURL(file));
      } else if (type === "garment") {
        const file = await convertSrcToFile(imageSrc, "garment-example");
        setGarmentFile(file);
        setGarmentImage(URL.createObjectURL(file));
      }
    }
  };

  const removeImage = (type) => {
    if (type === "model") {
      setModelImage(null);
      setModelFile(null);
    } else if (type === "garment") {
      setGarmentImage(null);
      setGarmentFile(null);
    }
    setResultImage(null);
  };

  const handleGenerate = async () => {
    if (!modelFile || !garmentFile) {
      setErrorMessage("Please upload both a model photo and a garment image.");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    setResultImage(null);

    const formData = new FormData();
    formData.append("person_image", modelFile);
    formData.append("garment_image", garmentFile);

    try {
      const response = await fetch("http://localhost:8001/api/generate-tryon", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to generate try-on result.");
      }
      const data = await response.json();
      // Handle both URL (local) and base64 (Colab) responses
      if (data.tryon_image_base64) {
        setResultImage(`data:image/png;base64,${data.tryon_image_base64}`);
      } else if (data.tryon_image_url) {
        setResultImage(data.tryon_image_url);
      } else {
        throw new Error("No image data received from server");
      }
    } catch (error) {
      setErrorMessage(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    
    const link = document.createElement("a");
    link.href = resultImage;
    link.download = `try-on-result-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="home" className="home-page">
      <div className="hero-section">
        <div className="hero-inner">
          <div className="hero-copy">
            <h1 className="hero-title">Redefine Fashion —<br className="hero-br" /> One Click at a Time</h1>
            <p className="hero-subtitle">Discover a smarter way to explore outfits. Our AI‑enhanced virtual studio lets you preview looks in real‑time — no fitting room, no hassle. Dress with precision and confidence, anytime, anywhere.</p>
          </div>
          <div className="hero-media">
            <div className="hero-card">
              <img src={heroImg} alt="Before and after virtual try-on" />
            </div>
          </div>
        </div>
      </div>

      <div id="try-it-now" className="try-on-section">
        <h1>Try It Now</h1>
        <p className="section-description">Upload your photo and any clothing item to see how it looks on you</p>
        
        <div className="home-container">
          {/* Model Upload Section */}
          <div className="upload-section">
            <h3>Step 1: Upload Your Photo</h3>
            <label
              className="upload-box"
              onDrop={(e) => handleDrop(e, "model")}
              onDragOver={(e) => e.preventDefault()}
            >
              <input type="file" onChange={handleModelUpload} hidden />
              {modelImage ? (
                <div className="image-preview">
                  <img src={modelImage} alt="Model" className="preview" />
                  <button className="remove-btn" onClick={() => removeImage("model")}>❌</button>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <FaCamera className="upload-icon" />
                  <p>Drop or Click to Upload</p>
                </div>
              )}
            </label>
          </div>

          {/* Garment Upload Section */}
          <div className="upload-section">
            <h3>Step 2: Upload Clothing</h3>
            <label
              className="upload-box"
              onDrop={(e) => handleDrop(e, "garment")}
              onDragOver={(e) => e.preventDefault()}
            >
              <input type="file" onChange={handleGarmentUpload} hidden />
              {garmentImage ? (
                <div className="image-preview">
                  <img src={garmentImage} alt="Garment" className="preview" />
                  <button className="remove-btn" onClick={() => removeImage("garment")}>❌</button>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <FaTshirt className="upload-icon" />
                  <p>Drop or Click to Upload</p>
                </div>
              )}
            </label>
          </div>

          {/* Result Section */}
          <div className="result-section">
            <h3>Step 3: See the Result</h3>
            <div className="result-box">
              {resultImage ? (
                <img src={resultImage} alt="Try-on result" className="preview" />
              ) : (
                <div className="upload-placeholder">
                  <FaMagic className="upload-icon" />
                  <p>Your Virtual Try-On Result Will Appear Here</p>
                </div>
              )}
            </div>
            {errorMessage && <p className="error-text">{errorMessage}</p>}
            <div className="result-buttons">
              <button className="result-btn" onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? "Generating..." : "Generate Try-On"}
              </button>
              {resultImage && (
                <button className="download-btn" onClick={handleDownload}>
                  <FaDownload /> Download
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;