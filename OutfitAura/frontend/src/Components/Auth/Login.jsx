import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, provider } from '../../firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { FaGoogle } from 'react-icons/fa';
import beforeAfter from '../../assets/before_and_after_login_signup.png';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-left">
          <h1>Welcome to OutfitAura</h1>
          <ul className="login-points">
            <li>Try Clothes Virtually with OutfitAura</li>
            <li>Style Yourself Instantly</li>
          </ul>
          <div className="login-image">
            <img src={beforeAfter} alt="Before and After" />
          </div>
        </div>

        <div className="login-right">
          <h2>Login into OutfitAura</h2>
          {error && <p className="error-message">{error}</p>}

          <form className="login-form" onSubmit={handleEmailLogin}>
            <input
              type="email"
              placeholder="Email"
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

            <button type="submit" className="login-btn">Login</button>
          </form>

          <button className="google-outline" onClick={handleGoogleLogin}>
            <FaGoogle />&nbsp; Sign in with Google
          </button>

          <p className="auth-switch">
            Don't have an account? <a href="/signup">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 