import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { HubProvider } from './lib/store';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <HubProvider>
        <App />
      </HubProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
