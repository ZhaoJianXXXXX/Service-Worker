import { logger } from 'workbox-core/_private/logger';
import { StrategyHandler, NetworkFirstOptions } from 'workbox-strategies';
import { NetworkFirst } from 'workbox-strategies/NetworkFirst';
import { messages } from 'workbox-strategies/utils/messages';

import { IS_ONLINE } from '../constants';
import { isRequestSuccess } from '../utils';

interface NetworkFirstKeepStatuesOptions extends NetworkFirstOptions {
  statuses?: number[] | ((code: number) => boolean);
  checkApiBizError?: boolean;
  ignoreBizErrorCodes?: number[];
}
export class NetworkFirstKeepStatues extends NetworkFirst {
  statuses: number[] | ((code: number) => boolean);
  checkApiBizError: boolean;
  ignoreBizErrorCodes: number[];
  constructor(options: NetworkFirstKeepStatuesOptions = {}) {
    super(options);
    this.statuses = options.statuses ?? ((code: number): boolean => code < 400);
    this.checkApiBizError = options.checkApiBizError ?? false;
    this.ignoreBizErrorCodes = options.ignoreBizErrorCodes ?? [];
  }

  async _handle(request: Request, handler: StrategyHandler): Promise<Response> {
    const response: Response = await super._handle(request, handler);
    const httpFail =
      (Array.isArray(this.statuses) && !this.statuses.includes(response.status)) ||
      (typeof this.statuses === 'function' && !this.statuses(response.status));
    const bizFail = this.checkApiBizError && !(await isRequestSuccess(response, this.ignoreBizErrorCodes));
    const fail = httpFail || bizFail;

    if (fail) {
      const cacheResponse = await handler.cacheMatch(request);
      if (!IS_ONLINE) {
        logger.groupCollapsed(messages.strategyStart(this.constructor.name, request));
        logger.log(cacheResponse ? 'Return cache Response.' : 'No available cache Response.');
        messages.printFinalResponse(cacheResponse ?? response);
        logger.groupEnd();
      }
      try {
        void response
          .clone()
          .json()
          .then((res: unknown) => {
            console.error(`[NetworkFirstKeepStatues _handle error]: url is ${request.url}, response is`, response, res);
          });
      } catch (e) {}
      return cacheResponse ?? response;
    }
    return response;
  }
}
