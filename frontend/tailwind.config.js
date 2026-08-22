/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark mode
        'dark-bg':      '#0f172a',   // slate-900
        'dark-sidebar': '#111827',   // gray-900
        'dark-card':    '#1e293b',   // slate-800
        'dark-card2':   '#334155',   // slate-700
        // Light mode
        'light-bg':     '#f8fafc',   // slate-50
        'light-card':   '#ffffff',
        'light-card2':  '#f1f5f9',   // slate-100
        // Primary blue (TalentLink style)
        primary:        '#2563eb',   // blue-600
        'primary-hover':'#1d4ed8',   // blue-700
        'primary-light':'#60a5fa',   // blue-400
        'primary-muted':'#dbeafe',   // blue-100
        // Semantic
        background:     '#f4f6f8',   // light background
        foreground:     '#0f172a',   // dark text
        secondary:      '#ffffff',   // white panels
        'secondary-light': '#ffffff', // white panels/inputs
        accent:         '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in':       'fadeIn 0.4s ease-out forwards',
        'fade-in-up':    'fadeInUp 0.5s ease-out forwards',
        'slide-in-right':'slideInRight 0.35s ease-out forwards',
        'pulse-glow':    'pulseGlow 2.5s ease-in-out infinite',
        'message-pop':   'messagePop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'float':         'float 6s ease-in-out infinite',
        'shimmer':       'shimmer 3s linear infinite',
      },
      keyframes: {
        fadeIn:       { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeInUp:     { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { '0%': { opacity: '0', transform: 'translateX(-16px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        pulseGlow:    { '0%,100%': { filter: 'drop-shadow(0 0 6px #2563eb)' }, '50%': { filter: 'drop-shadow(0 0 18px #3b82f6)' } },
        messagePop:   { '0%': { opacity: '0', transform: 'scale(0.94) translateY(8px)' }, '100%': { opacity: '1', transform: 'scale(1) translateY(0)' } },
        float:        { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        shimmer:      { '0%': { backgroundPosition: '-200% center' }, '100%': { backgroundPosition: '200% center' } },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
