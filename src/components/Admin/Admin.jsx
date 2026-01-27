import React, { useState } from 'react';
import { useRouletteStore } from '../../hooks/useRouletteStore';
import { useBroadcast } from '../../hooks/useBroadcast';
import { Trash2, Plus, RefreshCw, Play, Eye, EyeOff } from 'lucide-react';

export default function Admin() {
    // Added updatePrize to destructuring
    const { prizes, addPrize, removePrize, updatePrize, config, updateConfig, startSpin, isVisible, setIsVisible } = useRouletteStore();
    const { sendSpin, syncState } = useBroadcast();

    const [newPrize, setNewPrize] = useState('');
    const [newColor, setNewColor] = useState('#ffffff');
    const [newProb, setNewProb] = useState(10); // Default prob

    const totalProbability = prizes.reduce((acc, p) => acc + (p.probability || 0), 0);
    const eligiblePrizesCount = prizes.filter(p => (p.probability || 0) > 0).length;
    const canSpin = eligiblePrizesCount > 0;

    const handleToggleVisibility = () => {
        const newState = !isVisible;
        setIsVisible(newState);
        syncState({ isVisible: newState });
    };

    const handleAdd = () => {
        if (!newPrize) return;
        const prize = {
            id: Date.now().toString(),
            text: newPrize,
            color: newColor,
            probability: Number(newProb)
        };
        addPrize(prize);
        setNewPrize('');

        // Manual Sync because local update might be async or batched
        const updatedPrizes = [...prizes, prize];
        syncState({ prizes: updatedPrizes });
    };

    const handleRemove = (id) => {
        removePrize(id);
        const updatedPrizes = prizes.filter(p => p.id !== id);
        syncState({ prizes: updatedPrizes });
    };

    const handleUpdateProb = (id, newProb) => {
        const val = Number(newProb);
        updatePrize(id, { probability: val });

        // Manual Sync
        const updatedPrizes = prizes.map(p => p.id === id ? { ...p, probability: val } : p);
        syncState({ prizes: updatedPrizes });
    };

    const handleNormalize = () => {
        const activePrizes = prizes.filter(p => !p.probability || p.probability >= 0); // Safety check
        const totalCurrent = activePrizes.reduce((acc, p) => acc + (p.probability || 0), 0);

        let newPrizes;
        if (totalCurrent === 0) {
            // If all 0, distribute equally
            const share = 100 / prizes.length;
            newPrizes = prizes.map(p => ({ ...p, probability: Number(share.toFixed(1)) }));
        } else {
            // Scale proportionally
            let runningTotal = 0;
            newPrizes = prizes.map((p, index) => {
                // If it's the last one, take the remainder to ensure perfect 100
                if (index === prizes.length - 1) {
                    return { ...p, probability: Number((100 - runningTotal).toFixed(1)) };
                }
                const rawShare = (p.probability || 0) / totalCurrent * 100;
                const rounded = Number(rawShare.toFixed(1));
                runningTotal += rounded;
                return { ...p, probability: rounded };
            });
        }

        syncState({ prizes: newPrizes });
    };

    const handleSpin = () => {
        sendSpin();
    };

    return (
        <div className="w-full min-h-screen bg-gray-900 text-white p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Controls */}
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <RefreshCw className="w-6 h-6 text-primary" /> Controle
                    </h2>

                    <div className="space-y-4">
                        <button
                            onClick={handleSpin}
                            disabled={!canSpin}
                            className={`w-full py-4 rounded-lg font-bold text-xl flex items-center justify-center gap-2 transition-all shadow-lg
                                ${canSpin
                                    ? 'bg-green-600 hover:bg-green-500 active:scale-95 shadow-green-900/50 cursor-pointer'
                                    : 'bg-gray-600 cursor-not-allowed opacity-50'
                                }`}
                            title={!canSpin ? 'Adicione pelo menos um prêmio com probabilidade maior que 0%' : 'Girar a roleta'}
                        >
                            <Play className="fill-current" /> GIRAR ROLETA
                        </button>
                        {!canSpin && (
                            <p className="text-sm text-yellow-400 text-center">
                                ⚠️ Configure pelo menos um prêmio com probabilidade {'>'} 0% para girar
                            </p>
                        )}

                        <button
                            onClick={handleToggleVisibility}
                            className={`w-full py-3 rounded-lg font-bold text-lg transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 
                                ${isVisible ? 'bg-red-600 hover:bg-red-500 shadow-red-900/50' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/50'}`}
                        >
                            {isVisible ? <EyeOff /> : <Eye />}
                            {isVisible ? 'OCULTAR ROLETA' : 'MOSTRAR ROLETA'}
                        </button>
                    </div>

                    <div className="mt-8 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Tema da Roleta</label>
                            <select
                                value={config.theme}
                                onChange={(e) => {
                                    const newTheme = e.target.value;
                                    updateConfig({ theme: newTheme });
                                    syncState({ config: { ...config, theme: newTheme } });
                                }}
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 focus:border-primary outline-none transition-colors"
                            >
                                <option value="cyberpunk">Cyberpunk / Neon</option>
                                <option value="pop">Pop / Cute 3D</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Tempo de Giro (segundos)</label>
                            <input
                                type="number"
                                value={config.spinDuration}
                                onChange={(e) => updateConfig({ spinDuration: Number(e.target.value) })}
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 focus:border-primary outline-none transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Prizes */}
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold">Prêmios ({prizes.length})</h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleNormalize}
                                className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-full font-bold transition-colors shadow shadow-blue-900/50"
                                title="Ajustar matemática para somar 100% exatamente"
                            >
                                Balancear
                            </button>
                            <div className={`text-sm font-bold px-3 py-1 rounded-full ${Math.abs(totalProbability - 100) < 0.1 ? 'bg-green-600' : 'bg-yellow-600'}`}>
                                Total: {totalProbability.toFixed(0)}%
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 mb-6">
                        <input
                            type="text"
                            placeholder="Nome do prêmio"
                            value={newPrize}
                            onChange={(e) => setNewPrize(e.target.value)}
                            className="flex-[2] bg-gray-900 border border-gray-700 rounded p-2 focus:border-primary outline-none min-w-0"
                        />
                        <input
                            type="number"
                            placeholder="%"
                            value={newProb}
                            onChange={(e) => setNewProb(e.target.value)}
                            className="w-16 bg-gray-900 border border-gray-700 rounded p-2 focus:border-primary outline-none text-center"
                        />
                        <input
                            type="color"
                            value={newColor}
                            onChange={(e) => setNewColor(e.target.value)}
                            className="w-10 h-10 rounded cursor-pointer bg-transparent border-none shrink-0"
                        />
                        <button
                            onClick={handleAdd}
                            className="p-2 bg-primary hover:bg-secondary rounded transition-colors shrink-0"
                        >
                            <Plus />
                        </button>
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {prizes.map((prize) => (
                            <div key={prize.id} className="flex items-center justify-between p-3 bg-gray-900 rounded group border border-transparent hover:border-gray-600 transition-colors gap-3">
                                <div className="flex items-center gap-3 overflow-hidden flex-1">
                                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: prize.color }} />
                                    <input
                                        type="text"
                                        value={prize.text}
                                        onChange={(e) => {
                                            updatePrize(prize.id, { text: e.target.value });
                                            // Manual Sync
                                            const updatedPrizes = prizes.map(p => p.id === prize.id ? { ...p, text: e.target.value } : p);
                                            syncState({ prizes: updatedPrizes });
                                        }}
                                        className="font-medium bg-transparent border-b border-transparent hover:border-gray-500 focus:border-primary outline-none w-full text-white transition-colors"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={prize.probability || 0}
                                            onChange={(e) => handleUpdateProb(prize.id, e.target.value)}
                                            className="w-16 bg-gray-800 border border-gray-600 rounded p-1 text-center text-sm focus:border-primary outline-none"
                                        />
                                        <span className="absolute right-[-10px] top-1 text-gray-500 text-xs">%</span>
                                    </div>

                                    <button
                                        onClick={() => handleRemove(prize.id)}
                                        className="text-gray-500 hover:text-red-500 transition-colors p-1"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
