fs = require 'fs'
sys = require 'sys'
{spawn, exec} = require 'child_process'
util = require 'util'
async = require 'async'
_ = require 'underscore'

mainDir = './'

excludedHintFiles = []
excludedHintDirs = ['node_modules']

task 'spec', 'run vows specs', ->
  vowsFiles = []
  specFetch = (dir) ->
    files = fs.readdirSync dir
    for filename in files
      filepath = dir + '/' + filename
      if ((/^(\w+)\_spec.js$/).test filename)
        vowsFiles.push(filepath)
      else
        try
          specFetch filepath
        catch error

  specFetch('./spec')
  console.log('Running:\n  vows ');
  vowsFiles.forEach (file, index) ->
    console.log('\t' + file)

  vowsFiles.push('-spec')

  proc = spawn 'vows', vowsFiles
  proc.stdout.on 'data', (data) ->
    process.stdout.write data
  proc.stderr.on 'data', (data) ->
    process.stderr.write data
  proc.on 'exit', (code) ->
    console.log('Done.')

task 'hint', 'run jshint on all files in the main directory', ->
  tasks = {}
  hint mainDir, tasks
  async.series tasks,(err, results) ->
    output = _.map results, (log, path) ->
      return log
    console.log output.join ''

hint = (dir, tasks) ->
  if dir == './'
    dir = __dirname+'/'
  for filename in fs.readdirSync dir
    name = filename.match /^(\w+)\.js$/
    excluded = _.detect excludedHintFiles, (exclude) ->
      return exclude == filename
    if name and name.length > 1 and excluded == undefined
      tasks[dir+filename] = addToTasks dir+filename
    else if (filename.indexOf '.') == -1 && excludedHintDirs.indexOf(filename) == -1
      try
        hint dir+filename+'/', tasks
      catch error

addToTasks = (filepath) ->
  return (callback) ->
    hintProcess = spawn 'jshint', [filepath, '--config', 'jshint_config.json']
    hintProcess.stdout.on 'data', (result) ->
      console.log result.toString()
    hintProcess.stderr.on 'data', (result) ->
      console.error result.toString()
    hintProcess.on 'exit', (code) ->
      result = if code == 0 then '.' else 'x'
      process.stdout.write result
      callback(null)