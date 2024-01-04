import { sendEvent } from '../../common/utils/slardar';
import { SW_EVENTS } from '../constants';
import { ISlardarEvent } from '../type';

/* 通信到 sw */
function logoutToSw(): void {
  navigator?.serviceWorker?.controller?.postMessage?.({
    type: SW_EVENTS.LOGOUT,
  });
}

function toLoginToSw(): void {
  navigator?.serviceWorker?.controller?.postMessage?.({
    type: SW_EVENTS.TO_LOGIN,
  });
}
/* \通信到 sw */

/* 处理 sw 消息 */
function slardarEventFromSw(event: ISlardarEvent): void {
  const { type, message } = event.data;
  if (type === SW_EVENTS.SLARDAR_EVENT) {
    // 不需要传 module，默认上报至 client
    sendEvent(message);
  }
}
/* \处理 sw 消息 */

export const postMessageToSw = {
  logout: logoutToSw,
  toLogin: toLoginToSw,
};

export function registerEventsFromSw(): void {
  navigator?.serviceWorker?.addEventListener?.('message', (event) => {
    slardarEventFromSw(event);
  });
}
