背景：
既然已经安装了新的 SW，则表示老的 SW 已经过时，因此可以推断使用老的 SW 处理过的页面也已经过时。
我们要做的是让页面从头到尾都让新的 SW 处理，就能够保持一致，也能达成我们的需求了

在注册sw的地方，而不是sw里面

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
    });

    - 当发现控制自己的 SW 已经发生了变化，那就刷新自己，让自己从头到尾都被新的 SW 控制，就一定能保证数据的一致性。
    - 道理是对，但突然的更新会打断用户的操作，可能会引发不适。
    - 刷新的源头在于 SW 的变更；SW 的变更又来源于浏览器安装新的 SW 碰上了 skipWaiting，所以这次刷新绝大部分情况会发生在加载页面后的几秒内。
    - 用户刚开始浏览内容或者填写信息就遇上了莫名的刷新，可能会砸键盘

另外需要注意：

    简单的切换页面或者刷新是不能使得 SW 进行更新的

    1.刷新不能使得 SW 发生更新，即老的 SW 不会退出，新的 SW 也不会激活
    2.这个方法是通过 skipWaiting 迫使 SW 新老交替。在交替完成后，通过 controllerchange 监听到变化再执行刷新。

    所以两者的因果是相反的，并不矛盾。

避免无限刷新
在使用 Chrome Dev Tools 的 Update on Reload 功能时，使用如上代码会引发无限的自我刷新。
为了弥补这一点，需要添加一个 flag 判断一下，如下：

const handleControllerChange = (() => {
    let refreshing = false;
    return () => {
      if (refreshing) {
        return;
      }
      refreshing = true;
      window.location.reload();
    };
})();

navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
  

