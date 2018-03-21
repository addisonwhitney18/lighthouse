/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audits a page to see how the size of DOM it creates. Stats like
 * tree depth, # children, and total nodes are returned. The score is calculated
 * based solely on the total number of nodes found on the page.
 */

'use strict';

const Audit = require('../audit');
const Util = require('../../report/v2/renderer/util.js');

const MAX_DOM_NODES = 1500;
const MAX_DOM_TREE_WIDTH = 60;
const MAX_DOM_TREE_DEPTH = 32;

// Parameters for log-normal CDF scoring. See https://www.desmos.com/calculator/9cyxpm5qgp.
const SCORING_POINT_OF_DIMINISHING_RETURNS = 2400;
const SCORING_MEDIAN = 3000;

class DOMSize extends Audit {
  static get MAX_DOM_NODES() {
    return MAX_DOM_NODES;
  }

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'dom-size',
      description: 'Avoids an excessive DOM size',
      failureDescription: 'Uses an excessive DOM size',
      helpText: 'Browser engineers recommend pages contain fewer than ' +
        `~${Util.formatNumber(DOMSize.MAX_DOM_NODES)} DOM nodes. The sweet spot is a tree ` +
        `depth < ${MAX_DOM_TREE_DEPTH} elements and fewer than ${MAX_DOM_TREE_WIDTH} ` +
        'children/parent element. A large DOM can increase memory usage, cause longer ' +
        '[style calculations](https://developers.google.com/web/fundamentals/performance/rendering/reduce-the-scope-and-complexity-of-style-calculations), ' +
        'and produce costly [layout reflows](https://developers.google.com/speed/articles/reflow). [Learn more](https://developers.google.com/web/fundamentals/performance/rendering/).',
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['DOMStats'],
    };
  }


  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const stats = artifacts.DOMStats;

    // Use the CDF of a log-normal distribution for scoring.
    //   <= 1500: score≈1
    //   3000: score=0.5
    //   >= 5970: score≈0
    const score = Audit.computeLogNormalScore(
      stats.totalDOMNodes,
      SCORING_POINT_OF_DIMINISHING_RETURNS,
      SCORING_MEDIAN
    );

    const headings = [
      {key: 'totalNodes', itemType: 'text', text: 'Total DOM Nodes'},
      {key: 'depth', itemType: 'text', text: 'Maximum DOM Depth'},
      {key: 'width', itemType: 'text', text: 'Maximum Children'},
    ];

    const items = [
      {
        totalNodes: Util.formatNumber(stats.totalDOMNodes),
        depth: Util.formatNumber(stats.depth.max),
        width: Util.formatNumber(stats.width.max),
      },
      {
        totalNodes: '',
        depth: stats.depth.snippet,
        width: stats.width.snippet,
      },
    ];

    return {
      score,
      rawValue: stats.totalDOMNodes,
      displayValue: `${Util.formatNumber(stats.totalDOMNodes)} nodes`,
      extendedInfo: {
        value: items,
      },
      details: Audit.makeTableDetails(headings, items),
    };
  }
}

module.exports = DOMSize;
