/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const Audit = require('../../../audits/accessibility/tabindex.js');
const assert = require('assert');

/* eslint-env mocha */

describe('Accessibility: tabindex audit', () => {
  it('generates an audit output', () => {
    const artifacts = {
      Accessibility: {
        violations: [{
          id: 'tabindex',
          nodes: [],
          help: 'http://example.com/'
        }]
      }
    };

    const output = Audit.audit(artifacts);
    assert.equal(output.rawValue, false);
    assert.equal(output.displayValue, '');
  });

  it('generates an audit output (single node)', () => {
    const artifacts = {
      Accessibility: {
        violations: [{
          id: 'tabindex',
          nodes: [{}],
          help: 'http://example.com/'
        }]
      }
    };

    const output = Audit.audit(artifacts);
    assert.equal(output.rawValue, false);
    assert.equal(output.displayValue, '');
  });

  it('doesn\'t throw an error when violations is undefined', () => {
    const artifacts = {
      Accessibility: {
        violations: undefined
      }
    };

    const output = Audit.audit(artifacts);
    assert.equal(output.description, 'No element has a `tabindex` attribute greater than 0');
  });
});
