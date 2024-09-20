本文主要介绍两个插件的使用，DllPlugin 和 DllReferencePlugin，使用DllPlugin和DllReferencePlugin提取公共插件提升打包效率。

### 一、介绍

**核心：将静态资源文件（运行依赖包）与业务代码源文件分开打包，先使用 DllPlugin 给静态资源打包，再使用 DllReferencePlugin 让源文件引用资源文件。**

在使用webpack进行打包时候，对于依赖的第三方库，比如vue，vuex等这些不会修改的依赖，我们可以让它和我们自己编写的代码分开打包，这样做的好处是每次更改我本地代码的文件的时候，webpack只需要打包我项目本身的文件代码，而不会再去编译第三方库，那么第三方库在第一次打包的时候只打包一次，以后只要我们不升级第三方包的时候，那么webpack就不会对这些库去打包，这样的可以快速的提高打包的速度。因此为了解决这个问题，`DllPlugin` 和 `DllReferencePlugin`插件就产生了。

那么对于目前webpack社区来讲，我们希望和自己编写的代码分离开的话，webpack社区提供了2种方案：

1、**CommonsChunkPlugin**
2、**DLLPlugin**
CommonsChunkPlugin 插件每次打包的时候还是会去处理一些第三方依赖库，只是它能把第三方库文件和我们的代码分开掉，生成一个独立的js文件。但是它还是不能提高打包的速度。在vue3.x的vue.config配置文件中我们可以从官网找到optimization的配置，此配置很实用，具体的操作这里就不介绍，可官网查看optimization配置

`DLLPlugin` 它能把第三方库代码分离开，并且每次文件更改的时候，它只会打包该项目自身的代码。所以打包速度会更快。

`DLLPlugin` 这个插件是在一个额外独立的`webpack`设置中创建一个只有dll的bundle，也就是说我们在项目根目录下除了有webpack.config.js，还会新建一个`webpack.dll.config.js`文件。`webpack.dll.config.js`作用是把所有的第三方库依赖打包到一个bundle的dll文件里面，还会生成一个名为 `manifest.json`文件。
该`manifest.json`的作用是用来让 `DllReferencePlugin` 映射到相关的依赖上去的。

`DllReferencePlugin` 这个插件是在`webpack.config.js`中使用的，该插件的作用是把刚刚在`webpack.dll.config.js`中打包生成的dll文件引用到需要的预编译的依赖上来。什么意思呢？就是说在`webpack.dll.config.js`中打包后比如会生成 `vendor.dll.js`文件和`vendor-manifest.json`文件，`vendor.dll.js`文件包含所有的第三方库文件，vendor-manifest.json文件会包含所有库代码的一个索引，当在使用`webpack.config.js`文件打包`DllReferencePlugin`插件的时候，会使用该`DllReferencePlugin`插件读取`vendor-manifest.json`文件，看看是否有该第三方库。`vendor-manifest.json`文件就是有一个第三方库的一个映射而已。

所以说 第一次使用 `webpack.dll.config.js` 文件会对第三方库打包，打包完成后就不会再打包它了，然后每次运行 `webpack.config.js`文件的时候，都会打包项目中本身的文件代码，当需要使用第三方依赖的时候，会使用 `DllReferencePlugin`插件去读取第三方依赖库。所以说它的打包速度会得到一个很大的提升

### 二、DllPlugin配置

配置`DllPlugin`、`DllReferencePlugin`成功后，项目目录结构如下：

![17268035656285](https://github.com/WeiShuaiDev/webpack-vue-demo/blob/main/screenshots/17268035656285.png?raw=true)

项目中主要引入`dependencies`中第三方插件主要要有`axios`、`element-plus`、`vue`、`vue-router`、`vuex`，在插件没有变化的话，使用commonChunkPlugin插件打包出来的vendor.js文件基本不会有变化，我们完全可以把此处使用到的代码提取出来，这样打包就能减少很多时间。
 在此之前，我们先执行下`npm run build`看看打包出的文件大小和时长。

![17268030121707](https://github.com/WeiShuaiDev/webpack-vue-demo/blob/main/screenshots/17268030121707.png?raw=true)

可以看出，使用`commonChunkPlugin`打包项目代码花了大概**6075ms**，可以发现项目在引入少量插件情况下，就需要怎么长时间，所以对大项目还是很有必要对打包优化，接下来我们对项目进行改造，使用`DllPlugin`和`DllReferencePlugin`，看看在同等引入第三方插件情况下，到底能减少多少时间？

在`build`目录下新建`webpack.dll.conf.js`文件，里面内容如下：

```javascript
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
    filename: "[name].dll.js",  // 打包后的文件名 vendor.dll.js
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

```

`webpack.dll.conf.js`文件使用了`clean-webpack-plugin`插件，先通过npm命令安装：

```javascript
npm install -D clean-webpack-plugin
```

下载成功后，可以在`package.json`文件下`devDependencies`看到对应模块。

package.json文件添加`npm run dll`命令如下:

```javascript
"dll": "webpack --config ./webpack.dll.conf.js"
```

运行`npm run dll`命令结果如下：

![17268025586188](https://github.com/WeiShuaiDev/webpack-vue-demo/blob/main/screenshots/17268025586188.png?raw=true)

在public文件夹下的vendor文件夹发现有个vendor.dll.js、vendor-mainfest.json文件，说明已经执行成功了。

![17268026638280](https://github.com/WeiShuaiDev/webpack-vue-demo/blob/main/screenshots/17268026638280.png?raw=true)

可以看出，使用`DllPlugin`打包项目代码花了大概**2023ms**

### 三、DllReferencePlugin配置

直接在根目录下的`vue.config.js`文件进行配置，里面内容如下：

```javascript
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

```

`vue.config.js`文件使用了`add-asset-html-webpack-plugin`插件，先通过npm命令安装：

```javascript
npm install -D add-asset-html-webpack-plugin
```

下载成功后，可以在`package.json`文件下`devDependencies`看到对应模块。

为社么要使用改插件？就是解决以前在vue-cli2项目需要单独对每个html模板添加script标签，引入vendor.dll.js文件

```javascript
<script type='text/javascript' src='./public/vendor/vendor.dll.js'></script>
```

和在.conf.js文件去掉CommonChunkPlugin生成vendor.js和manifest.js文件的配置注释或者删除。

```javascript
// new webpack.optimize.CommonsChunkPlugin({
//   name: 'vendor',
//   minChunks (module) {
//     // any required modules inside node_modules are extracted to vendor
//     return (
//       module.resource &&
//       /\.js$/.test(module.resource) &&
//       module.resource.indexOf(
//         path.join(__dirname, '../node_modules')
//       ) === 0
//     )
//   }
// }),

// new webpack.optimize.CommonsChunkPlugin({
//   name: 'manifest',
//   minChunks: Infinity
// }),
```

然后添加plugins：

```javascript
  new webpack.DllReferencePlugin({
    manifest: require(path.resolve(__dirname, './.public/vendor/vendor-manifest.json'))
  }),
```

其实就是手动在页面引入第三方插件，为了方便使用，可以在`vue.config.js`配置成自动化注入。

到这里就针对DllPlugin 和 DllReferencePlugin所有配置就结束了，直接执行`npm run build`，会生成一个dist文件，同时发现编译打包速度比以前快很多，刚开始**6075ms**优化后为**2023ms** ，差不多提升了一半。

### 四、参考资料

[vue-cli3中webpack.dll打包优化](https://juejin.cn/post/6844904166280658952)

[webpack使用DllPlugin和DllReferencePlugin提取公共插件提升打包效率](https://www.jianshu.com/p/deedd775eec3)

[使用DllPlugin优化webpack打包性能（基于vue-cli）](https://segmentfault.com/a/1190000022542862)

[vue webpack打包优化操作技巧](
