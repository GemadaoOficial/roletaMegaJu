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

const playLegendaryWinSound = () => {
    if (!audioEnabled) return;
    try {
        const ctx = getAudioCtx();
        if (!ctx) return;

        // LEGENDARY FANFARE - Epic orchestral-style triumph
        // Bass drum impact
        const bassDrum = ctx.createOscillator();
        const bassDrumGain = ctx.createGain();
        bassDrum.type = 'sine';
        bassDrum.frequency.setValueAtTime(60, ctx.currentTime);
        bassDrum.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.1);
        bassDrumGain.gain.setValueAtTime(0.8, ctx.currentTime);
        bassDrumGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        bassDrum.connect(bassDrumGain);
        bassDrumGain.connect(ctx.destination);
        bassDrum.start(ctx.currentTime);
        bassDrum.stop(ctx.currentTime + 0.3);

        // Epic brass section - ascending triumph
        const brassNotes = [
            { freq: 261.63, time: 0.15, duration: 0.35, vol: 0.25 },  // C4
            { freq: 329.63, time: 0.35, duration: 0.35, vol: 0.28 },  // E4
            { freq: 392.00, time: 0.55, duration: 0.35, vol: 0.30 },  // G4
            { freq: 523.25, time: 0.75, duration: 0.5, vol: 0.35 },   // C5 (held)
            { freq: 659.25, time: 1.15, duration: 0.3, vol: 0.32 },   // E5
            { freq: 783.99, time: 1.35, duration: 0.8, vol: 0.40 }    // G5 (long hold)
        ];

        brassNotes.forEach(({ freq, time, duration, vol }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const startTime = ctx.currentTime + time;

            osc.type = 'sawtooth'; // Brass-like tone
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(vol, startTime + 0.05);
            gain.gain.setValueAtTime(vol * 0.9, startTime + duration * 0.7);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + duration);
        });

        // Timpani rolls (rumble effect)
        for (let i = 0; i < 12; i++) {
            const timpani = ctx.createOscillator();
            const timpaniGain = ctx.createGain();
            const startTime = ctx.currentTime + 0.2 + (i * 0.08);

            timpani.type = 'sine';
            timpani.frequency.setValueAtTime(80 + Math.random() * 20, startTime);
            timpaniGain.gain.setValueAtTime(0.15, startTime);
            timpaniGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);

            timpani.connect(timpaniGain);
            timpaniGain.connect(ctx.destination);
            timpani.start(startTime);
            timpani.stop(startTime + 0.1);
        }

        // Cymbal crash + shimmer (golden sparkle effect)
        const cymbalFreqs = [3000, 4200, 5800, 7200, 9500];
        cymbalFreqs.forEach((freq, idx) => {
            const cymbal = ctx.createOscillator();
            const cymbalGain = ctx.createGain();
            const startTime = ctx.currentTime + 0.25;

            cymbal.type = 'square';
            cymbal.frequency.setValueAtTime(freq, startTime);

            cymbalGain.gain.setValueAtTime(0.12, startTime);
            cymbalGain.gain.exponentialRampToValueAtTime(0.01, startTime + 1.5);

            cymbal.connect(cymbalGain);
            cymbalGain.connect(ctx.destination);
            cymbal.start(startTime);
            cymbal.stop(startTime + 1.5);
        });

        // Magical bell chimes (high frequency cascade)
        for (let i = 0; i < 15; i++) {
            const bell = ctx.createOscillator();
            const bellGain = ctx.createGain();
            const startTime = ctx.currentTime + 0.5 + (i * 0.12);
            const freq = 2093 + (i * 150) + Math.random() * 100;

            bell.type = 'sine';
            bell.frequency.setValueAtTime(freq, startTime);

            bellGain.gain.setValueAtTime(0.15, startTime);
            bellGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

            bell.connect(bellGain);
            bellGain.connect(ctx.destination);
            bell.start(startTime);
            bell.stop(startTime + 0.4);
        }

    } catch (e) {
        console.error('[AUDIO] Legendary win sound error:', e);
    }
};

const playLegendarySuspenseSound = () => {
    if (!audioEnabled) return;
    try {
        const ctx = getAudioCtx();
        if (!ctx) return;

        // Deep tension drone - builds from rumble to intensity
        const drone = ctx.createOscillator();
        const droneGain = ctx.createGain();
        drone.type = 'sawtooth';
        drone.frequency.setValueAtTime(35, ctx.currentTime);
        drone.frequency.linearRampToValueAtTime(100, ctx.currentTime + 3);
        droneGain.gain.setValueAtTime(0.04, ctx.currentTime);
        droneGain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 2.5);
        droneGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 3);
        drone.connect(droneGain);
        droneGain.connect(ctx.destination);
        drone.start(ctx.currentTime);
        drone.stop(ctx.currentTime + 3);

        // Heartbeat pulses - accelerating
        const beats = [0, 0.5, 0.9, 1.2, 1.45, 1.65, 1.8, 1.92, 2.02, 2.1, 2.17, 2.23];
        beats.forEach((time, i) => {
            const beat = ctx.createOscillator();
            const beatGain = ctx.createGain();
            const startTime = ctx.currentTime + time;
            beat.type = 'sine';
            beat.frequency.setValueAtTime(55 + i * 3, startTime);
            beat.frequency.exponentialRampToValueAtTime(25, startTime + 0.12);
            beatGain.gain.setValueAtTime(0.2 + i * 0.03, startTime);
            beatGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
            beat.connect(beatGain);
            beatGain.connect(ctx.destination);
            beat.start(startTime);
            beat.stop(startTime + 0.15);
        });

        // Rising shimmer cascade
        for (let i = 0; i < 15; i++) {
            const shimmer = ctx.createOscillator();
            const shimmerGain = ctx.createGain();
            const startTime = ctx.currentTime + 0.3 + i * 0.16;
            shimmer.type = 'sine';
            shimmer.frequency.setValueAtTime(600 + i * 180, startTime);
            shimmerGain.gain.setValueAtTime(0.02 + i * 0.008, startTime);
            shimmerGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
            shimmer.connect(shimmerGain);
            shimmerGain.connect(ctx.destination);
            shimmer.start(startTime);
            shimmer.stop(startTime + 0.12);
        }
    } catch (e) {
        console.error('[AUDIO] Suspense sound error:', e);
    }
};

const playLegendaryImpactSound = () => {
    if (!audioEnabled) return;
    try {
        const ctx = getAudioCtx();
        if (!ctx) return;

        // Massive bass impact
        const impact = ctx.createOscillator();
        const impactGain = ctx.createGain();
        impact.type = 'sine';
        impact.frequency.setValueAtTime(80, ctx.currentTime);
        impact.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.4);
        impactGain.gain.setValueAtTime(0.7, ctx.currentTime);
        impactGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        impact.connect(impactGain);
        impactGain.connect(ctx.destination);
        impact.start(ctx.currentTime);
        impact.stop(ctx.currentTime + 0.5);

        // High frequency crash
        const crash = ctx.createOscillator();
        const crashGain = ctx.createGain();
        crash.type = 'square';
        crash.frequency.setValueAtTime(3000, ctx.currentTime);
        crash.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.6);
        crashGain.gain.setValueAtTime(0.15, ctx.currentTime);
        crashGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        crash.connect(crashGain);
        crashGain.connect(ctx.destination);
        crash.start(ctx.currentTime);
        crash.stop(ctx.currentTime + 0.6);

        // Reverb tail
        for (let i = 0; i < 5; i++) {
            const rev = ctx.createOscillator();
            const revGain = ctx.createGain();
            const startTime = ctx.currentTime + 0.05 + i * 0.08;
            rev.type = 'sine';
            rev.frequency.setValueAtTime(1200 - i * 150, startTime);
            revGain.gain.setValueAtTime(0.08, startTime);
            revGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            rev.connect(revGain);
            revGain.connect(ctx.destination);
            rev.start(startTime);
            rev.stop(startTime + 0.3);
        }
    } catch (e) {
        console.error('[AUDIO] Impact sound error:', e);
    }
};

// --- THEME COMPONENTS ---

const CyberpunkFrame = () => null;


const CyberpunkPointer = ({ tickRef, legendaryGlow, legendaryHint }) => {
    const isGolden = legendaryGlow || legendaryHint;
    return (
        <div
            ref={tickRef}
            className={`absolute top-[-15px] left-1/2 -translate-x-1/2 z-30 transition-all duration-700 ${legendaryGlow ? 'scale-115' : ''}`}
            style={{
                width: '55px',
                height: '65px',
                filter: legendaryGlow
                    ? 'drop-shadow(0 0 20px #ffd700) drop-shadow(0 0 40px #ffd700) drop-shadow(0 0 60px rgba(255,215,0,0.5))'
                    : legendaryHint
                        ? 'drop-shadow(0 0 15px #ffd700) drop-shadow(0 0 8px #ffa500)'
                        : 'drop-shadow(0 0 12px #00f7ff) drop-shadow(0 0 6px #bc13fe)'
            }}
        >
            <svg width="55" height="65" viewBox="0 0 55 65" className="absolute inset-0 overflow-visible">
                <defs>
                    {/* Legendary gradient - rich gold */}
                    <linearGradient id="ptrLegendary" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fff7cc" />
                        <stop offset="30%" stopColor="#ffd700" />
                        <stop offset="70%" stopColor="#ffaa00" />
                        <stop offset="100%" stopColor="#ff8c00" />
                    </linearGradient>

                    {/* Normal gradient - cyberpunk neon */}
                    <linearGradient id="ptrNormal" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="20%" stopColor="#00f7ff" />
                        <stop offset="60%" stopColor="#bc13fe" />
                        <stop offset="100%" stopColor="#ff006e" />
                    </linearGradient>

                    {/* Shine overlay gradient */}
                    <linearGradient id="ptrShine" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.3)" />
                    </linearGradient>
                </defs>

                {/* Shadow layer for 3D effect */}
                <polygon
                    points="27.5,65 2,3 53,3"
                    fill="rgba(0,0,0,0.5)"
                    transform="translate(1, 2)"
                />

                {/* Main arrow body */}
                <polygon
                    points="27.5,62 3,3 52,3"
                    fill={isGolden ? 'url(#ptrLegendary)' : 'url(#ptrNormal)'}
                    className="transition-all duration-500"
                />

                {/* Inner darker section for depth */}
                <polygon
                    points="27.5,55 8,8 47,8"
                    fill="rgba(0,0,0,0.25)"
                />

                {/* Shine overlay on left side */}
                <polygon
                    points="27.5,62 3,3 20,3 27.5,50"
                    fill="url(#ptrShine)"
                    opacity="0.4"
                />

                {/* Center line detail */}
                <line
                    x1="27.5" y1="8"
                    x2="27.5" y2="55"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="1"
                />

                {/* Decorative side lines */}
                <line
                    x1="15" y1="15"
                    x2="27.5" y2="45"
                    stroke={isGolden ? 'rgba(255,215,0,0.3)' : 'rgba(0,247,255,0.3)'}
                    strokeWidth="1"
                />
                <line
                    x1="40" y1="15"
                    x2="27.5" y2="45"
                    stroke={isGolden ? 'rgba(255,215,0,0.3)' : 'rgba(0,247,255,0.3)'}
                    strokeWidth="1"
                />

                {/* Outer glowing border */}
                <polygon
                    points="27.5,62 3,3 52,3"
                    fill="none"
                    stroke={isGolden ? '#ffd700' : '#00f7ff'}
                    strokeWidth="2"
                    opacity="0.9"
                    className="transition-all duration-500"
                />

                {/* Inner border for extra definition */}
                <polygon
                    points="27.5,58 7,7 48,7"
                    fill="none"
                    stroke={isGolden ? 'rgba(255,215,0,0.5)' : 'rgba(0,247,255,0.5)'}
                    strokeWidth="1"
                />

                {/* Top edge accent line */}
                <line
                    x1="3" y1="3"
                    x2="52" y2="3"
                    stroke={isGolden ? '#fff7cc' : '#ffffff'}
                    strokeWidth="1.5"
                    opacity="0.8"
                />

                {/* Legendary edge glow animation */}
                {legendaryGlow && (
                    <>
                        {/* Left edge traveling glow */}
                        <line
                            x1="27.5" y1="62"
                            x2="3" y2="3"
                            stroke="#ffd700"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray="62"
                            strokeDashoffset="62"
                            className="animate-[edgeReveal_1s_ease-in_forwards]"
                            style={{ filter: 'drop-shadow(0 0 8px #ffd700)' }}
                        />
                        {/* Right edge traveling glow */}
                        <line
                            x1="27.5" y1="62"
                            x2="52" y2="3"
                            stroke="#ffd700"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray="62"
                            strokeDashoffset="62"
                            className="animate-[edgeReveal_1s_ease-in_forwards]"
                            style={{ filter: 'drop-shadow(0 0 8px #ffd700)' }}
                        />
                        {/* Top edge glow - completes last */}
                        <line
                            x1="3" y1="3"
                            x2="52" y2="3"
                            stroke="#ffd700"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray="49"
                            strokeDashoffset="49"
                            className="animate-[edgeRevealTop_0.5s_ease-in_0.8s_forwards]"
                            style={{ filter: 'drop-shadow(0 0 8px #ffd700)' }}
                        />
                    </>
                )}
            </svg>

            {/* Tip glow dot */}
            <div className={`absolute bottom-[-4px] left-1/2 -translate-x-1/2 rounded-full transition-all duration-700 z-10
                ${legendaryGlow
                    ? 'w-6 h-6 bg-[#ffd700] shadow-[0_0_20px_#ffd700,0_0_40px_#ffd700,0_0_60px_#ffd700] animate-[tipPulse_0.5s_ease-in-out_infinite]'
                    : legendaryHint
                        ? 'w-4 h-4 bg-[#ffd700] shadow-[0_0_12px_#ffd700,0_0_24px_#ffd700] animate-pulse'
                        : 'w-3 h-3 bg-[#00f7ff] shadow-[0_0_10px_#00f7ff] animate-pulse'
                }`}
            />

            {/* Sparkle particles from tip (full glow only) */}
            {legendaryGlow && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none">
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={`ptr-spark-${i}`}
                            className="absolute w-1.5 h-1.5 rounded-full bg-yellow-300 animate-[pointerSparkle_0.8s_ease-out_infinite]"
                            style={{
                                left: `${-12 + i * 3.5}px`,
                                bottom: '0px',
                                animationDelay: `${i * 0.1}s`,
                                boxShadow: '0 0 6px #ffd700, 0 0 12px rgba(255,215,0,0.5)'
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Continuous subtle pulse for hint mode */}
            {legendaryHint && !legendaryGlow && (
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 animate-pulse" style={{
                        background: 'radial-gradient(circle at 50% 0%, rgba(255,215,0,0.3) 0%, transparent 70%)',
                        animationDuration: '1.5s'
                    }} />
                </div>
            )}
        </div>
    );
};


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
    const [isLegendaryApproaching, setIsLegendaryApproaching] = useState(false);
    const [isLegendaryReveal, setIsLegendaryReveal] = useState(false);
    const [screenFlash, setScreenFlash] = useState(false);
    const legendaryApproachRef = useRef(false);
    const [showVipConfirm, setShowVipConfirm] = useState(false);

    const { prizes, mustSpin, config, stopSpin, updateConfig, startSpin } = useRouletteStore();

    // Security: blocked IDs and VIP mode from config
    const blockedIds = config.blockedIds || [];
    const vipMode = config.vipMode || false;

    // Handle manual spin from clicking the logo
    const handleManualSpin = () => {
        if (!isSpinning && prizes.length > 0) {
            // If VIP mode is active, show confirmation modal
            if (vipMode) {
                setShowVipConfirm(true);
                return;
            }
            console.log('[WHEEL] Manual spin triggered by logo click');
            startSpin();
        }
    };

    // Confirm VIP spin
    const confirmVipSpin = () => {
        setShowVipConfirm(false);
        console.log('[WHEEL] VIP spin confirmed by logo click');
        startSpin();
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
                const isRare = (prize.probability || 0) === 0 || blockedIds.includes(prize.id);

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

                // --- 2X BADGE for Legendary prizes when VIP mode is active ---
                if (isRare && vipMode) {
                    // Badge positioning - below the prize text
                    const badgeX = textAnchor - 50;
                    const badgeY = 35;
                    const badgeWidth = 45;
                    const badgeHeight = 22;
                    const badgeRadius = 8;

                    // Pulsating scale animation
                    const pulseScale = 1 + Math.sin(time * 4) * 0.1;
                    ctx.save();
                    ctx.translate(badgeX, badgeY);
                    ctx.scale(pulseScale, pulseScale);

                    // Badge background with gradient
                    const badgeGradient = ctx.createLinearGradient(-badgeWidth/2, -badgeHeight/2, badgeWidth/2, badgeHeight/2);
                    badgeGradient.addColorStop(0, '#ff4500');
                    badgeGradient.addColorStop(0.5, '#ff6347');
                    badgeGradient.addColorStop(1, '#ff4500');

                    ctx.fillStyle = badgeGradient;
                    ctx.shadowColor = '#ff4500';
                    ctx.shadowBlur = 15 + Math.sin(time * 4) * 5;

                    // Draw rounded rectangle
                    ctx.beginPath();
                    ctx.moveTo(-badgeWidth/2 + badgeRadius, -badgeHeight/2);
                    ctx.lineTo(badgeWidth/2 - badgeRadius, -badgeHeight/2);
                    ctx.quadraticCurveTo(badgeWidth/2, -badgeHeight/2, badgeWidth/2, -badgeHeight/2 + badgeRadius);
                    ctx.lineTo(badgeWidth/2, badgeHeight/2 - badgeRadius);
                    ctx.quadraticCurveTo(badgeWidth/2, badgeHeight/2, badgeWidth/2 - badgeRadius, badgeHeight/2);
                    ctx.lineTo(-badgeWidth/2 + badgeRadius, badgeHeight/2);
                    ctx.quadraticCurveTo(-badgeWidth/2, badgeHeight/2, -badgeWidth/2, badgeHeight/2 - badgeRadius);
                    ctx.lineTo(-badgeWidth/2, -badgeHeight/2 + badgeRadius);
                    ctx.quadraticCurveTo(-badgeWidth/2, -badgeHeight/2, -badgeWidth/2 + badgeRadius, -badgeHeight/2);
                    ctx.closePath();
                    ctx.fill();

                    // Badge border
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // Reset shadow for text
                    ctx.shadowBlur = 0;

                    // "2X" text
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 16px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('2X', 0, 0);

                    // Add sparkle effect on text
                    ctx.shadowColor = '#ffeb3b';
                    ctx.shadowBlur = 8;
                    ctx.fillText('2X', 0, 0);

                    ctx.restore();
                }

                ctx.restore();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };

    }, [prizes, winningIndex, blockedIds]);

    // Spin Logic
    useEffect(() => {
        if (mustSpin && prizes.length > 0) {
            setWinningIndex(null);
            setWinnerModal(null);
            setIsLegendaryApproaching(false);
            setIsLegendaryReveal(false);
            setScreenFlash(false);
            legendaryApproachRef.current = false;

            // === SECURITY SYSTEM: Multi-layer prize selection ===
            const _blockedIds = config.blockedIds || [];
            const _vipMode = config.vipMode || false;
            let winnerIndex = -1;
            let selectedPrize = null;

            if (_vipMode) {
                // ========== CUSTOMER MODE: Only premium prizes for customers ==========
                const customerPrizes = prizes.filter(p => _blockedIds.includes(p.id));

                if (customerPrizes.length === 0) {
                    console.error('[CUSTOMER] No premium prizes configured');
                    stopSpin(null);
                    alert('Erro: Nenhum prêmio premium configurado para clientes.');
                    return;
                }

                // Equal weight among customer prizes (use probability if set, else equal)
                const totalCustomerWeight = customerPrizes.reduce((acc, p) => acc + Math.max(p.probability || 0, 1), 0);
                let random = Math.random() * totalCustomerWeight;
                selectedPrize = customerPrizes[customerPrizes.length - 1];
                for (let i = 0; i < customerPrizes.length; i++) {
                    random -= Math.max(customerPrizes[i].probability || 0, 1);
                    if (random <= 0) {
                        selectedPrize = customerPrizes[i];
                        break;
                    }
                }
                winnerIndex = prizes.findIndex(p => p.id === selectedPrize.id);
                console.log('[CUSTOMER] Premium prize selected for customer:', selectedPrize.text);

            } else {
                // ========== NORMAL MODE: Blocked IDs NEVER win ==========

                // LAYER 1: Primary filter - exclude ALL blocked IDs from eligible pool
                const eligiblePrizes = prizes.filter(p => {
                    const hasProb = (p.probability || 0) > 0;
                    const isBlocked = _blockedIds.includes(p.id);
                    return hasProb && !isBlocked;
                });

                if (eligiblePrizes.length === 0) {
                    console.error('[SECURITY] No eligible prizes after blocking. Blocked IDs:', _blockedIds);
                    stopSpin(null);
                    alert('Erro: Não há prêmios elegíveis para sorteio. Configure pelo menos um prêmio não-lendário com probabilidade maior que 0%.');
                    return;
                }

                // Weighted random selection from eligible-only pool
                const totalWeight = eligiblePrizes.reduce((acc, p) => acc + (p.probability || 0), 0);
                let random = Math.random() * totalWeight;
                selectedPrize = eligiblePrizes[eligiblePrizes.length - 1];
                for (let i = 0; i < eligiblePrizes.length; i++) {
                    random -= (eligiblePrizes[i].probability || 0);
                    if (random <= 0) {
                        selectedPrize = eligiblePrizes[i];
                        break;
                    }
                }

                // LAYER 2: Secondary verification - double-check selected prize is NOT blocked
                if (_blockedIds.includes(selectedPrize.id)) {
                    console.warn('[SECURITY-L2] Blocked prize leaked through! Re-selecting from safe pool.');
                    selectedPrize = eligiblePrizes[Math.floor(Math.random() * eligiblePrizes.length)];
                }

                // LAYER 3: Tertiary verification - absolute guarantee
                if (_blockedIds.includes(selectedPrize.id)) {
                    console.error('[SECURITY-L3] CRITICAL - blocked prize still selected. Forcing first eligible.');
                    selectedPrize = eligiblePrizes[0];
                }

                // LAYER 4: Final assertion - abort if all layers failed
                if (_blockedIds.includes(selectedPrize.id)) {
                    console.error('[SECURITY-L4] FATAL - all security layers failed. Aborting spin.');
                    stopSpin(null);
                    return;
                }

                winnerIndex = prizes.findIndex(p => p.id === selectedPrize.id);

                // LAYER 5: Post-selection index validation
                if (winnerIndex >= 0 && _blockedIds.includes(prizes[winnerIndex].id)) {
                    console.error('[SECURITY-L5] Index mismatch detected. Aborting.');
                    stopSpin(null);
                    return;
                }

                console.log('[ROULETTE] Prize selected:', selectedPrize.text, '(ID:', selectedPrize.id, ')');
            }

            const prize = prizes[winnerIndex];
            const isLegendaryWin = _blockedIds.includes(prize.id);
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

                    // Legendary approaching detection - suspense when near end
                    if (isLegendaryWin && progress > 0.80 && !legendaryApproachRef.current) {
                        legendaryApproachRef.current = true;
                        setIsLegendaryApproaching(true);
                        playLegendarySuspenseSound();
                        console.log('[LEGENDARY] Approaching legendary prize - suspense activated!');
                    }
                },
                onComplete: () => {
                    currentRotation.current = totalRotation;
                    setWinningIndex(winnerIndex);
                    setIsSpinning(false);
                    setIsLegendaryApproaching(false);
                    legendaryApproachRef.current = false;
                    stopSpin(prize);

                    console.log('[AUDIO] Spin complete, stopping spin sound');
                    stopSpinSound();

                    const colors = ['#00f7ff', '#ffd700', '#bc13fe', '#ffffff'];
                    const isLegendary = _blockedIds.includes(prize.id);

                    if (isLegendary) {
                        // === LEGENDARY REVEAL SEQUENCE ===
                        console.log('[LEGENDARY] Starting reveal sequence for:', prize.text);

                        // Phase 1: Pointer golden glow begins (0s)
                        setIsLegendaryReveal(true);

                        // Initial golden confetti
                        confetti({
                            particleCount: 100,
                            spread: 80,
                            origin: { y: 0.3 },
                            colors: ['#ffd700', '#ffaa00', '#ff8c00', '#ffffff'],
                            startVelocity: 50
                        });

                        // Phase 2: Impact + screen flash (1.5s - after pointer edge glow completes)
                        setTimeout(() => {
                            playLegendaryImpactSound();
                            setScreenFlash(true);
                            setTimeout(() => setScreenFlash(false), 300);

                            // Golden confetti explosion
                            confetti({
                                particleCount: 200,
                                spread: 120,
                                origin: { y: 0.4 },
                                colors: ['#ffd700', '#ffaa00', '#ff8c00', '#fff'],
                                startVelocity: 70,
                                gravity: 0.8
                            });
                        }, 1500);

                        // Phase 3: Show legendary modal (2.2s)
                        setTimeout(() => {
                            setWinnerModal(prize);
                            setIsLegendaryReveal(false);
                            playLegendaryWinSound();

                            // Side bursts
                            confetti({
                                particleCount: 100,
                                angle: 60,
                                spread: 70,
                                origin: { x: 0, y: 0.6 },
                                colors: ['#ffd700', '#ffaa00', '#ffffff']
                            });
                            confetti({
                                particleCount: 100,
                                angle: 120,
                                spread: 70,
                                origin: { x: 1, y: 0.6 },
                                colors: ['#ffd700', '#ffaa00', '#ffffff']
                            });
                        }, 2200);

                        // Phase 4: Final burst (3s)
                        setTimeout(() => {
                            confetti({
                                particleCount: 150,
                                spread: 180,
                                origin: { y: 0.5 },
                                colors: ['#ffd700', '#ffaa00', '#ff8c00', '#ffffff'],
                                shapes: ['circle', 'square'],
                                gravity: 1.2
                            });
                        }, 3000);

                    } else {
                        // === NORMAL WIN FLOW ===
                        confetti({
                            particleCount: 150,
                            spread: 100,
                            origin: { y: 0.3 },
                            colors: colors,
                            startVelocity: 60
                        });

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
                            playWinSound();
                        }, 500);

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
                }
            });
            }); // end buildupTl.call
        }
    }, [mustSpin, prizes]);

    return (
        <div
            className={`relative flex items-center justify-center transition-transform duration-100 ${isBuildup ? 'animate-[buildupShake_0.05s_ease-in-out_infinite]' : isLegendaryApproaching ? 'animate-[legendaryApproach_0.06s_ease-in-out_infinite]' : isSpinning ? 'animate-[subtleShake_0.1s_ease-in-out_infinite]' : ''}`}
            style={{ width: `${size}px`, height: `${size}px` }}
        >
            {/* OBS Mode Indicator */}
            {isOBS && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 bg-purple-600/90 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg backdrop-blur-sm border border-purple-400">
                    🎥 OBS Mode - Audio Disabled
                </div>
            )}

            <CyberpunkPointer tickRef={pointerRef} legendaryGlow={isLegendaryReveal} legendaryHint={isLegendaryApproaching} />
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

            {/* Golden aura during legendary approach */}
            {isLegendaryApproaching && (
                <div className="absolute inset-0 z-5 flex items-center justify-center pointer-events-none">
                    <div
                        className="absolute rounded-full animate-[goldenPulse_0.6s_ease-in-out_infinite]"
                        style={{
                            width: `${size * 1.15}px`,
                            height: `${size * 1.15}px`,
                            background: 'radial-gradient(circle, rgba(255,215,0,0.25) 0%, rgba(255,165,0,0.1) 50%, transparent 70%)',
                            boxShadow: '0 0 60px rgba(255,215,0,0.4), 0 0 120px rgba(255,165,0,0.2)'
                        }}
                    />
                </div>
            )}

            {/* Legendary reveal aura - intense golden glow */}
            {isLegendaryReveal && (
                <div className="absolute inset-0 z-5 flex items-center justify-center pointer-events-none">
                    <div
                        className="absolute rounded-full animate-[goldenPulse_0.5s_ease-in-out_infinite]"
                        style={{
                            width: `${size * 1.25}px`,
                            height: `${size * 1.25}px`,
                            background: 'radial-gradient(circle, rgba(255,215,0,0.4) 0%, rgba(255,165,0,0.25) 40%, transparent 70%)',
                            boxShadow: '0 0 100px rgba(255,215,0,0.6), 0 0 200px rgba(255,165,0,0.3)'
                        }}
                    />
                    {/* Golden particles rising */}
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={`gp-${i}`}
                            className="absolute w-2 h-2 rounded-full bg-yellow-300 animate-[goldenRise_1.5s_ease-out_infinite]"
                            style={{
                                left: `${20 + i * 5}%`,
                                bottom: '30%',
                                animationDelay: `${i * 0.12}s`,
                                boxShadow: '0 0 8px #ffd700'
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Screen flash for legendary impact */}
            {screenFlash && (
                <div className="fixed inset-0 z-[10000] pointer-events-none animate-[flashFade_0.3s_ease-out_forwards]"
                    style={{
                        background: 'radial-gradient(circle, rgba(255,215,0,0.9) 0%, rgba(255,255,255,0.7) 50%, rgba(255,215,0,0.4) 100%)'
                    }}
                />
            )}

            {/* VIP Mode Confirmation Modal */}
            {showVipConfirm && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]"
                        onClick={() => setShowVipConfirm(false)}
                    />

                    {/* Modal Card */}
                    <div className="relative z-10 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border-2 border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.3)] max-w-md w-full animate-[scaleIn_0.3s_ease-out]">
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent animate-pulse" />

                        {/* Content */}
                        <div className="relative p-6 sm:p-8">
                            {/* Icon */}
                            <div className="flex justify-center mb-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-xl animate-pulse" />
                                    <div className="relative bg-gradient-to-br from-emerald-500 to-green-600 p-4 rounded-full">
                                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Title */}
                            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-400">
                                Modo Cliente Ativo
                            </h2>

                            {/* Description */}
                            <p className="text-center text-gray-300 mb-6 leading-relaxed">
                                Você está prestes a girar a roleta no <span className="text-emerald-400 font-semibold">Modo Cliente</span>.
                                <br />
                                Este é um giro especial para <span className="text-yellow-400 font-semibold">quem fez uma compra</span>.
                                <br />
                                <span className="text-sm text-gray-400 mt-2 block">Premiações lendárias estão disponíveis!</span>
                            </p>

                            {/* Warning badge */}
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-6">
                                <p className="text-yellow-400 text-sm text-center font-medium">
                                    ⚠️ Certifique-se de que este cliente realizou uma compra válida
                                </p>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowVipConfirm(false)}
                                    className="flex-1 py-3 px-4 rounded-xl font-semibold text-gray-300 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 transition-all active:scale-95"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmVipSpin}
                                    className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-900/50 transition-all active:scale-95"
                                >
                                    Confirmar Giro
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {winnerModal && (() => {
                const isLegendary = blockedIds.includes(winnerModal.id);

                return (
                    <div className={`fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none ${isLegendary ? 'animate-[screenShake_0.5s_ease-in-out]' : ''}`}>
                        {/* Backdrop with fade-in - covers entire viewport */}
                        <div className={`fixed inset-0 backdrop-blur-lg animate-[fadeIn_0.3s_ease-out_forwards] ${isLegendary ? 'bg-black/90' : 'bg-black/85'}`}></div>

                        {isLegendary && (
                            <>
                                {/* LEGENDARY: Golden lightning bolts */}
                                {[...Array(12)].map((_, i) => (
                                    <div
                                        key={`lightning-${i}`}
                                        className="absolute w-1 bg-gradient-to-b from-yellow-300 via-yellow-500 to-transparent animate-[lightning_0.6s_ease-out_infinite]"
                                        style={{
                                            left: `${10 + i * 8}%`,
                                            top: '-10%',
                                            height: `${50 + Math.random() * 30}%`,
                                            animationDelay: `${i * 0.08}s`,
                                            boxShadow: '0 0 20px rgba(255,215,0,0.8)',
                                            opacity: 0.6
                                        }}
                                    />
                                ))}

                                {/* LEGENDARY: Radial light explosion */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-full h-full bg-gradient-radial from-yellow-500/40 via-transparent to-transparent animate-[pulseGlow_1.5s_ease-in-out_infinite]"></div>
                                </div>

                                {/* LEGENDARY: Rotating golden rings */}
                                {[...Array(3)].map((_, i) => (
                                    <div
                                        key={`ring-${i}`}
                                        className="absolute rounded-full border-4 border-yellow-400/60 animate-spin"
                                        style={{
                                            width: `${300 + i * 150}px`,
                                            height: `${300 + i * 150}px`,
                                            animationDuration: `${3 + i}s`,
                                            animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
                                            boxShadow: '0 0 30px rgba(255,215,0,0.5)'
                                        }}
                                    />
                                ))}
                            </>
                        )}

                        {/* Winner announcement container */}
                        <div className={`relative flex flex-col items-center px-6 ${isLegendary ? 'animate-[legendaryBounce_1s_cubic-bezier(0.68,-0.55,0.265,1.55)_forwards]' : 'animate-[bounceIn_0.8s_cubic-bezier(0.68,-0.55,0.265,1.55)_forwards]'}`}>
                            {!isLegendary && (
                                <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: -1 }}>
                                    <div className="absolute w-72 h-72 rounded-full animate-[ping_1.5s_ease-out_infinite] opacity-20 bg-cyan-400"></div>
                                    <div className="absolute w-56 h-56 rounded-full animate-[ping_1.5s_ease-out_infinite_0.5s] opacity-30 bg-purple-400"></div>
                                </div>
                            )}

                            {/* Modern card container */}
                            <div className={`relative rounded-2xl overflow-visible shadow-2xl ${isLegendary ? 'animate-[cardPulse_1.5s_ease-in-out_infinite]' : ''}`}
                                style={{
                                    boxShadow: isLegendary
                                        ? '0 30px 60px -15px rgba(0,0,0,0.9), 0 0 120px rgba(255,215,0,0.6), 0 0 200px rgba(255,215,0,0.3)'
                                        : '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 80px rgba(0,247,255,0.3)'
                                }}>

                                {/* Content */}
                                <div className={`relative px-10 py-8 rounded-2xl ${isLegendary ? 'bg-gradient-to-br from-yellow-900/30 via-gray-900/95 to-yellow-900/30' : 'bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95'}`}>
                                    {/* Top banner */}
                                    <div className="text-center mb-4">
                                        <div className={`inline-flex items-center gap-2 px-6 py-2 rounded-full border ${isLegendary ? 'bg-gradient-to-r from-yellow-600/40 to-orange-600/40 border-yellow-400/60 shadow-[0_0_20px_rgba(255,215,0,0.5)]' : 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30'}`}>
                                            <span className="text-2xl">{isLegendary ? '⭐' : '🎉'}</span>
                                            <span className={`font-bold text-lg tracking-wider ${isLegendary ? 'text-yellow-300 animate-pulse' : 'text-yellow-400'}`}>
                                                {isLegendary ? '✨ LENDÁRIO ✨' : 'VOCÊ GANHOU'}
                                            </span>
                                            <span className="text-2xl">{isLegendary ? '⭐' : '🎉'}</span>
                                        </div>
                                    </div>

                                    {/* Prize text */}
                                    <div className="text-center relative">
                                        <h1 className={`text-5xl md:text-6xl font-black text-transparent bg-clip-text animate-[textGlow_1.5s_ease-in-out_infinite] py-2 ${isLegendary ? 'bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400' : 'bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400'}`}
                                            style={{
                                                filter: isLegendary
                                                    ? 'drop-shadow(0 0 30px rgba(255,215,0,0.8)) drop-shadow(0 0 60px rgba(255,165,0,0.5))'
                                                    : 'drop-shadow(0 0 20px rgba(0,247,255,0.5)) drop-shadow(0 0 40px rgba(188,19,254,0.3))',
                                                letterSpacing: '0.02em',
                                                lineHeight: '1.2'
                                            }}>
                                            {winnerModal.text}
                                        </h1>

                                        {/* Animated underline */}
                                        <div className={`mt-4 mx-auto w-32 h-1 rounded-full animate-pulse ${isLegendary ? 'bg-gradient-to-r from-transparent via-yellow-400 to-transparent' : 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent'}`}></div>
                                    </div>

                                    {/* Bottom sparkle effect */}
                                    <div className="mt-6 flex justify-center gap-2">
                                        {[...Array(isLegendary ? 7 : 5)].map((_, i) => (
                                            <div
                                                key={i}
                                                className={`w-2 h-2 rounded-full animate-pulse ${isLegendary ? 'bg-yellow-300' : 'bg-yellow-400'}`}
                                                style={{
                                                    animationDelay: `${i * 0.15}s`,
                                                    boxShadow: isLegendary ? '0 0 15px rgba(255,215,0,1)' : '0 0 10px rgba(255,215,0,0.8)'
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Shimmer effect overlay */}
                                <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                                    <div className={`absolute inset-0 bg-gradient-to-r from-transparent to-transparent animate-[shimmer_2s_linear_infinite] -translate-x-full ${isLegendary ? 'via-yellow-300/30' : 'via-white/10'}`}></div>
                                </div>
                            </div>

                            {/* Floating particles */}
                            {[...Array(isLegendary ? 20 : 8)].map((_, i) => (
                                <div
                                    key={`particle-${i}`}
                                    className="absolute w-3 h-3 rounded-full animate-[floatUp_2s_ease-out_infinite]"
                                    style={{
                                        left: isLegendary ? `${5 + i * 5}%` : `${20 + i * 10}%`,
                                        bottom: '-20px',
                                        background: isLegendary ? '#ffd700' : (i % 2 === 0 ? '#00f7ff' : '#ffd700'),
                                        boxShadow: `0 0 ${isLegendary ? '15' : '10'}px ${isLegendary ? '#ffd700' : (i % 2 === 0 ? '#00f7ff' : '#ffd700')}`,
                                        animationDelay: `${i * (isLegendary ? 0.1 : 0.2)}s`,
                                        opacity: isLegendary ? 0.9 : 0.7
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                );
            })()}
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
                @keyframes scaleIn {
                    0% { opacity: 0; transform: scale(0.8); }
                    100% { opacity: 1; transform: scale(1); }
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
                @keyframes floatUp {
                    0% { transform: translateY(0) scale(1); opacity: 0; }
                    10% { opacity: 0.7; }
                    90% { opacity: 0.7; }
                    100% { transform: translateY(-100px) scale(0.5); opacity: 0; }
                }
                @keyframes screenShake {
                    0%, 100% { transform: translate(0, 0); }
                    10% { transform: translate(-10px, 5px) rotate(-1deg); }
                    20% { transform: translate(10px, -5px) rotate(1deg); }
                    30% { transform: translate(-8px, 8px) rotate(-0.5deg); }
                    40% { transform: translate(8px, -8px) rotate(0.5deg); }
                    50% { transform: translate(-5px, 5px) rotate(-0.5deg); }
                    60% { transform: translate(5px, -5px) rotate(0.5deg); }
                    70% { transform: translate(-3px, 3px) rotate(-0.3deg); }
                    80% { transform: translate(3px, -3px) rotate(0.3deg); }
                    90% { transform: translate(-1px, 1px) rotate(-0.1deg); }
                }
                @keyframes legendaryBounce {
                    0% { transform: scale(0) rotate(-360deg); opacity: 0; }
                    50% { transform: scale(1.3) rotate(10deg); opacity: 1; }
                    75% { transform: scale(0.9) rotate(-5deg); opacity: 1; }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                @keyframes lightning {
                    0% { opacity: 0; transform: translateY(-20px) scaleY(0); }
                    10% { opacity: 1; transform: translateY(0) scaleY(1); }
                    20% { opacity: 0.8; }
                    30% { opacity: 0; }
                    100% { opacity: 0; transform: translateY(100%) scaleY(0.5); }
                }
                @keyframes pulseGlow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.2); }
                }
                @keyframes cardPulse {
                    0%, 100% { transform: scale(1); filter: brightness(1); }
                    50% { transform: scale(1.02); filter: brightness(1.15); }
                }
                @keyframes legendaryApproach {
                    0%, 100% { transform: translate(0, 0); }
                    10% { transform: translate(-4px, 3px); }
                    20% { transform: translate(4px, -3px); }
                    30% { transform: translate(-3px, -4px); }
                    40% { transform: translate(3px, 4px); }
                    50% { transform: translate(-4px, -2px); }
                    60% { transform: translate(4px, 2px); }
                    70% { transform: translate(-2px, 4px); }
                    80% { transform: translate(2px, -4px); }
                    90% { transform: translate(-3px, 3px); }
                }
                @keyframes edgeReveal {
                    0% { stroke-dashoffset: 62; }
                    100% { stroke-dashoffset: 0; }
                }
                @keyframes edgeRevealTop {
                    0% { stroke-dashoffset: 49; }
                    100% { stroke-dashoffset: 0; }
                }
                @keyframes tipPulse {
                    0%, 100% { transform: translateX(-50%) scale(1); }
                    50% { transform: translateX(-50%) scale(1.5); }
                }
                @keyframes pointerSparkle {
                    0% { opacity: 1; transform: translateY(0) scale(1); }
                    100% { opacity: 0; transform: translateY(-25px) scale(0); }
                }
                @keyframes goldenPulse {
                    0%, 100% { opacity: 0.6; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.08); }
                }
                @keyframes goldenRise {
                    0% { opacity: 0; transform: translateY(0) scale(1); }
                    20% { opacity: 1; }
                    100% { opacity: 0; transform: translateY(-80px) scale(0.3); }
                }
                @keyframes flashFade {
                    0% { opacity: 1; }
                    100% { opacity: 0; }
                }
                .stroke-text-pop { -webkit-text-stroke: 3px #ff69b4; }
                .stroke-text-cyber { -webkit-text-stroke: 2px #000; }
            `}</style>
        </div>
    );
}
