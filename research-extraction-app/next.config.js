/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    }
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
  async headers() {
    return [
      {
        source: '/research-extraction',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com",
              "connect-src 'self' https://huggingface.co https://*.huggingface.co https://raw.githubusercontent.com https://*.clerk.accounts.dev https://*.clerk.com",
              "img-src 'self' data: https://*.clerk.com",
              "style-src 'self' 'unsafe-inline'",
              "worker-src 'self' blob:",
              "font-src 'self' data:"
            ].join('; ')
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
