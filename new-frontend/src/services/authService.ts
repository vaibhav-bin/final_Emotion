import type { Operator } from '../types';

const STORAGE_KEY = 'sahaaya_operator';

export const authService = {
    getOperator(): Operator | null {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    },

    isAuthenticated(): boolean {
        return this.getOperator() !== null;
    },

    login(emailOrId: string, passwordHex: string): Promise<Operator> {
        return new Promise((resolve, reject) => {
            // Simulate API latency
            setTimeout(() => {
                if (!emailOrId || !passwordHex) {
                    reject(new Error('Email/Operator ID and Password are required.'));
                    return;
                }

                // Just let standard mock inputs pass for dev simplicity, validate pattern
                if (passwordHex.length < 4) {
                    reject(new Error('Password must be at least 4 characters.'));
                    return;
                }

                const name = emailOrId.split('@')[0] || 'Operator';
                const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

                const operator: Operator = {
                    id: 'OP-0482',
                    name: formattedName === 'Admin' ? 'Dr. Sarah Lin' : formattedName,
                    email: emailOrId.includes('@') ? emailOrId : `${emailOrId}@sahaaya.ai`,
                    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120'
                };

                localStorage.setItem(STORAGE_KEY, JSON.stringify(operator));
                resolve(operator);
            }, 800);
        });
    },

    logout(): void {
        localStorage.removeItem(STORAGE_KEY);
    }
};
