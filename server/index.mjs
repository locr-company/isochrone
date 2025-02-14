#!/usr/bin/env node

/**
 * server/index.js
 *
 * @author  Ringo Leese <r.leese@locr.com>
 * @license MIT
 */
/* eslint strict: 0, no-process-exit: 0 */
'use strict'

import log from '../src/util/log.mjs'
import _ from 'lodash'
import BodyParser from 'body-parser'
import Express from 'express'
import { IsoChrone, DEFAULT_PROVIDER, VALID_PROVIDERS } from '../src/index.mjs'
import Yargs from 'yargs'
import os from 'os'

const apiTimeout = 30 * 60 * 1000 // 30 minutes
const defaultPort = 3457
let runningTasks = 0
let totalTasks = 0

/**
 * Process CLI arguments
 */
const argv = Yargs(process.argv)
  .alias('p', 'port')
  .default('p', defaultPort)
  .describe('p', 'http-port to listen on.')
  .argv

function sendBadRequest (message, res) {
  const jsonResult = {
    code: 400,
    status: 'Bad Request',
    message
  }
  res.status(400)
  res.header('Content-Type', 'application/json')
  res.json(jsonResult)
}
function sendInternalServerError (err, res) {
  log.warn(err)

  let message = ''
  if (err instanceof Error) {
    message = err.message
  } else {
    message = err
  }
  const jsonResult = {
    code: 500,
    status: 'Internal Server Error',
    message
  }
  res.status(500)
  res.header('Content-Type', 'application/json')
  res.json(jsonResult)
}

function parseQueryForCellSize (query) {
  let cellSize = 0.1
  if (query.cell_size) {
    cellSize = parseFloat(query.cell_size)
    if (isNaN(cellSize)) {
      throw new Error(`Invalid "cell_size" value => ${query.cell_size}`)
    }
    if (cellSize <= 0) {
      throw new Error(`Invalid "cell_size" value => ${cellSize}. It must be greater than 0.`)
    }
  }

  return cellSize
}

function parseQueryForCoordinates (query) {
  if (!query.latitude) {
    throw new Error('Missing required parameter "latitude"')
  }
  if (!query.longitude) {
    throw new Error('Missing required parameter "longitude"')
  }
  const latitude = parseFloat(query.latitude)
  const longitude = parseFloat(query.longitude)
  if (isNaN(latitude)) {
    throw new Error(`Invalid "latitude" value => ${query.latitude}`)
  }
  if (isNaN(longitude)) {
    throw new Error(`Invalid "longitude" value => ${query.longitude}`)
  }

  return [longitude, latitude]
}

function parseQueryForDeintersect (query) {
  let deintersect = false
  if (typeof query.deintersect === 'string') {
    switch (query.deintersect) {
      case '1':
      case 'true':
      case 'yes':
      case 'on':
      case '':
        deintersect = true
        break
    }
  }

  return deintersect
}

function parseQueryForInterval (query) {
  const intervals = []
  if (!query.intervals) {
    throw new Error('Missing required parameter "intervals"')
  }
  if (typeof query.intervals !== 'string') {
    throw new Error('Invalid "intervals" value')
  }
  const intervalsSplitted = query.intervals.split(',')
  let intervalCounter = 0
  for (const intervalsplit of intervalsSplitted) {
    intervalCounter++
    const interval = parseFloat(intervalsplit)
    if (isNaN(interval)) {
      throw new Error(`invalid interval[${intervalCounter}] => ${intervalsplit}`)
    }
    intervals.push({
      interval
    })
  }

  return intervals
}

function parseQueryForRadius (query) {
  let radius = -1
  if (query.radius) {
    radius = parseFloat(query.radius)
    if (isNaN(radius)) {
      throw new Error(`Invalid "radius" value => ${query.radius}`)
    }
    if (radius < -1) {
      throw new Error(`Invalid "radius" value => ${radius}. It must be greater than 0.`)
    }
  }

  return radius
}

const app = Express()
app.use(BodyParser.json())
app.use(Express.static('website'))
app.disable('x-powered-by')

app.get('/api/providers/list', (_req, res) => {
  const json = {
    providers: VALID_PROVIDERS,
    default: DEFAULT_PROVIDER
  }
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(json))
})
app.get('/api/status', (req, res) => {
  const json = {
    data: {},
    machine: {
      'load-average': os.loadavg()
    },
    service: {
      'running-tasks': runningTasks,
      'total-tasks': totalTasks
    }
  }

  const provider = req.query.provider || DEFAULT_PROVIDER
  if (VALID_PROVIDERS.indexOf(provider) === -1) {
    throw new Error(`Invalid provider (${provider})`)
  }
  if (provider === 'valhalla' && process.env.VALHALLA_DATA_DATE) {
    json.data.date = process.env.VALHALLA_DATA_DATE
  } else if (provider === 'osrm' && process.env.OSRM_DATA_DATE) {
    json.data.date = process.env.OSRM_DATA_DATE
  }

  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(json))
})
app.post('/api/', (req, res) => {
  req.setTimeout(apiTimeout)
  run(req.body)
    .then(data => res.json(data))
    .catch(err => sendInternalServerError(err, res))
})
app.get('/api/', (req, res) => {
  req.setTimeout(apiTimeout)
  const query = req.query

  try {
    const options = {
      origin: {
        type: 'Point',
        coordinates: parseQueryForCoordinates(req.query)
      },
      deintersect: parseQueryForDeintersect(req.query),
      cellSize: parseQueryForCellSize(req.query),
      provider: query.provider || DEFAULT_PROVIDER,
      profile: query.profile || 'car',
      radius: parseQueryForRadius(req.query),
      intervals: parseQueryForInterval(req.query)
    }

    run(options)
      .then(data => res.json(data))
      .catch(err => sendInternalServerError(err, res))
  } catch (err) {
    sendBadRequest(err.message, res)
  }
})

const httpPort = (argv.p || process.env.PORT) || defaultPort

app.listen(httpPort, () => {
  log.success(`IsoChrone server listening on port ${httpPort}!`)
})

// Parse the parameter and call isodist
async function run (options) {
  if (!(options.intervals instanceof Array)) {
    throw new Error('Invalid "intervals" value. Must be an array.')
  }
  options.intervals = _.map(options.intervals, 'interval')
  for (const interval of options.intervals) {
    if (typeof interval !== 'number') {
      throw new Error('Invalid "intervals" value. Must contain numbers.')
    }
    if (interval <= 0) {
      throw new Error('Invalid "intervals" value. Must contain positive numbers.')
    }
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
  })

  if (options.radius <= 0) {
    const maxMinutes = Math.max(...options.intervals)
    // 120km/h / 60mins * maxMinutes
    options.radius = 120 / 60 * maxMinutes
  }

  if (VALID_PROVIDERS.indexOf(options.provider) === -1) {
    throw new Error(`Invalid provider (${options.provider})`)
  }

  const origin = {
    type: 'Point',
    coordinates: []
  }

  if (!options.origin) {
    throw new Error('Missing required parameter "origin"')
  }
  if (!(options.origin.coordinates instanceof Array)) {
    throw new Error('Invalid "origin" value. Must be an array.')
  }
  if (options.origin.coordinates.length !== 2) {
    throw new Error('Invalid "origin" value. Must contain 2 elements.')
  }
  for (const coord of options.origin.coordinates) {
    if (typeof coord !== 'number') {
      throw new Error('Invalid "origin" value. Must contain 2 numbers.')
    }
    origin.coordinates.push(coord)
  }

  try {
    runningTasks++
    totalTasks++
    return await IsoChrone(origin, options)
  } finally {
    runningTasks--
  }
}
