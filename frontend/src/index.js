import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import SaaSApp from "@/SaaSApp";
import SuperAdminPanel from "@/SuperAdminPanel";

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

// Simple path-based routing for different apps
const getAppComponent = () => {
  const path = window.location.pathname;
  
  // SaaS public landing and client dashboard
  if (path.startsWith('/saas') || path.startsWith('/app')) {
    return <SaaSApp />;
  }
  
  // Super Admin panel
  if (path.startsWith('/admin') || path.startsWith('/superadmin')) {
    return <SuperAdminPanel />;
  }
  
  // Default: Original Siempria Monitor app
  return <App />;
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    {getAppComponent()}
  </React.StrictMode>,
);
