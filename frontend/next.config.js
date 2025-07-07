/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  
  // API proxy configuration for RAG pipeline
  async rewrites() {
    return {
      beforeFiles: [
        // Proxy RAG API requests to avoid CORS in development
        {
          source: '/api/embedding/:path*',
          destination: process.env.NODE_ENV === 'production' 
            ? 'https://3.234.222.18:8810/:path*'
            : 'http://localhost:8810/:path*'
        },
        {
          source: '/api/reranking/:path*',
          destination: process.env.NODE_ENV === 'production'
            ? 'https://3.234.222.18:8811/:path*' 
            : 'http://localhost:8811/:path*'
        },
        {
          source: '/api/geogpt/:path*',
          destination: process.env.NODE_ENV === 'production'
            ? 'https://3.234.222.18:8812/:path*'
            : 'http://localhost:8812/:path*'
        }
      ]
    }
  },
  
  // Environment variables for API endpoints
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NODE_ENV === 'production' 
      ? 'https://3.234.222.18'
      : 'http://localhost',
    NEXT_PUBLIC_EMBEDDING_PORT: '8810',
    NEXT_PUBLIC_RERANKING_PORT: '8811',
    NEXT_PUBLIC_GEOGPT_PORT: '8812'
  },
  
  // Build optimization
  swcMinify: true,
  poweredByHeader: false,
  
  // Image optimization (if needed for maps/charts)
  images: {
    domains: ['localhost', '3.234.222.18'],
    formats: ['image/webp', 'image/avif']
  },
  
  // Headers for security and CORS
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig 