import { create } from 'zustand';

interface AppState {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    walletAddress: string | null;
    connectWallet: () => void;
    disconnectWallet: () => void;
}

export const useAppStore = create<AppState>((set) => ({
    isDarkMode: true,
    toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
    walletAddress: null,
    connectWallet: () => set({ walletAddress: '0x1234...5678' }), // Mock connection
    disconnectWallet: () => set({ walletAddress: null }),
}));
