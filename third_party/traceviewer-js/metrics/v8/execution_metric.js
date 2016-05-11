/**
Copyright 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../../base/range.js");
require("../metric_registry.js");
require("../../value/numeric.js");
require("../../value/unit.js");
require("../../value/value.js");

'use strict';

global.tr.exportTo('tr.metrics.v8', function() {
  var DURATION_NUMERIC_BUILDER = tr.v.NumericBuilder.createLinear(
      tr.v.Unit.byName.timeDurationInMs_smallerIsBetter,
      tr.b.Range.fromExplicitRange(4, 200), 100);

  function computeExecuteMetrics(valueList, model) {
    var cpuTotalExecution = DURATION_NUMERIC_BUILDER.build();
    var wallTotalExecution = DURATION_NUMERIC_BUILDER.build();
    var cpuSelfExecution = DURATION_NUMERIC_BUILDER.build();
    var wallSelfExecution = DURATION_NUMERIC_BUILDER.build();

    model.findTopmostSlicesNamed('V8.Execute', function(e) {
      cpuTotalExecution.add(e.cpuDuration);
      wallTotalExecution.add(e.duration);
      cpuSelfExecution.add(e.cpuSelfTime);
      wallSelfExecution.add(e.selfTime);
    });

    valueList.addValue(new tr.v.NumericValue(
        model.canonicalUrl, 'v8_execution_cpu_total', cpuTotalExecution,
        { description: 'cpu total time spent in script execution' }));
    valueList.addValue(new tr.v.NumericValue(
        model.canonicalUrl, 'v8_execution_wall_total', wallTotalExecution,
        { description: 'wall total time spent in script execution' }));
    valueList.addValue(new tr.v.NumericValue(
        model.canonicalUrl, 'v8_execution_cpu_self', cpuSelfExecution,
        { description: 'cpu self time spent in script execution' }));
    valueList.addValue(new tr.v.NumericValue(
        model.canonicalUrl, 'v8_execution_wall_self', wallSelfExecution,
        { description: 'wall self time spent in script execution' }));
  }

  function computeParseLazyMetrics(valueList, model) {
    var cpuSelfParseLazy = DURATION_NUMERIC_BUILDER.build();
    var wallSelfParseLazy = DURATION_NUMERIC_BUILDER.build();

    model.findTopmostSlicesNamed('V8.ParseLazyMicroSeconds', function(e) {
      cpuSelfParseLazy.add(e.cpuSelfTime);
      wallSelfParseLazy.add(e.selfTime);
    });
    model.findTopmostSlicesNamed('V8.ParseLazy', function(e) {
      cpuSelfParseLazy.add(e.cpuSelfTime);
      wallSelfParseLazy.add(e.selfTime);
    });

    valueList.addValue(new tr.v.NumericValue(
        model.canonicalUrl, 'v8_parse_lazy_cpu_self', cpuSelfParseLazy,
        { description: 'cpu self time spent performing lazy parsing' }));
    valueList.addValue(new tr.v.NumericValue(
        model.canonicalUrl, 'v8_parse_lazy_wall_self', wallSelfParseLazy,
        { description: 'wall self time spent performing lazy parsing' }));
  }

  function computeCompileFullCodeMetrics(valueList, model) {
    var cpuSelfCompileFullCode = DURATION_NUMERIC_BUILDER.build();
    var wallSelfCompileFullCode = DURATION_NUMERIC_BUILDER.build();

    model.findTopmostSlicesNamed('V8.CompileFullCode', function(e) {
      cpuSelfCompileFullCode.add(e.cpuSelfTime);
      wallSelfCompileFullCode.add(e.selfTime);
    });

    valueList.addValue(new tr.v.NumericValue(
        model.canonicalUrl, 'v8_compile_full_code_cpu_self',
        cpuSelfCompileFullCode,
        { description: 'cpu self time spent performing compiling full code' }));
    valueList.addValue(new tr.v.NumericValue(
        model.canonicalUrl, 'v8_compile_full_code_wall_self',
        wallSelfCompileFullCode, {
          description: 'wall self time spent performing compiling full code'
        }));
  }

  function computeCompileIgnitionMetrics(valueList, model) {
    var cpuSelfCompileIgnition = DURATION_NUMERIC_BUILDER.build();
    var wallSelfCompileIgnition = DURATION_NUMERIC_BUILDER.build();

    model.findTopmostSlicesNamed('V8.CompileIgnition', function(e) {
      cpuSelfCompileIgnition.add(e.cpuSelfTime);
      wallSelfCompileIgnition.add(e.selfTime);
    });

    valueList.addValue(new tr.v.NumericValue(
        model.canonicalUrl, 'v8_compile_ignition_cpu_self',
        cpuSelfCompileIgnition,
        { description: 'cpu self time spent in compile ignition' }));
    valueList.addValue(new tr.v.NumericValue(
        model.canonicalUrl, 'v8_compile_ignition_wall_self',
        wallSelfCompileIgnition, {
          description: 'wall self time spent in compile ignition'
        }));
  }

  function computeRecompileMetrics(valueList, model) {
    var cpuTotalRecompileSynchronous = DURATION_NUMERIC_BUILDER.build();
    var wallTotalRecompileSynchronous = DURATION_NUMERIC_BUILDER.build();
    var cpuTotalRecompileConcurrent = DURATION_NUMERIC_BUILDER.build();
    var wallTotalRecompileConcurrent = DURATION_NUMERIC_BUILDER.build();
    // TODO(eakuefner): Stop computing overall values once dash v2 is ready.
    // https://github.com/catapult-project/catapult/issues/2180
    var cpuTotalRecompileOverall = DURATION_NUMERIC_BUILDER.build();
    var wallTotalRecompileOverall = DURATION_NUMERIC_BUILDER.build();

    model.findTopmostSlicesNamed('V8.RecompileSynchronous', function(e) {
      cpuTotalRecompileSynchronous.add(e.cpuDuration);
      wallTotalRecompileSynchronous.add(e.duration);
      cpuTotalRecompileOverall.add(e.cpuDuration);
      wallTotalRecompileOverall.add(e.duration);
    });

    valueList.addValue(new tr.v.NumericValue(
        model.canonicalUrl, 'v8_recompile_synchronous_cpu_total',
        cpuTotalRecompileSynchronous,
        { description: 'cpu total time spent in synchronous recompilation' }));
    valueList.addValue(new tr.v.NumericValue(
        model.canonicalUrl, 'v8_recompile_synchronous_wall_total',
        wallTotalRecompileSynchronous,
        { description: 'wall total time spent in synchronous recompilation' }));


    model.findTopmostSlicesNamed('V8.RecompileConcurrent', function(e) {
      cpuTotalRecompileConcurrent.add(e.cpuDuration);
      wallTotalRecompileConcurrent.add(e.duration);
      cpuTotalRecompileOverall.add(e.cpuDuration);
      wallTotalRecompileOverall.add(e.duration);
    });

    valueList.addValue(new tr.v.NumericValue(
        model.canonicalUrl, 'v8_recompile_concurrent_cpu_total',
        cpuTotalRecompileConcurrent,
        { description: 'cpu total time spent in concurrent recompilation' }));
    valueList.addValue(new tr.v.NumericValue(
        model.canonicalUrl, 'v8_recompile_concurrent_wall_total',
        wallTotalRecompileConcurrent,
        { description: 'wall total time spent in concurrent recompilation' }));
    valueList.addValue(new tr.v.NumericValue(
        model.canonicalUrl, 'v8_recompile_overall_cpu_total',
        cpuTotalRecompileOverall, {
          description:
              'cpu total time spent in synchronous or concurrent recompilation'
        }));
    valueList.addValue(new tr.v.NumericValue(
        model.canonicalUrl, 'v8_recompile_overall_wall_total',
        wallTotalRecompileOverall, {
          description:
              'wall total time spent in synchronous or concurrent recompilation'
        }));
  }

  function computeOptimizeCodeMetrics(valueList, model) {
    var cpuTotalOptimizeCode = DURATION_NUMERIC_BUILDER.build();
    var wallTotalOptimizeCode = DURATION_NUMERIC_BUILDER.build();

    model.findTopmostSlicesNamed('V8.OptimizeCode', function(e) {
      cpuTotalOptimizeCode.add(e.cpuDuration);
      wallTotalOptimizeCode.add(e.duration);
    });

    valueList.addValue(new tr.v.NumericValue(
        model.canonicalUrl, 'v8_optimize_code_cpu_total',
        cpuTotalOptimizeCode,
        { description: 'cpu total time spent in code optimization' }));
    valueList.addValue(new tr.v.NumericValue(
        model.canonicalUrl, 'v8_optimize_code_wall_total',
        wallTotalOptimizeCode,
        { description: 'wall total time spent in code optimization' }));
  }

  function computeDeoptimizeCodeMetrics(valueList, model) {
    var cpuTotalDeoptimizeCode = DURATION_NUMERIC_BUILDER.build();
    var wallTotalDeoptimizeCode = DURATION_NUMERIC_BUILDER.build();

    model.findTopmostSlicesNamed('V8.DeoptimizeCode', function(e) {
      cpuTotalDeoptimizeCode.add(e.cpuDuration);
      wallTotalDeoptimizeCode.add(e.duration);
    });

    valueList.addValue(new tr.v.NumericValue(
        model.canonicalUrl, 'v8_deoptimize_code_cpu_total',
        cpuTotalDeoptimizeCode,
        { description: 'cpu total time spent in code deoptimization' }));
    valueList.addValue(new tr.v.NumericValue(
        model.canonicalUrl, 'v8_deoptimize_code_wall_total',
        wallTotalDeoptimizeCode,
        { description: 'wall total time spent in code deoptimization' }));
  }

  function executionMetric(valueList, model) {
    computeExecuteMetrics(valueList, model);
    computeParseLazyMetrics(valueList, model);
    computeCompileIgnitionMetrics(valueList, model);
    computeCompileFullCodeMetrics(valueList, model);
    computeRecompileMetrics(valueList, model);
    computeOptimizeCodeMetrics(valueList, model);
    computeDeoptimizeCodeMetrics(valueList, model);
  }

  executionMetric.prototype = {
    __proto__: Function.prototype
  };

  tr.metrics.MetricRegistry.register(executionMetric);

  return {
    executionMetric: executionMetric
  };
});
