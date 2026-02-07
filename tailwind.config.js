/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#050505',
                card: '#0f0f0f',
                neon: {
                    blue: '#1677ff',
                    cyan: '#00f2ff',
                    purple: '#9d00ff',
                    green: '#00c076',
                    red: '#fe4646'
                }
            },
            backgroundImage: {
                'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
            }
        },
    },
    plugins: [],
}
