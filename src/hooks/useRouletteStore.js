import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_PRIZES = [
    { id: '1', text: '5% OFF', color: '#FF5733', probability: 10 },
    { id: '2', text: 'Frete Grátis', color: '#33FF57', probability: 10 },
    { id: '3', text: 'Brinde Surpresa', color: '#3357FF', probability: 5 },
    { id: '4', text: '10% OFF', color: '#FF33A1', probability: 10 },
    { id: '5', text: 'Tente Novamente', color: '#A133FF', probability: 60 },
    { id: '6', text: 'R$ 10,00', color: '#33FFF5', probability: 5 },
];

export const useRouletteStore = create(
    persist(
        (set) => ({
            prizes: DEFAULT_PRIZES,
            config: {
                spinDuration: 5, // in seconds
                winnerMessage: 'Parabéns! Você ganhou:',
                theme: 'cyberpunk', // 'cyberpunk' | 'pop'
            },
            isSpinning: false,
            winner: null,
            mustSpin: false, // signal to start spin in overlay
            isVisible: false,

            setPrizes: (prizes) => set({ prizes }),
            addPrize: (prize) => set((state) => ({ prizes: [...state.prizes, prize] })),
            removePrize: (id) => set((state) => ({ prizes: state.prizes.filter((p) => p.id !== id) })),
            updateConfig: (newConfig) => set((state) => ({ config: { ...state.config, ...newConfig } })),

            updatePrize: (id, updates) => set((state) => ({ prizes: state.prizes.map((p) => (p.id === id ? { ...p, ...updates } : p)) })),

            setIsVisible: (isVisible) => set({ isVisible }),

            startSpin: () => set({ isSpinning: true, mustSpin: true, winner: null }),
            stopSpin: (winner) => set({ isSpinning: false, mustSpin: false, winner }),
            resetSpin: () => set({ mustSpin: false, isSpinning: false, winner: null }),
        }),
        {
            name: 'roulette-storage', // unique name
            partialize: (state) => ({ prizes: state.prizes, config: state.config, isVisible: state.isVisible }), // only persist prizes and config
        }
    )
);
