import React, { useEffect, useState } from 'react';
import { Particles, initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import Header from './Header';

const Layout = ({ children }: { children: React.ReactNode }) => {
    const [init, setInit] = useState(false);

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    return (
        <div className="min-h-screen relative">
            {init && (
                <Particles
                    id="tsparticles"
                    className="particles-container"
                    options={{
                        background: { opacity: 0 },
                        fpsLimit: 120,
                        interactivity: {
                            events: {
                                onHover: { enable: true, mode: "repulse" },
                                resize: { enable: true },
                            },
                            modes: {
                                repulse: { distance: 100, duration: 0.4 },
                            },
                        },
                        particles: {
                            color: { value: "#00f2ff" },
                            links: {
                                color: "#9d00ff",
                                distance: 150,
                                enable: true,
                                opacity: 0.2,
                                width: 1,
                            },
                            move: {
                                enable: true,
                                speed: 1,
                                direction: "none",
                                random: true,
                                straight: false,
                                outModes: { default: "out" },
                            },
                            number: {
                                density: { enable: true },
                                value: 40,
                            },
                            opacity: { value: 0.3 },
                            shape: { type: "circle" },
                            size: { value: { min: 1, max: 3 } },
                        },
                        detectRetina: true,
                    }}
                />
            )}

            <Header />

            <main className="container mx-auto px-4 pt-28 pb-10 relative z-10">
                {children}
            </main>

            <footer className="py-10 border-t border-white/5 text-center text-gray-500 relative z-10">
                <p>© 2026 NEONX Crypto Dashboard. Empowering your digital assets.</p>
            </footer>
        </div>
    );
};

export default Layout;
