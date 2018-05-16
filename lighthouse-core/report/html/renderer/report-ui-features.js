/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Adds export button, print, and other dynamic functionality to
 * the report.
 */

const VIEWER_ORIGIN = 'https://googlechrome.github.io';

/* globals self URL Blob CustomEvent getFilenamePrefix window */

class ReportUIFeatures {
  /**
   * @param {!DOM} dom
   */
  constructor(dom) {
    /** @type {!ReportRenderer.ReportJSON} */
    this.json; // eslint-disable-line no-unused-expressions
    /** @protected {!DOM} */
    this._dom = dom;
    /** @protected {!Document} */
    this._document = this._dom.document();
    /** @private {boolean} */
    this._copyAttempt = false;
    /** @type {!Element} */
    this.exportButton; // eslint-disable-line no-unused-expressions
    /** @type {!Element} */
    this.headerSticky; // eslint-disable-line no-unused-expressions
    /** @type {!Element} */
    this.headerBackground; // eslint-disable-line no-unused-expressions
    /** @type {!Element} */
    this.lighthouseIcon; // eslint-disable-line no-unused-expressions
    /** @type {!Element} */
    this.scoresShadowWrapper; // eslint-disable-line no-unused-expressions
    /** @type {!Element} */
    this.productInfo; // eslint-disable-line no-unused-expressions
    /** @type {!Element} */
    this.toolbar; // eslint-disable-line no-unused-expressions
    /** @type {!Element} */
    this.toolbarMetadata; // eslint-disable-line no-unused-expressions
    /** @type {!Element} */
    this.env; // eslint-disable-line no-unused-expressions
    /** @type {!number} */
    this.headerOverlap = 0;
    /** @type {!number} */
    this.headerHeight = 0;
    /** @type {number} */
    this.latestKnownScrollY = 0;
    /** @type {boolean} */
    this.isAnimatingHeader = false;

    this.onMediaQueryChange = this.onMediaQueryChange.bind(this);
    this.onCopy = this.onCopy.bind(this);
    this.onExportButtonClick = this.onExportButtonClick.bind(this);
    this.onExport = this.onExport.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.printShortCutDetect = this.printShortCutDetect.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this.onChevronClick = this.onChevronClick.bind(this);
  }

  /**
   * Adds export button, print, and other functionality to the report. The method
   * should be called whenever the report needs to be re-rendered.
   * @param {!ReportRenderer.ReportJSON} report
   */
  initFeatures(report) {
    this.json = report;
    this._setupMediaQueryListeners();
    this._setupExportButton();
    this._setUpCollapseDetailsAfterPrinting();
    this._setupHeaderAnimation();
    this._resetUIState();
    this._document.addEventListener('keydown', this.printShortCutDetect);
    this._document.addEventListener('copy', this.onCopy);
  }

  /**
   * Fires a custom DOM event on target.
   * @param {string} name Name of the event.
   * @param {!Node=} target DOM node to fire the event on.
   * @param {*=} detail Custom data to include.
   */
  _fireEventOn(name, target = this._document, detail) {
    const event = new CustomEvent(name, detail ? {detail} : null);
    target.dispatchEvent(event);
  }

  _setupMediaQueryListeners() {
    const mediaQuery = self.matchMedia('(max-width: 600px)');
    mediaQuery.addListener(this.onMediaQueryChange);
    // Ensure the handler is called on init
    this.onMediaQueryChange(mediaQuery);
  }

  /**
   * Handle media query change events.
   * @param {!MediaQueryList} mql
   */
  onMediaQueryChange(mql) {
    const root = this._dom.find('.lh-root', this._document);
    root.classList.toggle('lh-narrow', mql.matches);
  }

  _setupExportButton() {
    this.exportButton = this._dom.find('.lh-export__button', this._document);
    this.exportButton.addEventListener('click', this.onExportButtonClick);

    const dropdown = this._dom.find('.lh-export__dropdown', this._document);
    dropdown.addEventListener('click', this.onExport);
  }

  _setupHeaderAnimation() {
    /** @type {!Element} **/
    const scoresWrapper = this._dom.find('.lh-scores-wrapper', this._document);
    this.headerOverlap = /** @type {!number} */
      (scoresWrapper.computedStyleMap().get('margin-top').value);

    this.headerSticky = this._dom.find('.lh-header-sticky', this._document);
    this.headerBackground = this._dom.find('.lh-header-bg', this._document);
    this.lighthouseIcon = this._dom.find('.lh-lighthouse', this._document);
    this.scoresShadowWrapper = this._dom.find('.lh-scores-wrapper__shadow', this._document);
    this.productInfo = this._dom.find('.lh-product-info', this._document);
    this.toolbar = this._dom.find('.lh-toolbar', this._document);
    this.toolbarMetadata = this._dom.find('.lh-toolbar__metadata', this._document);
    this.env = this._dom.find('.lh-env', this._document);

    this.headerHeight = this.headerBackground.computedStyleMap().get('height').value;

    this._document.addEventListener('scroll', this.onScroll, {passive: true});

    const toolbarChevron = this._dom.find('.lh-toggle-arrow', this.toolbar);
    toolbarChevron.addEventListener('click', this.onChevronClick);
  }

  /**
   * Handle copy events.
   * @param {!Event} e
   */
  onCopy(e) {
    // Only handle copy button presses (e.g. ignore the user copying page text).
    if (this._copyAttempt) {
      // We want to write our own data to the clipboard, not the user's text selection.
      e.preventDefault();
      e.clipboardData.setData('text/plain', JSON.stringify(this.json, null, 2));

      this._fireEventOn('lh-log', this._document, {
        cmd: 'log', msg: 'Report JSON copied to clipboard',
      });
    }

    this._copyAttempt = false;
  }

  /**
   * Copies the report JSON to the clipboard (if supported by the browser).
   * @suppress {reportUnknownTypes}
   */
  onCopyButtonClick() {
    this._fireEventOn('lh-analytics', this._document, {
      cmd: 'send',
      fields: {hitType: 'event', eventCategory: 'report', eventAction: 'copy'},
    });

    try {
      if (this._document.queryCommandSupported('copy')) {
        this._copyAttempt = true;

        // Note: In Safari 10.0.1, execCommand('copy') returns true if there's
        // a valid text selection on the page. See http://caniuse.com/#feat=clipboard.
        if (!this._document.execCommand('copy')) {
          this._copyAttempt = false; // Prevent event handler from seeing this as a copy attempt.

          this._fireEventOn('lh-log', this._document, {
            cmd: 'warn', msg: 'Your browser does not support copy to clipboard.',
          });
        }
      }
    } catch (/** @type {!Error} */ e) {
      this._copyAttempt = false;
      this._fireEventOn('lh-log', this._document, {cmd: 'log', msg: e.message});
    }
  }

  onScroll() {
    this.latestKnownScrollY = window.scrollY;

    if (!this.isAnimatingHeader) {
      window.requestAnimationFrame(this.animateHeader.bind(this));
    }
    this.isAnimatingHeader = true;
  }

  onChevronClick() {
    const toggle = this._dom.find('.lh-config__settings-toggle', this._document);

    if (toggle.hasAttribute('open')) {
      toggle.removeAttribute('open');
    } else {
      toggle.setAttribute('open', true);
    }
  }

  animateHeader() {
    const collapsedHeaderHeight = 50;
    const animateScrollPercentage = Math.min(1, this.latestKnownScrollY /
      (this.headerHeight - collapsedHeaderHeight));
    const headerTransitionHeightDiff = this.headerHeight - collapsedHeaderHeight +
      this.headerOverlap;

    this.headerSticky.style.transform = `translateY(${headerTransitionHeightDiff *
      animateScrollPercentage *
      -1}px)`;
    this.headerBackground.style.transform = `translateY(${animateScrollPercentage *
      this.headerOverlap}px)`;
    this.lighthouseIcon.style.transform =
      `translate3d(calc(var(--report-content-width) / 2),` +
      ` calc(-100% - ${animateScrollPercentage * this.headerOverlap * -1}px), 0) scale(${1 -
        animateScrollPercentage})`;
    this.lighthouseIcon.style.opacity = Math.max(0, 1 - animateScrollPercentage);
    this.scoresShadowWrapper.style.opacity = 1 - animateScrollPercentage;
    const scoresContainer = this.scoresShadowWrapper.parentElement;
    scoresContainer.style.borderRadius = (1 - animateScrollPercentage) * 8 + 'px';
    scoresContainer.style.boxShadow =
        `0 4px 2px -2px rgba(0, 0, 0, ${animateScrollPercentage * 0.2})`;
    const scoreScale = scoresContainer.querySelector('.lh-scorescale');
    scoreScale.style.opacity = `${1 - animateScrollPercentage}`;
    const scoreHeader = scoresContainer.querySelector('.lh-scores-header');
    const delta = 32 * animateScrollPercentage;
    scoreHeader.style.paddingBottom = `${32 - delta}px`;
    scoresContainer.style.marginBottom = `${delta}px`;
    this.toolbar.style.transform = `translateY(${headerTransitionHeightDiff *
      animateScrollPercentage}px)`;
    this.exportButton.parentElement.style.transform = `translateY(${headerTransitionHeightDiff *
      animateScrollPercentage}px)`;
    this.exportButton.style.transform = `scale(${1 - 0.2 * animateScrollPercentage})`;
    // start showing the productinfo when we are at the 50% mark of our animation
    this.productInfo.style.opacity = this.toolbarMetadata.style.opacity =
      animateScrollPercentage < 0.5 ? 0 : (animateScrollPercentage - 0.5) * 2;
    this.env.style.transform = `translateY(${Math.max(
      0,
      headerTransitionHeightDiff * animateScrollPercentage - 6
    )}px)`;


    this.isAnimatingHeader = false;
  }

  closeExportDropdown() {
    this.exportButton.classList.remove('active');
  }

  /**
   * Click handler for export button.
   * @param {!Event} e
   */
  onExportButtonClick(e) {
    e.preventDefault();
    const el = /** @type {!Element} */ (e.target);
    el.classList.toggle('active');
    this._document.addEventListener('keydown', this.onKeyDown);
  }

  /**
   * Resets the state of page before capturing the page for export.
   * When the user opens the exported HTML page, certain UI elements should
   * be in their closed state (not opened) and the templates should be unstamped.
   */
  _resetUIState() {
    this.closeExportDropdown();
    this._dom.resetTemplates();
  }

  /**
   * Handler for "export as" button.
   * @param {!Event} e
   */
  onExport(e) {
    e.preventDefault();

    const el = /** @type {!Element} */ (e.target);

    if (!el.hasAttribute('data-action')) {
      return;
    }

    switch (el.getAttribute('data-action')) {
      case 'copy':
        this.onCopyButtonClick();
        break;
      case 'print-summary':
        this.collapseAllDetails();
        this.closeExportDropdown();
        self.print();
        break;
      case 'print-expanded':
        this.expandAllDetails();
        this.closeExportDropdown();
        self.print();
        break;
      case 'save-json': {
        const jsonStr = JSON.stringify(this.json, null, 2);
        this._saveFile(new Blob([jsonStr], {type: 'application/json'}));
        break;
      }
      case 'save-html': {
        const htmlStr = this.getReportHtml();
        try {
          this._saveFile(new Blob([htmlStr], {type: 'text/html'}));
        } catch (/** @type {!Error} */ e) {
          this._fireEventOn('lh-log', this._document, {
            cmd: 'error', msg: 'Could not export as HTML. ' + e.message,
          });
        }
        break;
      }
      case 'open-viewer': {
        const viewerPath = '/lighthouse/viewer/';
        ReportUIFeatures.openTabAndSendJsonReport(this.json, viewerPath);
        break;
      }
      case 'save-gist': {
        this.saveAsGist();
        break;
      }
    }

    this.closeExportDropdown();
    this._document.removeEventListener('keydown', this.onKeyDown);
  }

  /**
   * Keydown handler for the document.
   * @param {!Event} e
   */
  onKeyDown(e) {
    if (e.keyCode === 27) { // ESC
      this.closeExportDropdown();
    }
  }

  /**
   * Opens a new tab to the online viewer and sends the local page's JSON results
   * to the online viewer using postMessage.
   * @param {!ReportRenderer.ReportJSON} reportJson
   * @param {string} viewerPath
   * @suppress {reportUnknownTypes}
   * @protected
   */
  static openTabAndSendJsonReport(reportJson, viewerPath) {
    let resolve;
    const p = new Promise(res => resolve = res);
    // Chrome doesn't allow us to immediately postMessage to a popup right
    // after it's created. Normally, we could also listen for the popup window's
    // load event, however it is cross-domain and won't fire. Instead, listen
    // for a message from the target app saying "I'm open".
    const json = reportJson;
    window.addEventListener('message', function msgHandler(/** @type {!Event} */ e) {
      const messageEvent = /** @type {!MessageEvent<{opened: boolean, rendered: boolean}>} */ (e);
      if (messageEvent.origin !== VIEWER_ORIGIN) {
        return;
      }
      // Most recent deployment
      if (messageEvent.data.opened) {
        popup.postMessage({lhresults: json}, VIEWER_ORIGIN);
      }
      if (messageEvent.data.rendered) {
        window.removeEventListener('message', msgHandler);
        resolve(popup);
      }
    });

    // The popup's window.name is keyed by version+url+fetchTime, so we reuse/select tabs correctly
    const fetchTime = json.fetchTime || json.generatedTime;
    const windowName = `${json.lighthouseVersion}-${json.requestedUrl}-${fetchTime}`;
    const popup = /** @type {!Window} */ (window.open(`${VIEWER_ORIGIN}${viewerPath}`, windowName));

    return p;
  }

  /**
   * Expands audit details when user prints via keyboard shortcut.
   * @param {!Event} e
   */
  printShortCutDetect(e) {
    if ((e.ctrlKey || e.metaKey) && e.keyCode === 80) { // Ctrl+P
      this.closeExportDropdown();
    }
  }

  /**
   * Expands all audit `<details>`.
   * Ideally, a print stylesheet could take care of this, but CSS has no way to
   * open a `<details>` element.
   */
  expandAllDetails() {
    const details = this._dom.findAll('.lh-categories details', this._document);
    details.map(detail => detail.open = true);
  }

  /**
   * Collapses all audit `<details>`.
   * open a `<details>` element.
   */
  collapseAllDetails() {
    const details = this._dom.findAll('.lh-categories details', this._document);
    details.map(detail => detail.open = false);
  }

  /**
   * Sets up listeners to collapse audit `<details>` when the user closes the
   * print dialog, all `<details>` are collapsed.
   */
  _setUpCollapseDetailsAfterPrinting() {
    // FF and IE implement these old events.
    if ('onbeforeprint' in self) {
      self.addEventListener('afterprint', this.collapseAllDetails);
    } else {
      // Note: FF implements both window.onbeforeprint and media listeners. However,
      // it doesn't matchMedia doesn't fire when matching 'print'.
      self.matchMedia('print').addListener(mql => {
        if (mql.matches) {
          this.expandAllDetails();
        } else {
          this.collapseAllDetails();
        }
      });
    }
  }

  /**
   * Returns the html that recreates this report.
   * @return {string}
   * @protected
   */
  getReportHtml() {
    this._resetUIState();
    return this._document.documentElement.outerHTML;
  }

  /**
   * Save json as a gist. Unimplemented in base UI features.
   * @protected
   */
  saveAsGist() {
    throw new Error('Cannot save as gist from base report');
  }

  /**
   * Downloads a file (blob) using a[download].
   * @param {!Blob|!File} blob The file to save.
   * @private
   */
  _saveFile(blob) {
    const filename = getFilenamePrefix({
      finalUrl: this.json.finalUrl,
      fetchTime: this.json.fetchTime,
    });

    const ext = blob.type.match('json') ? '.json' : '.html';
    const href = URL.createObjectURL(blob);

    const a = /** @type {!HTMLAnchorElement} */ (this._dom.createElement('a'));
    a.download = `${filename}${ext}`;
    a.href = href;
    this._document.body.appendChild(a); // Firefox requires anchor to be in the DOM.
    a.click();

    // cleanup.
    this._document.body.removeChild(a);
    setTimeout(_ => URL.revokeObjectURL(href), 500);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReportUIFeatures;
} else {
  self.ReportUIFeatures = ReportUIFeatures;
}
