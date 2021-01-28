#!/usr/bin/env node

/**
 * server/index.js
 *
 * @author  Ringo Leese <r.leese@locr.com>
 * @license MIT
 */
/* eslint strict: 0, no-process-exit: 0 */
'use strict';
const _				= require('lodash');
const BodyParser	= require('body-parser');
const Cors			= require('cors');
const Express		= require('express');
const { IsoChrone, VALID_PROVIDERS }	= require('..');
const OSRM			= require('osrm');
const Path			= require('path');
const Yargs			= require('yargs');
const log			= require('../src/util/log');

const apiTimeout = 30 * 60 * 1000;
let concurrentCalculations = 0;

/**
 * Process CLI arguments
 */
const argv = Yargs
	.default('osrm-use-node-binding', false)
	.boolean('osrm-use-node-binding')
	.default('osrm-endpoint', 'http://127.0.0.1:5000/table/v1/')
	.describe('osrm-endpoint', 'An http-endpoint to the osrm routing provider (e.g.: http://127.0.0.1:5000/table/v1/)')
	.default('valhalla-endpoint', 'http://127.0.0.1:8002/isochrone')
	.describe('valhalla-endpoint', 'An http-endpoint to the osrm routing provider (e.g.: http://127.0.0.1:8002/isochrone)')
	.argv;

const app = Express();
app.use(Cors());
app.use(BodyParser.json());
app.use(Express.static('website'));

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
			res.status(500).send('Something broke!');
		});
});
app.get('/api/', (req, res) => {
	const query = req.query;
	const distances = [];
	if (!query.distances) {
		log.fail('Missing required parameter "distances".');
	}
	const distancesSplitted = query.distances.split(',');
	let distanceCounter = 0;
	for(const distanceSplit of distancesSplitted) {
		distanceCounter++;
		const distance = parseFloat(distanceSplit);
		if (isNaN(distance)) {
			log.fail(`invalid distance[${distanceCounter}] => ${distanceSplit}`);
		}
		distances.push({
			distance: distance
		});
	}
	if (!query.latitude) {
		log.fail('Missing required parameter "latitude".');
	}
	if (!query.longitude) {
		log.fail('Missing required parameter "latitude".');
	}
	const latitude = parseFloat(query.latitude);
	const longitude = parseFloat(query.longitude);
	if (isNaN(latitude)) {
		log.fail(`Invalid "latitude" value => ${query.latitude}`);
	}
	if (isNaN(longitude)) {
		log.fail(`Invalid "longitude" value => ${query.longitude}`);
	}
	let hexSize = 0.5;
	if (query['hex_size']) {
		hexSize = parseFloat(query['hex_size']);
		if (isNaN(hexSize)) {
			log.fail(`Invalid "hex_size" value => ${query['hex_size']}`);
		}
		if (hexSize <= 0) {
			log.fail(`Invalid "hex_size" value => ${hexSize}. It must be greater than 0.`);
		}
	}
	let resolution = 0.2;
	if (query.resolution) {
		resolution = parseFloat(query.resolution);
		if (isNaN(resolution)) {
			log.fail(`Invalid "resolution" value => ${query.resolution}`);
		}
		if (resolution <= 0) {
			log.fail(`Invalid "resolution" value => ${resolution}. It must be greater than 0.`);
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
	let noDeburr = false;
	if (query.noDeburr) {
		switch(query.noDeburr) {
			case '1':
			case 'true':
			case 'yes':
			case 'on':
				noDeburr = true;
				break;
		}
	}

	const options = {
		origin: {
			type: 'Point',
			coordinates: [ longitude, latitude ]
		},
		map: query.map || '',
		deintersect: deintersect,
		hexSize: hexSize,
		noDeburr: noDeburr,
		provider: query.provider || 'osrm',
		profile: query.profile || 'car',
		resolution: resolution,
		steps: distances
	};

	run(options)
		.then(data => {
			res.json(data);
		})
		.catch(err => {
			log.warn(err);
			res.status(500).send('Something broke!');
		});
});

const httpPort = process.env.PORT || 3456;

// eslint-disable-next-line no-process-env
app.listen(httpPort, () => {
	log.success(`Isodist server listening on port ${httpPort}!`);
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
		endpoint: endpoint,
		lengthThreshold: 0,
		map: '',
		profile: 'car',
		provider: 'osrm',
		radius: 5,
		units: 'kilometers'
	});

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
