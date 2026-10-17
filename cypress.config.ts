import { defineConfig } from "cypress";
import path from 'path'

export default defineConfig({
    component: {
        devServer: {
            framework: "react",
            bundler: "vite",
            viteConfig: {
                optimizeDeps: {
                    rolldownOptions: {
                        // osh-js 3.1.5 contains legacy named imports that are
                        // supplied by its runtime modules instead of ESM exports.
                        shimMissingExports: true,
                    },
                },
                resolve: {
                    alias: {
                        '@': path.resolve(__dirname, './src'),
                    }
                },
            },
        },
    },

    e2e: {
        baseUrl: 'http://100.94.197.23:8282',
        setupNodeEvents(on, config) {
            // implement node event listeners here
        },
        experimentalRunAllSpecs: true,
        testIsolation: false,
        viewportWidth: 1280,
        viewportHeight: 720,
    },
});
