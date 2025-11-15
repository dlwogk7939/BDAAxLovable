/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#1F4EF5',
        brandMedium: '#4880EE',
        brandLight: '#83B4F9',
        backgroundSoft: '#F7F8FA',
        surface: '#FFFFFF',
        textPrimary: '#111827',
        textSecondary: '#6B7280',
        danger: '#EF4444',
        success: '#10B981',
      },
      fontFamily: {
        sans: [
          'Pretendard',
          'SUIT',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        lg: '24px',
        md: '16px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 15px 35px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
}
