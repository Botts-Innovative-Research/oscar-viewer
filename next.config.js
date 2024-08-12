/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */
module.exports = {

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
    }
}