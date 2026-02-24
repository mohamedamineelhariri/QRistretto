/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    reactStrictMode: true,
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    },
    // Optimize for mobile
    images: {
        domains: ['localhost'],
        unoptimized: true,
    },
}

module.exports = nextConfig
