import { useEffect } from 'react';
import { useRouletteStore } from './useRouletteStore';

const CHANNEL_NAME = 'roulette_channel';

export const useBroadcast = (role = 'overlay') => {
    const { setPrizes, updateConfig, startSpin, setIsVisible } = useRouletteStore();

    useEffect(() => {
        const bc = new BroadcastChannel(CHANNEL_NAME);

        bc.onmessage = (event) => {
            const { type, data } = event.data;
            console.log(`[Broadcast] Received ${type}`, data);

            switch (type) {
                case 'SYNC_STATE':
                    // Optional: Force sync if storage event fails or is too slow
                    // In a real app with Zustand persist, this might be redundant for data, 
                    // but useful for immediate "flash" updates.
                    if (data.prizes) setPrizes(data.prizes);
                    if (data.config) updateConfig(data.config);
                    if (data.isVisible !== undefined) setIsVisible(data.isVisible);
                    break;
                case 'SPIN_COMMAND':
                    // Admin says: SPIN!
                    // We can pass the predetermined winner index here if we want rigged spins
                    startSpin();
                    break;
                default:
                    break;
            }
        };

        return () => bc.close();
    }, [setPrizes, updateConfig, startSpin, setIsVisible]);

    const sendSpin = (winnerIndex = -1) => {
        const bc = new BroadcastChannel(CHANNEL_NAME);
        bc.postMessage({ type: 'SPIN_COMMAND', data: { winnerIndex } });
        bc.close();
    };

    const syncState = (state) => {
        const bc = new BroadcastChannel(CHANNEL_NAME);
        bc.postMessage({ type: 'SYNC_STATE', data: state });
        bc.close();
    };

    return { sendSpin, syncState };
};
