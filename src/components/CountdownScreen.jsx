import React, { useState, useEffect, useRef } from 'react';

export default function CountdownScreen({ onComplete, onTimeout, onReset }) {
    const [timeLeft, setTimeLeft] = useState(15);
    const [phase, setPhase] = useState('countdown'); // 'countdown' | 'timeout'
    const intervalRef = useRef(null);

    useEffect(() => {
        if (phase === 'countdown' && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current);
                        setPhase('timeout');
                        if (onTimeout) onTimeout();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [phase]);

    const handleClick = () => {
        if (phase === 'countdown' && timeLeft > 0) {
            clearInterval(intervalRef.current);
            if (onComplete) onComplete();
        }
    };

    const handleReset = () => {
        setTimeLeft(15);
        setPhase('countdown');
        if (onReset) onReset();
    };

    // Calculate progress for circular timer
    const progress = (timeLeft / 15) * 100;
    const circumference = 2 * Math.PI * 120; // radius = 120
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    if (phase === 'timeout') {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center overflow-hidden relative"
                style={{
                    background: 'linear-gradient(135deg, #FF6B6B 0%, #EE4D2D 20%, #FF8C42 40%, #FFB84D 60%, #FF8C42 80%, #EE4D2D 100%)',
                    backgroundSize: '400% 400%',
                    animation: 'gradientShift 20s ease infinite'
                }}>

                {/* Background decorations */}
                <div className="absolute inset-0 opacity-15" style={{
                    backgroundImage: `
                        repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,.4) 40px, rgba(255,255,255,.4) 80px),
                        repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(255,255,255,.3) 40px, rgba(255,255,255,.3) 80px)
                    `
                }} />

                {/* Timeout message card */}
                <div className="relative z-10 bg-white/95 backdrop-blur-lg rounded-3xl p-10 shadow-2xl max-w-md mx-4 text-center transform animate-bounce-in">
                    {/* Sad emoji */}
                    <div className="text-8xl mb-6 animate-pulse">
                        😢
                    </div>

                    {/* Message */}
                    <h1 className="text-3xl font-black text-gray-800 mb-4">
                        Tempo Esgotado!
                    </h1>
                    <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                        Você não respondeu a tempo no chat e <span className="text-red-500 font-bold">não ganhou</span> o sorteio desta vez.
                    </p>

                    {/* Reset button */}
                    <button
                        onClick={handleReset}
                        className="group relative px-10 py-4 bg-gradient-to-r from-[#EE4D2D] to-[#FF6B6B] text-white font-bold text-xl rounded-full shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-3">
                            🎰 Tentar Novamente
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B6B] to-[#EE4D2D] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>
                </div>

                <style jsx>{`
                    @keyframes gradientShift {
                        0%, 100% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                    }
                    @keyframes bounce-in {
                        0% { transform: scale(0.3); opacity: 0; }
                        50% { transform: scale(1.05); }
                        70% { transform: scale(0.9); }
                        100% { transform: scale(1); opacity: 1; }
                    }
                    .animate-bounce-in {
                        animation: bounce-in 0.6s ease-out forwards;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div
            className="w-screen h-screen flex flex-col items-center justify-center overflow-hidden relative cursor-pointer"
            onClick={handleClick}
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

            {/* Decorative pattern overlay */}
            <div className="absolute inset-0 opacity-15" style={{
                backgroundImage: `
                    repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,.4) 40px, rgba(255,255,255,.4) 80px),
                    repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(255,255,255,.3) 40px, rgba(255,255,255,.3) 80px)
                `
            }} />

            {/* Shopping bag icons */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute text-white animate-float-icons"
                        style={{
                            left: `${10 + (i * 12)}%`,
                            top: `${Math.random() * 80 + 10}%`,
                            animationDelay: `${i * 1.2}s`,
                            fontSize: `${50 + Math.random() * 30}px`
                        }}
                    >
                        🛍️
                    </div>
                ))}
            </div>

            {/* Floating circles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute w-80 h-80 bg-gradient-to-br from-white/10 to-yellow-300/10 rounded-full -top-40 -left-40 animate-float blur-2xl" />
                <div className="absolute w-96 h-96 bg-gradient-to-br from-orange-300/10 to-red-300/10 rounded-full top-1/4 -right-48 animate-float-delayed blur-3xl" />
                <div className="absolute w-64 h-64 bg-gradient-to-br from-yellow-300/10 to-white/10 rounded-full bottom-10 left-1/3 animate-float-slow blur-2xl" />
            </div>

            {/* Main content */}
            <div className="relative z-10 flex flex-col items-center">
                {/* Header text */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-lg mb-2"
                        style={{ textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                        🎁 SORTEIO AO VIVO! 🎁
                    </h1>
                    <p className="text-xl text-white/90 font-medium">
                        Clique para participar antes do tempo acabar!
                    </p>
                </div>

                {/* Circular Timer */}
                <div className="relative mb-8">
                    {/* Outer glow */}
                    <div className="absolute inset-0 rounded-full blur-xl bg-white/30 animate-pulse"
                        style={{ transform: 'scale(1.1)' }} />

                    {/* SVG Timer */}
                    <svg width="280" height="280" className="transform -rotate-90 drop-shadow-2xl">
                        {/* Background circle */}
                        <circle
                            cx="140"
                            cy="140"
                            r="120"
                            fill="rgba(0,0,0,0.3)"
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="12"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="140"
                            cy="140"
                            r="120"
                            fill="none"
                            stroke="url(#timerGradient)"
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-1000 ease-linear"
                            style={{
                                filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))'
                            }}
                        />
                        {/* Gradient definition */}
                        <defs>
                            <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#ffffff" />
                                <stop offset="50%" stopColor="#FFD700" />
                                <stop offset="100%" stopColor="#ffffff" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Center content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-7xl font-black text-white drop-shadow-lg transition-all duration-300 ${timeLeft <= 5 ? 'text-yellow-300 animate-pulse scale-110' : ''}`}
                            style={{ textShadow: '0 0 30px rgba(255,255,255,0.5)' }}>
                            {timeLeft}
                        </span>
                        <span className="text-lg text-white/80 font-semibold uppercase tracking-wider">
                            segundos
                        </span>
                    </div>

                    {/* Pulsing ring when time is low */}
                    {timeLeft <= 5 && (
                        <div className="absolute inset-0 rounded-full border-4 border-yellow-300 animate-ping opacity-50" />
                    )}
                </div>

                {/* Call to action button */}
                <button
                    onClick={handleClick}
                    className="group relative px-12 py-5 bg-white text-[#EE4D2D] font-black text-2xl rounded-full shadow-2xl transform transition-all duration-300 hover:scale-110 active:scale-95 overflow-hidden"
                    style={{
                        boxShadow: '0 10px 40px rgba(0,0,0,0.3), 0 0 60px rgba(255,255,255,0.3)'
                    }}
                >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                        👆 CLIQUE AQUI PARA GIRAR! 👆
                    </span>

                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                    {/* Hover background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] to-[#FFA500] opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                </button>

                {/* Urgency text */}
                <p className={`mt-6 text-lg font-bold transition-all duration-300 ${timeLeft <= 5 ? 'text-yellow-300 animate-bounce' : 'text-white/80'}`}>
                    {timeLeft <= 5 ? '⚡ RÁPIDO! O TEMPO ESTÁ ACABANDO! ⚡' : '✨ Não perca essa chance! ✨'}
                </p>
            </div>

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
            `}</style>
        </div>
    );
}
