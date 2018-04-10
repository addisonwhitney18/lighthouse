/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import * as _Node from '../lighthouse-core/lib/dependency-graph/node';
import * as _NetworkNode from '../lighthouse-core/lib/dependency-graph/network-node';
import * as _CPUNode from '../lighthouse-core/lib/dependency-graph/cpu-node';
import * as Driver from '../lighthouse-core/gather/driver';

declare global {
  module LH.Gatherer {
    export interface PassContext {
      url: string;
      driver: InstanceType<typeof Driver>;
      disableJavaScript?: boolean;
      passConfig: Config.Pass
      settings: Config.Settings;
      options?: object;
    }

    export interface LoadData {
      networkRecords: Array<WebInspector.NetworkRequest>;
      devtoolsLog: Array<Protocol.RawEventMessage>;
      trace?: Trace;
    }

    namespace Simulation {
      // HACK: TS treats 'import * as Foo' as namespace instead of a type, use typeof and prototype
      export type GraphNode = InstanceType<typeof _Node>;
      export type GraphNetworkNode = InstanceType<typeof _NetworkNode>;
      export type GraphCPUNode = InstanceType<typeof _CPUNode>;

      export interface MetricCoefficients {
        intercept: number;
        optimistic: number;
        pessimistic: number;
      }

      export interface Options {
        rtt?: number;
        throughput?: number;
        fallbackTTFB?: number;
        maximumConcurrentRequests?: number;
        cpuSlowdownMultiplier?: number;
        layoutTaskMultiplier?: number;
        additionalRttByOrigin?: Map<string, number>;
        serverResponseTimeByOrigin?: Map<string, number>;
      }

      export interface NodeTiming {
        startTime?: number;
        endTime?: number;
        queuedTime?: number;
        estimatedTimeElapsed?: number;
        timeElapsed?: number;
        timeElapsedOvershoot?: number;
        bytesDownloaded?: number;
      }

      export interface Result {
        timeInMs: number;
        nodeTiming: Map<GraphNode, NodeTiming>;
      }
    }
  }
}

// empty export to keep file a module
export {};
