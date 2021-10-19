import type { Reporter } from 'workers-logger';
import { track } from 'workers-logger';

const reporter: Reporter = (events) => void console.log(events);

// TODO: ~ Types dont exist yet — waiting on https://github.com/cloudflare/workers-types/pull/102
const worker: ModuleWorker = {
	async fetch(request, _env, context) {
		const log = track(request, 'worker-example', reporter);

		log.info('gearing up to make a response');

		const res = new Response('hi there');

		context.waitUntil(log.report(res));

		return res;
	},
};

export default worker;
