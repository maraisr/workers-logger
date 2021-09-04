import { diary } from 'diary';
import type { Diary, LogEvent } from 'diary';

export { sprintf as format } from 'diary/utils';

export type Reporter = (
	events: LogEvent[],
	context: { req: Request; res: Response },
) => Promise<any> | void;

interface Tracker extends Diary {
	report(response: Response): Promise<any> | void | undefined;
}

export const track = (req: Request, name?: string, reporter?: Reporter) => {
	const queue: LogEvent[] = [];

	const $ = diary(name || '', (event) => void queue.push(event)) as Tracker;

	$.report = (res) => {
		if (!queue.length || typeof reporter !== 'function') return;

		return reporter(queue, { req, res });
	};

	return $;
};
