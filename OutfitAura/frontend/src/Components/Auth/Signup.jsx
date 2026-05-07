import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, provider } from '../../firebase';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { FaGoogle } from 'react-icons/fa';
import beforeAfter from '../../assets/before_and_after_login_signup.png';
import './Auth.css';
import ReCAPTCHA from 'react-google-recaptcha';

const Signup = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const navigate = useNavigate();

  const handleEmailSignup = async (e) => {
    e.preventDefault();

    // Basic Gmail validation before sending to Firebase
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(email.trim())) {
      setError('Please enter a valid Gmail address (example@gmail.com).');
      return;
    }

    // Optional: basic password length validation (Firebase requires 6+ chars)
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleCaptcha = (token) => {
    setCaptchaToken(token);
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-left">
          <h1>Join OutfitAura Today</h1>
          <ul className="login-points">
            <li>Create your virtual try-on profile</li>
            <li>Explore AI-powered fashion tools</li>
            <li>Personalize your style instantly</li>
          </ul>
          <div className="login-image">
            <img src={beforeAfter} alt="Before and After" />
          </div>
        </div>

        <div className="login-right">
          <h2>Create Your Account</h2>
          {error && <p className="error-message">{error}</p>}

          <form className="login-form" onSubmit={handleEmailSignup}>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Gmail Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="recaptcha-wrap">
              <ReCAPTCHA
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}
                onChange={handleCaptcha}
              />
            </div>

            <button type="submit" className="login-btn" disabled={!captchaToken}>Sign up</button>
          </form>

          <button className="google-outline" onClick={handleGoogleSignup}>
            <FaGoogle />&nbsp; Sign up with Google
          </button>

          <p className="auth-switch">
            Already have an account? <a href="/login">Login</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup; 