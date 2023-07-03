// 该文件的路径，对应了【配置文件注册】中，swSrc的位置，源码相对路径即可
// 注意：【self.__WB_MANIFEST】只能出现一次，包括注释里
// 这里只是做个说明，如果实际也是这样的话，构建会报错，提示多实例

// 这里做一个简单的静态资源预缓存
import { precacheAndRoute } from 'workbox-precaching/precacheAndRoute';

const MAINFEST = self.__WB_MANIFEST;

if (MAINFEST) {
  console.log('MAINFEST', MAINFEST);
}

const registerPrecache = () => {
  precacheAndRoute(MAINFEST.filter((i) => i.url.endsWith('js') || i.url.endsWith('css') || i.url.endsWith('png')));
};

const run = async () => {
  //这个方法后续会说明
  self.skipWaiting();
  registerPrecache();
};

run();