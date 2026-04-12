import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/Main.css';
import Dashboard from './components/Dashboard';
import { LanguageProvider } from './context/LanguageContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <Dashboard />
    </LanguageProvider>
  </React.StrictMode>
);
