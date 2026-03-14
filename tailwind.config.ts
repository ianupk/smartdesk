import type { Config } from "tailwindcss";

const config: Config = {
    content: ["./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ["'Geist'", "system-ui", "sans-serif"],
                display: ["'Geist'", "system-ui", "sans-serif"],
                body: ["'Geist'", "system-ui", "sans-serif"],
                mono: ["'Geist Mono'", "monospace"],
            },
            colors: {
                surface: {
                    DEFAULT: "#0e0e12",
                    1: "#141418",
                    2: "#1a1a20",
                    3: "#222228",
                    4: "#2a2a32",
                },
                border: {
                    DEFAULT: "#2a2a32",
                    dim: "#1e1e24",
                    bright: "#3a3a45",
                },
                accent: {
                    DEFAULT: "#7c6af7",
                    dim: "rgba(124,106,247,0.12)",
                    glow: "rgba(124,106,247,0.25)",
                },
                gold: {
                    DEFAULT: "#f0b429",
                    dim: "rgba(240,180,41,0.12)",
                },
                success: "#3ecf8e",
                warning: "#f0b429",
                danger: "#f87171",
                muted: {
                    DEFAULT: "#6b6b7e",
                    dim: "#3d3d4a",
                },
                ink: {
                    DEFAULT: "#f0f0f8",
                    dim: "#9898a8",
                    muted: "#5a5a68",
                },
            },
            animation: {
                "pulse-slow":
                    "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "fade-in": "fadeIn 0.3s ease forwards",
                "slide-up": "slideUp 0.3s ease forwards",
                blink: "blink 1s step-end infinite",
            },
            keyframes: {
                fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
                slideUp: {
                    "0%": { opacity: "0", transform: "translateY(8px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                blink: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0" } },
            },
            boxShadow: {
                "glow-accent": "0 0 20px rgba(124,106,247,0.15)",
                "glow-gold": "0 0 20px rgba(240,180,41,0.12)",
                card: "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
            },
        },
    },
    plugins: [],
};

export default config;
