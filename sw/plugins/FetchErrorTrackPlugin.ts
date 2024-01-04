import { WorkboxPlugin } from 'workbox-core';
import { logger } from 'workbox-core/_private/logger';
import { messages } from 'workbox-strategies/utils/messages';

import { IS_ONLINE } from '../constants';
import { postMessageToClient } from '../events/sw';
import { isRequestSuccess, getBizCode } from '../utils';

interface IOptions {
  statuses?: number[] | ((code: number) => boolean);
  includeApiBizError?: boolean;
}

export class FetchErrorTrackPlugin implements WorkboxPlugin {
  statuses: number[] | ((code: number) => boolean);
  includeApiBizError: boolean;
  constructor({ statuses, includeApiBizError }: IOptions = {}) {
    this.statuses = statuses ?? ((code): boolean => code < 400);
    this.includeApiBizError = includeApiBizError ?? false;
  }
  fetchDidSucceed: WorkboxPlugin['fetchDidSucceed'] = async ({ event, request, response, state }) => {
    if (
      (Array.isArray(this.statuses) && !this.statuses.includes(response.status)) ||
      (typeof this.statuses === 'function' && !this.statuses(response.status))
    ) {
      if (!IS_ONLINE) {
        logger.log(`Fetch ${request.url} but got wrong http code, slardar event is sw_fetch_http_error.`);
        messages.printFinalResponse(response);
      }
      postMessageToClient.slardarEvent(event.clientId, {
        name: 'apiError',
        categories: {
          path: request.url,
          originPath: event?.request?.url,

          http_code: String(response.status),

          log_id: response.headers.get('X-Tt-Logid') ?? '',
          sence: 'sw',
          type: 'http_error',
        },
      });
    } else if (this.includeApiBizError && !(await isRequestSuccess(response))) {
      const code = await getBizCode(response);
      if (!IS_ONLINE) {
        logger.log(`Fetch ${request.url} but got wrong biz code, slardar event is sw_fetch_biz_error.`);
        messages.printFinalResponse(response);
      }
      postMessageToClient.slardarEvent(event.clientId, {
        name: 'apiError',
        categories: {
          path: request.url,
          originPath: event?.request?.url,
          code: String(code),

          log_id: response.headers.get('X-Tt-Logid') ?? '',
          sence: 'sw',
          type: 'biz_error',
        },
      });
    }
    return response;
  };
  fetchDidFail: WorkboxPlugin['fetchDidFail'] = async ({ event, error, request, originalRequest, state }) => {
    if (!IS_ONLINE) {
      logger.log(`Fetch ${request.url} but failed, slardar event is sw_fetch_timeout.`);
    }
    postMessageToClient.slardarEvent(event.clientId, {
      name: 'apiError',
      categories: {
        path: request.url,
        originPath: event?.request?.url,
        sence: 'sw',
        type: 'timeout',
      },
    });
  };
}
