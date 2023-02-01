#!/usr/bin/env node

/**
 * bin/isochrone.js
 *
 * @author  Ringo Leese <r.leese@locr.com>
 * @license MIT
 * @example node bin/isochrone.js --lon=8.8071646 --lat=53.0758196 -r 5 -c 0.2 -i 1 -i 3 -i 5 --deintersect -m bremen
 */
'use strict';
import _ from 'lodash';
import Yargs from 'yargs';
import { IsoChrone, DEFAULT_PROVIDER, VALID_PROVIDERS } from '../src/index.mjs';
import StdIn from '../src/util/stdin.mjs';
import log from '../src/util/log.mjs';

/**
 * Process CLI arguments
 */
const argv = Yargs(process.argv)
	.alias('r', 'radius')
	.default('r', 5)
	.describe('r', 'distance to draw the buffer')
	.alias('c', 'cell-size')
	.default('c', 0.1)
	.describe('c', 'the distance across each cell')
	.alias('i', 'interval')
	.number('i')
	.describe('i', 'intervals for isochrones in minutes')
	.alias('p', 'profile')
	.default('p', 'car')
	.describe('p', 'Routing profile to use (car, motorbike, pedestrian...)')
	.alias('u', 'units')
	.describe('u', 'any of the options supported by turf units')
	.default('u', 'kilometers')
	.default('provider', DEFAULT_PROVIDER)
	.describe('provider', 'Routing provider (valhalla, osrm)')
	.describe('endpoint', 'An http-endpoint to the routing provider (e.g.: http://127.0.0.1:5000/table/v1/)')
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
		if (!options.origin && (!(_.isFinite(argv.lat) && _.isFinite(argv.lon)))) {
			log.fail('Could not determine origin location');
		}
		if (argv.lat && argv.lon) {
			options.origin = {
				type: 'Point',
				coordinates: [argv.lon, argv.lat]
			};
		}

		/**
		 * Generate steps
		 */
		if (argv.interval) {
			options.intervals = [].concat(argv.interval);
		}
		if (!(options.intervals?.length)) {
			log.fail('Could not determine isodistance intervals');
		}

		const provider = argv.provider || DEFAULT_PROVIDER;
		let endpoint = argv.endpoint;
		if (!endpoint) {
			switch(provider) {
				case 'osrm':
					endpoint = 'http://127.0.0.1:5000/table/v1/';
					break;
				case 'valhalla':
					endpoint = 'http://127.0.0.1:8002/isochrone';
					break;
			}
		}

		/**
		 * Copy over -h, -r and -m
		 */
		options = _.defaults(options, {
			deintersect: argv.deintersect,
			endpoint,
			cellSize: argv.c,
			profile: argv.profile || 'car',
			provider,
			radius: argv.r,
			concavity: argv.concavity,
			lengthThreshold: argv['length-threshold'],
			units: argv.units
		});

		if (VALID_PROVIDERS.indexOf(options.provider) === -1) {
			log.fail(`Invalid provider (${options.provider})`);
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
