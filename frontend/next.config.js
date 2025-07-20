/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  
  // NO PROXY REWRITES - Direct connection to EC2
  // Removed all rewrites to force direct API calls to EC2
  
  // Environment variables for API endpoints - ALWAYS use EC2 IP
  env: {
    NEXT_PUBLIC_API_BASE_URL: `http://${process.env.NEXT_PUBLIC_API_HOST || '54.224.133.45'}`,
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