import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Wheel from './components/Roulette/Wheel';
import Admin from './components/Admin/Admin';
import { useBroadcast } from './hooks/useBroadcast';
import { useRouletteStore } from './hooks/useRouletteStore';

function Overlay() {
  const isVisible = useRouletteStore((state) => state.isVisible);

  return (
    <div className={`w-screen h-screen flex items-center justify-center overflow-hidden transition-all duration-700 ease-in-out ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}
      style={{
        background: 'linear-gradient(135deg, #FF6B6B 0%, #EE4D2D 20%, #FF8C42 40%, #FFB84D 60%, #FF8C42 80%, #EE4D2D 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 20s ease infinite'
      }}>
      {/* Animated radial gradient overlay */}
      <div className="absolute inset-0 opacity-20" style={{
        background: 'radial-gradient(circle at 20% 50%, rgba(255,215,0,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,107,107,0.3) 0%, transparent 50%)',
        animation: 'pulseGlow 8s ease-in-out infinite'
      }} />

      {/* Decorative pattern overlay - more complex */}
      <div className="absolute inset-0 opacity-15" style={{
        backgroundImage: `
          repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,.4) 40px, rgba(255,255,255,.4) 80px),
          repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(255,255,255,.3) 40px, rgba(255,255,255,.3) 80px),
          radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 70%)
        `
      }} />

      {/* Shopping bag icons scattered */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute text-white text-6xl animate-float-icons"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 1.5}s`,
              fontSize: `${40 + Math.random() * 40}px`
            }}
          >
            🛍️
          </div>
        ))}
      </div>

      {/* Animated floating circles - enhanced */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-80 h-80 bg-gradient-to-br from-white/10 to-yellow-300/10 rounded-full -top-40 -left-40 animate-float blur-2xl" />
        <div className="absolute w-96 h-96 bg-gradient-to-br from-orange-300/10 to-red-300/10 rounded-full top-1/4 -right-48 animate-float-delayed blur-3xl" />
        <div className="absolute w-64 h-64 bg-gradient-to-br from-yellow-300/10 to-white/10 rounded-full bottom-10 left-1/3 animate-float-slow blur-2xl" />
        <div className="absolute w-72 h-72 bg-gradient-to-br from-red-400/10 to-orange-300/10 rounded-full top-1/2 right-1/4 animate-float blur-3xl" style={{ animationDelay: '5s' }} />
      </div>

      {/* Sparkles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={`sparkle-${i}`}
            className="absolute w-2 h-2 bg-white rounded-full animate-sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Light rays from center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="absolute w-full h-full animate-spin-slow opacity-20" style={{ animationDuration: '30s' }}>
          {[...Array(8)].map((_, i) => (
            <div
              key={`ray-${i}`}
              className="absolute w-1 h-full bg-gradient-to-t from-transparent via-white/40 to-transparent"
              style={{
                left: '50%',
                transformOrigin: 'center',
                transform: `rotate(${i * 45}deg)`
              }}
            />
          ))}
        </div>
      </div>

      <Wheel />

      <style jsx>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
          33% { transform: translateY(-40px) translateX(30px) rotate(5deg); }
          66% { transform: translateY(30px) translateX(-30px) rotate(-5deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
          33% { transform: translateY(50px) translateX(-40px) rotate(-8deg); }
          66% { transform: translateY(-30px) translateX(40px) rotate(8deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) translateX(0) scale(1) rotate(0deg); }
          50% { transform: translateY(-50px) translateX(30px) scale(1.15) rotate(10deg); }
        }
        @keyframes float-icons {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.1; }
          50% { transform: translateY(-30px) rotate(180deg); opacity: 0.3; }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-float {
          animation: float 25s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 30s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 35s ease-in-out infinite;
        }
        .animate-float-icons {
          animation: float-icons 15s ease-in-out infinite;
        }
        .animate-sparkle {
          animation: sparkle 4s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 30s linear infinite;
        }
      `}</style>
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
