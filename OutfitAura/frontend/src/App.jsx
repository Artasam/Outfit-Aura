import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import Navbar from './Components/Navbar/Navbar';
import Chatbot from './Components/Chatbot/Chatbot';
import Work from './Components/Work/Work';
import About from './Components/About/About';
import HelpCenter from './Components/HelpCenter/HelpCenter';
import Footer from './Components/Footer/Footer';
import Home from './Components/Home/Home';
import Login from './Components/Auth/Login';
import Signup from './Components/Auth/Signup';
import PrivateRoute from './Components/Auth/PrivateRoute';
import TryOnShowcase from './Components/TryOnShowcase/TryOnShowcase';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <div>
                <Navbar />
                <Home />
                <TryOnShowcase />
                <Chatbot />
                <Work />
                <About />
                <HelpCenter />
                <Footer />
              </div>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
