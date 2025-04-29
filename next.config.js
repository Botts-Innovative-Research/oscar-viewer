/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */
module.exports = {
    distDir: 'web',
    output: 'export',
    trailingSlash: true,
    webpack: (config, { isServer }) => {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
        }
        config.module.rules.push({
            test: /\.worker\.js$/,
            use: { loader: 'worker-loader' },
        });
        return config;
    },
    experimental: {
        missingSuspenseWithCSRBailout: false,
    },
    typescript: {
        // !! WARN !!
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        // !! WARN !!
        ignoreBuildErrors: true,
    },
    images: {
        unoptimized: true,
    },
    reactStrictMode: false,
}