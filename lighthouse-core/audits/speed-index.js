/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/v2/renderer/util');

class SpeedIndex extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'speed-index',
      description: 'Speed Index',
      helpText: 'Speed Index shows how quickly the contents of a page are visibly populated. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/speed-index).',
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // see https://www.desmos.com/calculator/mdgjzchijg
      scorePODR: 1250,
      scoreMedian: 5500,
    };
  }

  /**
   * Audits the page to give a score for the Speed Index.
   * @see https://github.com/GoogleChrome/lighthouse/issues/197
   * @param {Artifacts} artifacts The artifacts from the gather phase.
   * @param {LH.Audit.Context} context
   * @return {Promise<AuditResult>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const metricComputationData = {trace, devtoolsLog, settings: context.settings};
    const metricResult = await artifacts.requestSpeedIndex(metricComputationData);

    return {
      score: Audit.computeLogNormalScore(
        metricResult.timing,
        context.options.scorePODR,
        context.options.scoreMedian
      ),
      rawValue: metricResult.timing,
      displayValue: Util.formatMilliseconds(metricResult.timing),
    };
  }
}

module.exports = SpeedIndex;
