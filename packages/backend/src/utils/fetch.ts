import { C3vkMode } from '@/shared/c3vk';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { config } from '@/config';
import { logger } from '@/lib/logger';
import { UnrecoverableError } from 'bullmq';

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36';

const axiosConfig: AxiosRequestConfig = {
    maxRedirects: 0,
    validateStatus: () => true
};

function handleRequestError(err: any): never {
    const code = err.code;
    const msg = err.message || '';
    if (
        code === 'ECONNABORTED' ||
        code === 'ETIMEDOUT' ||
        code === 'ECONNREFUSED' ||
        code === 'ECONNRESET' ||
        msg.includes('timeout')
    ) {
        throw new Error('Network timeout or connection error: ' + code);
    }
    throw new UnrecoverableError(err.message || 'Unknown network error');
}

function mergeSetCookieToHeaders(response: AxiosResponse, headers: Record<string, string>) {
    const setCookie: string[] | undefined = response.headers['set-cookie'];
    if (!setCookie) return;
    const existingCookies = headers['Cookie']
        ? headers['Cookie'].split('; ').reduce(
              (acc, cur) => {
                  const parts = cur.split('=');
                  if (parts.length >= 2) {
                      const k = parts[0];
                      const v = parts.slice(1).join('=');
                      acc[k] = v;
                  }
                  return acc;
              },
              {} as Record<string, string>
          )
        : {};

    setCookie.forEach(cookieStr => {
        const [cookiePair] = cookieStr.split(';');
        const parts = cookiePair.split('=');
        if (parts.length >= 2) {
            const k = parts[0];
            const v = parts.slice(1).join('=');
            existingCookies[k] = v;
        }
    });

    headers['Cookie'] = Object.entries(existingCookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
}

async function handleLegacyC3VK(
    response: AxiosResponse,
    url: string,
    headers: Record<string, string>,
    timeout: number
): Promise<AxiosResponse> {
    if (typeof response.data === 'string') {
        const m = response.data.match(/C3VK=([a-zA-Z0-9]+);/);
        if (m) {
            const c3vkValue = m[1];
            const newCookie = headers['Cookie'] ? `${headers['Cookie']}; C3VK=${c3vkValue}` : `C3VK=${c3vkValue}`;
            const newHeaders = { ...headers, Cookie: newCookie };
            logger.debug({ url, c3vk: c3vkValue }, 'Detected Legacy C3VK token, retrying request');
            return await axios.get(url, {
                ...axiosConfig,
                headers: newHeaders,
                timeout
            });
        }
    }
    return response;
}

/**
 * Fetch a page with C3VK handling.
 * @param url URL to fetch
 * @param mode C3VK mode
 * @param cookie Cookie object
 * @returns Page content as string
 */
export async function fetch(url: string, mode: C3vkMode, cookie?: Record<string, string>): Promise<any> {
    const timeout = config.network.timeout;

    const headers: Record<string, string> = {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json; charset=UTF-8',
        'x-luogu-type': 'content-only',
        'x-lentille-request': 'content-only',
        ...(cookie
            ? {
                  Cookie: Object.entries(cookie)
                      .map(([k, v]) => `${k}=${v}`)
                      .join('; ')
              }
            : {})
    };

    logger.debug({ url, mode }, 'Fetching the page');
    let resp: AxiosResponse;
    try {
        resp = await axios.get(url, {
            ...axiosConfig,
            headers,
            timeout
        });
    } catch (err: any) {
        handleRequestError(err);
    }
    if (mode === C3vkMode.LEGACY) {
        resp = await handleLegacyC3VK(resp, url, headers, timeout);
    }
    if (mode === C3vkMode.MODERN && resp.status === 302 && resp.headers.location) {
        mergeSetCookieToHeaders(resp, headers);
        logger.debug(
            {
                url,
                location: resp.headers.location,
                status: resp.status
            },
            'Detected New C3VK redirect, merging cookies and retrying'
        );
        try {
            resp = await axios.get(url, {
                ...axiosConfig,
                headers,
                timeout
            });
        } catch (err: any) {
            handleRequestError(err);
        }
    }
    logger.debug({ url, status: resp.status }, 'Page fetch completed');
    if (resp.status === 401) {
        logger.warn(
            { url, cookie: headers['Cookie'] },
            "Can't fetch the page. Is the cookie expired? Received 401 Unauthorized."
        );
        throw new UnrecoverableError('Unauthorized fetch');
    }
    const data = resp.data;
    try {
        return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (err) {
        throw new UnrecoverableError('Failed to parse response JSON');
    }
}
