/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#030712', // deeper dark (gray-950)
        foreground: '#f9fafb', // gray-50
        primary: '#3b82f6',
        'primary-hover': '#2563eb',
        secondary: '#111827', // gray-900
        'secondary-light': '#1f2937', // gray-800
        accent: '#8b5cf6',
        'accent-light': '#a78bfa',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'slide-in-right': 'slideInRight 0.4s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'message-pop': 'messagePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)' },
          '50%': { opacity: '.8', boxShadow: '0 0 25px rgba(59, 130, 246, 0.8)' },
        },
        messagePop: {
          '0%': { opacity: '0', transform: 'scale(0.9) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
