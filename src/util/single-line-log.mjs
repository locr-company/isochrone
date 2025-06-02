/**
 * Based on https://github.com/cunzaizhuyi/single-line-log
 */

import stringWidth from 'string-width'

const MAX_PREV_LINES = 1000
const MOVE_LEFT = Buffer.from('1b5b3130303044', 'hex').toString()
const MOVE_UP = Buffer.from('1b5b3141', 'hex').toString()
const CLEAR_LINE = Buffer.from('1b5b304b', 'hex').toString()

export default function (stream) {
  const write = stream.write
  let str

  stream.write = function (data) {
    if (str && data !== str) {
      str = null
    }
    return write.apply(this, arguments)
  }

  if (stream === process.stderr || stream === process.stdout) {
    process.on('exit', function () {
      if (str !== null) {
        stream.write('')
      }
    })
  }

  let prevLineCount = 0
  const log = function () {
    str = ''
    const nextStr = Array.prototype.join.call(arguments, ' ')

    // Clear screen
    for (let i = 0; i < prevLineCount; i++) {
      str += MOVE_LEFT + CLEAR_LINE + (i < prevLineCount - 1 ? MOVE_UP : '')
    }

    // Actual log output
    str += nextStr
    stream.write(str)

    // How many lines to remove on next clear screen
    let prevLines = nextStr.split('\n')
    if (prevLines.length > MAX_PREV_LINES) {
      prevLines = prevLines.slice(0, MAX_PREV_LINES)
    }
    if (!(prevLines instanceof Array)) {
      return
    }

    prevLineCount = 0
    for (const prevLine of prevLines) {
      prevLineCount += Math.ceil(stringWidth(prevLine) / stream.columns) || 1
    }
  }

  log.clear = function () {
    stream.write('')
  }

  return log
}
