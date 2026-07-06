import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/styles/theme.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// PWA: registrar el service worker mínimo (habilita "Instalar app").
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
