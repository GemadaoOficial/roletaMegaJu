/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                dark: '#0d0d0d',
                primary: '#646cff', // Start with Vite's purple or a generic one
                secondary: '#535bf2',
            },
        },
    },
    plugins: [],
}
