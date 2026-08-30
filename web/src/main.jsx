import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './design-system.css'
import './styles.css'

// Global Fetch Interceptor for JWT Auth
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  if (typeof resource === 'string' && resource.startsWith('/api')) {
    config = config || {};
    config.headers = config.headers || {};
    const token = localStorage.getItem('hive_token');
    if (token) {
      if (config.headers instanceof Headers) {
        config.headers.append('Authorization', `Bearer ${token}`);
      } else {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
  }
  const res = await originalFetch(resource, config);
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('hive_token');
    window.dispatchEvent(new Event('auth_error'));
  }
  return res;
};

import { ToastProvider } from './ToastContext.jsx'

createRoot(document.getElementById('root')).render(
  <ToastProvider>
    <App />
  </ToastProvider>
)
