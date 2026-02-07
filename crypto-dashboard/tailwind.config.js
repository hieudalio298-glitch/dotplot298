/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                background: {
                    DEFAULT: '#0f0f1a',
                    light: '#ffffff',
                },
                neon: {
                    cyan: '#00f2ff',
                    purple: '#9d00ff',
                    pink: '#ff00aa',
                },
                glass: {
                    base: 'rgba(255, 255, 255, 0.05)',
                    border: 'rgba(255, 255, 255, 0.1)',
                }
            },
            backgroundImage: {
                'neon-gradient': 'linear-gradient(45deg, #00f2ff, #9d00ff, #ff00aa)',
            },
            boxShadow: {
                'neon-cyan': '0 0 10px #00f2ff, 0 0 20px rgba(0, 242, 255, 0.3)',
                'neon-purple': '0 0 10px #9d00ff, 0 0 20px rgba(157, 0, 255, 0.3)',
            },
            backdropBlur: {
                'glass': '10px',
            }
        },
    },
    plugins: [],
}
