const path = require("path");
const webpack = require("webpack");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
/* 将特定的类库提前打包然后引入，不但能够极大减少打包时间，
也实现了将公共代码抽离成单独文件的优化方案，可以很大程度的减小打包之后的文件体积。 */
// dll文件存放的目录(建议存放到public中)
const dllPath = "./public/vendor";
module.exports = {
  // 如果这些类库有版本更新了（一般很少更新），就需要重新执行 npm run dll 打包类库，再执行 npm run build 打包项目上线
  // 这里用 vendor 作为 key 值表示后文用到的 [name] ，后续生成的打包文件就为 vendor-manifest.json  vendor.dll.js
  entry: {
    vendor: ["vue", "vuex", "vue-router", "element-plus", "axios"],
  },
  output: {
    filename: "[name].dll.js", // 打包后的文件名 vendor.dll.js
    path: path.resolve(__dirname, dllPath), // 打包后文件输出的位置，放到项目根目录的 public/vendor 下
    // vendor.dll.js 中暴露出的全局变量名，主要是给 DllPlugin 中的 name 使用。
    // 所以这里需要和 webpack.DllPlugin 中的 name: '[name]_library', 保持一致。
    library: "[name]_[hash]",
  },
  plugins: [
    // 清除之前的dll文件
    new CleanWebpackPlugin(),
    // manifest.json描述动态链接库包含了哪些内容
    new webpack.DllPlugin({
      // 和 output.library 保持一致即可
      name: "[name]_[hash]",
      path: path.join(__dirname, dllPath, "[name]-manifest.json"),
      // manifest 文件中请求的上下文，默认为本文件的上下文
      context: process.cwd(),
    }),
  ],
};
