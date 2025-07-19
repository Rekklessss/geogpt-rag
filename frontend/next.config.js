/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  
  // API proxy configuration for RAG pipeline
  async rewrites() {
    // Get API host from environment variable, fallback to hardcoded IP
    const apiHost = process.env.NEXT_PUBLIC_API_HOST || '54.224.133.45'
    const apiProtocol = process.env.NEXT_PUBLIC_API_PROTOCOL || 'https'
    const embeddingPort = process.env.NEXT_PUBLIC_EMBEDDING_PORT || '8810'
    const rerankingPort = process.env.NEXT_PUBLIC_RERANKING_PORT || '8811' 
    const geogptPort = process.env.NEXT_PUBLIC_GEOGPT_PORT || '8812'
    
    return {
      beforeFiles: [
        // Proxy RAG API requests to avoid CORS in development
        {
          source: '/api/embedding/:path*',
          destination: process.env.NODE_ENV === 'production' 
            ? `${apiProtocol}://${apiHost}:${embeddingPort}/:path*`
            : `http://localhost:${embeddingPort}/:path*`
        },
        {
          source: '/api/reranking/:path*',
          destination: process.env.NODE_ENV === 'production'
            ? `${apiProtocol}://${apiHost}:${rerankingPort}/:path*` 
            : `http://localhost:${rerankingPort}/:path*`
        },
        {
          source: '/api/geogpt/:path*',
          destination: process.env.NODE_ENV === 'production'
            ? `${apiProtocol}://${apiHost}:${geogptPort}/:path*`
            : `http://localhost:${geogptPort}/:path*`
        }
      ]
    }
  },
  
  // Environment variables for API endpoints
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NODE_ENV === 'production' 
      ? `${process.env.NEXT_PUBLIC_API_PROTOCOL || 'https'}://${process.env.NEXT_PUBLIC_API_HOST || '54.224.133.45'}`
      : 'http://localhost',
    NEXT_PUBLIC_EMBEDDING_PORT: process.env.NEXT_PUBLIC_EMBEDDING_PORT || '8810',
    NEXT_PUBLIC_RERANKING_PORT: process.env.NEXT_PUBLIC_RERANKING_PORT || '8811',
    NEXT_PUBLIC_GEOGPT_PORT: process.env.NEXT_PUBLIC_GEOGPT_PORT || '8812'
  },
  
  // Build optimization
  swcMinify: true,
  poweredByHeader: false,
  
  // Image optimization (if needed for maps/charts)
  images: {
    domains: [
      'localhost', 
      process.env.NEXT_PUBLIC_API_HOST || '54.224.133.45'
    ],
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