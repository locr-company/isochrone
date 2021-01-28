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
const deintersect = require('turf-deintersect');
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
	const grid = pointGrid(bboxGrid, options.cellSize, { units: options.units });

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
			if (!contentType.match(/application\/json/)) {
				error = new Error(`invalid contentType(${contentType}) from server.`);
			}
			if (error) {
				res.resume();
				return reject(error);
			}
	
			res.setEncoding('utf8');
			let rawData = '';
			res.on('data', chunk => rawData += chunk);
			res.on('end', () => {
				try {
					const parsedData = JSON.parse(rawData);
					resolve(parsedData);
				} catch(e) {
					if (callback) {
						reject(e);
					}
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
	const coordinatesPerRequest = 10000;
	const totalRequests = Math.ceil(coordinates.length / coordinatesPerRequest);
	const urls = [];
	for(let i = 0; i < totalRequests; i++) {
		let url = `${options.endpoint}${options.profile}/${coordinates[0][0]},${coordinates[0][1]}`;
		let coordinateCounter = 0;
		let firstRequestOffset = (i === 0) ? 1 : 0;
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
	
	let result = {
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

async function isochroneValhalla(parameters, options) {
	let json = {
		locations: [{
			lat: parameters.startPoint[1],
			lon: parameters.startPoint[0]
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
		for(let i = 0; i < result.features.length - 1; i++) {
			for(let j = i; j < result.features.length - 1; j++) {
				const properties = Object.assign({}, result.features[i].properties);
				result.features[i] = turf.union(result.features[i], result.features[j + 1]);
				result.features[i].properties = properties;
			}
		}
		for(let i = 0; i < result.features.length - 1; i++) {
			result.features[i] = turf.difference(result.features[i], result.features[i + 1]);
		}
	}
	return result;
}

/**
 * @param {GeoJSON} origin Example: { type: "Point", coordinates: [ 9.86557, 52.3703 ] }
 * @param {Object} options 
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

					const features = options.deintersect ? deintersect(polygons) : polygons;
					const featureCollection = rewind(helpers.featureCollection(features));
					featureCollection.features.reverse();

					resolve(featureCollection);
				} catch (e) {
					reject(e);
				}
			};
			const startPoint = origin.coordinates;
			switch(options.provider) {
				case 'osrm':
					const endPoints = makeGrid(startPoint, options);
					const coordinates = [startPoint].concat(endPoints);
					if (options.osrm) {
						options.osrm.table({ sources: [0], coordinates }, osrmTableResultCallback);
					} else {
						isochroneOSRM({ sources: [0], coordinates }, options)
							.then(result => osrmTableResultCallback(null, result))
							.catch(reject);
					}
					break;
				
				case 'valhalla':
						isochroneValhalla({ startPoint }, options)
							.then(resolve)
							.catch(reject);
					break;
			}
		} catch (e) {
			reject(e);
		}
	});
}

module.exports = { IsoChrone, VALID_PROVIDERS };
