import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import '../planner/planner.css';
import LoaApp from './LoaApp.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LoaApp />
  </StrictMode>
);
