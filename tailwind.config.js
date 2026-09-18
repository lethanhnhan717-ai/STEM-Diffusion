/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./stem_khu_ch_t_n.tsx"
  ],
  theme: {
    extend: {
      colors: {
        coral: '#FF6B6B',
        teal: '#4ECDC4',
      }
    },
  },
  plugins: [],
}
