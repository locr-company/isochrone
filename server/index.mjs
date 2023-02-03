#!/usr/bin/env node

/**
 * server/index.js
 *
 * @author  Ringo Leese <r.leese@locr.com>
 * @license MIT
 */
/* eslint strict: 0, no-process-exit: 0 */
'use strict';

import log from '../src/util/log.mjs';
import _ from 'lodash';
import BodyParser from 'body-parser';
import Cors from 'cors';
import Express from 'express';
import { IsoChrone, DEFAULT_PROVIDER, VALID_PROVIDERS } from '../src/index.mjs';
import Yargs from 'yargs';
import os from 'os';

const apiTimeout = 30 * 60 * 1000; // 30 minutes
const defaultPort = 3457;
let runningTasks = 0;
let totalTasks = 0;

/**
 * Process CLI arguments
 */
const argv = Yargs(process.argv)
	.alias('p', 'port')
	.default('p', defaultPort)
	.describe('p', 'http-port to listen on.')
	.argv;

function sendBadRequest(message, res) {
	const jsonResult = {
		code: 400,
		status: 'Bad Request',
		message
	};
	res.status(400);
	res.header('Content-Type', 'application/json');
	res.json(jsonResult);
}
function sendInternalServerError(err, res) {
	log.warn(err);

	let message = '';
	if (err instanceof Error) {
		message = err.message;
	} else {
		message = err;
	}
	const jsonResult = {
		code: 500,
		status: 'Internal Server Error',
		message
	};
	res.status(500);
	res.header('Content-Type', 'application/json');
	res.json(jsonResult);
}

const app = Express();
app.use(Cors());
app.use(BodyParser.json());
app.use(Express.static('website'));

app.get('/api/providers/list', (_req, res) => {
	const json = {
		providers: VALID_PROVIDERS,
		default: DEFAULT_PROVIDER
	};
	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify(json));
});
app.get('/api/status', (req, res) => {
	const json = {
		machine: {
			'load-average': os.loadavg()
		},
		service: {
			'running-tasks': runningTasks,
			'total-tasks': totalTasks
		}
	};
	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify(json));
});
app.post('/api/', (req, res) => {
	req.setTimeout(apiTimeout);
	run(req.body)
		.then(data => res.json(data))
		.catch(err => sendInternalServerError(err, res));
});
app.get('/api/', (req, res) => {
	req.setTimeout(apiTimeout);
	const query = req.query;
	const intervals = [];
	if (!query.intervals) {
		sendBadRequest('Missing required parameter "intervals"', res);
		return;
	}
	const intervalsSplitted = query.intervals.split(',');
	let intervalCounter = 0;
	for(const intervalsplit of intervalsSplitted) {
		intervalCounter++;
		const interval = parseFloat(intervalsplit);
		if (isNaN(interval)) {
			sendBadRequest(`invalid interval[${intervalCounter}] => ${intervalsplit}`, res);
			return;
		}
		intervals.push({
			interval
		});
	}
	if (!query.latitude) {
		sendBadRequest('Missing required parameter "latitude"', res);
		return;
	}
	if (!query.longitude) {
		sendBadRequest('Missing required parameter "longitude"', res);
		return;
	}
	const latitude = parseFloat(query.latitude);
	const longitude = parseFloat(query.longitude);
	if (isNaN(latitude)) {
		sendBadRequest(`Invalid "latitude" value => ${query.latitude}`, res);
		return;
	}
	if (isNaN(longitude)) {
		sendBadRequest(`Invalid "longitude" value => ${query.longitude}`, res);
		return;
	}
	let cellSize = 0.1;
	if (query.cell_size) {
		cellSize = parseFloat(query.cell_size);
		if (isNaN(cellSize)) {
			sendBadRequest(`Invalid "cell_size" value => ${query.cell_size}`, res);
			return;
		}
		if (cellSize <= 0) {
			sendBadRequest(`Invalid "cell_size" value => ${cellSize}. It must be greater than 0.`, res);
			return;
		}
	}
	let radius = -1;
	if (query.radius) {
		radius = parseFloat(query.radius);
		if (isNaN(radius)) {
			sendBadRequest(`Invalid "radius" value => ${query.radius}`, res);
			return;
		}
		if (radius < -1) {
			sendBadRequest(`Invalid "radius" value => ${radius}. It must be greater than 0.`, res);
			return;
		}
	}
	let deintersect = false;
	if (typeof query.deintersect === 'string') {
		switch(query.deintersect) {
			case '1':
			case 'true':
			case 'yes':
			case 'on':
			case '':
				deintersect = true;
				break;
		}
	}

	const options = {
		origin: {
			type: 'Point',
			coordinates: [longitude, latitude]
		},
		deintersect,
		cellSize,
		provider: query.provider || DEFAULT_PROVIDER,
		profile: query.profile || 'car',
		radius,
		intervals
	};

	run(options)
		.then(data => res.json(data))
		.catch(err => sendInternalServerError(err, res));
});

const httpPort = (argv.p || process.env.PORT) || defaultPort;

app.listen(httpPort, () => {
	log.success(`IsoChrone server listening on port ${httpPort}!`);
});

// Parse the parameter and call isodist
async function run(options) {
	if (options.intervals instanceof Array) {
		options.intervals = _.map(options.intervals, 'interval');
	}

	options = _.defaults(options, {
		cellSize: 0.1,
		concavity: 2,
		deintersect: false,
		lengthThreshold: 0,
		profile: 'car',
		provider: DEFAULT_PROVIDER,
		radius: -1,
		unit: 'kilometers'
	});

	if (options.radius <= 0) {
		const maxMinutes = Math.max(...options.intervals);
		// 120km/h / 60mins * maxMinutes
		options.radius = 120 / 60 * maxMinutes;
	}

	if (VALID_PROVIDERS.indexOf(options.provider) === -1) {
		throw new Error(`Invalid provider (${options.provider})`);
	}

	try {
		runningTasks++;
		totalTasks++;
		return await IsoChrone(options.origin, options);
	} finally {
		runningTasks--;
	}
}
