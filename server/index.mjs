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
import { IsoChrone, VALID_PROVIDERS } from '../src/index.mjs';
import Path from 'path';
import Yargs from 'yargs';

const apiTimeout = 30 * 60 * 1000;
const defaultPort = 3456;
let concurrentCalculations = 0;

/**
 * Process CLI arguments
 */
const argv = Yargs(process.argv)
	.alias('p', 'port')
	.default('p', defaultPort)
	.describe('p', 'http-port to listen on.')
	.default('default-provider', 'osrm')
	.describe('default-provider', `which provider (${VALID_PROVIDERS.join(', ')}) to use as default`)
	.default('osrm-use-node-binding', false)
	.boolean('osrm-use-node-binding')
	.default('osrm-endpoint', 'http://127.0.0.1:5000/table/v1/') // Devskim: ignore DS137138
	.describe('osrm-endpoint', 'An http-endpoint to the osrm routing provider (e.g.: http://127.0.0.1:5000/table/v1/)') // Devskim: ignore DS137138
	.default('valhalla-endpoint', 'http://127.0.0.1:8002/isochrone') // Devskim: ignore DS137138
	.describe('valhalla-endpoint', 'An http-endpoint to the osrm routing provider (e.g.: http://127.0.0.1:8002/isochrone)') // Devskim: ignore DS137138
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
function sendInternalServerError(message, res) {
	const jsonResult = {
		code: 500,
		status: 'Internal Server Error',
		message
	};
	res.status(400);
	res.header('Content-Type', 'application/json');
	res.json(jsonResult);
}

const app = Express();
app.use(Cors());
app.use(BodyParser.json());
app.use(Express.static('website'));

app.get('/api/providers/list', (req, res) => {
	const json = {
		providers: VALID_PROVIDERS,
		default: argv['default-provider']
	};
	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify(json));
});
app.get('/api/status.json', (req, res) => {
	const json = {
		server: {
			type: 'nodejs',
			platform: process.platform,
			version: process.version
		},
		processes: {
			count: concurrentCalculations
		}
	};
	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify(json));
});
app.post('/api/', (req, res) => {
	req.setTimeout(apiTimeout);
	run(req.body)
		.then((data) => {
			res.json(data);
		})
		.catch((err) => {
			log.warn(err);
			sendInternalServerError(err, res);
		});
});
app.get('/api/', (req, res) => {
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
	if (query.deintersect) {
		switch(query.deintersect) {
			case '1':
			case 'true':
			case 'yes':
			case 'on':
				deintersect = true;
				break;
		}
	}

	const options = {
		origin: {
			type: 'Point',
			coordinates: [longitude, latitude]
		},
		map: query.map || '',
		deintersect,
		cellSize,
		provider: query.provider || 'osrm',
		profile: query.profile || 'car',
		radius,
		intervals
	};

	run(options)
		.then(data => {
			res.json(data);
		})
		.catch(err => {
			log.warn(err);
			let errorMessage = '';
			if (err instanceof Error) {
				errorMessage = err.message;
			} else {
				errorMessage = err;
			}
			sendInternalServerError(errorMessage, res);
		});
});

const httpPort = (argv.p || process.env.PORT) || defaultPort;
if (VALID_PROVIDERS.indexOf(argv['default-provider']) === -1) {
	log.fail(`invalid provider => ${argv['default-provider']}. Valid values are (${VALID_PROVIDERS.join(', ')}).`);
}

app.listen(httpPort, () => {
	log.success(`IsoChrone server listening on port ${httpPort}!`);
});

// Parse the parameter and call isodist
function run(options) {
	options.intervals = _.map(options.intervals, 'interval');

	let endpoint = '';
	if (options.provider === 'osrm') {
		endpoint = argv['osrm-endpoint'];
	} else if (options.provider === 'valhalla') {
		endpoint = argv['valhalla-endpoint'];
	}

	options = _.defaults(options, {
		cellSize: 0.1,
		concavity: 2,
		deintersect: false,
		endpoint,
		lengthThreshold: 0,
		map: '',
		profile: 'car',
		provider: 'osrm',
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

	switch(options.provider) {
		case 'osrm':
			if (argv['osrm-use-node-binding']) {
				if (!options.map) {
					log.fail('Missing OSRM map name, if no endpoint is given');
				}
				/**
				 * Resolve the options path
				 */
				const mapName = Path.resolve(__dirname, `../data/osrm/${options.map}.osrm`);
				const OSRM = require('osrm');
				options.osrm = new OSRM(mapName);
			}
			break;

		case 'valhalla':
			if (!options.endpoint) {
				log.fail('Missing endpoint for provider: valhalla');
			}
			break;
	}

	try {
		concurrentCalculations++;
		return IsoChrone(options.origin, options);
	} finally {
		concurrentCalculations--;
	}
}
