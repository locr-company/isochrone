#!/usr/bin/env node

/**
 * bin/isochrone.js
 *
 * @author  Ringo Leese <r.leese@locr.com>
 * @license MIT
 * @example node bin/isochrone.js --lon=8.8071646 --lat=53.0758196 -r 5 -c 0.2 -i 1 -i 3 -i 5 --deintersect -m bremen
 */
/* eslint strict: 0, no-process-exit: 0 */
'use strict';
const _			= require('lodash');
const OSRM		= require('osrm');
const Path		= require('path');
const Yargs		= require('yargs');
const { IsoChrone, VALID_PROVIDERS }	= require('../src');
const StdIn		= require('../src/util/stdin');
const log		= require('../src/util/log');

/**
 * Process CLI arguments
 */
const argv = Yargs
	.alias('m', 'map')
	.describe('map', 'OSRM file to use for routing')
	.alias('r', 'radius')
	.default('r', 5)
	.describe('r', 'distance to draw the buffer')
	.alias('c', 'cell-size')
	.default('c', 0.1)
	.describe('c', 'the distance across each cell')
	.alias('i', 'interval')
	.describe('interval', 'intervals for isochrones in minutes')
	.alias('p', 'profile')
	.default('p', 'car')
	.describe('p', 'Routing profile to use (car, motorbike, pedestrian...)')
	.alias('u', 'units')
	.default('units', 'kilometers')
	.describe('units', 'any of the options supported by turf units')
	.default('provider', 'osrm')
	.describe('provider', 'Routing provider (osrm, valhalla)')
	.describe('endpoint', 'An http-endpoint to the routing provider (e.g.: http://127.0.0.1:5000/route/v1/)')
	.default('concavity', 2)
	.describe('concavity', 'relative measure of concavity')
	.default('length-threshold', 0)
	.describe('length-threshold', 'length threshold')
	.boolean('deintersect')
	.describe('deintersect', 'whether or not to deintersect the isochrones. If this is true, then the isochrones will be mutually exclusive')
	.argv;

/**
 * Read stdin file
 */
StdIn()
	.then(options => {
		/**
		 * Generate intervals entries
		 */
		options.intervals = _.map(options.intervals, 'interval');

		/**
		 * Generate the origin point if not specified
		 */
		if (!options.origin && (!_.isFinite(argv.lat) || !_.isFinite(argv.lon))) {
			log.fail('Could not determine origin location');
		}
		if (argv.lat && argv.lon) {
			options.origin = {
				type: 'Point',
				coordinates: [ argv.lon, argv.lat ]
			};
		}

		/**
		 * Generate steps
		 */
		if (argv.interval) {
			options.intervals = [].concat(argv.interval);
		}
		if (!options.intervals || !options.intervals.length) {
			log.fail('Could not determine isodistance intervals');
		}

		/**
		 * Copy over -h, -r and -m
		 */
		options = _.defaults(options, {
			deintersect: argv.deintersect || false,
			endpoint: argv.endpoint,
			cellSize: argv.c,
			map: argv.m,
			profile: argv.profile || 'car',
			provider: argv.provider || 'osrm',
			radius: argv.r,
			concavity: argv.concavity,
			lengthThreshold: argv['length-threshold'],
			units: argv.units
		});

		if (VALID_PROVIDERS.indexOf(options.provider) === -1) {
			log.fail(`Invalid provider (${options.provider})`);
		}

		switch(options.provider) {
			case 'osrm':
				if (options.endpoint) {
					if (options.map) {
						log.fail('Ambigious parameters where given (--endpoint and --map). Please only use 1 of them!');
					}
				} else {
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

		/**
		 * Start processing
		 */
		return IsoChrone(options.origin, options);
	})
	.then(fc => {
		const output = JSON.stringify(fc, null, 2);
		process.stdout.write(output);
		process.exit(0);
	})
	.catch(err => {
		if (!err.known) {
			log.fail(err.stack);
		}
		process.exit(1);
	});
