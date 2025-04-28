import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./Components/Navbar";
import Hero from "./Components/Hero";
import Card from "./Components/Card";
import ProductDes from "./Components/ProductDes";
import Footer from "./Components/Footer";

const App = () => {
  return (
    <Router>
      <div>
        <Navbar />
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
          {/* add the custom id here to fetch thed data of the custom product */}
          <Route path="/product" element={<ProductDes />} />
        </Routes>
      </div>
      <Footer />
    </Router>
  );
};

export default App;
