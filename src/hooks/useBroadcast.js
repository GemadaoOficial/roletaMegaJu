import { useEffect, useRef } from 'react';
import { useRouletteStore } from './useRouletteStore';

// Use relative URLs - Vite will proxy to Node.js server
const SYNC_API_URL = '/api/sync';
const SPIN_API_URL = '/api/spin';
const POLL_INTERVAL = 1000; // Poll every 1 second

export const useBroadcast = (role = 'overlay') => {
    const { syncFromServer, startSpin, lastSyncTimestamp } = useRouletteStore();
    const lastKnownTimestamp = useRef(0);

    useEffect(() => {
        // Initial sync from server
        syncFromServer();

        // Poll for changes from server
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(SYNC_API_URL);
                if (!response.ok) return;
                const data = await response.json();

                // If server data is newer than our last known timestamp, sync
                if (data.lastUpdated && data.lastUpdated > lastKnownTimestamp.current) {
                    console.log('[POLL] New data detected, syncing...');
                    lastKnownTimestamp.current = data.lastUpdated;
                    syncFromServer();
                }
            } catch (error) {
                console.error('[POLL] Error polling server:', error);
            }
        }, POLL_INTERVAL);

        // Poll for spin commands (only for overlay)
        let spinPollInterval;
        if (role === 'overlay') {
            spinPollInterval = setInterval(async () => {
                try {
                    const response = await fetch(SPIN_API_URL);
                    if (!response.ok) return;
                    const data = await response.json();

                    if (data.hasCommand) {
                        console.log('[POLL] Spin command received!');
                        startSpin();
                    }
                } catch (error) {
                    console.error('[POLL] Error checking spin command:', error);
                }
            }, 500); // Check for spin commands every 500ms for faster response
        }

        return () => {
            clearInterval(pollInterval);
            if (spinPollInterval) clearInterval(spinPollInterval);
        };
    }, [syncFromServer, startSpin, role]);

    // Update lastKnownTimestamp when local store updates
    useEffect(() => {
        lastKnownTimestamp.current = lastSyncTimestamp;
    }, [lastSyncTimestamp]);

    const sendSpin = async (winnerIndex = -1) => {
        try {
            const response = await fetch(SPIN_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ winnerIndex })
            });
            if (!response.ok) throw new Error('Failed to send spin command');
            console.log('[SPIN] Spin command sent to server');

            // Also trigger locally for immediate feedback
            startSpin();
        } catch (error) {
            console.error('[SPIN] Error sending spin command:', error);
        }
    };

    // syncState is now handled automatically by the store methods
    const syncState = (state) => {
        console.log('[SYNC] Manual sync called (handled by store)');
    };

    return { sendSpin, syncState };
};
