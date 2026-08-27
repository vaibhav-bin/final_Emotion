import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
    Activity,
    LogOut,
    Shield,
    Database,
    Network
} from 'lucide-react';
import type { Operator } from '../types';
import { authService } from '../services/authService';

interface AppShellProps {
    children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [operator, setOperator] = useState<Operator | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const currentOperator = authService.getOperator();
        if (!currentOperator) {
            navigate('/login');
        } else {
            setOperator(currentOperator);
        }

        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, [navigate]);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: Activity },
        { name: 'Voice Analysis', path: '/analysis', icon: Network },
        { name: 'Settings', path: '/settings', icon: Database },
    ];

    const currentPath = location.pathname;

    return (
        <div className="min-h-screen bg-[var(--color-surface-base)] flex flex-col font-sans text-zinc-900 selection:bg-[var(--color-accent-lime)] selection:text-black">

            {/* V2 Floating Navigation Pill (Previous Design) - Updated to Light Theme */}
            <header className="fixed top-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-zinc-200/80 rounded-full px-2 py-2 flex items-center justify-between w-[95%] max-w-[1200px] z-[100] shadow-xl shadow-black/5">

                {/* Brand Logo & Name */}
                <Link to="/dashboard" className="flex items-center gap-3 pl-4 pr-6 shrink-0 group">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 overflow-hidden flex items-center justify-center relative">
                        <div className="absolute inset-0 opacity-20 bg-gradient-to-tr from-transparent via-transparent to-white group-hover:opacity-100 transition-opacity"></div>
                        <Activity size={16} className="text-[var(--color-accent-lime)]" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-display font-medium tracking-wide text-zinc-900 leading-none">
                            Sahaaya <span className="font-light">AI</span>
                        </span>
                        <span className="text-[9px] uppercase tracking-widest text-zinc-500 mt-1 font-mono">v2.4.0-stable</span>
                    </div>
                </Link>

                {/* Central Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1.5 p-1 bg-zinc-100/50 rounded-full border border-zinc-200/50 backdrop-blur-sm">
                    {navItems.map((item) => {
                        const isActive = currentPath.startsWith(item.path);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${isActive
                                    ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-white/50'
                                    }`}
                            >
                                <Icon size={14} className={isActive ? 'text-[var(--color-accent-lime-hover)]' : ''} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Operator Session Metrics / Logout */}
                {operator && (
                    <div className="flex items-center gap-3 pr-2 shrink-0">
                        {/* Secure status indicator */}
                        <div className="hidden lg:flex flex-col items-end mr-4">
                            <div className="flex items-center gap-1.5 align-baseline">
                                <Shield size={10} className="text-emerald-500" />
                                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Sys.Secure</span>
                            </div>
                            <span className="text-[9px] font-mono text-zinc-400 mt-1">{currentTime.toISOString().split('T')[1].slice(0, 8)} UTC</span>
                        </div>

                        {/* Profile Pill */}
                        <div className="flex items-center gap-3 bg-zinc-100 border border-zinc-200 pl-3 pr-1 py-1 rounded-full">
                            <div className="text-right hidden sm:block">
                                <div className="text-xs font-bold text-zinc-900 tracking-wide">{operator.name}</div>
                                <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{operator.id}</div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                {operator.name.charAt(0)}
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-500 hover:text-white text-red-500 flex items-center justify-center transition-all ml-1 group"
                                title="Terminate Session"
                            >
                                <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Workspace Frame */}
            <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 pt-32 pb-16">
                <div className="animate-fade-in transition-all duration-300 h-full">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AppShell;
