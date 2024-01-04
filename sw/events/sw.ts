import { trafficConfigStore } from 'sw/configStore';
import { swIndexDB } from 'sw/indexDB';

import { SW_EVENTS, NET_FIRST_REQUESTS, STALE_WHILE_REVALIDATE_REQUESTS } from '../constants';
import { IEventData, ISlardarEventData } from '../type';

// 通信到 clients
async function postToClient<T>({ clientId, data }: { clientId: string; data: IEventData<T> }): Promise<void> {
  const client = await self.clients.get(clientId);
  // 向指定客户端发送消息
  client?.postMessage?.(data);
}

function logEventFromClient(event: MessageEvent<IEventData<unknown>>): void {
  const { type } = event.data;
  if (type === SW_EVENTS.LOGOUT || type === SW_EVENTS.TO_LOGIN) {
    void caches.delete(NET_FIRST_REQUESTS.CACHE_NAME);
    void caches.delete(STALE_WHILE_REVALIDATE_REQUESTS.CACHE_NAME);
  }
}

function swTccEventFromClient(event: MessageEvent<IEventData<unknown>>): void {
  const { type, message = {} } = event.data;
  if (type === SW_EVENTS.SW_TCC) {
    const { swTrafficConfig } = message;
    try {
      void swIndexDB.put('swTrafficConfig', { ...swTrafficConfig });
    } catch (e) {
      console.error('===swIndexDB===', e);
    }
  }
}

async function pageLoadEventFromClient(event: MessageEvent<IEventData<unknown>>): Promise<void> {
  const { type } = event.data;
  if (type === SW_EVENTS.PAGE_LOAD) {
    const configValue = await swIndexDB.get('swTrafficConfig');
    trafficConfigStore.updateConfig({ configValue });
  }
}

export const postMessageToClient = {
  slardarEvent(clientId: string, message: ISlardarEventData['message']): void {
    void postToClient({
      clientId,
      data: {
        type: SW_EVENTS.SLARDAR_EVENT,
        message,
      },
    });
  },
};

export function registerEventsFromClient(): void {
  self.addEventListener('message', (event: MessageEvent<IEventData<unknown>>) => {
    logEventFromClient(event);
    swTccEventFromClient(event);
    void pageLoadEventFromClient(event);
  });
}
