import type { Reporter } from 'workers-logger';
import { track } from 'workers-logger';

const reporter: Reporter = (events) => void console.log(events);

addEventListener('fetch', (event) => {
	const { request } = event;
	const log = track(request, 'worker-example', reporter);

	log.info('gearing up to make a response');

	const res = new Response('hi there');

	event.waitUntil(log.report(res));

	return res;
});
