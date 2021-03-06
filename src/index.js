#!/usr/bin/env node

/**
 * index.js
 *
 * @author  Ringo Leese <r.leese@locr.com>
 * @license MIT
 */

const http = require('http');
const https = require('https');
const bbox = require('@turf/bbox').default;
const concaveman = require('concaveman');
const destination = require('@turf/destination').default;
const helpers = require('@turf/helpers');
const pointGrid = require('@turf/point-grid').default;
const rewind = require('geojson-rewind');
const turf = require('@turf/turf');

const makeGrid = (startPoint, options) => {
	const point = helpers.point(startPoint);

	const spokes = helpers.featureCollection([
		destination(point, options.radius, 180, options.unit),
		destination(point, options.radius, 0, options.unit),
		destination(point, options.radius, 90, options.unit),
		destination(point, options.radius, -90, options.unit)
	]);

	const bboxGrid = bbox(spokes);
	const grid = pointGrid(bboxGrid, options.cellSize, { units: options.unit });

	return grid.features.map(feature => feature.geometry.coordinates);
};

const groupByInterval = (destinations, intervals, travelTime) => {
	const groups = {};
	intervals.forEach((interval) => {
		const points = destinations
			.filter((point, index) => travelTime[index] !== null && travelTime[index] <= interval * 60)
			.map(d => d.location);

		groups[interval] = points;
	});
	return groups;
};

const makePolygon = (points, interval, options) => {
	const concave = concaveman(points, options.concavity, options.lengthThreshold);
	return helpers.polygon([concave], { time: parseFloat(interval) });
};

const makePolygons = (pointsByInterval, options) => {
	return Object.keys(pointsByInterval).reduce((acc, interval) => {
		const points = pointsByInterval[interval];
		if (points.length >= 3) {
			acc.push(makePolygon(points, interval, options));
		}
		return acc;
	}, []);
};

const VALID_PROVIDERS = ['osrm', 'valhalla'];

function httpGetJSONPromise(url) {
	return new Promise((resolve, reject) => {
		const restCallback = res => {
			const { statusCode } = res;
			const contentType = res.headers['content-type'];
			let error;

			if (statusCode !== 200) {
				error = new Error(`invalid statusCode(${statusCode}) from server.`);
			}
			if (!contentType) {
				error = new Error('no contentType from server received.');
			}
			if (contentType && !contentType.match(/application\/json/)) {
				error = new Error(`invalid contentType(${contentType}) from server.`);
			}
			if (error) {
				res.resume();
				return reject(error);
			}

			res.setEncoding('utf8');
			let rawData = '';
			res.on('data', chunk => {
				rawData += chunk;
			});
			res.on('end', () => {
				try {
					const parsedData = JSON.parse(rawData);
					resolve(parsedData);
				} catch(e) {
					reject(e);
				}
			});
		};

		if (url.indexOf('https') === 0) {
			https.get(url, restCallback).on('error', reject);
		} else {
			http.get(url, restCallback).on('error', reject);
		}
	});
}

async function isochroneOSRM(parameters, options) {
	const coordinates = parameters.coordinates;
	const coordinatesPerRequest = 5000;
	const totalRequests = Math.ceil(coordinates.length / coordinatesPerRequest);
	const urls = [];
	for(let i = 0; i < totalRequests; i++) {
		let url = `${options.endpoint}${options.profile}/${coordinates[0][0]},${coordinates[0][1]}`;
		let coordinateCounter = 0;
		const firstRequestOffset = (i === 0) ? 1 : 0;
		for(let j = i * coordinatesPerRequest + firstRequestOffset; j < i * coordinatesPerRequest + coordinatesPerRequest; j++) {
			const coordinate = coordinates[j];
			if (!coordinate) {
				break;
			}
			coordinateCounter++;
			url += `;${coordinate[0]},${coordinate[1]}`;
		}
		if (coordinateCounter === 0) {
			break;
		}
		url += `?sources=${parameters.sources.join(';')}`;
		urls.push(url);
	}

	const result = {
		code: 'Error',
		durations: [[0]],
		sources: [],
		destinations: []
	};
	for(const url of urls) {
		const jsonResult = await httpGetJSONPromise(url);
		if (jsonResult.code) {
			result.code = jsonResult.code;
		}
		if (jsonResult.code !== 'Ok') {
			break;
		}
		if (result.sources.length === 0 && jsonResult.sources.length > 0) {
			for(const source of jsonResult.sources) {
				result.sources.push(source);
			}
		}
		if (jsonResult.durations[0].length > 1) {
			for(let i = 1; i < jsonResult.durations[0].length; i++) {
				result.durations[0].push(jsonResult.durations[0][i]);
			}
		}
		if (jsonResult.destinations.length > 1) {
			if (result.destinations.length === 0) {
				result.destinations.push(jsonResult.destinations[0]);
			}
			for(let i = 1; i < jsonResult.destinations.length; i++) {
				result.destinations.push(jsonResult.destinations[i]);
			}
		}
	}

	return result;
}

function deintersectGeoJSONFeatures(features) {
	for(let i = 0; i < features.length - 1; i++) {
		for(let j = i; j < features.length - 1; j++) {
			const properties = Object.assign({}, features[i].properties);
			features[i] = turf.union(features[i], features[j + 1]);
			features[i].properties = properties;
		}
	}
	for(let i = 0; i < features.length - 1; i++) {
		features[i] = turf.difference(features[i], features[i + 1]);
	}

	return features;
}

async function isochroneValhalla(startPoint, options) {
	const json = {
		locations: [{
			lat: startPoint[1],
			lon: startPoint[0]
		}],
		costing: 'auto',
		contours: [],
		polygons: true
	};
	if (options.intervals instanceof Array) {
		for(const interval of options.intervals) {
			json.contours.push({ time: interval });
		}
	}
	const url = `${options.endpoint}?json=${JSON.stringify(json)}`;
	const result = await httpGetJSONPromise(url);
	if (options.deintersect && result.features.length > 1) {
		result.features = deintersectGeoJSONFeatures(result.features);
	}
	return result;
}

/**
 * @param {GeoJSON} origin Example: { type: "Point", coordinates: [ 9.86557, 52.3703 ] }
 * @param {Object} options object
 * @param {number} options.cellSize - the distance across each cell as in [@turf/point-grid](https://github.com/Turfjs/turf/tree/master/packages/turf-point-grid)
 * @param {number} [options.concavity=2] - relative measure of concavity as in [concaveman](https://github.com/mapbox/concaveman)
 * @param {boolean} options.deintersect - wether or not to deintersect the isochrones. If this is true, then the isochrones will be mutually exclusive.
 * @param {Array.<number>} options.intervals - intervals for isochrones in minutes
 * @param {number} [options.lengthThreshold=0] - length threshold as in [concaveman](https://github.com/mapbox/concaveman)
 * @param {number} options.radius - distance to draw the buffer as in [@turf/buffer](https://github.com/Turfjs/turf/tree/master/packages/turf-buffer)
 * @param {string} [options.units='kilometers'] - any of the options supported by turf units
 * @returns {Promise} GeoJSON FeatureCollection of Polygons when resolved
 */
function IsoChrone(origin, options) {
	return new Promise((resolve, reject) => {
		try {
			const osrmTableResultCallback = (error, table) => {
				if (error) {
					reject(error);
				}

				const travelTime = table.durations[0] || [];

				try {
					const pointsByInterval = groupByInterval(table.destinations, options.intervals, travelTime);
					const polygons = makePolygons(pointsByInterval, options);

					const featureCollection = rewind(helpers.featureCollection(polygons));
					featureCollection.features.reverse();
					if (options.deintersect && featureCollection.features.length > 1) {
						featureCollection.features = deintersectGeoJSONFeatures(featureCollection.features);
					}

					resolve(featureCollection);
				} catch(e) {
					reject(e);
				}
			};

			let coordinates;
			const startPoint = origin.coordinates;
			switch(options.provider) {
				case 'osrm':
					coordinates = [startPoint].concat(makeGrid(startPoint, options));
					if (options.osrm) {
						options.osrm.table({ sources: [0], coordinates }, osrmTableResultCallback);
					} else {
						isochroneOSRM({ sources: [0], coordinates }, options)
							.then(result => osrmTableResultCallback(null, result))
							.catch(reject);
					}
					break;

				case 'valhalla':
					isochroneValhalla(startPoint, options)
						.then(resolve)
						.catch(reject);
					break;
			}
		} catch(e) {
			reject(e);
		}
	});
}

module.exports = { IsoChrone, VALID_PROVIDERS };
