"use strict";
/**
Copyright (c) 2014 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./base.js");
require("./base64.js");

'use strict';

global.tr.exportTo('tr.b', function () {
  var Base64 = tr.b.Base64;

  function computeUserTimingMarkName(groupName, functionName, opt_args) {
    if (groupName === undefined) throw new Error('getMeasureString should have group name');
    if (functionName === undefined) throw new Error('getMeasureString should have function name');
    var userTimingMarkName = groupName + ':' + functionName;
    if (opt_args !== undefined) {
      userTimingMarkName += '/';
      userTimingMarkName += Base64.btoa(JSON.stringify(opt_args));
    }
    return userTimingMarkName;
  }

  function Timing() {}

  Timing.nextMarkNumber = 0;

  Timing.mark = function (groupName, functionName, opt_args) {
    if (tr.isHeadless) {
      return {
        end: function () {}
      };
    }
    var userTimingMarkName = computeUserTimingMarkName(groupName, functionName, opt_args);
    var markBeginName = 'tvcm.mark' + Timing.nextMarkNumber++;
    var markEndName = 'tvcm.mark' + Timing.nextMarkNumber++;
    window.performance.mark(markBeginName);
    return {
      end: function () {
        window.performance.mark(markEndName);
        window.performance.measure(userTimingMarkName, markBeginName, markEndName);
      }
    };
  };

  Timing.wrap = function (groupName, callback, opt_args) {
    if (groupName === undefined) throw new Error('Timing.wrap should have group name');
    if (callback.name === '') throw new Error('Anonymous function is not allowed');
    return Timing.wrapNamedFunction(groupName, callback.name, callback, opt_args);
  };

  Timing.wrapNamedFunction = function (groupName, functionName, callback, opt_args) {
    function timedNamedFunction() {
      var markedTime = Timing.mark(groupName, functionName, opt_args);
      try {
        callback.apply(this, arguments);
      } finally {
        markedTime.end();
      }
    }
    return timedNamedFunction;
  };

  function TimedNamedPromise(groupName, name, executor, opt_args) {
    var markedTime = Timing.mark(groupName, name, opt_args);
    var promise = new Promise(executor);
    promise.then(function (result) {
      markedTime.end();
      return result;
    }, function (e) {
      markedTime.end();
      throw e;
    });
    return promise;
  }

  return {
    _computeUserTimingMarkName: computeUserTimingMarkName, // export for testing
    TimedNamedPromise: TimedNamedPromise,
    Timing: Timing
  };
});