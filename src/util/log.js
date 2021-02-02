/**
 * log.js
 *
 * @author  Ringo Leese <r.leese@locr.com>
 * @license MIT
 */
const chalk = require('chalk');
const singleLineLog = require('single-line-log');

const write = singleLineLog(process.stderr);

function log(data) {
	write(`${chalk.bold.cyan(' .. ')} ${data}`);
}

log.success = data => {
	write(`${chalk.bold.green(' OK ')} ${data}`);
	// eslint-disable-next-line no-console
	console.error('');
};

log.warn = data => {
	write(`${chalk.bold.yellow('WARN')} ${data}`);
	// eslint-disable-next-line no-console
	console.error('');
};

log.fail = data => {
	write(`${chalk.bold.red('FAIL')} ${data}`);
	// eslint-disable-next-line no-console
	console.error('');
	const err = new Error(data);
	err.known = true;
	throw err;
};

module.exports = log;
