/* eslint-disable no-undef */
const path = require("path");
const devCerts = require("office-addin-dev-certs");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const DEV_URL = "https://localhost:3000/";

module.exports = async (env, argv) => {
  const dev = argv.mode !== "production";
  // Production builds point the manifest at wherever dist/ will be hosted.
  let prodUrl = process.env.ADDIN_BASE_URL || "https://localhost:3000/";
  if (!prodUrl.endsWith("/")) prodUrl += "/";
  const harness = !!(env && env.harness);
  const serving = !!(env && env.WEBPACK_SERVE);

  const entry = {
    taskpane: "./src/taskpane/taskpane.ts",
    commands: "./src/commands/commands.ts",
  };
  const pages = [
    new HtmlWebpackPlugin({
      filename: "taskpane.html",
      template: "./src/taskpane/taskpane.html",
      chunks: ["taskpane"],
    }),
    new HtmlWebpackPlugin({
      filename: "commands.html",
      template: "./src/commands/commands.html",
      chunks: ["commands"],
    }),
  ];
  if (harness) {
    entry.harness = "./src/harness/harness.ts";
    pages.push(
      new HtmlWebpackPlugin({ filename: "harness.html", template: "./src/harness/harness.html", chunks: ["harness"] })
    );
  }

  return {
    devtool: dev ? "source-map" : false,
    entry,
    output: {
      path: path.resolve(__dirname, harness ? "test-build" : "dist"),
      filename: dev ? "[name].js" : "[name].[contenthash].js",
      chunkFilename: dev ? "[name].js" : "[name].[contenthash].js",
      publicPath: "auto",
      clean: true,
    },
    resolve: { extensions: [".ts", ".js", ".mjs"] },
    module: {
      rules: [
        { test: /\.ts$/, exclude: /node_modules/, use: "ts-loader" },
      ],
    },
    performance: { hints: false },
    plugins: [
      ...pages,
      new CopyWebpackPlugin({
        patterns: [
          { from: "assets/*.png", to: "assets/[name][ext]" },
          { from: "src/taskpane/taskpane.css", to: "taskpane.css" },
          {
            from: "manifest.xml",
            to: "manifest.xml",
            transform: (content) =>
              dev
                ? content
                : content
                    .toString()
                    .split(DEV_URL)
                    .join(prodUrl)
                    .split(new URL(DEV_URL).origin)
                    .join(new URL(prodUrl).origin),
          },
        ],
      }),
    ],
    devServer: {
      port: Number(process.env.npm_package_config_dev_server_port || 3000),
      headers: { "Access-Control-Allow-Origin": "*" },
      server: { type: "https", options: serving ? await devCerts.getHttpsServerOptions() : {} },
      static: { directory: path.resolve(__dirname, "dist") },
    },
  };
};
