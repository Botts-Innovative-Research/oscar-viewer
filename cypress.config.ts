import { defineConfig } from "cypress";
import webpack from "@cypress/webpack-dev-server";
// @ts-ignore
import path from 'path'

export default defineConfig({
    component: {
        devServer: {
            framework: "react",
            bundler: "webpack",
            webpackConfig: {
                resolve: {
                    extensions: [".ts", ".tsx", ".js", ".jsx"],
                    alias: {
                        '@': path.resolve(__dirname, './src'),
                    }
                },
                module: {
                    rules: [
                        {
                            test: /\.(ts|tsx|js|jsx)$/,
                            exclude: /node_modules/,
                            use: [
                                {
                                    loader: "babel-loader",
                                },
                            ],
                        },
                        {
                            test: /\.css$/,
                            use: ["style-loader", "css-loader"],
                        },
                    ],
                },
            },
        },
    },

    e2e: {
        baseUrl: 'http://localhost:3000',
        setupNodeEvents(on, config) {
            // implement node event listeners here
        },
        testIsolation: false,
    },
});
