import nodefetch from 'node-fetch';

export { AbortError } from 'node-fetch';

const { AbortController } = globalThis;
const defaultUserAgent =
  'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)';
// 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36';

export default async function fetch(url, args = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, args.timeout || 5000);
  args.headers = args.headers || {};
  args.headers['user-agent'] = args.headers['user-agent'] || defaultUserAgent;
  args.signal = controller.signal;

  try {
    return await nodefetch(url, args);
  } catch (error) {
    // if (error instanceof AbortError) {
    //   console.warn('request was aborted');
    // }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
