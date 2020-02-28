/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

// Example:
//     node lighthouse-core/scripts/compare-runs.js --name my-collection --collect -n 3 --lh-flags='--only-audits=unminified-javascript' --urls https://www.example.com https://www.nyt.com
//     node lighthouse-core/scripts/compare-runs.js --name my-collection --summarize --measure-filter 'loadPage|connect'
//     node lighthouse-core/scripts/compare-runs.js --name base --name pr --compare

// The script will report both timings and perf metric results. View just one of them but using --filter:
//     node lighthouse-core/scripts/compare-runs.js --summarize --name pr --filter=metric

const fs = require('fs');
const mkdir = fs.promises.mkdir;
const glob = require('glob');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const yargs = require('yargs');

const {ProgressLogger} = require('./lantern/collect/common.js');

const LH_ROOT = `${__dirname}/../..`;
const ROOT_OUTPUT_DIR = `${LH_ROOT}/timings-data`;

const argv = yargs
  .help('help')
  .describe({
    // common flags
    'name': 'Unique identifier, makes the folder for storing LHRs. Not a path',
    'report-exclude': 'Regex of properties to exclude. Set to "none" to disable default',
    'collect': 'Gathers, audits and saves LHRs to disk',
    // --gather
    'gather': 'Just gathers',
    'lh-flags': 'Lighthouse flags',
    'urls': 'Urls to run',
    'n': 'Number of times to run',
    'audit': 'Audits from the artifacts on disk',
    // --summarize
    'summarize': 'Prints statistics report',
    'filter': 'Regex inclusion filter applied to key. Optional',
    'reportExclude': 'Regex of columns keys to exclude.',
    'output': 'table, json',
    // --compare
    'compare': 'Compare two sets of LHRs',
    'delta-property-sort': 'Property to sort by its delta',
    'desc': 'Set to override default ascending sort',
  })
  .string('filter')
  .alias({'gather': 'G', 'audit': 'A'})
  .default('report-exclude', 'key|min|max|stdev|^n$')
  .default('delta-property-sort', 'mean')
  .default('output', 'table')
  .array('urls')
  .string('lh-flags')
  .default('desc', false)
  .default('lh-flags', '')
  .strict() // fail on unknown commands
  .wrap(yargs.terminalWidth())
.argv;

const reportExcludeRegex =
  argv.reportExclude !== 'none' ? new RegExp(argv.reportExclude, 'i') : null;

/**
 * @param {string} name
 */
function dir(name) {
  return `${ROOT_OUTPUT_DIR}/${name}`;
}

/**
 * @param {number[]} values
 */
function sum(values) {
  return values.reduce((sum, value) => sum + value);
}

/**
 * @param {number[]} values
 */
function average(values) {
  return sum(values) / values.length;
}

/**
 * @param {number[]} values
 */
function sampleStdev(values) {
  const mean = average(values);
  const variance = sum(values.map(value => (value - mean) ** 2)) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * @param {string} url
 * @return string
 */
function urlToFolder(url) {
  return url.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Round to the tenth.
 * @param {number} value
 */
function round(value) {
  return Math.round(value * 10) / 10;
}

/**
 * Get box-drawing progress bar
 * @param {number} i
 * @param {number} total
 * @return {string}
 */
function getProgressBar(i, total = argv.n * argv.urls.length) {
  return new Array(Math.round(i * 40 / total)).fill('▄').join('').padEnd(40);
}

async function gather() {
  const outputDir = dir(argv.name);
  await mkdir(ROOT_OUTPUT_DIR, {recursive: true});
  // Don't overwrite a previous collection
  if (fs.existsSync(outputDir)) throw new Error(`folder already exists: ${outputDir}`);
  await mkdir(outputDir);

  const progress = new ProgressLogger();
  progress.log('Gathering…');

  for (const url of argv.urls) {
    for (let i = 0; i < argv.n; i++) {
      const gatherDir = `${outputDir}/${urlToFolder(url)}/${i}/`;
      await mkdir(gatherDir, {recursive: true});
      progress.progress(getProgressBar(i));

      const cmd = [
        'node',
        `${LH_ROOT}/lighthouse-cli`,
        url,
        `--gather-mode=${gatherDir}`,
        argv.lhFlags,
      ].join(' ');
      await exec(cmd);
    }
  }
  progress.closeProgress();
}

async function audit() {
  const outputDir = dir(argv.name);
  const progress = new ProgressLogger();
  progress.log('Auditing…');

  for (const url of argv.urls) {
    for (let i = 0; i < argv.n; i++) {
      const gatherDir = `${outputDir}/${urlToFolder(url)}/${i}/`;
      progress.progress(getProgressBar(i));

      const cmd = [
        'node',
        `${LH_ROOT}/lighthouse-cli`,
        url,
        `--audit-mode=${gatherDir}`,
        `--output-path=${outputDir}/lhr-${urlToFolder(url)}-${i}.json`,
        '--output=json',
        argv.lhFlags,
      ].join(' ');
      await exec(cmd);
    }
  }
  progress.closeProgress();
}

/**
 * @param {string} name
 */
function aggregateResults(name) {
  const outputDir = dir(name);

  // `${url}@@@${entry.name}` -> duration
  /** @type {Map<string, number[]>} */
  const durationsMap = new Map();

  for (const lhrPath of glob.sync(`${outputDir}/*.json`)) {
    const lhrJson = fs.readFileSync(lhrPath, 'utf-8');
    /** @type {LH.Result} */
    const lhr = JSON.parse(lhrJson);

    const metrics = lhr.audits.metrics ?
    /** @type {!LH.Audit.Details.Table} */ (lhr.audits.metrics.details).items[0] :
      {};
    const allEntries = {
      metric: Object.entries(metrics).filter(([name]) => !name.endsWith('Ts')),
      timing: lhr.timing.entries.map(entry => ([entry.name, entry.duration])),
    };

    Object.entries(allEntries).forEach(([kind, entries]) => {
      // Group the durations of each entry of the same name.
      /** @type {Record<string, number[]>} */
      const durationsByName = {};

      for (const [name, duration] of entries) {
        const durations = durationsByName[name] = durationsByName[name] || [];
        durations.push(Number(duration));
      }

      // Push the aggregate time of each unique (by name) entry.
      for (const [name, durationsForSingleRun] of Object.entries(durationsByName)) {
        const key = `${lhr.requestedUrl}@@@${kind}@@@${name}`;
        let durations = durationsMap.get(key);
        if (!durations) {
          durations = [];
          durationsMap.set(key, durations);
        }
        durations.push(sum(durationsForSingleRun));
      }
    });
  }

  return [...durationsMap].map(([key, durations]) => {
    const [url, _, entryName] = key.split('@@@');
    const mean = average(durations);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const stdev = sampleStdev(durations);
    return {
      key,
      name: entryName,
      url,
      n: durations.length,
      mean: round(mean),
      stdev: round(stdev),
      // https://en.wikipedia.org/wiki/Coefficient_of_variation
      CV: `${(stdev / mean * 100).toLocaleString()}%`,
      min: round(min),
      max: round(max),
    };
  }).sort((a, b) => {
    // sort by {measure, url}
    const measureComp = a.name.localeCompare(b.name);
    if (measureComp !== 0) return measureComp;
    return a.url.localeCompare(b.url);
  });
}

/**
 * @param {*[]} results
 */
function filter(results) {
  const includeFilter = argv.filter ? new RegExp(argv.filter, 'i') : null;

  results.forEach((result, i) => {
    for (const propName of Object.keys(result)) {
      if (reportExcludeRegex && reportExcludeRegex.test(propName)) delete result[propName];
    }

    if (includeFilter && !includeFilter.test(result.key)) {
      delete results[i];
    }
  });
}

/**
 * @param {number=} value
 * @return {value is number}
 */
function isNumber(value) {
  return typeof value === 'number';
}

function summarize() {
  const results = aggregateResults(argv.name);
  filter(results);
  print(results);
}

/**
 * @param {number=} base
 * @param {number=} other
 */
function compareValues(base, other) {
  const basePart = isNumber(base) ? base : 'N/A';
  const otherPart = isNumber(other) ? other : 'N/A';
  return {
    description: `${basePart} -> ${otherPart}`,
    delta: isNumber(base) && isNumber(other) ? (other - base) : undefined,
  };
}

function compare() {
  if (!Array.isArray(argv.name) || argv.name.length !== 2) {
    throw new Error('expected two entries for name option');
  }

  const baseResults = aggregateResults(argv.name[0]);
  const otherResults = aggregateResults(argv.name[1]);

  const keys = [...new Set([...baseResults.map(r => r.key), ...otherResults.map(r => r.key)])];
  const results = keys.map(key => {
    const baseResult = baseResults.find(result => result.key === key);
    const otherResult = otherResults.find(result => result.key === key);

    const someResult = baseResult || otherResult;
    if (!someResult) throw new Error('impossible');

    const mean = compareValues(baseResult && baseResult.mean, otherResult && otherResult.mean);
    const stdev = compareValues(baseResult && baseResult.stdev, otherResult && otherResult.stdev);
    // eslint-disable-next-line max-len
    const cv = compareValues(baseResult && parseFloat(baseResult.CV), otherResult && parseFloat(otherResult.CV));
    const min = compareValues(baseResult && baseResult.min, otherResult && otherResult.min);
    const max = compareValues(baseResult && baseResult.max, otherResult && otherResult.max);

    return {
      'name': someResult.name,
      'url': someResult.url,
      'mean': mean.description,
      'mean Δ': isNumber(mean.delta) ? round(mean.delta) : undefined,
      'stdev': stdev.description,
      'stdev Δ': isNumber(stdev.delta) ? round(stdev.delta) : undefined,
      'cv': cv.description,
      'cv Δ': isNumber(cv.delta) ? round(cv.delta) : undefined,
      'min': min.description,
      'min Δ': isNumber(min.delta) ? round(min.delta) : undefined,
      'max': max.description,
      'max Δ': isNumber(max.delta) ? round(max.delta) : undefined,
    };
  });

  const sortByKey = `${argv.deltaPropertySort} Δ`;
  results.sort((a, b) => {
    // @ts-ignore - shhh tsc.
    const aValue = a[sortByKey];
    // @ts-ignore - shhh tsc.
    const bValue = b[sortByKey];

    // Always put the keys missing a result at the bottom of the table.
    if (!isNumber(aValue)) return 1;
    else if (!isNumber(bValue)) return -1;

    return (argv.desc ? 1 : -1) * (Math.abs(aValue) - Math.abs(bValue));
  });
  filter(results);
  print(results);
}

/**
 * @param {*[]} results
 */
function print(results) {
  if (argv.output === 'table') {
    // eslint-disable-next-line no-console
    console.table(results);
  } else if (argv.output === 'json') {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(results, null, 2));
  }
}

async function main() {
  if (argv.gather) await gather();
  if (argv.audit) await audit();
  if (argv.collect) {
    await gather();
    await audit();
  }
  if (argv.summarize) summarize();
  if (argv.compare) compare();
}

main();
