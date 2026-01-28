import React, { useState } from 'react';
import { useRouletteStore } from '../../hooks/useRouletteStore';
import { useBroadcast } from '../../hooks/useBroadcast';
import { Trash2, Plus, RefreshCw, Play, Eye, EyeOff, Shield, Crown, Settings, Gift, BarChart3, Zap } from 'lucide-react';

export default function Admin() {
    const { prizes, addPrize, removePrize, updatePrize, setPrizes, config, updateConfig, startSpin, isVisible, setIsVisible } = useRouletteStore();
    const { sendSpin } = useBroadcast();

    const [newPrize, setNewPrize] = useState('');
    const [newColor, setNewColor] = useState('#ffffff');
    const [newProb, setNewProb] = useState(10);
    const [showVipConfirm, setShowVipConfirm] = useState(false);
    const [showSpinConfirm, setShowSpinConfirm] = useState(false);

    const blockedIds = config.blockedIds || [];
    const vipMode = config.vipMode || false;

    const totalProbability = prizes.reduce((acc, p) => acc + (p.probability || 0), 0);
    const eligiblePrizesCount = prizes.filter(p => (p.probability || 0) > 0 && !blockedIds.includes(p.id)).length;
    const legendaryCount = blockedIds.length;
    const canSpin = vipMode ? blockedIds.length > 0 : eligiblePrizesCount > 0;

    const handleToggleVisibility = () => setIsVisible(!isVisible);

    const handleAdd = () => {
        if (!newPrize) return;
        const maxId = prizes.reduce((max, p) => {
            const num = parseInt(p.id);
            return !isNaN(num) && num > max ? num : max;
        }, 0);
        addPrize({
            id: (maxId + 1).toString(),
            text: newPrize,
            color: newColor,
            probability: Number(newProb)
        });
        setNewPrize('');
    };

    const handleRemove = (id) => {
        removePrize(id);
        if (blockedIds.includes(id)) {
            updateConfig({ blockedIds: blockedIds.filter(bid => bid !== id) });
        }
    };

    const handleUpdateProb = (id, val) => updatePrize(id, { probability: Number(val) });

    const handleToggleBlocked = (id) => {
        const isCurrentlyBlocked = blockedIds.includes(id);
        updateConfig({
            blockedIds: isCurrentlyBlocked
                ? blockedIds.filter(bid => bid !== id)
                : [...blockedIds, id]
        });
    };

    const handleToggleVip = () => {
        if (!vipMode) setShowVipConfirm(true);
        else updateConfig({ vipMode: false });
    };

    const handleConfirmVip = () => {
        updateConfig({ vipMode: true });
        setShowVipConfirm(false);
    };

    const handleNormalize = () => {
        const totalCurrent = prizes.reduce((acc, p) => acc + (p.probability || 0), 0);
        let newPrizes;
        if (totalCurrent === 0) {
            const share = 100 / prizes.length;
            newPrizes = prizes.map(p => ({ ...p, probability: Number(share.toFixed(1)) }));
        } else {
            let runningTotal = 0;
            newPrizes = prizes.map((p, index) => {
                if (index === prizes.length - 1) {
                    return { ...p, probability: Number((100 - runningTotal).toFixed(1)) };
                }
                const rounded = Number(((p.probability || 0) / totalCurrent * 100).toFixed(1));
                runningTotal += rounded;
                return { ...p, probability: rounded };
            });
        }
        setPrizes(newPrizes);
    };

    const handleSpin = () => {
        // If VIP mode is active, show confirmation modal
        if (vipMode) {
            setShowSpinConfirm(true);
            return;
        }
        sendSpin();
    };

    const confirmSpin = () => {
        setShowSpinConfirm(false);
        sendSpin();
    };

    return (
        <div className="w-full min-h-screen bg-[#0a0a0f] text-white overflow-y-auto">
            {/* Header */}
            <div className="relative overflow-hidden border-b border-gray-800/50">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/20 via-purple-900/20 to-cyan-900/20" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400">
                                Painel Administrativo
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Roleta Loja Mada</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${isVisible ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isVisible ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                                {isVisible ? 'ONLINE' : 'OFFLINE'}
                            </div>
                            {vipMode && (
                                <div className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                                    <Crown className="w-3 h-3" />
                                    CLIENTE
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-gray-900/80 rounded-xl p-3 sm:p-4 border border-gray-800/60">
                        <div className="flex items-center gap-2 mb-1.5">
                            <Gift className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium">Total</span>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-white">{prizes.length}</p>
                    </div>
                    <div className="bg-gray-900/80 rounded-xl p-3 sm:p-4 border border-gray-800/60">
                        <div className="flex items-center gap-2 mb-1.5">
                            <Zap className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium">Elegíveis</span>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-green-400">{eligiblePrizesCount}</p>
                    </div>
                    <div className="bg-gray-900/80 rounded-xl p-3 sm:p-4 border border-gray-800/60">
                        <div className="flex items-center gap-2 mb-1.5">
                            <Shield className="w-3.5 h-3.5 text-yellow-400" />
                            <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium">Lendários</span>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-yellow-400">{legendaryCount}</p>
                    </div>
                    <div className="bg-gray-900/80 rounded-xl p-3 sm:p-4 border border-gray-800/60">
                        <div className="flex items-center gap-2 mb-1.5">
                            <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium">Prob. Total</span>
                        </div>
                        <p className={`text-xl sm:text-2xl font-bold ${Math.abs(totalProbability - 100) < 0.1 ? 'text-green-400' : 'text-yellow-400'}`}>{totalProbability.toFixed(0)}%</p>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">

                    {/* Controls - 2 columns */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Actions Card */}
                        <div className="bg-gray-900/60 rounded-xl border border-gray-800/60 overflow-hidden">
                            <div className="px-4 sm:px-5 py-3 border-b border-gray-800/40 bg-gray-800/30">
                                <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                                    <Play className="w-4 h-4 text-cyan-400" /> Controle da Roleta
                                </h2>
                            </div>
                            <div className="p-4 sm:p-5 space-y-3">
                                <button
                                    onClick={handleSpin}
                                    disabled={!canSpin}
                                    className={`w-full py-3 sm:py-3.5 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all
                                        ${canSpin
                                            ? 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 active:scale-[0.98] shadow-lg shadow-green-900/40 cursor-pointer'
                                            : 'bg-gray-800 cursor-not-allowed opacity-40 text-gray-500'
                                        }`}
                                >
                                    <Play className="fill-current w-5 h-5" />
                                    GIRAR ROLETA
                                </button>
                                {!canSpin && (
                                    <p className="text-[11px] text-yellow-500/80 text-center">
                                        Configure pelo menos um prêmio elegível para girar
                                    </p>
                                )}

                                <button
                                    onClick={handleToggleVisibility}
                                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2
                                        ${isVisible
                                            ? 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30'
                                            : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30'
                                        }`}
                                >
                                    {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    {isVisible ? 'OCULTAR ROLETA' : 'MOSTRAR ROLETA'}
                                </button>
                            </div>
                        </div>

                        {/* Settings Card */}
                        <div className="bg-gray-900/60 rounded-xl border border-gray-800/60 overflow-hidden">
                            <div className="px-4 sm:px-5 py-3 border-b border-gray-800/40 bg-gray-800/30">
                                <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-purple-400" /> Configurações
                                </h2>
                            </div>
                            <div className="p-4 sm:p-5 space-y-4">
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Tema</label>
                                    <select
                                        value={config.theme}
                                        onChange={(e) => updateConfig({ theme: e.target.value })}
                                        className="w-full bg-gray-800/80 border border-gray-700/50 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none transition-colors"
                                    >
                                        <option value="cyberpunk">Cyberpunk / Neon</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Tempo de Giro (s)</label>
                                    <input
                                        type="number"
                                        value={config.spinDuration}
                                        onChange={(e) => updateConfig({ spinDuration: Number(e.target.value) })}
                                        className="w-full bg-gray-800/80 border border-gray-700/50 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Customer Mode Card */}
                        <div className={`bg-gray-900/60 rounded-xl border overflow-hidden transition-all ${vipMode ? 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-gray-800/60'}`}>
                            <div className={`px-4 sm:px-5 py-3 border-b ${vipMode ? 'border-emerald-800/40 bg-emerald-900/20' : 'border-gray-800/40 bg-gray-800/30'}`}>
                                <h2 className={`text-sm font-semibold flex items-center gap-2 ${vipMode ? 'text-emerald-400' : 'text-gray-300'}`}>
                                    <Crown className="w-4 h-4" /> Modo Cliente
                                </h2>
                            </div>
                            <div className="p-4 sm:p-5">
                                <button
                                    onClick={handleToggleVip}
                                    className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]
                                        ${vipMode
                                            ? 'bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white shadow-lg shadow-emerald-900/40'
                                            : 'bg-gray-800/80 hover:bg-gray-700/80 text-gray-400 hover:text-gray-300 border border-gray-700/50'
                                        }`}
                                >
                                    <Crown className="w-4 h-4" />
                                    {vipMode ? 'ROLETA CLIENTE ATIVA' : 'Ativar Roleta Cliente'}
                                    {vipMode && <span className="ml-1 w-2 h-2 rounded-full bg-green-300 animate-pulse" />}
                                </button>
                                {vipMode && (
                                    <p className="text-[11px] text-emerald-400/70 text-center mt-2">
                                        Somente prêmios lendários serão sorteados
                                    </p>
                                )}
                                {!vipMode && (
                                    <p className="text-[11px] text-gray-600 text-center mt-2">
                                        Prêmios lendários ficam bloqueados no modo normal
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Prizes - 3 columns */}
                    <div className="lg:col-span-3">
                        <div className="bg-gray-900/60 rounded-xl border border-gray-800/60 overflow-hidden">
                            <div className="px-4 sm:px-5 py-3 border-b border-gray-800/40 bg-gray-800/30 flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                                    <Gift className="w-4 h-4 text-yellow-400" /> Prêmios
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 font-normal">{prizes.length}</span>
                                </h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleNormalize}
                                        className="text-[11px] bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 px-3 py-1 rounded-lg font-semibold transition-colors border border-cyan-500/20"
                                    >
                                        <RefreshCw className="w-3 h-3 inline mr-1" />
                                        Balancear
                                    </button>
                                    <div className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${Math.abs(totalProbability - 100) < 0.1 ? 'bg-green-500/15 text-green-400 border border-green-500/20' : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'}`}>
                                        {totalProbability.toFixed(0)}%
                                    </div>
                                </div>
                            </div>

                            {/* Add Prize Form */}
                            <div className="px-4 sm:px-5 py-3 border-b border-gray-800/30 bg-gray-800/10">
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        placeholder="Nome do prêmio..."
                                        value={newPrize}
                                        onChange={(e) => setNewPrize(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                        className="flex-1 min-w-0 bg-gray-800/80 border border-gray-700/50 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 outline-none placeholder-gray-600"
                                    />
                                    <input
                                        type="number"
                                        placeholder="%"
                                        value={newProb}
                                        onChange={(e) => setNewProb(e.target.value)}
                                        className="w-16 bg-gray-800/80 border border-gray-700/50 rounded-lg px-2 py-2 text-sm text-center focus:border-cyan-500/50 outline-none"
                                    />
                                    <input
                                        type="color"
                                        value={newColor}
                                        onChange={(e) => setNewColor(e.target.value)}
                                        className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border border-gray-700/50 shrink-0"
                                    />
                                    <button
                                        onClick={handleAdd}
                                        className="p-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors border border-cyan-500/20 shrink-0"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Prize List */}
                            <div className="p-2 sm:p-3 space-y-1.5 max-h-[420px] sm:max-h-[520px] overflow-y-auto custom-scrollbar">
                                {prizes.map((prize) => {
                                    const isBlocked = blockedIds.includes(prize.id);
                                    return (
                                        <div
                                            key={prize.id}
                                            className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg transition-all group
                                                ${isBlocked
                                                    ? 'bg-yellow-500/[0.06] border border-yellow-500/30 shadow-[inset_0_0_20px_rgba(255,215,0,0.03)]'
                                                    : 'bg-gray-800/40 border border-transparent hover:border-gray-700/50 hover:bg-gray-800/60'
                                                }`}
                                        >
                                            {/* ID Badge */}
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 font-mono
                                                ${isBlocked
                                                    ? 'bg-yellow-500/25 text-yellow-400 border border-yellow-500/30'
                                                    : 'bg-gray-700/50 text-gray-500'
                                                }`}>
                                                #{prize.id}
                                            </span>

                                            {/* Color dot */}
                                            <div
                                                className="w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-gray-700/50"
                                                style={{ backgroundColor: prize.color }}
                                            />

                                            {/* Name */}
                                            <input
                                                type="text"
                                                value={prize.text}
                                                onChange={(e) => updatePrize(prize.id, { text: e.target.value })}
                                                className="flex-1 min-w-0 font-medium bg-transparent border-b border-transparent hover:border-gray-600 focus:border-cyan-500/50 outline-none text-white text-sm transition-colors"
                                            />

                                            {/* Legendary badge */}
                                            {isBlocked && (
                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gradient-to-r from-yellow-600/80 to-amber-500/80 text-black shrink-0 uppercase tracking-wider">
                                                    Lendário
                                                </span>
                                            )}

                                            {/* Controls */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={prize.probability || 0}
                                                        onChange={(e) => handleUpdateProb(prize.id, e.target.value)}
                                                        className="w-14 bg-gray-800/80 border border-gray-700/40 rounded-md px-1.5 py-1 text-center text-xs focus:border-cyan-500/50 outline-none"
                                                    />
                                                    <span className="absolute right-1 top-1 text-gray-600 text-[10px]">%</span>
                                                </div>

                                                <button
                                                    onClick={() => handleToggleBlocked(prize.id)}
                                                    className={`p-1.5 rounded-md transition-all
                                                        ${isBlocked
                                                            ? 'text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20'
                                                            : 'text-gray-600 hover:text-gray-400 hover:bg-gray-700/50'
                                                        }`}
                                                    title={isBlocked ? 'Remover proteção lendária' : 'Marcar como lendário'}
                                                >
                                                    <Shield size={14} className={isBlocked ? 'fill-yellow-400/30' : ''} />
                                                </button>

                                                <button
                                                    onClick={() => handleRemove(prize.id)}
                                                    className="p-1.5 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Customer Prize Confirmation Modal */}
            {showVipConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#111118] p-6 rounded-2xl border border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.15)] max-w-sm mx-4 animate-[modalIn_0.3s_ease-out]">
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30">
                                <Crown className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-emerald-400">Roleta para Clientes</h3>
                                <p className="text-[11px] text-gray-500">Modo especial de premiação</p>
                            </div>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">
                            Ativar a roleta especial para <strong className="text-emerald-400">clientes que realizaram compra</strong> na loja?
                        </p>
                        <p className="text-gray-500 text-xs mb-1">
                            Os clientes terão acesso aos prêmios premium exclusivos.
                        </p>
                        <div className="mt-3 mb-5 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/30">
                            <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider font-medium">Prêmios Lendários Disponíveis:</p>
                            <p className="text-xs text-yellow-400">
                                {blockedIds.map(id => {
                                    const prize = prizes.find(p => p.id === id);
                                    return prize ? prize.text : `#${id}`;
                                }).join(', ') || 'nenhum configurado'}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowVipConfirm(false)}
                                className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 font-medium text-sm transition-colors border border-gray-700/50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmVip}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-emerald-900/40"
                            >
                                Ativar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Spin Confirmation Modal (when VIP mode is active) */}
            {showSpinConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 sm:p-8 rounded-2xl border-2 border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.3)] max-w-md mx-4 animate-[modalIn_0.3s_ease-out]">
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent animate-pulse pointer-events-none" />

                        <div className="relative">
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
                                    onClick={() => setShowSpinConfirm(false)}
                                    className="flex-1 py-3 px-4 rounded-xl font-semibold text-gray-300 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 transition-all active:scale-95"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmSpin}
                                    className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-900/50 transition-all active:scale-95"
                                >
                                    Confirmar Giro
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes modalIn {
                    0% { transform: scale(0.9) translateY(10px); opacity: 0; }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #444; }
            `}</style>
        </div>
    );
}
