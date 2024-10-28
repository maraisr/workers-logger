<div align="left">

<samp>

# workers-logger [![licenses](https://licenses.dev/b/npm/workers-logger?style=dark)](https://licenses.dev/npm/workers-logger)

</samp>

Fast and effective logging for [Cloudflare Workers](https://workers.cloudflare.com/).

<br>
<br>

<sup>

This is free to use software, but if you do like it, consider supporting me ❤️

[![sponsor me](https://badgen.net/badge/icon/sponsor?icon=github&label&color=gray)](https://github.com/sponsors/maraisr)
[![buy me a coffee](https://badgen.net/badge/icon/buymeacoffee?icon=buymeacoffee&label&color=gray)](https://www.buymeacoffee.com/marais)

</sup>

</div>

## ⚡️ Features

- Super [light weight](https://npm.anvaka.com/#/view/2d/workers-logger)
- Custom [Reporters](#Reporters)
- Built on top of [`diary`](https://github.com/maraisr/diary)
- Optimized to not hinder critical path

## ⚙️ Install

```sh
npm add workers-logger
```

## 🚀 Usage

```ts
import { track } from 'workers-logger';

addEventListener('fetch', (event) => {
	const { request } = event;
	const log = track(request);

	log.info('gearing up to make a response');

	const res = new Response('hi there');

	event.waitUntil(log.report(res));

	return res;
});
```

> to see more visit [examples](/examples)

## 🔎 API

### track(request: Request, name?: string, reporter?: Reporter)

Returns [log functions](https://github.com/maraisr/diary#log-functions) and our
[`.report`](#reportresponse-response) method.

#### report(response: Response)

Returns a promise with intended usage with `event.waitUntil`. And thus in terns runs your
[`reporter`](#reporters) defined on track.

## Reporters

A reporter is a single function ran at then end of [`.report`](#reportresponse-response). And gives
you the ability to send that data somewhere, or merely into
[dashboard logs](https://blog.cloudflare.com/introducing-workers-dashboard-logs/).

```ts
import type { Reporter } from 'workers-logger';
import { track } from 'workers-logger';

const reporter: Reporter = (events, { req, res }) => {
	// do whatever you want
};

addEventListener('fetch', (event) => {
	const { request } = event;
	const log = track(request, 'my-worker', reporter);

	log.info('gearing up to make a response');

	const res = new Response('hi there');

	event.waitUntil(log.report(res));

	return res;
});
```

> example when sending into [Logflare](https://logflare.app/) at
> [/examples/workers/logflare](/examples/workers/logflare/index.ts)

## License

MIT © [Marais Rossouw](https://marais.io)
