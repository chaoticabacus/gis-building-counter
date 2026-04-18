import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'

// Set default theme
if (!document.documentElement.getAttribute('data-theme')) {
  document.documentElement.setAttribute('data-theme',
    localStorage.getItem('gis-theme') || 'dark'
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
