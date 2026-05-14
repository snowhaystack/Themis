import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        'bg-elev': 'rgb(var(--bg-elev) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-hi': 'rgb(var(--surface-hi) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-hi': 'rgb(var(--border-hi) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'muted-2': 'rgb(var(--muted-2) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-hi': 'rgb(var(--accent-hi) / <alpha-value>)',
        agent1: 'rgb(var(--agent1) / <alpha-value>)',
        agent2: 'rgb(var(--agent2) / <alpha-value>)',
        agent3: 'rgb(var(--agent3) / <alpha-value>)',
        agent4: 'rgb(var(--agent4) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'system-ui', 'sans-serif'],
        display: ['Arial', 'Helvetica', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--border-hi) / 0.6), 0 8px 24px -8px rgb(var(--accent) / 0.35)',
        'glow-strong':
          '0 0 0 1px rgb(var(--accent) / 0.4), 0 12px 40px -12px rgb(var(--accent) / 0.55)',
        soft: '0 1px 2px rgb(0 0 0 / 0.06), 0 8px 24px -12px rgb(0 0 0 / 0.18)',
      },
      backgroundImage: {
        'agent-gradient':
          'linear-gradient(90deg, rgb(var(--agent1)), rgb(var(--agent2)) 33%, rgb(var(--agent3)) 66%, rgb(var(--agent4)))',
        'agent-gradient-soft':
          'linear-gradient(90deg, rgb(var(--agent1) / 0.15), rgb(var(--agent2) / 0.15) 33%, rgb(var(--agent3) / 0.15) 66%, rgb(var(--agent4) / 0.15))',
        'aurora':
          'radial-gradient(40rem 30rem at 10% -10%, rgb(var(--agent2) / 0.25), transparent 60%), radial-gradient(36rem 28rem at 90% 0%, rgb(var(--agent1) / 0.22), transparent 60%), radial-gradient(36rem 28rem at 50% 110%, rgb(var(--agent3) / 0.18), transparent 60%)',
      },
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'gradient-shift': 'gradient-shift 6s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 240ms ease-out both',
      },
    },
  },
  plugins: [],
}

export default config
