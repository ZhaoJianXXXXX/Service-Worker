import { registerEventsFromSw } from './events/client';

// sw init 初始化
export function swInitFn(): void {
  if ('serviceWorker' in navigator && location.host.includes('arena')) {
    registerEventsFromSw();
  }
}
