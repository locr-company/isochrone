#!/usr/bin/env node

/**
 * server/index.js
 *
 * @author  Hao Chen <a@ricepo.com>
 * @license 2015-16 (C) Ricepo LLC. All Rights Reserved.
 */
/* eslint strict: 0, no-process-exit: 0 */
'use strict';
const _            = require('lodash');
const IsoDist      = require('..');
const Express      = require('express');
const BodyParser   = require('body-parser');
const Cors         = require('cors');

const app          = Express();

app.use(Cors());
app.use(BodyParser.json());
app.use(Express.static('website'));
// app.use(BodyParser.urlencoded({ extended: true }));

app.post('/', (req, res) => {
	run(req.body)
		.then((data) => {
			// res.json(_.get(data, 'features[0].geometry'));
			res.json(data);
		})
		.catch((err) => {
			// eslint-disable-next-line no-console
			console.log(err);
			res.status(500).send('Something broke!');
		});
});

// eslint-disable-next-line no-process-env
app.listen(process.env.PORT || 3456, () => {
	// eslint-disable-next-line no-console
	console.log('Isodist server listening on port 3456!');
});

// Parse the parameter and call isodist
function run(options) {
	options.data = _.keyBy(options.steps, 'distance');
	options.steps = _.map(options.steps, 'distance');

	_.defaults(options, {
		resolution: 0.1,
		hexSize: 0.5
	});

	return IsoDist(options.origin, options.steps, options);
}
