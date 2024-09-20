const webpack = require('webpack');
const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin');
const path = require('path');
// 这些代码就是dll优化的代码
const dllReference = (config) => {
  config.plugin('vendorDll')
    .use(webpack.DllReferencePlugin, [{
      context: __dirname,
      manifest: require('./public/vendor/vendor-manifest.json')
    }]);
  // 这里是把相关文件引用入到html模板中
  config.plugin('addAssetHtml')
    .use(AddAssetHtmlPlugin, [
      [
        {
          filepath: require.resolve(path.resolve(__dirname, 'public/vendor/vendor.dll.js')),
          outputPath: 'vendor',
          publicPath: 'vendor'
        }
      ]
    ])
    .after('html')
};

module.exports = {
  chainWebpack: (config) => {
    if (process.env.NODE_ENV === 'production') { // 这里区分下，只有生产环境才需要用到
      dllReference(config)
    }
  }
};
