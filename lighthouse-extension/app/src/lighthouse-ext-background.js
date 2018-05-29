/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const background = require('./lighthouse-background');

const ExtensionProtocol = require('../../../lighthouse-core/gather/connections/extension');
const log = require('lighthouse-logger');
const assetSaver = require('../../../lighthouse-core/lib/asset-saver.js');

/** @typedef {import('../../../lighthouse-core/gather/connections/connection.js')} Connection */

const STORAGE_KEY = 'lighthouse_audits';
const SETTINGS_KEY = 'lighthouse_settings';

let lighthouseIsRunning = false;
/** @type {?[string, string, string]} */
let latestStatusLog = null;

/**
 * Sets the extension badge text.
 * @param {string=} optUrl If present, sets the badge text to "Testing <url>".
 *     Otherwise, restore the default badge text.
 */
function updateBadgeUI(optUrl) {
  lighthouseIsRunning = !!optUrl;
  if ('chrome' in window && chrome.runtime) {
    const manifest = chrome.runtime.getManifest();
    if (!manifest.browser_action || !manifest.browser_action.default_icon) {
      return;
    }

    let title = manifest.browser_action.default_title || '';
    let path = manifest.browser_action.default_icon[38];

    if (lighthouseIsRunning) {
      title = `Testing ${optUrl}`;
      path = 'images/lh_logo_icon_light.png';
    }

    chrome.browserAction.setTitle({title});
    chrome.browserAction.setIcon({path});
  }
}

/**
 * @param {{flags: LH.Flags}} options Lighthouse options.
 * @param {Array<string>} categoryIDs Name values of categories to include.
 * @return {Promise<LH.RunnerResult|void>}
 */
async function runLighthouseInExtension(options, categoryIDs) {
  // Default to 'info' logging level.
  log.setLevel('info');
  const connection = new ExtensionProtocol();
  options.flags = Object.assign({}, options.flags, {output: 'html'});

  const url = await connection.getCurrentTabURL();
  const runnerResult = await background.runLighthouseForConnection(connection, url, options,
    categoryIDs, updateBadgeUI);
  if (!runnerResult) {
    // For now, should always be a runnerResult as the extension can't do `gatherMode`
    throw new Error('no runnerResult generated by Lighthouse');
  }

  const blobURL = createReportPageAsBlob(runnerResult);
  await new Promise(resolve => chrome.windows.create({url: blobURL}, resolve));
}

/**
 * Run lighthouse for connection and provide similar results as in CLI.
 * @param {Connection} connection
 * @param {string} url
 * @param {{flags: LH.Flags} & {outputFormat: string, logAssets: boolean}} options Lighthouse options.
          Specify outputFormat to change the output format.
 * @param {Array<string>} categoryIDs Name values of categories to include.
 * @return {Promise<string|Array<string>|void>}
 */
async function runLighthouseAsInCLI(connection, url, options, categoryIDs) {
  log.setLevel('info');
  options.flags = Object.assign({}, options.flags, {output: options.outputFormat});

  const results = await background.runLighthouseForConnection(connection, url, options,
    categoryIDs);
  if (results) {
    if (options && options.logAssets) {
      await assetSaver.logAssets(results.artifacts, results.lhr.audits);
    }

    return results.report;
  }
}


/**
 * @param {LH.RunnerResult} runnerResult Lighthouse results object
 * @return {string} Blob URL of the report (or error page) HTML
 */
function createReportPageAsBlob(runnerResult) {
  performance.mark('report-start');
  const html = runnerResult.report;
  const blob = new Blob([html], {type: 'text/html'});
  const blobURL = URL.createObjectURL(blob);

  performance.mark('report-end');
  performance.measure('generate report', 'report-start', 'report-end');
  return blobURL;
}

/**
 * Save currently selected set of category categories to local storage.
 * @param {{selectedCategories: Array<string>, useDevTools: boolean}} settings
 */
function saveSettings(settings) {
  const storage = {
    [STORAGE_KEY]: {},
    [SETTINGS_KEY]: {},
  };

  // Stash selected categories.
  background.getDefaultCategories().forEach(category => {
    storage[STORAGE_KEY][category.id] = settings.selectedCategories.includes(category.id);
  });

  // Stash throttling setting.
  storage[SETTINGS_KEY].useDevTools = settings.useDevTools;

  // Save object to chrome local storage.
  chrome.storage.local.set(storage);
}

/**
 * Load selected category categories from local storage.
 * @return {Promise<{selectedCategories: Array<string>, useDevTools: boolean}>}
 */
function loadSettings() {
  return new Promise(resolve => {
    // Protip: debug what's in storage with:
    //   chrome.storage.local.get(['lighthouse_audits'], console.log)
    chrome.storage.local.get([STORAGE_KEY, SETTINGS_KEY], result => {
      // Start with list of all default categories set to true so list is
      // always up to date.
      const defaultCategories = {};
      background.getDefaultCategories().forEach(category => {
        defaultCategories[category.id] = true;
      });

      // Load saved categories and settings, overwriting defaults with any
      // saved selections.
      const savedCategories = Object.assign(defaultCategories, result[STORAGE_KEY]);

      const defaultSettings = {
        useDevTools: false,
      };
      const savedSettings = Object.assign(defaultSettings, result[SETTINGS_KEY]);

      resolve({
        useDevTools: !!savedSettings.useDevTools,
        selectedCategories: Object.keys(savedCategories).filter(cat => savedCategories[cat]),
      });
    });
  });
}

/** @param {(status: [string, string, string]) => void} listenCallback */
function listenForStatus(listenCallback) {
  log.events.addListener('status', function(log) {
    latestStatusLog = log;
    listenCallback(log);
  });

  // Show latest saved status log to give immediate feedback
  // when reopening the popup message when lighthouse is running
  if (lighthouseIsRunning && latestStatusLog) {
    listenCallback(latestStatusLog);
  }
}

function isRunning() {
  return lighthouseIsRunning;
}

// Run when in extension context, but not in devtools.
if ('chrome' in window && chrome.runtime) {
  chrome.runtime.onInstalled.addListener(details => {
    if (details.previousVersion) {
      // eslint-disable-next-line no-console
      console.log('previousVersion', details.previousVersion);
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  // Export for popup.js to import types. We don't want tsc to infer an index
  // type, so use exports instead of module.exports.
  exports.runLighthouseInExtension = runLighthouseInExtension;
  exports.getDefaultCategories = background.getDefaultCategories;
  exports.isRunning = isRunning;
  exports.listenForStatus = listenForStatus;
  exports.saveSettings = saveSettings;
  exports.loadSettings = loadSettings;
}

// Expose on window for extension, other consumers of file.
// @ts-ignore
window.runLighthouseInExtension = runLighthouseInExtension;
// @ts-ignore
window.runLighthouseAsInCLI = runLighthouseAsInCLI;
// @ts-ignore
window.getDefaultCategories = background.getDefaultCategories;
// @ts-ignore
window.isRunning = isRunning;
// @ts-ignore
window.listenForStatus = listenForStatus;
// @ts-ignore
window.loadSettings = loadSettings;
// @ts-ignore
window.saveSettings = saveSettings;
