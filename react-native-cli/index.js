#!/usr/bin/env node

/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// /!\ DO NOT MODIFY THIS FILE /!\
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//
// react-native-cli is installed globally on people's computers. This means
// that it is extremely difficult to have them upgrade the version and
// because there's only one global version installed, it is very prone to
// breaking changes.
//
// The only job of react-native-cli is to init the repository and then
// forward all the commands to the local version of react-native.
//
// If you need to add a new command, please add it to local-cli/.
//
// The only reason to modify this file is to add more warnings and
// troubleshooting information for the `react-native init` command.
//
// Do not make breaking changes! We absolutely don't want to have to
// tell people to update their global version of react-native-cli.
//
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// /!\ DO NOT MODIFY THIS FILE /!\
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

'use strict';

var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var chalk = require('chalk');
var prompt = require('prompt');
var semver = require('semver');
var os = require('os');

var CLI_MODULE_PATH = function() {
  return path.resolve(
    process.cwd(),
    'node_modules',
    'react-native',
    'cli.js'
  );
};

var REACT_NATIVE_PACKAGE_JSON_PATH = function() {
  return path.resolve(
    process.cwd(),
    'node_modules',
    'react-native',
    'package.json'
  );
};

checkForVersionArgument();

var cli;
var cliPath = CLI_MODULE_PATH();
if (fs.existsSync(cliPath)) {
  cli = require(cliPath);
}

if (cli) {
  cli.run();
} else {
  var args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      'You did not pass any commands, did you mean to run `react-native init`?'
    );
    process.exit(1);
  }

  switch (args[0]) {
  case 'init':
    if (args[1]) {
      var logLevel = '';
      if (process.argv.indexOf('--verbose') >= 0) {
        logLevel = 'verbose';
      } else if (process.argv.indexOf('--debug') >= 0) {
        logLevel = 'debug';
      }
      init(args[1], logLevel);
    } else {
      console.error(
        'Usage: react-native init <ProjectName> [--debug|--verbose]'
      );
      process.exit(1);
    }
    break;
  default:
    console.error(
      'Command `%s` unrecognized. ' +
      'Did you mean to run this inside a react-native project?',
      args[0]
    );
    process.exit(1);
    break;
  }
}

function validatePackageName(name) {
  if (!name.match(/^[$A-Z_][0-9A-Z_$]*$/i)) {
    console.error(
      '"%s" is not a valid name for a project. Please use a valid identifier ' +
        'name (alphanumeric).',
      name
    );
    process.exit(1);
  }

  if (name === 'React') {
    console.error(
      '"%s" is not a valid name for a project. Please do not use the ' +
        'reserved word "React".',
      name
    );
    process.exit(1);
  }
}

function init(name, logLevel) {
  validatePackageName(name);

  if (fs.existsSync(name)) {
    createAfterConfirmation(name, logLevel);
  } else {
    createProject(name, logLevel);
  }
}

function createAfterConfirmation(name, logLevel) {
  prompt.start();

  var property = {
    name: 'yesno',
    message: 'Directory ' + name + ' already exists. Continue?',
    validator: /y[es]*|n[o]?/,
    warning: 'Must respond yes or no',
    default: 'no'
  };

  prompt.get(property, function (err, result) {
    if (result.yesno[0] === 'y') {
      createProject(name, logLevel);
    } else {
      console.log('Project initialization canceled');
      process.exit();
    }
  });
}

function createProject(name, logLevel) {
  var root = path.resolve(name);
  var projectName = path.basename(root);

  console.log(
    'This will walk you through creating a new React Native project in',
    root
  );

  if (!fs.existsSync(root)) {
    fs.mkdirSync(root);
  }

  var packageJson = {
    name: projectName,
    version: '0.0.1',
    private: true,
    scripts: {
      start: 'node node_modules/react-native/local-cli/cli.js start'
    }
  };
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(packageJson));
  process.chdir(root);

  console.log('Installing react-native package from npm...');

  run(root, projectName, logLevel);
}

function run(root, projectName, logLevel) {
  var args = ['install', '--save'];
  if (logLevel === 'verbose') {
    args.push('--verbose');
  }
  args.push('react-native');
  var spawnArgs = {};
  if (logLevel === 'debug' || logLevel === 'verbose') {
    spawnArgs = {stdio: 'inherit'};
  }
  var proc;
  if (/^win/.test(process.platform)) {
    args.unshift('npm');
    args.unshift('/c');
    proc = spawn('cmd', args, spawnArgs);
  } else {
    proc = spawn('npm', args, spawnArgs);
  }
  proc.on('close', function (code) {
    if (code !== 0) {
      console.error('`npm install --save react-native` failed');
      return;
    }

    checkNodeVersion();

    cli = require(CLI_MODULE_PATH());
    cli.init(root, projectName);
  });
}

function checkNodeVersion() {
  var packageJson = require(REACT_NATIVE_PACKAGE_JSON_PATH());
  if (!packageJson.engines || !packageJson.engines.node) {
    return;
  }
  if (!semver.satisfies(process.version, packageJson.engines.node)) {
    console.error(chalk.red(
        'You are currently running Node %s but React Native requires %s. ' +
        'Please use a supported version of Node.\n' +
        'See https://facebook.github.io/react-native/docs/getting-started.html'
      ),
      process.version,
      packageJson.engines.node);
  }
}

function checkForVersionArgument() {
  if (process.argv.indexOf('-v') >= 0 || process.argv.indexOf('--version') >= 0) {
    console.log('react-native-cli: ' + require('./package.json').version);
    try {
      console.log('react-native: ' + require(REACT_NATIVE_PACKAGE_JSON_PATH()).version);
    } catch (e) {
      console.log('react-native: n/a - not inside a React Native project directory')
    }
    process.exit();
  }
}
