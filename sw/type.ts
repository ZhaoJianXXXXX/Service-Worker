import { slardarMonitor } from '../common/utils/slardar';
export interface IEventData<T> {
  type: string;
  message: T;
}

export type ISlardarEventData = IEventData<Parameters<typeof slardarMonitor.sendEvent>[0]>;

export type ISlardarEvent = MessageEvent<ISlardarEventData>;
export interface IResponseStruct {
  BaseResp?: {
    StatusCode: number;
    StatusMessage?: string;
    Prompts?: string;
  };
  baseResp?: {
    statusCode: number;
    statusMessage?: string;
  };
  [index: string]: unknown;
}
