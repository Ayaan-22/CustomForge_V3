import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import Navbar from "./Components/Navbar";
import Hero from "./Components/Hero";
import Card from "./Components/Card";
import ProductDes from "./Components/ProductDes";
import Footer from "./Components/Footer";
import Login from "../login/login";

const AppContent = () => {
  const location = useLocation();

  const isLoginPage = location.pathname === "/login";

  return (
    <>
      {/* Show layout only if NOT on /login */}
      {!isLoginPage && <Navbar />}

      <Routes>
        <Route
          path="/"
          element={
            <>
              <Hero />
              <Card />
            </>
          }
        />
        <Route path="/product" element={<ProductDes />} />
        <Route path="/login" element={<Login />} />
      </Routes>

      {!isLoginPage && <Footer />}
    </>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
