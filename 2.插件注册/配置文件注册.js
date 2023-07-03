配置文件中进配置（webpack.config.js）
- plugins或者raw均可
- publicPath确保是string类型，否则需要使用一些黑科技

// 假设publicPath是function形式
const cdnIndex = 0;
const publicPath = () => (isProd ? `xxx/yyy/${cdnIndex++}` : '/');
// 定义该变量的toString方法，这样在workbox源码内部做字符串相加的时候会使用方法执行后的返回字符串
publicPath.toString = () => publicPath();


import { InjectManifest } from 'workbox-webpack-plugin';

// plugins或者raw模式均可添加
export default config({
  // ...
  raw: (options) => {
    //...
    options.plugins.push(
      new InjectManifest({
        // 注册文件的原始文件，在此文件中编写了注册需要的全部代码. 
        swSrc: path.resolve(__dirname, './sw.js'),
        // 目标文件，编译后注册文件的位置
        swDest: 'sw.js',
        maximumFileSizeToCacheInBytes: 1000000000,
        // mode?: "none" | "development" | "production";
        // development 模式下会开启debug 
        mode: isProd ? 'production' : 'development'
      }),
    );
    return options;
  },
  // ...
})