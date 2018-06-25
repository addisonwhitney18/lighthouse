/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Interactive = require('../../../audits/metrics/interactive.js');
const Runner = require('../../../runner.js');
const Util = require('../../../report/html/renderer/util');
const assert = require('assert');
const options = Interactive.defaultOptions;

const acceptableTrace = require('../../fixtures/traces/progressive-app-m60.json');
const acceptableDevToolsLog =
    require('../../fixtures/traces/progressive-app-m60.devtools.log.json');

const redirectTrace = require('../../fixtures/traces/site-with-redirect.json');
const redirectDevToolsLog = require('../../fixtures/traces/site-with-redirect.devtools.log.json');


/* eslint-env mocha */
describe('Performance: interactive audit', () => {
  it('should compute interactive', () => {
    const artifacts = Object.assign({
      traces: {
        [Interactive.DEFAULT_PASS]: acceptableTrace,
      },
      devtoolsLogs: {
        [Interactive.DEFAULT_PASS]: acceptableDevToolsLog,
      },
    }, Runner.instantiateComputedArtifacts());

    const settings = {throttlingMethod: 'provided'};
    return Interactive.audit(artifacts, {options, settings}).then(output => {
      assert.equal(output.score, 1);
      assert.equal(Math.round(output.rawValue), 1582);
      assert.equal(Util.formatDisplayValue(output.displayValue), '1,580\xa0ms');
    });
  });

  it('should compute interactive on pages with redirect', () => {
    const artifacts = Object.assign({
      traces: {
        [Interactive.DEFAULT_PASS]: redirectTrace,
      },
      devtoolsLogs: {
        [Interactive.DEFAULT_PASS]: redirectDevToolsLog,
      },
    }, Runner.instantiateComputedArtifacts());

    const settings = {throttlingMethod: 'provided'};
    return Interactive.audit(artifacts, {options, settings}).then(output => {
      assert.equal(output.score, 0.97);
      assert.equal(Math.round(output.rawValue), 2712);
      assert.equal(Util.formatDisplayValue(output.displayValue), '2,710\xa0ms');
    });
  });
});
