import { diary } from 'diary';
import type { Diary, LogEvent } from 'diary';

export type { LogEvent, LogLevels } from 'diary';

export { compare, sprintf as format } from 'diary/utils';
export { enable } from 'diary';

export type Reporter<T = unknown> = (
	events: LogEvent[],
	context: { req: Request; res: Response },
) => Promise<T> | void;

export interface Tracker<T = unknown> extends Diary {
	report(response: Response): Promise<T> | void | undefined;
}

export const track = <T = unknown>(
	req: Request,
	name?: string,
	reporter?: Reporter<T>,
): Tracker<T> => {
	const queue: LogEvent[] = [];

	const $ = diary(name || '', (event) => void queue.push(event)) as Tracker<T>;

	$.report = (res: Response) => {
		if (queue.length && typeof reporter === 'function') {
			return reporter(queue, { req, res });
		}
	};

	return $;
};
