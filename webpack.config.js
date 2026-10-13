const path = require('path');

module.exports = {
    mode: "production",
    entry: {
        loader: path.resolve(__dirname, "src", "loader.ts"),
        chessmint: path.resolve(__dirname, "src", "chessmint.ts"),
        options: path.resolve(__dirname, "src", "options.ts"),
    },
    output: {
        path: path.resolve(__dirname, "dist", "js"),
        filename: "[name].js",
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
};