const path = require("path");
const HtmlPlugin = require("html-webpack-plugin");
const HtmlTagsPlugin = require("html-webpack-tags-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const {DefinePlugin} = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: "./src/index.tsx",
    output: {
        filename: "main.js",
        path: path.resolve(__dirname, "build"),
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.join(__dirname, "public", "index.html"),
            favicon: path.join(__dirname, "public/images", "opensensorhub.png")
        }),
        new DefinePlugin({
            // Define relative base path in cesium for loading assets
            BASE_URL: JSON.stringify('/')
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: "node_modules/cesium/Build/Cesium",
                    to: "cesium",
                },
            ],
        }),
        // new HtmlPlugin({
        //     template: "public/index.html",
        //     favicon: "public/images/opensensorhub.png"
        // }),
        new HtmlTagsPlugin({
            append: false,
            tags: ["cesium/Widgets/widgets.css", "cesium/Cesium.js"],
        }),
        new DefinePlugin({
            CESIUM_BASE_URL: JSON.stringify('cesium'),
        }),
        new CopyWebpackPlugin({
            patterns: [
                // {from: path.resolve(__dirname, 'src/public/images'), to: 'images'},
                // {from: path.resolve(__dirname, 'src/images'), to: 'images'},
                {from: path.resolve(__dirname, 'src/assets'), to: 'assets'},
            ]
        }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, "build"),
        },
        port: 3000,
    },
    module: {
        // exclude node_modules
        rules: [
            {
                test: /\.(js|jsx|tsx)$/,
                exclude: /node_modules/,
                use: ["babel-loader"],
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader',
                ]
            },
            // {
            //     test: /\.(glb|png|jpg|gif|svg|woff(2)?|ttf|eot)$/,
            //     loader: 'file-loader',
            //     options: {
            //         name: '[name].[ext]?[hash]',
            //         plugins: [CopyWebpackPlugin]
            //     }
            // },
            {
                test: /\.(png|svg|jpg|gif)$/,
                loader: 'file-loader',
                options: {
                    name: '[name].[ext]',
                    outputPath: 'media',
                    plugins: [CopyWebpackPlugin]
                },
            },
            {
                test: /\.(glb|gltf)$/,
                use:
                    [
                        {
                            loader: 'file-loader',
                            options:
                                {
                                    outputPath: 'assets/models/'
                                }
                        }
                    ]
            },
            {
                test: /\.(svg)$/,
                use:
                    [
                        {
                            loader: 'file-loader',
                            options:
                                {
                                    outputPath: 'components/icons/'
                                }
                        }
                    ]
            },
            {
                test: /\.worker\.js$/,
                use: { loader: 'worker-loader', options: { filename: 'Worker.[chunkhash].js' } }

            },
        ],
    },
    // pass all js files through Babel
    resolve: {
        modules: [
            path.resolve(__dirname, 'node_modules'),
        ],
        extensions: ["*", ".js", ".jsx", ".tsx"],    // <-- added `.jsx` here
        fallback: {
            "url": require.resolve("url/"),
            "zlib": require.resolve("browserify-zlib"),
            "https": require.resolve("https-browserify"),
            "http": require.resolve("stream-http"),
            "buffer": require.resolve("buffer/"),
            "assert": require.resolve("assert/"),
            "util": require.resolve("util/"),
            "stream": require.resolve("stream-browserify")
        }
    }
};