import { resolve } from 'node:path';
import Koa from 'koa';
import favicon from 'koa-favicon';
import fetch, { AbortError } from './fetch.js';

const app = new Koa();
let gstaticIndex = 0;
let duckduckgoIndex = 0;

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.error(error);
    ctx.status = error.statusCode || error.status || 500;
    ctx.body = 'Sorry!';
  }
});

app.use(favicon(resolve('static', 'favicon.ico')));

app.use((ctx, next) => {
  if (ctx.path !== '/') {
    return next();
  }

  ctx.body = `<html>
<head><title>Favicon Service</title></head>
<body>
<center><h1>Favicon Service</h1></center>
<p><a href="https://icons.pipecraft.net/favicons/16/www.bing.com/favicon.ico">https://icons.pipecraft.net/favicons/16/www.bing.com/favicon.ico</a></p>
</body>
</html>`;
});

app.use(async (ctx, next) => {
  const pattern = /^\/favicons\/(16|32|64|128|256)\/(([\w\-]+\.)+\w+)\/favicon.ico$/;
  const matched = pattern.exec(ctx.path);
  if (!matched) {
    return next();
  }

  const size = matched[1];
  const domain = matched[2];
  const ua = ctx.req.headers['user-agent'] || '';

  console.log(`Get favicon with size: ${size}, domain: ${domain}`);

  const providers = [
    `https://cdn.jsdelivr.net/gh/PipecraftNet/favicon-service@favicons/favicons/${size}/${domain}.ico`,

    `https://t${
      ++gstaticIndex % 4
    }.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=${size}`,
    `https://t${
      ++gstaticIndex % 4
    }.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=${size}`,

    `https://${domain}/favicon.ico`,
    `http://${domain}/favicon.ico`,

    `https://icons.duckduckgo.com/ip${++duckduckgoIndex % 4}/${domain}`,
    `https://external-content.duckduckgo.com/ip${
      ++duckduckgoIndex % 4
    }/${domain}`,

    `https://favicon.yandex.net/favicon/${domain}`
  ];

  for (const provider of providers) {
    try {
      console.log('Request to', provider);

      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(provider, {
        headers: { 'user-agent': ua }
      });

      console.log(response.status);
      // console.log(response.headers);

      if (response.status !== 200) {
        // await next();
        // return;
        continue;
      }

      const { headers } = response;
      const contentType = headers.get('content-type');
      if (!/icon|image/.test(contentType)) {
        continue;
      }

      ctx.set('Content-Type', contentType);
      ctx.set('Cache-Control', 'public, max-age=2678400');
      ctx.set('Connection', 'close');
      for (const key of [
        'Accept-Ranges',
        // "Content-Encoding",
        // "Content-Length",
        'Content-Type'
      ]) {
        const value = headers.get(key);
        if (value) {
          ctx.set(key, headers.get(key));
        }
      }

      ctx.body = response.body;
      return;
    } catch (error) {
      if (error instanceof AbortError) {
        console.warn('request was aborted');
      } else {
        console.error(error);
      }
    }
  }

  await next();
});

app.use((ctx) => {
  const status = ctx.status || 404;
  console.error('[' + status + ']', ctx.path);
  const MESSAGES = {
    403: '403 Forbidden',
    404: '404 Not Found',
    408: '408 Request Timeout',
    500: '500 Internal Server Error',
    502: '502 Bad Gateway',
    503: '503 Service Unavailable',
    504: '504 Gateway Timeout'
  };
  const message = MESSAGES[status] || status + ' Error';
  ctx.body = `<html>
<head><title>${message}</title></head>
<body>
<center><h1>${message}</h1></center>
<hr><center>nginx/1.21.1</center>
</body>
</html>`;
  ctx.status = status;
});

app.listen(3000);
