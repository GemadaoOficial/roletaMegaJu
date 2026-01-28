import React, { useState } from 'react';
import { useRouletteStore } from '../../hooks/useRouletteStore';
import { useBroadcast } from '../../hooks/useBroadcast';
import { Trash2, Plus, RefreshCw, Play, Eye, EyeOff } from 'lucide-react';

export default function Admin() {
    // Added updatePrize to destructuring
    const { prizes, addPrize, removePrize, updatePrize, setPrizes, config, updateConfig, startSpin, isVisible, setIsVisible } = useRouletteStore();
    const { sendSpin } = useBroadcast();

    const [newPrize, setNewPrize] = useState('');
    const [newColor, setNewColor] = useState('#ffffff');
    const [newProb, setNewProb] = useState(10); // Default prob

    const totalProbability = prizes.reduce((acc, p) => acc + (p.probability || 0), 0);
    const eligiblePrizesCount = prizes.filter(p => (p.probability || 0) > 0).length;
    const canSpin = eligiblePrizesCount > 0;

    const handleToggleVisibility = () => {
        const newState = !isVisible;
        setIsVisible(newState);
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
    };

    const handleRemove = (id) => {
        removePrize(id);
    };

    const handleUpdateProb = (id, newProb) => {
        const val = Number(newProb);
        updatePrize(id, { probability: val });
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

        setPrizes(newPrizes);
    };

    const handleSpin = () => {
        sendSpin();
    };

    return (
        <div className="w-full min-h-screen bg-gray-900 text-white p-2 sm:p-4 md:p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4 sm:mb-6 md:mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
                    🎰 Painel Administrativo - Roleta Loja Mada
                </h1>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">

                {/* Controls */}
                <div className="bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-700">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Controle
                    </h2>

                    <div className="space-y-3 sm:space-y-4">
                        <button
                            onClick={handleSpin}
                            disabled={!canSpin}
                            className={`w-full py-3 sm:py-4 rounded-lg font-bold text-lg sm:text-xl flex items-center justify-center gap-2 transition-all shadow-lg
                                ${canSpin
                                    ? 'bg-green-600 hover:bg-green-500 active:scale-95 shadow-green-900/50 cursor-pointer'
                                    : 'bg-gray-600 cursor-not-allowed opacity-50'
                                }`}
                            title={!canSpin ? 'Adicione pelo menos um prêmio com probabilidade maior que 0%' : 'Girar a roleta'}
                        >
                            <Play className="fill-current w-5 h-5 sm:w-6 sm:h-6" />
                            <span className="hidden sm:inline">GIRAR ROLETA</span>
                            <span className="sm:hidden">GIRAR</span>
                        </button>
                        {!canSpin && (
                            <p className="text-xs sm:text-sm text-yellow-400 text-center">
                                ⚠️ Configure pelo menos um prêmio com probabilidade {'>'} 0% para girar
                            </p>
                        )}

                        <button
                            onClick={handleToggleVisibility}
                            className={`w-full py-2.5 sm:py-3 rounded-lg font-bold text-base sm:text-lg transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2
                                ${isVisible ? 'bg-red-600 hover:bg-red-500 shadow-red-900/50' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/50'}`}
                        >
                            {isVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            <span className="hidden sm:inline">{isVisible ? 'OCULTAR ROLETA' : 'MOSTRAR ROLETA'}</span>
                            <span className="sm:hidden">{isVisible ? 'OCULTAR' : 'MOSTRAR'}</span>
                        </button>
                    </div>

                    <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-2">Tema da Roleta</label>
                            <select
                                value={config.theme}
                                onChange={(e) => {
                                    updateConfig({ theme: e.target.value });
                                }}
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm sm:text-base focus:border-primary outline-none transition-colors"
                            >
                                <option value="cyberpunk">Cyberpunk / Neon</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-2">Tempo de Giro (segundos)</label>
                            <input
                                type="number"
                                value={config.spinDuration}
                                onChange={(e) => updateConfig({ spinDuration: Number(e.target.value) })}
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm sm:text-base focus:border-primary outline-none transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Prizes */}
                <div className="bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-700">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
                        <h2 className="text-xl sm:text-2xl font-bold">Prêmios ({prizes.length})</h2>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={handleNormalize}
                                className="text-xs bg-blue-600 hover:bg-blue-500 px-2.5 sm:px-3 py-1 rounded-full font-bold transition-colors shadow shadow-blue-900/50"
                                title="Ajustar matemática para somar 100% exatamente"
                            >
                                Balancear
                            </button>
                            <div className={`text-xs sm:text-sm font-bold px-2.5 sm:px-3 py-1 rounded-full ${Math.abs(totalProbability - 100) < 0.1 ? 'bg-green-600' : 'bg-yellow-600'}`}>
                                Total: {totalProbability.toFixed(0)}%
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap gap-2 mb-4 sm:mb-6">
                        <input
                            type="text"
                            placeholder="Nome do prêmio"
                            value={newPrize}
                            onChange={(e) => setNewPrize(e.target.value)}
                            className="flex-1 min-w-[150px] bg-gray-900 border border-gray-700 rounded p-2 text-sm sm:text-base focus:border-primary outline-none"
                        />
                        <input
                            type="number"
                            placeholder="%"
                            value={newProb}
                            onChange={(e) => setNewProb(e.target.value)}
                            className="w-14 sm:w-16 bg-gray-900 border border-gray-700 rounded p-2 text-sm sm:text-base focus:border-primary outline-none text-center"
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
                            <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>

                    <div className="space-y-2 max-h-[300px] sm:max-h-[400px] overflow-y-auto custom-scrollbar">
                        {prizes.map((prize) => (
                            <div key={prize.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-900 rounded group border border-transparent hover:border-gray-600 transition-colors gap-2 sm:gap-3">
                                <div className="flex items-center gap-2 sm:gap-3 overflow-hidden flex-1 min-w-0">
                                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shrink-0" style={{ backgroundColor: prize.color }} />
                                    <input
                                        type="text"
                                        value={prize.text}
                                        onChange={(e) => {
                                            updatePrize(prize.id, { text: e.target.value });
                                        }}
                                        className="font-medium bg-transparent border-b border-transparent hover:border-gray-500 focus:border-primary outline-none w-full text-white transition-colors text-sm sm:text-base"
                                    />
                                </div>

                                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={prize.probability || 0}
                                            onChange={(e) => handleUpdateProb(prize.id, e.target.value)}
                                            className="w-12 sm:w-16 bg-gray-800 border border-gray-600 rounded p-1 text-center text-xs sm:text-sm focus:border-primary outline-none"
                                        />
                                        <span className="absolute right-[-8px] sm:right-[-10px] top-0.5 sm:top-1 text-gray-500 text-xs">%</span>
                                    </div>

                                    <button
                                        onClick={() => handleRemove(prize.id)}
                                        className="text-gray-500 hover:text-red-500 transition-colors p-1"
                                    >
                                        <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                </div>
            </div>
        </div>
    );
}
