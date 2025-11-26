/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack config ekleyelim
  turbopack: {},
  // Webpack config ile bazı modülleri ignore et
  webpack: (config, { isServer }) => {
    // Bazı optional dependency'leri ignore et
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    return config;
  },
}

module.exports = nextConfig
