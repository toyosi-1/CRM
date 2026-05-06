/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        sidebar: '#0c1220',
        'sidebar-hover': '#161f30',
        'sidebar-active': '#4f46e5',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 1.6s infinite linear',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'count-up': 'countUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseDot: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.4)', opacity: '0.7' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'card': '0 1px 4px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 8px 30px -4px rgb(0 0 0 / 0.14), 0 4px 10px -2px rgb(0 0 0 / 0.08)',
        'card-xl': '0 20px 60px -10px rgb(0 0 0 / 0.18), 0 8px 20px -6px rgb(0 0 0 / 0.1)',
        'stat': '0 2px 8px 0 rgb(79 70 229 / 0.1)',
        'glass': '0 8px 32px 0 rgb(31 38 135 / 0.12), inset 0 0 0 1px rgb(255 255 255 / 0.3)',
        'inner-white': 'inset 0 1px 0 0 rgb(255 255 255 / 0.15)',
        'glow-brand': '0 0 24px rgb(99 102 241 / 0.4), 0 0 8px rgb(99 102 241 / 0.2)',
        'glow-brand-lg': '0 0 60px rgb(99 102 241 / 0.35), 0 0 20px rgb(99 102 241 / 0.2)',
        'glow-red': '0 0 24px rgb(239 68 68 / 0.35)',
        'glow-green': '0 0 24px rgb(16 185 129 / 0.35)',
        'glow-amber': '0 0 24px rgb(245 158 11 / 0.35)',
        'btn': '0 2px 8px -1px rgb(79 70 229 / 0.4), 0 1px 2px rgb(0 0 0 / 0.1)',
      },
      backgroundImage: {
        'grid-white': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Cpath d='M 20 0 L 0 0 0 20' fill='none' stroke='white' stroke-width='0.5' opacity='0.1'/%3E%3C/svg%3E\")",
        'dots-white': "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
}

