import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotFound } from './components/NotFound';

const isRoot = window.location.pathname === '/' || window.location.pathname === '/index.html';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>{isRoot ? <App /> : <NotFound />}</ErrorBoundary>
  </React.StrictMode>
);
