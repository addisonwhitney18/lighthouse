/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview The entry point for rendering the Lighthouse report based on the JSON output.
 *    This file is injected into the report HTML along with the JSON report.
 *
 * Dummy text for ensuring report robustness: </script> pre$`post %%LIGHTHOUSE_JSON%%
 */

/** @typedef {import('./dom.js')} DOM */
/** @typedef {import('./details-renderer.js').DetailsJSON} DetailsJSON */

/* globals self, Util, DetailsRenderer, CategoryRenderer, PerformanceCategoryRenderer */

class ReportRenderer {
  /**
   * @param {DOM} dom
   */
  constructor(dom) {
    /** @type {DOM} */
    this._dom = dom;
    /** @type {ParentNode} */
    this._templateContext = this._dom.document();
  }

  /**
   * @param {ReportJSON} report
   * @param {Element} container Parent element to render the report into.
   */
  renderReport(report, container) {
    // If any mutations happen to the report within the renderers, we want the original object untouched
    const clone = /** @type {ReportJSON} */ (JSON.parse(JSON.stringify(report)));

    // TODO(phulce): we all agree this is technical debt we should fix
    if (typeof clone.categories !== 'object') throw new Error('No categories provided.');
    clone.reportCategories = Object.values(clone.categories);
    ReportRenderer.smooshAuditResultsIntoCategories(clone.audits, clone.reportCategories);

    container.textContent = ''; // Remove previous report.
    container.appendChild(this._renderReport(clone));
    return /** @type {Element} **/ (container);
  }

  /**
   * Define a custom element for <templates> to be extracted from. For example:
   *     this.setTemplateContext(new DOMParser().parseFromString(htmlStr, 'text/html'))
   * @param {ParentNode} context
   */
  setTemplateContext(context) {
    this._templateContext = context;
  }

  /**
   * @param {ReportJSON} report
   * @return {DocumentFragment}
   */
  _renderReportHeader(report) {
    const header = this._dom.cloneTemplate('#tmpl-lh-heading', this._templateContext);
    this._dom.find('.lh-config__timestamp', header).textContent =
        Util.formatDateTime(report.fetchTime);
    this._dom.find('.lh-product-info__version', header).textContent = report.lighthouseVersion;
    const url = /** @type {HTMLAnchorElement} */ (this._dom.find('.lh-metadata__url', header));
    url.href = report.finalUrl;
    url.textContent = report.finalUrl;
    const toolbarUrl = /** @type {HTMLAnchorElement}*/ (this._dom.find('.lh-toolbar__url', header));
    toolbarUrl.href = report.finalUrl;
    toolbarUrl.textContent = report.finalUrl;

    this._dom.find('.lh-env__item__ua', header).textContent = report.userAgent;

    const env = this._dom.find('.lh-env__items', header);
    const environment = Util.getEnvironmentDisplayValues(report.configSettings || {});
    environment.forEach(runtime => {
      const item = this._dom.cloneTemplate('#tmpl-lh-env__items', env);
      this._dom.find('.lh-env__name', item).textContent = runtime.name;
      this._dom.find('.lh-env__description', item).textContent = runtime.description;
      env.appendChild(item);
    });

    return header;
  }

  /**
   * @param {ReportJSON} report
   * @return {DocumentFragment}
   */
  _renderReportFooter(report) {
    const footer = this._dom.cloneTemplate('#tmpl-lh-footer', this._templateContext);
    this._dom.find('.lh-footer__version', footer).textContent = report.lighthouseVersion;
    this._dom.find('.lh-footer__timestamp', footer).textContent =
        Util.formatDateTime(report.fetchTime);
    return footer;
  }

  /**
   * Returns a div with a list of top-level warnings, or an empty div if no warnings.
   * @param {ReportJSON} report
   * @return {Node}
   */
  _renderReportWarnings(report) {
    if (!report.runWarnings || report.runWarnings.length === 0) {
      return this._dom.createElement('div');
    }

    const container = this._dom.cloneTemplate('#tmpl-lh-run-warnings', this._templateContext);
    const warnings = this._dom.find('ul', container);
    for (const warningString of report.runWarnings) {
      const warning = warnings.appendChild(this._dom.createElement('li'));
      warning.textContent = warningString;
    }

    return container;
  }

  /**
   * @param {ReportJSON} report
   * @return {DocumentFragment}
   */
  _renderReport(report) {
    const headerStickyContainer = this._dom.createElement('div', 'lh-header-sticky');
    headerStickyContainer.appendChild(this._renderReportHeader(report));
    const scoreContainer = this._dom.find('.lh-scores-container', headerStickyContainer);

    const container = this._dom.createElement('div', 'lh-container');

    const reportSection = container.appendChild(this._dom.createElement('div', 'lh-report'));

    reportSection.appendChild(this._renderReportWarnings(report));

    let scoreHeader;
    const isSoloCategory = report.reportCategories.length === 1;
    if (!isSoloCategory) {
      scoreHeader = this._dom.createElement('div', 'lh-scores-header');
    }

    const detailsRenderer = new DetailsRenderer(this._dom);
    const categoryRenderer = new CategoryRenderer(this._dom, detailsRenderer);
    categoryRenderer.setTemplateContext(this._templateContext);
    const perfCategoryRenderer = new PerformanceCategoryRenderer(this._dom, detailsRenderer);
    perfCategoryRenderer.setTemplateContext(this._templateContext);

    const categories = reportSection.appendChild(this._dom.createElement('div', 'lh-categories'));

    for (const category of report.reportCategories) {
      if (scoreHeader) {
        scoreHeader.appendChild(categoryRenderer.renderScoreGauge(category));
      }

      let renderer = categoryRenderer;
      if (category.id === 'performance') {
        renderer = perfCategoryRenderer;
      }
      categories.appendChild(renderer.render(category, report.categoryGroups));
    }

    if (scoreHeader) {
      const scoreScale = this._dom.cloneTemplate('#tmpl-lh-scorescale', this._templateContext);
      scoreContainer.appendChild(scoreHeader);
      scoreContainer.appendChild(scoreScale);
    }

    reportSection.appendChild(this._renderReportFooter(report));

    const reportFragment = this._dom.createFragment();
    reportFragment.appendChild(headerStickyContainer);
    reportFragment.appendChild(container);

    return reportFragment;
  }

  /**
   * Place the AuditResult into the auditDfn (which has just weight & group)
   * @param {Object<string, AuditResultJSON>} audits
   * @param {Array<CategoryJSON>} reportCategories
   */
  static smooshAuditResultsIntoCategories(audits, reportCategories) {
    for (const category of reportCategories) {
      category.auditRefs.forEach(auditMeta => {
        const result = audits[auditMeta.id];
        auditMeta.result = result;
      });
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReportRenderer;
} else {
  self.ReportRenderer = ReportRenderer;
}

/**
 * @typedef {{
      rawValue: (number|boolean|undefined),
      id: string,
      title: string,
      description: string,
      explanation?: string,
      errorMessage?: string,
      displayValue?: string|Array<string|number>,
      scoreDisplayMode: string,
      error: boolean,
      score: (number|null),
      details?: DetailsJSON,
  }} AuditResultJSON
 */

/**
 * @typedef {{
      id: string,
      score: (number|null),
      weight: number,
      group?: string,
      result: AuditResultJSON
  }} AuditJSON
 */

/**
 * @typedef {{
      title: string,
      id: string,
      score: (number|null),
      description?: string,
      manualDescription: string,
      auditRefs: Array<AuditJSON>
  }} CategoryJSON
 */

/**
 * @typedef {{
      title: string,
      description?: string,
  }} GroupJSON
 */

/**
 * @typedef {{
      lighthouseVersion: string,
      userAgent: string,
      fetchTime: string,
      timing: {total: number},
      requestedUrl: string,
      finalUrl: string,
      runWarnings?: Array<string>,
      artifacts: {traces: {defaultPass: {traceEvents: Array}}},
      audits: Object<string, AuditResultJSON>,
      categories: Object<string, CategoryJSON>,
      reportCategories: Array<CategoryJSON>,
      categoryGroups: Object<string, GroupJSON>,
      configSettings: LH.Config.Settings,
  }} ReportJSON
 */
