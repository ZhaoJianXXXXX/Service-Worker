背景：
    浏览器检测到存在新的SW 时，安装并让它等待，同时触发 updatefound 事件，window 注册并触发【SW_UPDATE】事件
    业务代码中编写

// 第1步：业务代码-添加updatefound事件监听
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
          // 已经存在新的SW实例，直接注册并触发事件提示更新，触发emitUpdate
          if (reg.waiting) {
            emitUpdate();
            return;
          }
          // 若没有新的SW实例，则添加新实例事件
          reg.onupdatefound = (): void => {
            const installingWorker = reg?.installing;
            if (installingWorker) {
              // SW实例state change事件监听
              installingWorker.onstatechange = (): void => {
                // 如果新的SW实例安装成功，则通知刷新
                if (installingWorker.state === 'installed' && window?.navigator?.serviceWorker?.controller) {
                  emitUpdate();
                }
              };
            }
          };
        })
        .catch((err) => {
          // 注册失败回调
          console.error('Service Worker registration failed', err);
        });
    }
  });
};

// 第2步：业务代码-定义emitUpdate事件
const SW_UPDATE = 'SW_UPDATE';
const emitUpdate = () => {
  const event = new Event(SW_UPDATE);
  window.dispatchEvent(event);
};

// 第3步：业务代码-在SW更新后，Toast组件提示
const showToast = (): void => {
    Toast.info({
        content: (
        <div>
            <div>A new version of this page is available</div>
            <a className={styles.loadNew} onClick={handleToastClick}>
            LOAD NEW
            </a>
        </div>
        ),
        duration: 0,
    });
};
window.addEventListener(SW_UPDATE, showToast);

// 第4步：业务代码-点击LOAD NEW，触发handleToastClick
const handleToastClick = (): void => {
  try {
    if (window?.navigator?.serviceWorker) {
        window.navigator.serviceWorker.getRegistration().then(reg => {
            if (reg && reg.waiting) {
                reg.waiting.postMessage('skipWaiting');
            } else {
                throw new Error('no registration');
            }
        });
    }
  } catch (e) {
  }
};

// 第5步：sw注册文件-- SW收到skipwaiting 事件，执行skipWaiting ，移交控制权
const run = () => {
    self.addEventListener('message', (event) => {
        if (!event.data) {
            return;
        }
        if (event.data === 'skipWaiting') {
            self.skipWaiting();
        }
    });
    // ...
}
run();

// 第6步: 业务代码-移交控制权，触发controllerchange 事件，重新加载页面
const handleControllerChange = (() => {
    let refreshing = false;
    return (): void => {
        if (refreshing) {
            return;
        }
        refreshing = true;
        window.location.reload();
    };
})();
navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
