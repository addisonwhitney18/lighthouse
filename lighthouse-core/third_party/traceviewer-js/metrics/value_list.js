/**
Copyright 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../value/numeric.js");
require("../value/unit.js");

'use strict';

global.tr.exportTo('tr.metrics', function() {
  function ValueList(values) {
    this.values_ = [];
    if (values !== undefined)
      values.forEach(this.addValue, this);
  }

  ValueList.prototype = {
    get valueDicts() {
      return this.values_.map(function(v) { return v.asDict(); });
    },

    getValuesWithName: function(name) {
      return this.values_.filter(function(value) {
        return value.name.indexOf(name) > -1;
      });
    },

    addValue: function(v) {
      if (!(v instanceof tr.v.NumericValue)) {
        var err = new Error('Tried to add value ' + v +
                            ' which is non-Numeric');
        err.name = 'ValueError';
        throw err;
      }

      this.values_.push(v);

      if (v.numeric instanceof tr.v.Numeric) {
        this.values_.push.apply(
            this.values_, ValueList.computeSummaryValuesForNumericValue(v));
      }
    }
  };

  ValueList.computeSummaryValuesForNumericValue = function(value) {
    if (!(value instanceof tr.v.NumericValue &&
          value.numeric instanceof tr.v.Numeric))
      throw new Error('Tried to compute summary values for non-numeric');
    return value.numeric.getSummarizedScalarNumericsWithNames().map(
        function(stat) {
          return new tr.v.NumericValue(
              value.canonicalUrl, value.name + '_' + stat.name, stat.scalar,
              { description: value.description });
        });
  };

  return {
    ValueList: ValueList
  };
});
