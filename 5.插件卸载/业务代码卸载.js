
const swInitFn = () => {
  // 可以自定义一些其他的条件，方便在符合情况时才注册
  const otherReason = true;
  // 是否存在serviceWorker
  const hasSw = 'serviceWorker' in navigator;
  window.addEventListener('load', async () => {
    if (hasSw && otherReason) {
      // 注册SW  
    } else {
      // 删除Cache内容
      const cacheKeys = await caches.keys();
      cacheKeys?.length > 0 && cacheKeys.forEach((key) => caches.delete(key));

      // 注销SW
      const registrations = await navigator.serviceWorker.getRegistrations();
      registrations?.length > 0 &&
        registrations.forEach((sw) => typeof sw.unregister === 'function' && sw.unregister());   
      }
  });
};