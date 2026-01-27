import React, { useRef, useEffect, useState } from 'react';
import { useRouletteStore } from '../../hooks/useRouletteStore';
import gsap from 'gsap';
import confetti from 'canvas-confetti';

// --- AUDIO UTILS ---
let audioCtx = null;
let isAudioInitialized = false;

const initAudio = async () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }
    isAudioInitialized = true;
    console.log('[AUDIO] Audio context initialized:', audioCtx.state);
};

const getAudioCtx = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
};

let spinSoundInterval = null;
let spinOscillators = []; // All active oscillators for cleanup

const playTickSound = (speed = 1.0) => {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const freq = 250 + (speed * speed * speed * 1150); // Cubic: 250-1400 Hz
        const duration = 0.06 + ((1 - speed) * 0.06); // Longer ticks when slower
        const volume = 0.08 + (speed * speed * speed * 0.52); // Cubic: 0.08-0.60

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + duration);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);

    } catch (e) {
        console.error('[AUDIO] Error playing tick:', e);
    }
};

const startDynamicSpinSound = (getSpeedFn) => {
    try {
        const ctx = getAudioCtx();
        console.log('[AUDIO] Starting dynamic spin sound, ctx state:', ctx.state);

        // --- Layer 1: Engine rumble (audible frequency) ---
        const rumbleOsc = ctx.createOscillator();
        const rumbleGain = ctx.createGain();
        rumbleOsc.type = 'sawtooth';
        rumbleOsc.frequency.value = 150; // Audible on all speakers
        rumbleGain.gain.value = 0.12;
        rumbleOsc.connect(rumbleGain);
        rumbleGain.connect(ctx.destination);
        rumbleOsc.start();
        spinOscillators.push({ osc: rumbleOsc, gain: rumbleGain });

        // --- Layer 2: Whoosh/wind sweep ---
        const whooshOsc = ctx.createOscillator();
        const whooshGain = ctx.createGain();
        whooshOsc.type = 'sawtooth';
        whooshOsc.frequency.value = 300;
        whooshGain.gain.value = 0.08;
        whooshOsc.connect(whooshGain);
        whooshGain.connect(ctx.destination);
        whooshOsc.start();
        spinOscillators.push({ osc: whooshOsc, gain: whooshGain });

        // --- Layer 3: High harmonic for "air" feel ---
        const airOsc = ctx.createOscillator();
        const airGain = ctx.createGain();
        airOsc.type = 'sine';
        airOsc.frequency.value = 600;
        airGain.gain.value = 0.04;
        airOsc.connect(airGain);
        airGain.connect(ctx.destination);
        airOsc.start();
        spinOscillators.push({ osc: airOsc, gain: airGain });

        // --- Dynamic modulation loop ---
        let lastTickTime = 0;
        const update = () => {
            const speed = getSpeedFn();
            const now = Date.now();

            // Modulate oscillators based on speed (exponential curves for dramatic fade)
            const t = ctx.currentTime;
            const s3 = speed * speed * speed; // Cubic curve - even more aggressive fade
            rumbleOsc.frequency.setTargetAtTime(60 + (s3 * 190), t, 0.1);
            rumbleGain.gain.setTargetAtTime(0.005 + (s3 * 0.15), t, 0.2);
            whooshOsc.frequency.setTargetAtTime(120 + (s3 * 480), t, 0.1);
            whooshGain.gain.setTargetAtTime(0.003 + (s3 * 0.10), t, 0.2);
            airOsc.frequency.setTargetAtTime(250 + (s3 * 750), t, 0.1);
            airGain.gain.setTargetAtTime(0.002 + (s3 * 0.05), t, 0.2);

            // Tick sounds at intervals based on speed (wider range for dramatic effect)
            const interval = 40 + ((1 - speed) * 260); // 40-300ms
            if (now - lastTickTime >= interval) {
                playTickSound(speed);
                lastTickTime = now;
            }
        };

        spinSoundInterval = setInterval(update, 16); // ~60fps update rate
        console.log('[AUDIO] Dynamic spin sound active with', spinOscillators.length, 'layers');

    } catch (e) {
        console.error('[AUDIO] Error starting dynamic sound:', e);
    }
};

const stopSpinSound = () => {
    if (spinSoundInterval) {
        clearInterval(spinSoundInterval);
        spinSoundInterval = null;
    }
    // Fade out all oscillators gracefully
    spinOscillators.forEach(({ osc, gain }) => {
        try {
            const ctx = getAudioCtx();
            gain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
            osc.stop(ctx.currentTime + 0.3);
        } catch (e) { }
    });
    spinOscillators = [];
    console.log('[AUDIO] Spin sound stopped');
};

const playSpinAmbience = () => { };

const playWinSound = () => {
    try {
        const ctx = getAudioCtx();

        // Victory fanfare melody: C-E-G-C (major chord arpeggio) + triumph notes
        const melody = [
            { freq: 523.25, time: 0, duration: 0.15 },      // C5
            { freq: 659.25, time: 0.12, duration: 0.15 },   // E5
            { freq: 783.99, time: 0.24, duration: 0.15 },   // G5
            { freq: 1046.50, time: 0.36, duration: 0.25 },  // C6
            { freq: 987.77, time: 0.55, duration: 0.15 },   // B5
            { freq: 1046.50, time: 0.70, duration: 0.4 }    // C6 (long)
        ];

        melody.forEach(({ freq, time, duration }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const startTime = ctx.currentTime + time;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            // ADSR envelope for more natural sound
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02); // Attack
            gain.gain.linearRampToValueAtTime(0.25, startTime + 0.05); // Decay
            gain.gain.setValueAtTime(0.2, startTime + duration * 0.7); // Sustain
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration); // Release

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + duration);
        });

        // Add harmony layer (chord)
        const chordFreqs = [523.25, 659.25, 783.99]; // C-E-G chord
        chordFreqs.forEach(freq => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const startTime = ctx.currentTime + 0.36;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.8);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.8);
        });

        // Add sparkle/shimmer effect
        for (let i = 0; i < 8; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const startTime = ctx.currentTime + 0.4 + (i * 0.08);
            const freq = 2093 + Math.random() * 1000; // High frequency sparkles

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0.08, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.1);
        }
    } catch (e) { }
};

// --- THEME COMPONENTS ---

const CyberpunkFrame = () => null;

const PopFrame = () => (
    <div className="absolute inset-[-20px] pointer-events-none z-20 flex items-center justify-center">
        <div className="w-full h-full rounded-full shadow-[inset_0_0_30px_rgba(0,0,0,0.2),0_10px_20px_rgba(0,0,0,0.3)] animate-[spin_20s_linear_infinite]"
            style={{
                background: 'conic-gradient(#ff69b4 0deg 20deg, #ffb6c1 20deg 40deg, #ff69b4 40deg 60deg, #ffb6c1 60deg 80deg, #ff69b4 80deg 100deg, #ffb6c1 100deg 120deg, #ff69b4 120deg 140deg, #ffb6c1 140deg 160deg, #ff69b4 160deg 180deg, #ffb6c1 180deg 200deg, #ff69b4 200deg 220deg, #ffb6c1 220deg 240deg, #ff69b4 240deg 260deg, #ffb6c1 260deg 280deg, #ffb6c1 280deg 300deg, #ffb6c1 300deg 320deg, #ffb6c1 320deg 340deg, #ff69b4 340deg 360deg)',
                border: '8px solid #fff',
            }}
        ></div>
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>
    </div>
);

const CyberpunkPointer = ({ tickRef }) => (
    <div ref={tickRef} className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-30 filter drop-shadow-[0_0_8px_#00f7ff]">
        <div className="relative">
            {/* Glow trail effect */}
            <div className="absolute inset-0 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[50px] border-t-[#00f7ff] blur-sm opacity-60"></div>

            {/* Main pointer */}
            <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[50px] border-t-[#00f7ff] relative z-10"></div>

            {/* Animated pulsing dot at tip */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#00f7ff] rounded-full animate-pulse shadow-[0_0_10px_#00f7ff]"></div>
        </div>
    </div>
);

const PopPointer = ({ tickRef }) => (
    <div ref={tickRef} className="absolute top-[-40px] left-1/2 -translate-x-1/2 z-30 filter drop-shadow-lg">
        <div className="relative">
            {/* Glow trail */}
            <div className="absolute inset-0 w-16 h-20 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-lg blur-md opacity-50"></div>

            <div className="w-16 h-20 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-lg flex items-center justify-center clip-arrow shadow-inner border-2 border-white/50 relative z-10">
                <div className="w-10 h-10 bg-yellow-200/50 rounded-full blur-md absolute top-2 animate-pulse"></div>
            </div>

            {/* Pulsing dot at arrow tip */}
            <div className="absolute bottom-[-52px] left-1/2 -translate-x-1/2 w-3 h-3 bg-pink-400 rounded-full animate-pulse shadow-[0_0_15px_#ff69b4] z-20"></div>

            <svg width="60" height="80" viewBox="0 0 60 80" className="overflow-visible absolute -bottom-12 left-0">
                <defs>
                    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ffd700" />
                        <stop offset="100%" stopColor="#b8860b" />
                    </linearGradient>
                    <filter id="glow"><feGaussianBlur stdDeviation="2" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                </defs>
                <path d="M10,0 L50,0 Q60,0 60,10 L60,40 L30,80 L0,40 L0,10 Q0,0 10,0 Z" fill="url(#goldGrad)" stroke="#ff69b4" strokeWidth="3" filter="url(#glow)" />
            </svg>
        </div>
    </div>
);

const CyberpunkCenter = ({ isSpinning }) => (
    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-32 h-32 rounded-full bg-black border-4 border-[#bc13fe] shadow-[0_0_20px_#bc13fe] flex items-center justify-center overflow-hidden transition-all duration-300 ${isSpinning ? 'scale-110 shadow-[0_0_40px_#bc13fe] animate-pulse' : ''}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#2a2a2a_0%,_#000_100%)]"></div>

        {/* Animated spinning ring during spin */}
        {isSpinning && (
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '1.5s' }}>
                <div className="absolute inset-0 bg-[conic-gradient(transparent,#00f7ff,transparent_30%)] rounded-full opacity-40"></div>
            </div>
        )}

        <div className={`text-center relative z-10 flex flex-col items-center justify-center ${isSpinning ? 'animate-pulse' : ''}`}>
            <h2 className={`text-[#ffd700] font-black text-2xl tracking-tight drop-shadow-md font-sans italic transition-all duration-300 ${isSpinning ? 'scale-105' : ''}`}
                style={{ textShadow: isSpinning ? '0 0 20px #ffd700, 0 0 30px #ffd700' : '0 0 10px #ffd700' }}>Loja</h2>
            <h2 className={`text-[#ffd700] font-black text-2xl tracking-tight drop-shadow-md font-sans italic transition-all duration-300 ${isSpinning ? 'scale-105' : ''}`}
                style={{ textShadow: isSpinning ? '0 0 20px #ffd700, 0 0 30px #ffd700' : '0 0 10px #ffd700' }}>Mada</h2>
            <div className={`w-20 h-[2px] bg-[#00f7ff] my-1 shadow-[0_0_8px_#00f7ff] transition-all duration-300 ${isSpinning ? 'animate-pulse shadow-[0_0_15px_#00f7ff]' : ''}`}></div>
        </div>
    </div>
);

const PopCenter = ({ isSpinning }) => (
    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-36 h-36 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 shadow-xl flex items-center justify-center border-[6px] border-white transition-all duration-300 ${isSpinning ? 'scale-110 shadow-[0_0_40px_rgba(255,105,180,0.8)] animate-pulse' : ''}`}>

        {/* Animated spinning ring during spin */}
        {isSpinning && (
            <div className="absolute inset-0 animate-spin rounded-full" style={{ animationDuration: '1.5s' }}>
                <div className="absolute inset-0 bg-[conic-gradient(transparent,#ffffff,transparent_30%)] rounded-full opacity-50"></div>
            </div>
        )}

        <div className={`text-center text-white drop-shadow-md leading-tight relative z-10 ${isSpinning ? 'animate-pulse' : ''}`}>
            <span className={`block font-black text-3xl font-sans transition-all duration-300 ${isSpinning ? 'scale-105' : ''}`}
                style={{ textShadow: isSpinning ? '2px 2px 0px rgba(0,0,0,0.1), 0 0 20px rgba(255,255,255,0.8)' : '2px 2px 0px rgba(0,0,0,0.1)' }}>Loja</span>
            <span className={`block font-black text-3xl font-sans transition-all duration-300 ${isSpinning ? 'scale-105' : ''}`}
                style={{ textShadow: isSpinning ? '2px 2px 0px rgba(0,0,0,0.1), 0 0 20px rgba(255,255,255,0.8)' : '2px 2px 0px rgba(0,0,0,0.1)' }}>Mada</span>
        </div>
        <div className={`absolute top-2 left-4 w-8 h-4 bg-white/30 rounded-full blur-[2px] -rotate-12 ${isSpinning ? 'animate-pulse' : ''}`}></div>
    </div>
);

export default function Wheel() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const pointerRef = useRef(null);
    const currentRotation = useRef(0);
    const [winningIndex, setWinningIndex] = useState(null);
    const [winnerModal, setWinnerModal] = useState(null);
    const [isSpinning, setIsSpinning] = useState(false);

    const { prizes, mustSpin, config, stopSpin } = useRouletteStore();
    const theme = config.theme || 'cyberpunk';
    const isPop = theme === 'pop';
    const [isBuildup, setIsBuildup] = useState(false); // tremor/suspense phase

    const size = 600;

    // --- ANIMATED RENDER LOOP ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2 - (isPop ? 60 : 40);
        const arc = (2 * Math.PI) / prizes.length;

        canvas.width = size;
        canvas.height = size;

        let animationFrameId;

        // Sparkle state configuration
        const sparkles = Array.from({ length: 20 }, () => ({
            r: Math.random(), // radius factor
            a: Math.random() * Math.PI * 2, // angle factor within slice
            d: Math.random() * radius, // distance
            speed: 0.05 + Math.random() * 0.05,
            offset: Math.random() * 10
        }));

        const render = () => {
            const time = Date.now() / 1000;
            ctx.clearRect(0, 0, size, size);

            prizes.forEach((prize, i) => {
                const angle = i * arc;
                const isWinner = i === winningIndex;
                const isRare = (prize.probability || 0) === 0;

                // --- 0% ANIMATED VISUALS ---
                if (isRare) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY);
                    ctx.arc(centerX, centerY, radius, angle, angle + arc);
                    ctx.lineTo(centerX, centerY);
                    ctx.closePath();
                    ctx.clip(); // Clip to slice

                    // 1. Base Premium Gradient
                    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
                    if (isPop) {
                        // Pop: Diamond/Iridescent
                        gradient.addColorStop(0, '#ffffff');
                        gradient.addColorStop(0.3, '#f3e8ff'); // Light Purple
                        gradient.addColorStop(1, '#d8b4fe'); // Lavender edge
                    } else {
                        // Cyberpunk: Deep Gold
                        gradient.addColorStop(0, '#fffbe6');
                        gradient.addColorStop(0.4, '#fbbf24'); // Amber-400
                        gradient.addColorStop(1, '#b45309'); // Amber-700
                    }
                    ctx.fillStyle = gradient;
                    ctx.fill();

                    // 2. Scanline / Sheen Effect (Moving Reflection)
                    ctx.save();
                    // Rotate context to align with the slice angle roughly
                    ctx.translate(centerX, centerY);
                    ctx.rotate(angle + arc / 2);

                    // Moving sheer band
                    const sheenPos = (Math.sin(time * 2) * radius);
                    const sheenGrad = ctx.createLinearGradient(0, -radius, 0, radius);
                    sheenGrad.addColorStop(0, 'transparent');
                    sheenGrad.addColorStop(0.5, 'rgba(255,255,255,0.6)');
                    sheenGrad.addColorStop(1, 'transparent');

                    ctx.fillStyle = sheenGrad;
                    // Draw a rect moving up/down based on sheenPos
                    // We draw a big rect but it's clipped by parent
                    ctx.beginPath();
                    ctx.rect(-radius / 2, sheenPos - 40, radius, 80);
                    // Actually, let's just fill the whole slice area rotated? 
                    // Simpler: Draw a large band moving L-R relative to slice
                    ctx.fillStyle = 'rgba(255,255,255,0.15)';
                    ctx.fillRect(-radius, sheenPos, radius * 2, 50); // Moving band

                    // Second thinner band (highlight)
                    ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.fillRect(-radius, sheenPos + 20, radius * 2, 10);

                    ctx.restore();

                    // 3. Sparkles / Stars
                    sparkles.forEach((s, idx) => {
                        // Calculate position relative to slice wedge
                        // We map 's.a' (0-1) to the slice angle range
                        const sAngle = angle + (s.a % arc);
                        const sX = centerX + Math.cos(sAngle) * s.d;
                        const sY = centerY + Math.sin(sAngle) * s.d;

                        // Twinkle logic
                        const alpha = 0.5 + 0.5 * Math.sin(time * s.speed * 5 + s.offset);

                        ctx.globalAlpha = alpha;
                        ctx.fillStyle = isPop ? '#ffffff' : '#ffeb3b'; // White or Yellow sparks

                        // Draw Star shape
                        ctx.beginPath();
                        const starSize = 2 + s.r * 2;
                        ctx.arc(sX, sY, starSize, 0, Math.PI * 2);
                        ctx.fill();

                        // Cross glare for bigger stars
                        if (starSize > 3) {
                            ctx.beginPath();
                            ctx.moveTo(sX - starSize * 2, sY);
                            ctx.lineTo(sX + starSize * 2, sY);
                            ctx.moveTo(sX, sY - starSize * 2);
                            ctx.lineTo(sX, sY + starSize * 2);
                            ctx.strokeStyle = ctx.fillStyle;
                            ctx.lineWidth = 1;
                            ctx.stroke();
                        }
                    });

                    ctx.globalAlpha = 1; // Reset alpha
                    ctx.restore();
                } else if (isWinner) {
                    ctx.fillStyle = prize.color;
                    ctx.filter = 'brightness(1.5)';
                } else {
                    ctx.fillStyle = prize.color;
                    ctx.filter = 'none';
                }

                // --- MAIN BORDER ---
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, angle, angle + arc);
                ctx.lineTo(centerX, centerY);

                if (isWinner) {
                    ctx.fill();
                    ctx.lineWidth = 10;
                    ctx.strokeStyle = '#fff';
                    ctx.stroke();
                } else if (isRare) {
                    ctx.lineWidth = isPop ? 4 : 3;
                    // Pulsating Border Color
                    const pulse = 0.5 + 0.5 * Math.sin(time * 3);
                    if (isPop) {
                        ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + pulse * 0.5})`;
                        ctx.shadowColor = '#d8b4fe';
                    } else {
                        ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 + pulse * 0.5})`; // Gold
                        ctx.shadowColor = '#ffd700';
                    }
                    ctx.shadowBlur = 10 + pulse * 10;
                    ctx.stroke();
                    ctx.shadowBlur = 0; // Reset
                } else {
                    ctx.fill();
                    ctx.lineWidth = isPop ? 6 : 2;
                    ctx.strokeStyle = isPop ? '#fff' : '#1a1a1a';
                    ctx.stroke();
                }
                ctx.filter = 'none';

                // --- TEXT ---
                const innerMargin = isPop ? 80 : 70;
                const textAnchor = radius - 10;
                const maxWidth = textAnchor - innerMargin;

                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(angle + arc / 2);
                ctx.textAlign = 'right';

                if (isRare) {
                    // Premium Text Style
                    ctx.fillStyle = isPop ? '#7e22ce' : '#000'; // Deep Purple or Black
                    ctx.shadowColor = isPop ? '#fff' : '#ffd700';
                    ctx.shadowBlur = 15;
                    // Slight scale pulse for text too?
                    // const scale = 1 + Math.sin(time) * 0.02;
                    // ctx.scale(scale, scale); 
                } else {
                    ctx.fillStyle = isWinner ? '#ffff00' : '#fff';
                    ctx.shadowColor = isPop ? "rgba(0,0,0,0.2)" : "#000";
                    ctx.shadowBlur = 4;
                }

                let fontSize = isPop ? (isWinner ? 36 : 26) : (isWinner ? 32 : 22);
                if (isRare) fontSize += 4; // Bigger text for premium

                const fontFamily = isPop ? 'sans-serif' : 'monospace';
                ctx.font = `bold ${fontSize}px ${fontFamily}`;

                const metrics = ctx.measureText(prize.text);
                if (metrics.width > maxWidth) {
                    fontSize = fontSize * (maxWidth / metrics.width);
                    ctx.font = `bold ${fontSize}px ${fontFamily}`;
                }

                ctx.fillText(prize.text, textAnchor, 8, maxWidth);
                ctx.restore();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };

    }, [prizes, theme, winningIndex]);

    // Spin Logic
    useEffect(() => {
        if (mustSpin && prizes.length > 0) {
            setWinningIndex(null);
            setWinnerModal(null);

            const eligiblePrizes = prizes.filter(p => (p.probability || 0) > 0);
            let winnerIndex = -1;

            // SECURITY: Block spin if no eligible prizes (all probabilities are 0%)
            if (eligiblePrizes.length === 0) {
                console.error('[ROULETTE] Cannot spin: No eligible prizes (all probabilities are 0%)');
                stopSpin(null);
                alert('Erro: Não há prêmios elegíveis para sorteio. Configure pelo menos um prêmio com probabilidade maior que 0%.');
                return;
            }

            // Weighted random selection from eligible prizes only
            const totalWeight = eligiblePrizes.reduce((acc, p) => acc + (p.probability || 0), 0);
            let random = Math.random() * totalWeight;
            let selectedPrize = eligiblePrizes[eligiblePrizes.length - 1];
            for (let i = 0; i < eligiblePrizes.length; i++) {
                random -= (eligiblePrizes[i].probability || 0);
                if (random <= 0) {
                    selectedPrize = eligiblePrizes[i];
                    break;
                }
            }
            winnerIndex = prizes.findIndex(p => p.id === selectedPrize.id);

            const prize = prizes[winnerIndex];
            const arcDeg = 360 / prizes.length;
            const sliceCenter = (winnerIndex * arcDeg) + (arcDeg / 2);
            const targetRotation = 270 - sliceCenter;
            const minSpins = 8 * 360;
            const totalRotation = currentRotation.current + minSpins + (360 - (currentRotation.current % 360)) + targetRotation;

            let lastSliceIndex = -1;
            let lastRotation = currentRotation.current;
            let currentSpeed = 1.0;

            console.log('[ROULETTE] 🎰 Starting buildup phase!');
            setIsBuildup(true);
            setIsSpinning(true);

            // --- BUILDUP PHASE: 2 seconds of escalating tremor ---
            // Initialize audio DURING buildup so it's ready when spin starts
            initAudio().then(() => {
                console.log('[AUDIO] Audio context ready');
            });

            // Buildup tremor: small random oscillations that get more intense
            const buildupTl = gsap.timeline();
            buildupTl.to(containerRef.current, {
                rotation: currentRotation.current + 3,
                duration: 0.08,
                ease: 'power1.inOut',
                yoyo: true,
                repeat: 5, // 6 back-and-forth = ~0.5s
            });
            buildupTl.to(containerRef.current, {
                rotation: currentRotation.current - 5,
                duration: 0.06,
                ease: 'power1.inOut',
                yoyo: true,
                repeat: 9, // 10 back-and-forth = ~0.6s, more intense
            });
            buildupTl.to(containerRef.current, {
                rotation: currentRotation.current + 8,
                duration: 0.04,
                ease: 'power1.inOut',
                yoyo: true,
                repeat: 17, // 18 back-and-forth = ~0.7s, very intense
            });

            // Play a buildup sound during tremor
            buildupTl.call(() => {
                try {
                    const ctx = getAudioCtx();
                    // Rising tone for suspense
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(60, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 1.8);
                    gain.gain.setValueAtTime(0.15, ctx.currentTime);
                    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 1.5);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.8);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 1.8);
                } catch (e) {
                    console.error('[AUDIO] Buildup sound error:', e);
                }
            }, null, 0); // Fire at start of timeline

            // After buildup completes, start the real spin
            buildupTl.call(() => {
                console.log('[ROULETTE] Buildup complete, starting spin!');
                setIsBuildup(false);

                // Launch burst sound - bridges buildup to spin
                try {
                    const actx = getAudioCtx();
                    // Downward sweep "whoosh"
                    const launchOsc = actx.createOscillator();
                    const launchGain = actx.createGain();
                    launchOsc.type = 'sawtooth';
                    launchOsc.frequency.setValueAtTime(800, actx.currentTime);
                    launchOsc.frequency.exponentialRampToValueAtTime(150, actx.currentTime + 0.5);
                    launchGain.gain.setValueAtTime(0.35, actx.currentTime);
                    launchGain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.5);
                    launchOsc.connect(launchGain);
                    launchGain.connect(actx.destination);
                    launchOsc.start(actx.currentTime);
                    launchOsc.stop(actx.currentTime + 0.5);
                    // Impact thud
                    const thudOsc = actx.createOscillator();
                    const thudGain = actx.createGain();
                    thudOsc.type = 'sine';
                    thudOsc.frequency.setValueAtTime(200, actx.currentTime);
                    thudOsc.frequency.exponentialRampToValueAtTime(60, actx.currentTime + 0.3);
                    thudGain.gain.setValueAtTime(0.4, actx.currentTime);
                    thudGain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.3);
                    thudOsc.connect(thudGain);
                    thudGain.connect(actx.destination);
                    thudOsc.start(actx.currentTime);
                    thudOsc.stop(actx.currentTime + 0.3);
                } catch (e) {
                    console.error('[AUDIO] Launch sound error:', e);
                }

                // Start continuous spin sound
                const startSpin = () => {
                    try {
                        startDynamicSpinSound(() => currentSpeed);
                    } catch (e) {
                        console.error('[AUDIO] Failed to start spin sound:', e);
                    }
                };

                const ctx = getAudioCtx();
                if (ctx.state === 'suspended') {
                    ctx.resume().then(startSpin);
                } else {
                    startSpin();
                }

            gsap.to(containerRef.current, {
                rotation: totalRotation,
                duration: 12, // Increased from 8 to 12 seconds
                ease: 'power3.out', // More gradual deceleration
                onUpdate: function () {
                    const rotation = this.targets()[0]._gsap.rotation;
                    const totalSlicesPassed = Math.floor(rotation / arcDeg);
                    const progress = this.progress();

                    // Calculate speed and update for audio
                    const rotationDelta = rotation - lastRotation;
                    const normalizedSpeed = Math.min(1, Math.abs(rotationDelta) / 50);
                    // Aggressive fade: 60% reduction starts at 50%, then extra 35% in final 30%
                    let fadeMult = 1;
                    if (progress > 0.5) {
                        fadeMult = 1 - ((progress - 0.5) / 0.5) * 0.6; // First 50% reduction
                    }
                    if (progress > 0.7) {
                        fadeMult *= 1 - ((progress - 0.7) / 0.3) * 0.35; // Additional 35% in final stretch
                    }
                    currentSpeed = Math.max(0.01, normalizedSpeed * fadeMult);
                    lastRotation = rotation;

                    if (totalSlicesPassed !== lastSliceIndex) {
                        lastSliceIndex = totalSlicesPassed;

                        // Pointer animation - more dramatic
                        const pointerRotation = (isPop ? 15 : -15) * currentSpeed;
                        const pointerDuration = 0.04 + ((1 - currentSpeed) * 0.06);

                        gsap.fromTo(pointerRef.current,
                            { rotation: 0, scale: 1 },
                            {
                                rotation: pointerRotation,
                                scale: 1 + (currentSpeed * 0.1),
                                duration: pointerDuration,
                                yoyo: true,
                                repeat: 1,
                                ease: 'power2.out'
                            }
                        );
                    }
                },
                onComplete: () => {
                    currentRotation.current = totalRotation;
                    setWinningIndex(winnerIndex);
                    setIsSpinning(false);
                    stopSpin(prize);
                    stopSpinSound(); // Stop the continuous sound (no win sound yet)

                    // Initial confetti burst
                    const colors = isPop ? ['#ff00ff', '#ff69b4', '#ffff00', '#ffffff'] : ['#00f7ff', '#ffd700', '#bc13fe', '#ffffff'];

                    confetti({
                        particleCount: 150,
                        spread: 100,
                        origin: { y: 0.3 },
                        colors: colors,
                        startVelocity: 60
                    });

                    // Side bursts
                    setTimeout(() => {
                        confetti({
                            particleCount: 80,
                            angle: 60,
                            spread: 70,
                            origin: { x: 0, y: 0.6 },
                            colors: colors
                        });
                        confetti({
                            particleCount: 80,
                            angle: 120,
                            spread: 70,
                            origin: { x: 1, y: 0.6 },
                            colors: colors
                        });
                    }, 200);

                    // Continuous sparkles
                    const sparkleInterval = setInterval(() => {
                        confetti({
                            particleCount: 3,
                            spread: 360,
                            origin: { x: Math.random(), y: Math.random() * 0.5 },
                            colors: colors,
                            gravity: 0.5,
                            scalar: 0.8
                        });
                    }, 100);

                    setTimeout(() => {
                        setWinnerModal(prize);
                        clearInterval(sparkleInterval);
                        playWinSound(); // Play win sound when modal appears
                    }, 500);

                    // Final burst when modal appears
                    setTimeout(() => {
                        confetti({
                            particleCount: 100,
                            spread: 160,
                            origin: { y: 0.5 },
                            colors: colors,
                            shapes: ['circle', 'square'],
                            gravity: 1.2
                        });
                    }, 800);
                }
            });
            }); // end buildupTl.call
        }
    }, [mustSpin, theme]);

    return (
        <div className={`relative w-[600px] h-[600px] flex items-center justify-center scale-90 md:scale-100 transition-transform duration-100 ${isBuildup ? 'animate-[buildupShake_0.05s_ease-in-out_infinite]' : isSpinning ? 'animate-[subtleShake_0.1s_ease-in-out_infinite]' : ''}`}>
            {isPop ? <PopPointer tickRef={pointerRef} /> : <CyberpunkPointer tickRef={pointerRef} />}
            {isPop ? <PopFrame /> : <CyberpunkFrame />}
            {isPop ? <PopCenter isSpinning={isSpinning} /> : <CyberpunkCenter isSpinning={isSpinning} />}

            {/* Flying particles during spin */}
            {isSpinning && (
                <div className="absolute inset-0 pointer-events-none overflow-visible">
                    {[
                        { angle: 0, anim: 'flyRight' },
                        { angle: 45, anim: 'flyRightDown' },
                        { angle: 90, anim: 'flyDown' },
                        { angle: 135, anim: 'flyLeftDown' },
                        { angle: 180, anim: 'flyLeft' },
                        { angle: 225, anim: 'flyLeftUp' },
                        { angle: 270, anim: 'flyUp' },
                        { angle: 315, anim: 'flyRightUp' }
                    ].map((particle, idx) => (
                        <div
                            key={`fly-${idx}`}
                            className={`absolute animate-[${particle.anim}_1.2s_ease-out_infinite]`}
                            style={{
                                left: '50%',
                                top: '50%',
                                animationDelay: `${idx * 0.15}s`
                            }}
                        >
                            <div
                                className={`w-2 h-2 rounded-full`}
                                style={{
                                    background: isPop
                                        ? idx % 3 === 0 ? '#ff69b4' : idx % 3 === 1 ? '#ffff00' : '#ffffff'
                                        : idx % 3 === 0 ? '#00f7ff' : idx % 3 === 1 ? '#ffd700' : '#bc13fe',
                                    boxShadow: `0 0 8px ${isPop ? '#ff69b4' : '#00f7ff'}`
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Spinning glow effect */}
            {isSpinning && (
                <div className="absolute inset-0 z-5 flex items-center justify-center pointer-events-none">
                    {/* Multi-layer pulsating glow */}
                    <div
                        className={`absolute w-[500px] h-[500px] rounded-full blur-3xl animate-pulse`}
                        style={{
                            background: isPop
                                ? 'radial-gradient(circle, rgba(255,0,255,0.4) 0%, rgba(255,105,180,0.3) 50%, transparent 70%)'
                                : 'radial-gradient(circle, rgba(0,247,255,0.4) 0%, rgba(188,19,254,0.3) 50%, transparent 70%)',
                            animation: 'pulse 1s ease-in-out infinite'
                        }}
                    />
                    <div
                        className={`absolute w-[600px] h-[600px] rounded-full blur-2xl`}
                        style={{
                            background: isPop
                                ? 'radial-gradient(circle, transparent 40%, rgba(255,0,255,0.2) 60%, transparent 80%)'
                                : 'radial-gradient(circle, transparent 40%, rgba(0,247,255,0.2) 60%, transparent 80%)',
                            animation: 'pulse 1.5s ease-in-out infinite reverse'
                        }}
                    />

                    {/* Rotating energy beams */}
                    <div
                        className={`absolute w-[550px] h-[550px] rounded-full animate-spin`}
                        style={{
                            background: isPop
                                ? 'conic-gradient(transparent, rgba(255,0,255,0.5), transparent 30%)'
                                : 'conic-gradient(transparent, rgba(0,247,255,0.5), transparent 30%)',
                            animationDuration: '3s'
                        }}
                    />
                    <div
                        className={`absolute w-[550px] h-[550px] rounded-full animate-spin`}
                        style={{
                            background: isPop
                                ? 'conic-gradient(transparent 50%, rgba(255,105,180,0.4), transparent 80%)'
                                : 'conic-gradient(transparent 50%, rgba(188,19,254,0.4), transparent 80%)',
                            animationDuration: '2s',
                            animationDirection: 'reverse'
                        }}
                    />

                    {/* Energy waves expanding */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`absolute w-[400px] h-[400px] rounded-full border-4 opacity-60 animate-[expandFade_2s_ease-out_infinite]
                            ${isPop ? 'border-pink-400' : 'border-cyan-400'}`}></div>
                        <div className={`absolute w-[400px] h-[400px] rounded-full border-4 opacity-60 animate-[expandFade_2s_ease-out_infinite_0.7s]
                            ${isPop ? 'border-purple-400' : 'border-yellow-400'}`}></div>
                        <div className={`absolute w-[400px] h-[400px] rounded-full border-4 opacity-60 animate-[expandFade_2s_ease-out_infinite_1.4s]
                            ${isPop ? 'border-pink-300' : 'border-cyan-300'}`}></div>
                    </div>

                    {/* Orbiting particles */}
                    {[0, 60, 120, 180, 240, 300].map((angle, idx) => (
                        <div
                            key={angle}
                            className="absolute w-[500px] h-[500px] animate-spin"
                            style={{
                                animationDuration: `${4 + idx * 0.5}s`,
                                animationDirection: idx % 2 === 0 ? 'normal' : 'reverse'
                            }}
                        >
                            <div
                                className={`absolute w-3 h-3 rounded-full animate-pulse shadow-lg`}
                                style={{
                                    left: '50%',
                                    top: '0',
                                    background: isPop
                                        ? idx % 2 === 0 ? '#ff69b4' : '#ffff00'
                                        : idx % 2 === 0 ? '#00f7ff' : '#ffd700',
                                    boxShadow: `0 0 15px ${isPop ? '#ff69b4' : '#00f7ff'}`,
                                    transform: `rotate(${angle}deg) translateY(250px)`
                                }}
                            />
                        </div>
                    ))}

                    {/* Sparkle particles */}
                    {[...Array(12)].map((_, idx) => (
                        <div
                            key={`sparkle-${idx}`}
                            className={`absolute w-2 h-2 rounded-full animate-pulse`}
                            style={{
                                left: `${20 + Math.random() * 60}%`,
                                top: `${20 + Math.random() * 60}%`,
                                background: isPop ? '#ffffff' : '#ffeb3b',
                                boxShadow: `0 0 10px ${isPop ? '#ff69b4' : '#ffd700'}`,
                                animation: `pulse ${0.5 + Math.random()}s ease-in-out infinite`,
                                animationDelay: `${idx * 0.1}s`
                            }}
                        />
                    ))}

                    {/* Energy trails shooting outward */}
                    {[0, 72, 144, 216, 288].map((angle) => (
                        <div
                            key={`trail-${angle}`}
                            className="absolute inset-0 animate-[shootOut_1.5s_ease-out_infinite]"
                            style={{
                                animationDelay: `${angle / 360}s`
                            }}
                        >
                            <div
                                className={`absolute w-1 h-12 rounded-full shadow-lg`}
                                style={{
                                    left: '50%',
                                    top: '50%',
                                    background: isPop
                                        ? 'linear-gradient(to bottom, #ff69b4, transparent)'
                                        : 'linear-gradient(to bottom, #00f7ff, transparent)',
                                    transform: `rotate(${angle}deg) translateY(-150px)`,
                                    boxShadow: `0 0 10px ${isPop ? '#ff69b4' : '#00f7ff'}`
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}

            <div className={`w-full h-full flex items-center justify-center z-10 transition-all duration-500 ${isSpinning ? 'scale-105 brightness-125' : ''}`}>
                <div ref={containerRef} className="w-full h-full flex items-center justify-center">
                    <canvas ref={canvasRef} className={`rounded-full transition-all duration-300 ${isSpinning ? 'drop-shadow-[0_0_40px_rgba(0,247,255,0.8)] animate-[wheelPulse_2s_ease-in-out_infinite]' : ''}`} />
                </div>
            </div>

            {winnerModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                    {/* Backdrop with fade-in */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out_forwards]"></div>

                    {/* Winner announcement container */}
                    <div className="relative animate-[bounceIn_0.8s_cubic-bezier(0.68,-0.55,0.265,1.55)_forwards] flex flex-col items-center">
                        {/* Animated glow rings */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className={`absolute w-64 h-64 rounded-full animate-[ping_1.5s_ease-out_infinite] opacity-30
                                ${isPop ? 'bg-pink-400' : 'bg-yellow-400'}`}></div>
                            <div className={`absolute w-48 h-48 rounded-full animate-[ping_1.5s_ease-out_infinite_0.5s] opacity-40
                                ${isPop ? 'bg-purple-400' : 'bg-cyan-400'}`}></div>
                        </div>

                        {/* Decorative stars */}
                        <div className="absolute inset-0 animate-[spin_3s_linear_infinite]">
                            {[0, 60, 120, 180, 240, 300].map((angle) => (
                                <div
                                    key={angle}
                                    className={`absolute w-4 h-4 ${isPop ? 'bg-pink-400' : 'bg-yellow-400'} rounded-full animate-pulse`}
                                    style={{
                                        left: '50%',
                                        top: '50%',
                                        transform: `rotate(${angle}deg) translateY(-120px)`,
                                        filter: 'blur(1px)',
                                        boxShadow: `0 0 20px ${isPop ? '#ff69b4' : '#ffd700'}`
                                    }}
                                />
                            ))}
                        </div>

                        {/* Main winner text with enhanced effects */}
                        <div className="relative px-8 py-6 bg-gradient-to-br from-black/50 to-transparent rounded-3xl border-4 animate-[pulse_2s_ease-in-out_infinite]"
                            style={{
                                borderColor: isPop ? '#ff69b4' : '#ffd700',
                                boxShadow: `0 0 40px ${isPop ? '#ff69b4' : '#ffd700'}, inset 0 0 20px rgba(255,255,255,0.1)`
                            }}>
                            <h1
                                className={`text-7xl font-black uppercase text-center drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)] animate-[textGlow_1.5s_ease-in-out_infinite]
                                ${isPop ? 'text-white' : 'text-[#ffff00]'}`}
                                style={{
                                    textShadow: isPop
                                        ? '0 0 20px #ff69b4, 0 0 40px #ff69b4, 0 0 60px #ff69b4, 0 5px 10px rgba(0,0,0,0.5)'
                                        : '0 0 20px #ffff00, 0 0 40px #ffff00, 0 0 60px #ffd700, 0 5px 10px rgba(0,0,0,0.5)',
                                    WebkitTextStroke: isPop ? '3px #ff00ff' : '2px #000',
                                    letterSpacing: '0.05em'
                                }}
                            >
                                {winnerModal.text}
                            </h1>

                            {/* Shimmer effect overlay */}
                            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_linear_infinite] -translate-x-full"></div>
                            </div>
                        </div>

                        {/* Victory banner */}
                        <div className={`mt-4 px-6 py-2 rounded-full font-bold text-xl animate-[bounceIn_1s_cubic-bezier(0.68,-0.55,0.265,1.55)_0.3s_forwards] opacity-0
                            ${isPop ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-gradient-to-r from-yellow-500 to-orange-500'}
                            text-white shadow-lg`}
                            style={{
                                boxShadow: `0 5px 25px ${isPop ? '#ff69b4' : '#ffd700'}`
                            }}>
                            🎉 PARABÉNS! 🎉
                        </div>
                    </div>
                </div>
            )}
            <style jsx>{`
                @keyframes bounceIn {
                    0% { transform: scale(0) rotate(-180deg); opacity: 0; }
                    60% { transform: scale(1.2) rotate(10deg); opacity: 1; }
                    80% { transform: scale(0.9) rotate(-5deg); opacity: 1; }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                @keyframes fadeIn {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
                @keyframes textGlow {
                    0%, 100% { filter: brightness(1) drop-shadow(0 0 10px currentColor); }
                    50% { filter: brightness(1.3) drop-shadow(0 0 20px currentColor); }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
                @keyframes ping {
                    0% { transform: scale(1); opacity: 0.8; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
                @keyframes expandFade {
                    0% { transform: scale(0.7); opacity: 0.8; }
                    100% { transform: scale(1.8); opacity: 0; }
                }
                @keyframes wheelPulse {
                    0%, 100% { filter: drop-shadow(0 0 40px rgba(0,247,255,0.8)) brightness(1); }
                    50% { filter: drop-shadow(0 0 60px rgba(0,247,255,1)) brightness(1.15); }
                }
                @keyframes shootOut {
                    0% { transform: scale(0); opacity: 1; }
                    100% { transform: scale(2); opacity: 0; }
                }
                @keyframes flyRight {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { transform: translate(200px, -50%) scale(0.3); opacity: 0; }
                }
                @keyframes flyRightDown {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { transform: translate(140px, 140px) scale(0.3); opacity: 0; }
                }
                @keyframes flyDown {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { transform: translate(-50%, 200px) scale(0.3); opacity: 0; }
                }
                @keyframes flyLeftDown {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { transform: translate(-240px, 140px) scale(0.3); opacity: 0; }
                }
                @keyframes flyLeft {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { transform: translate(-300px, -50%) scale(0.3); opacity: 0; }
                }
                @keyframes flyLeftUp {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { transform: translate(-240px, -240px) scale(0.3); opacity: 0; }
                }
                @keyframes flyUp {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { transform: translate(-50%, -300px) scale(0.3); opacity: 0; }
                }
                @keyframes flyRightUp {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { transform: translate(140px, -240px) scale(0.3); opacity: 0; }
                }
                @keyframes subtleShake {
                    0%, 100% { transform: translate(0, 0); }
                    25% { transform: translate(1px, -1px); }
                    50% { transform: translate(-1px, 1px); }
                    75% { transform: translate(1px, 1px); }
                }
                @keyframes buildupShake {
                    0%, 100% { transform: translate(0, 0); }
                    10% { transform: translate(-3px, 2px); }
                    20% { transform: translate(3px, -2px); }
                    30% { transform: translate(-2px, -3px); }
                    40% { transform: translate(2px, 3px); }
                    50% { transform: translate(-3px, -1px); }
                    60% { transform: translate(3px, 1px); }
                    70% { transform: translate(-1px, 3px); }
                    80% { transform: translate(1px, -3px); }
                    90% { transform: translate(-2px, 2px); }
                }
                .stroke-text-pop { -webkit-text-stroke: 3px #ff69b4; }
                .stroke-text-cyber { -webkit-text-stroke: 2px #000; }
            `}</style>
        </div>
    );
}
