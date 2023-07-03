// 在项目初始化时
// 或者在项目的模板文件中
// 新增代码片段

const swInitFn = (): void => {
  // 可以自定义一些其他的条件，方便在符合情况时才注册
  const otherReason = true;
  // 是否存在serviceWorker
  const hasSw = 'serviceWorker' in navigator;
  window.addEventListener('load', async () => {
    if (hasSw && otherReason) {
      navigator.serviceWorker
        // 此处路径为产物的相对路径，不同项目可根据产物路径做调整 
        // 文件名称需要与【配置文件注册】中swDest制定值相同
        .register('/sw.js')
        .then((reg) => {
          // 注册成功回调
          console.log('Service Worker registration success', reg);
        })
        .catch((err) => {
          // 注册失败回调
          console.error('Service Worker registration failed', err);
        });
    }
  });
};