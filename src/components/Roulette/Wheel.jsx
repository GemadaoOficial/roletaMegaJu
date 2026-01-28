import React, { useRef, useEffect, useState } from 'react';
import { useRouletteStore } from '../../hooks/useRouletteStore';
import gsap from 'gsap';
import confetti from 'canvas-confetti';

// --- AUDIO UTILS ---
let audioCtx = null;
let isAudioInitialized = false;
let isOBS = false;
let audioEnabled = true;

// Detect if running in OBS Browser Source
const detectOBS = () => {
    // OBS adds "obs-browser" to user agent or window.obsstudio exists
    const ua = navigator.userAgent.toLowerCase();
    return (
        ua.includes('obs') ||
        ua.includes('obsstudio') ||
        window.obsstudio !== undefined ||
        // Alternative: check if running in iframe with specific permissions
        (window.self !== window.top && !window.location.ancestorOrigins)
    );
};

isOBS = detectOBS();
if (isOBS) {
    console.log('[AUDIO] OBS detected - audio will be disabled to prevent errors');
    audioEnabled = false;
}

const initAudio = async () => {
    if (!audioEnabled) {
        console.log('[AUDIO] Audio disabled (OBS mode)');
        return;
    }
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }
        isAudioInitialized = true;
        console.log('[AUDIO] Audio context initialized:', audioCtx.state);
    } catch (e) {
        console.warn('[AUDIO] Failed to initialize audio, disabling:', e);
        audioEnabled = false;
    }
};

const getAudioCtx = () => {
    if (!audioEnabled) return null;
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    } catch (e) {
        console.warn('[AUDIO] Error getting audio context:', e);
        audioEnabled = false;
        return null;
    }
};

let spinSoundInterval = null;
let spinOscillators = []; // All active oscillators for cleanup

const playTickSound = (speed = 1.0) => {
    if (!audioEnabled) return;
    try {
        const ctx = getAudioCtx();
        if (!ctx) return;
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
    if (!audioEnabled) return;
    try {
        const ctx = getAudioCtx();
        if (!ctx) return;
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

            // Modulate oscillators based on speed (quartic curve for even more dramatic fade)
            const t = ctx.currentTime;
            const s4 = speed * speed * speed * speed; // Quartic curve - VERY aggressive fade
            rumbleOsc.frequency.setTargetAtTime(50 + (s4 * 200), t, 0.1);
            rumbleGain.gain.setTargetAtTime(0.001 + (s4 * 0.19), t, 0.15);
            whooshOsc.frequency.setTargetAtTime(100 + (s4 * 500), t, 0.1);
            whooshGain.gain.setTargetAtTime(0.0005 + (s4 * 0.13), t, 0.15);
            airOsc.frequency.setTargetAtTime(200 + (s4 * 800), t, 0.1);
            airGain.gain.setTargetAtTime(0.0002 + (s4 * 0.07), t, 0.15);

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
    if (!audioEnabled) return;
    // Fade out all oscillators with proper cleanup
    spinOscillators.forEach(({ osc, gain }) => {
        try {
            const ctx = getAudioCtx();
            if (!ctx) return;
            // Cancel any scheduled changes and fade to 0
            gain.gain.cancelScheduledValues(ctx.currentTime);
            gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.3); // Smoother fade: 300ms
            osc.stop(ctx.currentTime + 0.35); // Stop after fade completes
        } catch (e) {
            console.warn('[AUDIO] Error stopping oscillator:', e);
        }
    });
    spinOscillators = [];
    console.log('[AUDIO] Spin sound stopped (300ms fade)');
};

const playSpinAmbience = () => { };

const playWinSound = () => {
    if (!audioEnabled) return;
    try {
        const ctx = getAudioCtx();
        if (!ctx) return;

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


const CyberpunkCenter = ({ isSpinning, size = 600, onSpin }) => {
    const centerSize = Math.max(80, size * 0.21); // Min 80px, 21% of wheel size
    const fontSize = Math.max(14, size * 0.04); // Responsive text size
    return (
        <div
            onClick={onSpin}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 rounded-full bg-black border-4 border-[#bc13fe] shadow-[0_0_20px_#bc13fe] flex items-center justify-center overflow-hidden transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 ${isSpinning ? 'scale-110 shadow-[0_0_40px_#bc13fe] animate-pulse pointer-events-none' : 'hover:shadow-[0_0_30px_#bc13fe]'}`}
            style={{ width: `${centerSize}px`, height: `${centerSize}px` }}
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#2a2a2a_0%,_#000_100%)]"></div>

            {isSpinning && (
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '1.5s' }}>
                    <div className="absolute inset-0 bg-[conic-gradient(transparent,#00f7ff,transparent_30%)] rounded-full opacity-40"></div>
                </div>
            )}

            <div className={`text-center relative z-10 flex flex-col items-center justify-center ${isSpinning ? 'animate-pulse' : ''}`}>
                <h2
                    className={`text-[#ffd700] font-black tracking-tight drop-shadow-md font-sans italic transition-all duration-300 ${isSpinning ? 'scale-105' : ''}`}
                    style={{ fontSize: `${fontSize}px`, textShadow: isSpinning ? '0 0 20px #ffd700, 0 0 30px #ffd700' : '0 0 10px #ffd700' }}
                >Loja</h2>
                <h2
                    className={`text-[#ffd700] font-black tracking-tight drop-shadow-md font-sans italic transition-all duration-300 ${isSpinning ? 'scale-105' : ''}`}
                    style={{ fontSize: `${fontSize}px`, textShadow: isSpinning ? '0 0 20px #ffd700, 0 0 30px #ffd700' : '0 0 10px #ffd700' }}
                >Mada</h2>
                <div
                    className={`bg-[#00f7ff] shadow-[0_0_8px_#00f7ff] transition-all duration-300 ${isSpinning ? 'animate-pulse shadow-[0_0_15px_#00f7ff]' : ''}`}
                    style={{ width: `${Math.max(40, size * 0.13)}px`, height: '2px', margin: '2px 0' }}
                ></div>
            </div>
        </div>
    );
};


export default function Wheel() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const pointerRef = useRef(null);
    const currentRotation = useRef(0);
    const [winningIndex, setWinningIndex] = useState(null);
    const [winnerModal, setWinnerModal] = useState(null);
    const [isSpinning, setIsSpinning] = useState(false);

    const { prizes, mustSpin, config, stopSpin, updateConfig, startSpin } = useRouletteStore();

    // Handle manual spin from clicking the logo
    const handleManualSpin = () => {
        if (!isSpinning && prizes.length > 0) {
            console.log('[WHEEL] Manual spin triggered by logo click');
            startSpin();
        }
    };

    // Force cyberpunk theme - pop theme was removed
    useEffect(() => {
        if (config.theme === 'pop') {
            console.log('[THEME] Pop theme detected, forcing cyberpunk');
            updateConfig({ theme: 'cyberpunk' });
        }
    }, [config.theme, updateConfig]);

    const [isBuildup, setIsBuildup] = useState(false); // tremor/suspense phase

    // Responsive size based on viewport
    const [size, setSize] = useState(600);

    useEffect(() => {
        const updateSize = () => {
            const vw = Math.min(window.innerWidth, window.innerHeight);
            const newSize = Math.min(600, vw * 0.9); // 90% of viewport, max 600px
            setSize(newSize);
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // --- ANIMATED RENDER LOOP ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2 - 40;
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
                    if (false) {
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
                        ctx.fillStyle = false ? '#ffffff' : '#ffeb3b'; // White or Yellow sparks

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
                    ctx.lineWidth = false ? 4 : 3;
                    // Pulsating Border Color
                    const pulse = 0.5 + 0.5 * Math.sin(time * 3);
                    if (false) {
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
                    ctx.lineWidth = false ? 6 : 2;
                    ctx.strokeStyle = false ? '#fff' : '#1a1a1a';
                    ctx.stroke();
                }
                ctx.filter = 'none';

                // --- TEXT ---
                const innerMargin = false ? 80 : 70;
                const textAnchor = radius - 10;
                const maxWidth = textAnchor - innerMargin;

                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(angle + arc / 2);
                ctx.textAlign = 'right';

                if (isRare) {
                    // Premium Text Style
                    ctx.fillStyle = false ? '#7e22ce' : '#000'; // Deep Purple or Black
                    ctx.shadowColor = false ? '#fff' : '#ffd700';
                    ctx.shadowBlur = 15;
                    // Slight scale pulse for text too?
                    // const scale = 1 + Math.sin(time) * 0.02;
                    // ctx.scale(scale, scale); 
                } else {
                    ctx.fillStyle = isWinner ? '#ffff00' : '#fff';
                    ctx.shadowColor = false ? "rgba(0,0,0,0.2)" : "#000";
                    ctx.shadowBlur = 4;
                }

                let fontSize = false ? (isWinner ? 36 : 26) : (isWinner ? 32 : 22);
                if (isRare) fontSize += 4; // Bigger text for premium

                const fontFamily = false ? 'sans-serif' : 'monospace';
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

    }, [prizes, winningIndex]);

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
                if (!audioEnabled) return;
                try {
                    const ctx = getAudioCtx();
                    if (!ctx) return;
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
                if (audioEnabled) {
                    try {
                        const actx = getAudioCtx();
                        if (actx) {
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
                        }
                    } catch (e) {
                        console.error('[AUDIO] Launch sound error:', e);
                    }
                }

                // Start continuous spin sound
                if (audioEnabled) {
                    const startSpin = () => {
                        try {
                            startDynamicSpinSound(() => currentSpeed);
                        } catch (e) {
                            console.error('[AUDIO] Failed to start spin sound:', e);
                        }
                    };

                    const ctx = getAudioCtx();
                    if (ctx && ctx.state === 'suspended') {
                        ctx.resume().then(startSpin);
                    } else if (ctx) {
                        startSpin();
                    }
                }

            gsap.to(containerRef.current, {
                rotation: totalRotation,
                duration: 18, // Increased from 12 to 18 seconds for longer suspense
                ease: 'power3.out', // More gradual deceleration
                onUpdate: function () {
                    const rotation = this.targets()[0]._gsap.rotation;
                    const totalSlicesPassed = Math.floor(rotation / arcDeg);
                    const progress = this.progress();

                    // Calculate speed and update for audio - more aggressive deceleration
                    const rotationDelta = rotation - lastRotation;
                    const normalizedSpeed = Math.min(1, Math.abs(rotationDelta) / 50);
                    // Very aggressive fade using exponential curve matching audio ease
                    const easedProgress = 1 - Math.pow(1 - progress, 3); // Cubic easing matches power3.out
                    const speedMultiplier = Math.pow(1 - easedProgress, 2); // Squared for even steeper decline
                    currentSpeed = Math.max(0.001, normalizedSpeed * speedMultiplier);
                    lastRotation = rotation;

                    if (totalSlicesPassed !== lastSliceIndex) {
                        lastSliceIndex = totalSlicesPassed;

                        // Pointer animation - more dramatic
                        const pointerRotation = (false ? 15 : -15) * currentSpeed;
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

                    console.log('[AUDIO] Spin complete, stopping spin sound');
                    stopSpinSound(); // Stop the continuous sound - takes 300ms to fade out

                    // Initial confetti burst
                    const colors = false ? ['#ff00ff', '#ff69b4', '#ffff00', '#ffffff'] : ['#00f7ff', '#ffd700', '#bc13fe', '#ffffff'];

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

                    // Wait for spin sound to fully stop (300ms fade) before showing modal and playing win sound
                    setTimeout(() => {
                        setWinnerModal(prize);
                        clearInterval(sparkleInterval);
                        console.log('[AUDIO] Playing win sound');
                        playWinSound(); // Play win sound AFTER spin sound is fully stopped
                    }, 500); // 500ms ensures 300ms fade + 200ms buffer

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
                    }, 800); // Adjusted to match new modal timing
                }
            });
            }); // end buildupTl.call
        }
    }, [mustSpin, prizes]);

    return (
        <div
            className={`relative flex items-center justify-center transition-transform duration-100 ${isBuildup ? 'animate-[buildupShake_0.05s_ease-in-out_infinite]' : isSpinning ? 'animate-[subtleShake_0.1s_ease-in-out_infinite]' : ''}`}
            style={{ width: `${size}px`, height: `${size}px` }}
        >
            {/* OBS Mode Indicator */}
            {isOBS && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 bg-purple-600/90 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg backdrop-blur-sm border border-purple-400">
                    🎥 OBS Mode - Audio Disabled
                </div>
            )}

            <CyberpunkPointer tickRef={pointerRef} />
            <CyberpunkFrame />
            <CyberpunkCenter isSpinning={isSpinning} size={size} onSpin={handleManualSpin} />

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
                                className={`rounded-full`}
                                style={{
                                    width: `${Math.max(6, size * 0.01)}px`,
                                    height: `${Math.max(6, size * 0.01)}px`,
                                    background: idx % 3 === 0 ? '#00f7ff' : idx % 3 === 1 ? '#ffd700' : '#bc13fe',
                                    boxShadow: `0 0 8px #00f7ff`
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
                        className={`absolute rounded-full blur-3xl animate-pulse`}
                        style={{
                            width: `${size * 0.83}px`,
                            height: `${size * 0.83}px`,
                            background: 'radial-gradient(circle, rgba(0,247,255,0.4) 0%, rgba(188,19,254,0.3) 50%, transparent 70%)',
                            animation: 'pulse 1s ease-in-out infinite'
                        }}
                    />
                    <div
                        className={`absolute rounded-full blur-2xl`}
                        style={{
                            width: `${size}px`,
                            height: `${size}px`,
                            background: 'radial-gradient(circle, transparent 40%, rgba(0,247,255,0.2) 60%, transparent 80%)',
                            animation: 'pulse 1.5s ease-in-out infinite reverse'
                        }}
                    />

                    {/* Rotating energy beams */}
                    <div
                        className={`absolute rounded-full animate-spin`}
                        style={{
                            width: `${size * 0.92}px`,
                            height: `${size * 0.92}px`,
                            background: 'conic-gradient(transparent, rgba(0,247,255,0.5), transparent 30%)',
                            animationDuration: '3s'
                        }}
                    />
                    <div
                        className={`absolute rounded-full animate-spin`}
                        style={{
                            width: `${size * 0.92}px`,
                            height: `${size * 0.92}px`,
                            background: 'conic-gradient(transparent 50%, rgba(188,19,254,0.4), transparent 80%)',
                            animationDuration: '2s',
                            animationDirection: 'reverse'
                        }}
                    />

                    {/* Energy waves expanding */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`absolute rounded-full border-4 opacity-60 animate-[expandFade_2s_ease-out_infinite] ${false ? 'border-pink-400' : 'border-cyan-400'}`}
                            style={{ width: `${size * 0.67}px`, height: `${size * 0.67}px` }}></div>
                        <div className={`absolute rounded-full border-4 opacity-60 animate-[expandFade_2s_ease-out_infinite_0.7s] ${false ? 'border-purple-400' : 'border-yellow-400'}`}
                            style={{ width: `${size * 0.67}px`, height: `${size * 0.67}px` }}></div>
                        <div className={`absolute rounded-full border-4 opacity-60 animate-[expandFade_2s_ease-out_infinite_1.4s] ${false ? 'border-pink-300' : 'border-cyan-300'}`}
                            style={{ width: `${size * 0.67}px`, height: `${size * 0.67}px` }}></div>
                    </div>

                    {/* Orbiting particles */}
                    {[0, 60, 120, 180, 240, 300].map((angle, idx) => (
                        <div
                            key={angle}
                            className="absolute animate-spin"
                            style={{
                                width: `${size * 0.83}px`,
                                height: `${size * 0.83}px`,
                                animationDuration: `${4 + idx * 0.5}s`,
                                animationDirection: idx % 2 === 0 ? 'normal' : 'reverse'
                            }}
                        >
                            <div
                                className={`absolute rounded-full animate-pulse shadow-lg`}
                                style={{
                                    width: `${Math.max(8, size * 0.02)}px`,
                                    height: `${Math.max(8, size * 0.02)}px`,
                                    left: '50%',
                                    top: '0',
                                    background: idx % 2 === 0 ? '#00f7ff' : '#ffd700',
                                    boxShadow: `0 0 15px #00f7ff`,
                                    transform: `rotate(${angle}deg) translateY(${size * 0.42}px)`
                                }}
                            />
                        </div>
                    ))}

                    {/* Sparkle particles */}
                    {[...Array(12)].map((_, idx) => (
                        <div
                            key={`sparkle-${idx}`}
                            className={`absolute rounded-full animate-pulse`}
                            style={{
                                width: `${Math.max(6, size * 0.01)}px`,
                                height: `${Math.max(6, size * 0.01)}px`,
                                left: `${20 + Math.random() * 60}%`,
                                top: `${20 + Math.random() * 60}%`,
                                background: false ? '#ffffff' : '#ffeb3b',
                                boxShadow: `0 0 10px ${false ? '#ff69b4' : '#ffd700'}`,
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
                                className={`absolute rounded-full shadow-lg`}
                                style={{
                                    width: `${Math.max(3, size * 0.005)}px`,
                                    height: `${Math.max(36, size * 0.06)}px`,
                                    left: '50%',
                                    top: '50%',
                                    background: 'linear-gradient(to bottom, #00f7ff, transparent)',
                                    transform: `rotate(${angle}deg) translateY(${-size * 0.25}px)`,
                                    boxShadow: `0 0 10px #00f7ff`
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
                                ${false ? 'bg-pink-400' : 'bg-yellow-400'}`}></div>
                            <div className={`absolute w-48 h-48 rounded-full animate-[ping_1.5s_ease-out_infinite_0.5s] opacity-40
                                ${false ? 'bg-purple-400' : 'bg-cyan-400'}`}></div>
                        </div>

                        {/* Decorative stars */}
                        <div className="absolute inset-0 animate-[spin_3s_linear_infinite]">
                            {[0, 60, 120, 180, 240, 300].map((angle) => (
                                <div
                                    key={angle}
                                    className={`absolute w-4 h-4 ${false ? 'bg-pink-400' : 'bg-yellow-400'} rounded-full animate-pulse`}
                                    style={{
                                        left: '50%',
                                        top: '50%',
                                        transform: `rotate(${angle}deg) translateY(-120px)`,
                                        filter: 'blur(1px)',
                                        boxShadow: `0 0 20px ${false ? '#ff69b4' : '#ffd700'}`
                                    }}
                                />
                            ))}
                        </div>

                        {/* Main winner text with enhanced effects */}
                        <div className="relative px-8 py-6 bg-gradient-to-br from-black/50 to-transparent rounded-3xl border-4 animate-[pulse_2s_ease-in-out_infinite]"
                            style={{
                                borderColor: false ? '#ff69b4' : '#ffd700',
                                boxShadow: `0 0 40px ${false ? '#ff69b4' : '#ffd700'}, inset 0 0 20px rgba(255,255,255,0.1)`
                            }}>
                            <h1
                                className={`text-7xl font-black uppercase text-center drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)] animate-[textGlow_1.5s_ease-in-out_infinite]
                                ${false ? 'text-white' : 'text-[#ffff00]'}`}
                                style={{
                                    textShadow: '0 0 20px #ffff00, 0 0 40px #ffff00, 0 0 60px #ffd700, 0 5px 10px rgba(0,0,0,0.5)',
                                    WebkitTextStroke: false ? '3px #ff00ff' : '2px #000',
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
                            ${false ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-gradient-to-r from-yellow-500 to-orange-500'}
                            text-white shadow-lg`}
                            style={{
                                boxShadow: `0 5px 25px ${false ? '#ff69b4' : '#ffd700'}`
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
