import { create } from 'zustand';

const DEFAULT_PRIZES = [
    { id: '1', text: '5% OFF', color: '#FF5733', probability: 10 },
    { id: '2', text: 'Frete Grátis', color: '#33FF57', probability: 10 },
    { id: '3', text: 'Brinde Surpresa', color: '#3357FF', probability: 5 },
    { id: '4', text: '10% OFF', color: '#FF33A1', probability: 10 },
    { id: '5', text: 'Tente Novamente', color: '#A133FF', probability: 60 },
    { id: '6', text: 'R$ 10,00', color: '#33FFF5', probability: 5 },
];

// API endpoint - Uses Vite proxy to Node.js server
const API_URL = '/api/sync';

export const useRouletteStore = create((set, get) => ({
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
    lastSyncTimestamp: 0,

    // Sync state from server
    syncFromServer: async () => {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Failed to fetch from server');
            const data = await response.json();

            set({
                prizes: data.prizes || DEFAULT_PRIZES,
                config: data.config || get().config,
                isVisible: data.isVisible !== undefined ? data.isVisible : false,
                lastSyncTimestamp: data.lastUpdated || Date.now()
            });
            console.log('[SYNC] State synced from server');
        } catch (error) {
            console.error('[SYNC] Failed to sync from server:', error);
        }
    },

    // Sync state to server
    syncToServer: async (updates) => {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!response.ok) throw new Error('Failed to sync to server');
            const result = await response.json();
            console.log('[SYNC] State synced to server:', result);
            return true;
        } catch (error) {
            console.error('[SYNC] Failed to sync to server:', error);
            return false;
        }
    },

    setPrizes: (prizes) => {
        set({ prizes });
        get().syncToServer({ prizes });
    },

    addPrize: (prize) => {
        const prizes = [...get().prizes, prize];
        set({ prizes });
        get().syncToServer({ prizes });
    },

    removePrize: (id) => {
        const prizes = get().prizes.filter((p) => p.id !== id);
        set({ prizes });
        get().syncToServer({ prizes });
    },

    updateConfig: (newConfig) => {
        const config = { ...get().config, ...newConfig };
        set({ config });
        get().syncToServer({ config });
    },

    updatePrize: (id, updates) => {
        const prizes = get().prizes.map((p) => (p.id === id ? { ...p, ...updates } : p));
        set({ prizes });
        get().syncToServer({ prizes });
    },

    setIsVisible: (isVisible) => {
        set({ isVisible });
        get().syncToServer({ isVisible });
    },

    startSpin: () => set({ isSpinning: true, mustSpin: true, winner: null }),
    stopSpin: (winner) => set({ isSpinning: false, mustSpin: false, winner }),
    resetSpin: () => set({ mustSpin: false, isSpinning: false, winner: null }),
}));
