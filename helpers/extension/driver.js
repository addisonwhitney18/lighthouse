/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const ChromeProtocol = require('../browser/driver.js')

/* globals chrome */

class ExtensionProtocol extends ChromeProtocol {

  constructor() {
    super();
    this._listeners = {};
    this._tabId = null;
    chrome.debugger.onEvent.addListener(this._onEvent.bind(this));
  }

  connect() {
    return this.queryCurrentTab_()
      .then(tabId => {
        this._tabId = tabId;
        return this.attachDebugger_(tabId);
      });
  }

  disconnect() {
    if (this._tabId === null) {
      return;
    }

    this.detachDebugger_(this._tabId)
        .then(_ => {
          this._tabId = null;
          this.url = null;
        });
  }

  /**
   * Bind listeners for protocol events
   * @param {!string} eventName
   * @param {function(...)} cb
   */
  on(eventName, cb) {
    if (typeof this._listeners[eventName] === 'undefined') {
      this._listeners[eventName] = [];
    }

    this._listeners[eventName].push(cb);
  }

  _onEvent(source, method, params) {
    if (typeof this._listeners[method] === 'undefined') {
      return;
    }

    this._listeners[method].forEach(cb => {
      cb(params);
    });

    // Reset the listeners;
    this._listeners[method].length = 0;
  }

  /**
   * Call protocol methods
   * @param {!string} command
   * @param {!Object} params
   * @return {!Promise}
   */
  sendCommand(command, params) {
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({tabId: this._tabId}, command, params, result => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }

        resolve(result);
      });
    });
  }

  queryCurrentTab_() {
    const currentTab = {
      active: true,
      windowId: chrome.windows.WINDOW_ID_CURRENT
    };

    return new Promise((resolve, reject) => {
      chrome.tabs.query(currentTab, tabs => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }

        this.url = tabs[0].url;
        resolve(tabs[0].id);
      });
    });
  }

  attachDebugger_(tabId) {
    return new Promise((resolve, reject) => {
      chrome.debugger.attach({tabId}, '1.1', _ => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }

        resolve(tabId);
      });
    });
  }

  detachDebugger_(tabId) {
    return new Promise((resolve, reject) => {
      chrome.debugger.detach({tabId}, _ => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }

        resolve(tabId);
      });
    });
  }
}

module.exports = ExtensionProtocol;
