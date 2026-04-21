// src/planner/planner-main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import './planner.css';
import PlannerApp from './PlannerApp.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PlannerApp />
  </StrictMode>
);
