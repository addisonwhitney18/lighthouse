"use strict";
/**
Copyright (c) 2013 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../base/range.js");
require("./thread_time_slice.js");

'use strict';

/**
 * @fileoverview Provides the CpuSlice class.
 */
global.tr.exportTo('tr.model', function () {

  var Slice = tr.model.Slice;

  /**
   * A CpuSlice represents a slice of time on a CPU.
   *
   * @constructor
   */
  function CpuSlice(cat, title, colorId, start, args, opt_duration) {
    Slice.apply(this, arguments);
    this.threadThatWasRunning = undefined;
    this.cpu = undefined;
  }

  CpuSlice.prototype = {
    __proto__: Slice.prototype,

    get analysisTypeName() {
      return 'tr.ui.analysis.CpuSlice';
    },

    getAssociatedTimeslice: function () {
      if (!this.threadThatWasRunning) return undefined;
      var timeSlices = this.threadThatWasRunning.timeSlices;
      for (var i = 0; i < timeSlices.length; i++) {
        var timeSlice = timeSlices[i];
        if (timeSlice.start !== this.start) continue;
        if (timeSlice.duration !== this.duration) continue;
        return timeSlice;
      }
      return undefined;
    }
  };

  tr.model.EventRegistry.register(CpuSlice, {
    name: 'cpuSlice',
    pluralName: 'cpuSlices'
  });

  return {
    CpuSlice: CpuSlice
  };
});