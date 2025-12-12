/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {},
  
  // Настройка для работы с CommonJS модулями
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
