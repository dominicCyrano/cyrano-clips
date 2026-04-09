import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App";
import BatchApp from "./BatchApp";
import { HomePage } from "./components/HomePage";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/clips/*" element={<App />} />
        <Route path="/batch/*" element={<BatchApp />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
