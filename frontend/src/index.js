import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Disable error overlay in development
if (process.env.NODE_ENV === 'development') {
  const noop = () => {};
  window.addEventListener('error', (e) => {
    // Suppress generic "Script error" from cross-origin scripts
    if (e.message === 'Script error.') {
      e.preventDefault();
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
