import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, Eye, EyeOff, Headphones, AlertTriangle } from 'lucide-react';
import { authService } from '../services/authService';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [emailOrId, setEmailOrId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailOrId || !password) {
            setError('Please fill in all authorized vendor credentials.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await authService.login(emailOrId, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Authentication failed. Please verify credentials.');
        } finally {
            setLoading(false);
        }
    };

    // Generate 24 wave bars for the signature Login visual
    const waveBarsCount = 24;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">

            {/* LEFT SIDE: Brand & Waveform Visualizer Panel */}
            <div className="md:w-7/12 bg-neutral-900 text-white flex flex-col justify-between p-8 sm:p-12 md:p-16 relative overflow-hidden select-none">
                {/* Subtle backdrop dot pattern to add visual texture */}
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px] opacity-60"></div>
                <div className="absolute -left-1/4 -bottom-1/4 w-96 h-96 rounded-full bg-teal-600/10 blur-[120px]"></div>
                <div className="absolute -right-1/4 -top-1/4 w-96 h-96 rounded-full bg-indigo-600/10 blur-[120px]"></div>

                {/* Top Header */}
                <div className="flex items-center gap-3 relative z-10 animate-fade-in">
                    <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-white shadow-xl shadow-teal-500/20">
                        <Headphones size={20} className="stroke-[2.5]" />
                    </div>
                    <div>
                        <h1 className="font-display font-bold tracking-tight text-xl">SAHAAYA AI</h1>
                        <p className="text-[10px] text-teal-400 font-mono tracking-wider">SECURED PLATFORM v1.0</p>
                    </div>
                </div>

                {/* Middle Core Branding & Waveform Visual */}
                <div className="my-16 md:my-auto relative z-10 max-w-xl">
                    <span className="text-teal-400 font-display font-medium text-sm tracking-widest uppercase block mb-3 animate-fade-in">
                        Understanding Distress. Prioritizing Support.
                    </span>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold tracking-tight mb-6 leading-tight text-gradient bg-gradient-to-r from-white via-slate-100 to-slate-300">
                        AI-assisted real-time stress and vulnerability assessment.
                    </h2>
                    <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-10 font-light">
                        An advanced triage analytics platform analysing raw voice dynamics, speech pacing, pitch tremors and semantic transcripts to help support networks action critical cases safely.
                    </p>

                    {/* Calming Animated Signature Waveform */}
                    <div className="bg-neutral-800/40 border border-neutral-800 rounded-2xl p-6 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                                Voice Waveform Signal Stream
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">VOICE → SIGNAL → UNDERSTANDING</span>
                        </div>

                        <div className="h-16 flex items-end justify-between gap-1 px-2">
                            {Array.from({ length: waveBarsCount }).map((_, index) => {
                                // Generate a pseudo-random height pattern for Awwwards wave
                                const baseHeight = [
                                    30, 45, 60, 25, 40, 85, 95, 45, 65, 30, 50, 75,
                                    80, 50, 35, 60, 90, 70, 40, 20, 55, 30, 45, 25
                                ][index] || 40;

                                // Add staggered animation delay
                                const delay = (index * 0.05).toFixed(2);

                                return (
                                    <div
                                        key={index}
                                        className="flex-1 bg-gradient-to-t from-teal-500 to-teal-300 rounded-full"
                                        style={{
                                            height: `${baseHeight}%`,
                                            animation: 'waveform 1.4s ease-in-out infinite',
                                            animationDelay: `${delay}s`,
                                            transformOrigin: 'bottom',
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Bottom Security Banner */}
                <div className="relative z-10 flex items-start gap-3 bg-neutral-800/20 border border-neutral-800/40 rounded-xl p-4 text-xs font-light text-slate-400 leading-normal">
                    <Shield size={16} className="text-teal-400 shrink-0 mt-0.5" />
                    <p>
                        Encryption standard AES-256 active. All helpline metadata transmissions and acoustic analysis parameters evaluated are subject to institutional privacy audits.
                    </p>
                </div>
            </div>

            {/* RIGHT SIDE: Operator Authentication Form */}
            <div className="md:w-5/12 bg-white flex flex-col justify-center p-8 sm:p-12 md:p-16">
                <div className="max-w-md w-full mx-auto">
                    {/* Header */}
                    <div className="mb-10 text-left">
                        <h3 className="font-display font-bold text-2xl text-slate-800 tracking-tight">
                            Operator Sign In
                        </h3>
                        <p className="text-sm text-slate-500 mt-2">
                            Please enter your triage terminal credentials to proceed.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 flex items-start gap-3 text-red-700 text-xs animate-fade-in">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500" />
                                <div>
                                    <p className="font-semibold">Access Denied</p>
                                    <p className="text-red-600/90 mt-0.5">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Email/Operator ID Field */}
                        <div>
                            <label
                                htmlFor="operator-id"
                                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
                            >
                                Email / Operator ID
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-600 transition-colors">
                                    <User size={16} />
                                </div>
                                <input
                                    id="operator-id"
                                    name="operator-id"
                                    type="text"
                                    required
                                    placeholder="operator@sahaaya.ai"
                                    value={emailOrId}
                                    onChange={(e) => setEmailOrId(e.target.value)}
                                    className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all outline-none"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1.5 font-light">
                                Use your institutional credentials (e.g. operator@sahaaya.ai)
                            </p>
                        </div>

                        {/* Password Field */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label
                                    htmlFor="password"
                                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                                >
                                    Password
                                </label>
                                <a href="#reset" className="text-xs text-slate-400 hover:text-teal-600 transition-colors" onClick={(e) => e.preventDefault()}>
                                    Forgot credentials?
                                </a>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-600 transition-colors">
                                    <Lock size={16} />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Remember Terminal checkbox */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    defaultChecked
                                    className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500 accent-teal-600"
                                />
                                <span className="text-xs text-slate-500">Remember this triage workstation</span>
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white font-medium py-3 px-4 rounded-xl text-sm transition-all focus:outline-none flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg hover:shadow-slate-900/10 active:scale-[0.98]"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    <span>Verifying Station...</span>
                                </>
                            ) : (
                                <span>Sign In to Terminal</span>
                            )}
                        </button>
                    </form>

                    {/* Footer details */}
                    <div className="mt-16 text-center text-xs text-slate-400 font-light flex flex-col items-center gap-1 border-t border-slate-100 pt-6">
                        <span className="font-semibold text-slate-500 uppercase tracking-widest text-[9px] mb-1">
                            AUTHORIZED PERSONNEL ONLY
                        </span>
                        <p>Access is restricted to secure network operators.</p>
                        <p>Actions performed on this system are tracked, logged and audited.</p>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Login;
