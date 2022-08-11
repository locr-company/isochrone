/**
 * util/stdin.js
 *
 * @author  Ringo Leese <r.leese@locr.com>
 * @license MIT
 */
export default function stdin() {
	return new Promise((resolve, reject) => {
		const stream = process.stdin;
		const chunks = [];

		if (stream.isTTY) {
			return resolve({});
		}

		stream.setEncoding('utf8');
		stream.on('data', d => chunks.push(d));
		stream.on('end', () => {
			if (chunks.length === 0) {
				return resolve({});
			}
			const input = chunks.join('');
			return resolve(JSON.parse(input));
		});

		stream.on('error', reject);
	});
}
