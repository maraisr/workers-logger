import type { Reporter } from 'workers-logger';
import { format, track } from 'workers-logger';

const logflareReport: Reporter = (events, { req, res }) => {
	const url = new URL(req.url);

	const metadata = {
		method: req.method,
		pathname: url.pathname,
		headers: Object.fromEntries(req.headers),
		response: {
			status: res.status,
			headers: Object.fromEntries(res.headers),
		},
		log: events.map((i) => ({
			level: i.level,
			message: format(i.message, ...i.extra),
		})),
	};

	// prettier-ignore
	const message = `${req.headers.get('cf-connecting-ip')} (${req.headers.get('cf-ray')}) ${req.method} ${req.url} ${res.status}`;

	return fetch('https://api.logflare.app/logs', {
		method: 'POST',
		headers: {
			'x-api-key': '<API_KEY>',
			'content-type': 'application/json',
		},
		body: JSON.stringify({
			source: '<LOGFLARE_SOURCE>',
			log_entry: message,
			metadata,
		}),
	});
};

addEventListener('fetch', (event) => {
	const { request } = event;
	const log = track(request, 'worker-example', logflareReport);

	log.info('gearing up to make a response');

	const res = new Response('hi there');

	event.waitUntil(log.report(res));

	return res;
});
