/**
 * log.js
 *
 * @author  Ringo Leese <r.leese@locr.com>
 * @license MIT
 */
import chalk from 'chalk'
import singleLineLog from './single-line-log.mjs'

const write = singleLineLog(process.stderr)

function log (data) {
  write(`${chalk.bold.cyan(' .. ')} ${data}`)
}

log.success = data => {
  write(`${chalk.bold.green(' OK ')} ${data}`)
  console.error('')
}

log.warn = data => {
  write(`${chalk.bold.yellow('WARN')} ${data}`)
  console.error('')
}

log.fail = data => {
  write(`${chalk.bold.red('FAIL')} ${data}`)
  console.error('')
  const err = new Error(data)
  err.known = true
  throw err
}

export default log
