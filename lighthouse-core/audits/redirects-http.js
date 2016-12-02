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

const Audit = require('./audit');

class RedirectsHTTP extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Security',
      name: 'redirects-http',
      description: 'Site redirects HTTP traffic to HTTPS',
      helpText: 'If you\'ve already set up HTTPS, make sure that you redirect all HTTP traffic to HTTPS. <a href="https://developers.google.com/web/tools/lighthouse/audits/http-redirects-to-https" target="_blank" rel="noreferrer noopener">Learn more</a>.',
      requiredArtifacts: ['HTTPRedirect']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    return RedirectsHTTP.generateAuditResult({
      rawValue: artifacts.HTTPRedirect.value,
      debugString: artifacts.HTTPRedirect.debugString
    });
  }
}

module.exports = RedirectsHTTP;
