import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Wheel from './components/Roulette/Wheel';
import Admin from './components/Admin/Admin';
import { useBroadcast } from './hooks/useBroadcast';
import { useRouletteStore } from './hooks/useRouletteStore';

function Overlay() {
  const isVisible = useRouletteStore((state) => state.isVisible);

  return (
    <div className={`w-screen h-screen flex items-center justify-center overflow-hidden bg-transparent transition-all duration-700 ease-in-out ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
      <Wheel />
    </div>
  );
}

function App() {
  useBroadcast(); // Listen for events

  return (
    <Routes>
      <Route path="/" element={<Overlay />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  );
}

export default App;
