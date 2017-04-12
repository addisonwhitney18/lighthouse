"use strict";require("../base/iteration_helpers.js");require("../base/range.js");require("../base/running_statistics.js");require("../base/sorted_array_utils.js");require("../base/statistics.js");require("../base/unit.js");require("./diagnostics/diagnostic_map.js");require("./numeric.js");'use strict';global.tr.exportTo('tr.v',function(){var MAX_DIAGNOSTIC_MAPS=16;var DEFAULT_BOUNDARIES_FOR_UNIT=new Map();class HistogramBin{constructor(range){this.range=range;this.count=0;this.diagnosticMaps=[];}addSample(value){this.count+=1;}addDiagnosticMap(diagnostics){tr.b.Statistics.uniformlySampleStream(this.diagnosticMaps,this.count,diagnostics,MAX_DIAGNOSTIC_MAPS);}addBin(other){if(!this.range.equals(other.range))throw new Error('Merging incompatible Histogram bins.');tr.b.Statistics.mergeSampledStreams(this.diagnosticMaps,this.count,other.diagnosticMaps,other.count,MAX_DIAGNOSTIC_MAPS);this.count+=other.count;}fromDict(dict){this.count=dict[0];if(dict.length>1){for(var map of dict[1]){this.diagnosticMaps.push(tr.v.d.DiagnosticMap.fromDict(map));}}}asDict(){if(!this.diagnosticMaps.length){return[this.count];}return[this.count,this.diagnosticMaps.map(d=>d.asDict())];}}var DEFAULT_SUMMARY_OPTIONS=new Map([['avg',true],['geometricMean',false],['std',true],['count',true],['sum',true],['min',true],['max',true],['nans',false]]);class Histogram{constructor(name,unit,opt_binBoundaries){var binBoundaries=opt_binBoundaries;if(!binBoundaries){var baseUnit=unit.baseUnit?unit.baseUnit:unit;binBoundaries=DEFAULT_BOUNDARIES_FOR_UNIT.get(baseUnit.unitName);}this.guid_=undefined;this.binBoundariesDict_=binBoundaries.asDict();this.centralBins=[];this.description='';this.diagnostics=new tr.v.d.DiagnosticMap();this.maxCount_=0;this.name_=name;this.nanDiagnosticMaps=[];this.numNans=0;this.running=new tr.b.RunningStatistics();this.sampleValues_=[];this.shortName=undefined;this.summaryOptions=new Map(DEFAULT_SUMMARY_OPTIONS);this.summaryOptions.set('percentile',[]);this.unit=unit;this.underflowBin=new HistogramBin(tr.b.Range.fromExplicitRange(-Number.MAX_VALUE,binBoundaries.range.min));this.overflowBin=new HistogramBin(tr.b.Range.fromExplicitRange(binBoundaries.range.max,Number.MAX_VALUE));for(var range of binBoundaries.binRanges()){this.centralBins.push(new HistogramBin(range));}this.allBins=[this.underflowBin];for(var bin of this.centralBins)this.allBins.push(bin);this.allBins.push(this.overflowBin);this.maxNumSampleValues_=this.defaultMaxNumSampleValues_;}get maxNumSampleValues(){return this.maxNumSampleValues_;}set maxNumSampleValues(n){this.maxNumSampleValues_=n;tr.b.Statistics.uniformlySampleArray(this.sampleValues_,this.maxNumSampleValues_);}get name(){return this.name_;}get guid(){if(this.guid_===undefined)this.guid_=tr.b.GUID.allocateUUID4();return this.guid_;}set guid(guid){if(this.guid_!==undefined)throw new Error('Cannot reset guid');this.guid_=guid;}static fromDict(dict){var hist=new Histogram(dict.name,tr.b.Unit.fromJSON(dict.unit),HistogramBinBoundaries.fromDict(dict.binBoundaries));hist.guid=dict.guid;if(dict.shortName){hist.shortName=dict.shortName;}if(dict.description){hist.description=dict.description;}if(dict.diagnostics){hist.diagnostics.addDicts(dict.diagnostics);}if(dict.underflowBin){hist.underflowBin.fromDict(dict.underflowBin);}if(dict.overflowBin){hist.overflowBin.fromDict(dict.overflowBin);}if(dict.centralBins){if(dict.centralBins.length!==undefined){for(var i=0;i<dict.centralBins.length;++i){hist.centralBins[i].fromDict(dict.centralBins[i]);}}else{tr.b.iterItems(dict.centralBins,(i,binDict)=>{hist.centralBins[i].fromDict(binDict);});}}for(var bin of hist.allBins){hist.maxCount_=Math.max(hist.maxCount_,bin.count);}if(dict.running){hist.running=tr.b.RunningStatistics.fromDict(dict.running);}if(dict.summaryOptions){hist.customizeSummaryOptions(dict.summaryOptions);}if(dict.maxNumSampleValues!==undefined){hist.maxNumSampleValues=dict.maxNumSampleValues;}if(dict.sampleValues){hist.sampleValues_=dict.sampleValues;}if(dict.numNans){hist.numNans=dict.numNans;}if(dict.nanDiagnostics){for(var map of dict.nanDiagnostics){hist.nanDiagnosticMaps.push(tr.v.d.DiagnosticMap.fromDict(map));}}return hist;}static buildFromSamples(unit,samples){var boundaries=HistogramBinBoundaries.createFromSamples(samples);var result=new Histogram(unit,boundaries);result.maxNumSampleValues=1000;for(var sample of samples)result.addSample(sample);return result;}get numValues(){return tr.b.Statistics.sum(this.allBins,function(e){return e.count;});}get average(){return this.running.mean;}get standardDeviation(){return this.running.stddev;}get geometricMean(){return this.running.geometricMean;}get sum(){return this.running.sum;}get maxCount(){return this.maxCount_;}getDifferenceSignificance(other,opt_alpha){if(this.unit!==other.unit)throw new Error('Cannot compare Numerics with different units');if(this.unit.improvementDirection===tr.b.ImprovementDirection.DONT_CARE){return tr.b.Statistics.Significance.DONT_CARE;}if(!(other instanceof Histogram))throw new Error('Unable to compute a p-value');var testResult=tr.b.Statistics.mwu(this.sampleValues,other.sampleValues,opt_alpha);return testResult.significance;}getApproximatePercentile(percent){if(!(percent>=0&&percent<=1))throw new Error('percent must be [0,1]');if(this.numValues==0)return 0;var valuesToSkip=Math.floor((this.numValues-1)*percent);for(var i=0;i<this.allBins.length;i++){var bin=this.allBins[i];valuesToSkip-=bin.count;if(valuesToSkip<0){if(bin===this.underflowBin)return bin.range.max;else if(bin===this.overflowBin)return bin.range.min;else return bin.range.center;}}throw new Error('Unreachable');}getBinForValue(value){var binIndex=tr.b.findHighIndexInSortedArray(this.allBins,b=>value<b.range.max?-1:1);return this.allBins[binIndex]||this.overflowBin;}addSample(value,opt_diagnostics){if(opt_diagnostics&&!(opt_diagnostics instanceof tr.v.d.DiagnosticMap))opt_diagnostics=tr.v.d.DiagnosticMap.fromObject(opt_diagnostics);if(typeof value!=='number'||isNaN(value)){this.numNans++;if(opt_diagnostics){tr.b.Statistics.uniformlySampleStream(this.nanDiagnosticMaps,this.numNans,opt_diagnostics,MAX_DIAGNOSTIC_MAPS);}}else{this.running.add(value);var bin=this.getBinForValue(value);bin.addSample(value);if(opt_diagnostics)bin.addDiagnosticMap(opt_diagnostics);if(bin.count>this.maxCount_)this.maxCount_=bin.count;}tr.b.Statistics.uniformlySampleStream(this.sampleValues_,this.numValues+this.numNans,value,this.maxNumSampleValues);}sampleValuesInto(samples){for(var sampleValue of this.sampleValues)samples.push(sampleValue);}canAddHistogram(other){if(this.unit!==other.unit)return false;if(this.allBins.length!==other.allBins.length)return false;for(var i=0;i<this.allBins.length;++i)if(!this.allBins[i].range.equals(other.allBins[i].range))return false;return true;}addHistogram(other){if(!this.canAddHistogram(other)){throw new Error('Merging incompatible Histograms');}tr.b.Statistics.mergeSampledStreams(this.nanDiagnosticMaps,this.numNans,other.nanDiagnosticMaps,other.numNans,MAX_DIAGNOSTIC_MAPS);tr.b.Statistics.mergeSampledStreams(this.sampleValues,this.numValues,other.sampleValues,other.numValues,tr.b.Statistics.mean([this.maxNumSampleValues,other.maxNumSampleValues]));this.numNans+=other.numNans;this.running=this.running.merge(other.running);for(var i=0;i<this.allBins.length;++i){this.allBins[i].addBin(other.allBins[i]);}}customizeSummaryOptions(summaryOptions){tr.b.iterItems(summaryOptions,(key,value)=>this.summaryOptions.set(key,value));}get statisticsScalars(){function statNameToKey(stat){switch(stat){case'std':return'stddev';case'avg':return'mean';}return stat;}function percentToString(percent){if(percent<0||percent>1)throw new Error('Percent must be between 0.0 and 1.0');switch(percent){case 0:return'000';case 1:return'100';}var str=percent.toString();if(str[1]!=='.')throw new Error('Unexpected percent');str=str+'0'.repeat(Math.max(4-str.length,0));if(str.length>4)str=str.slice(0,4)+'_'+str.slice(4);return'0'+str.slice(2);}var results=new Map();for(var[stat,option]of this.summaryOptions){if(!option){continue;}if(stat==='percentile'){for(var percent of option){var percentile=this.getApproximatePercentile(percent);results.set('pct_'+percentToString(percent),new tr.v.ScalarNumeric(this.unit,percentile));}}else if(stat==='nans'){results.set('nans',new tr.v.ScalarNumeric(tr.b.Unit.byName.count_smallerIsBetter,this.numNans));}else{var statUnit=stat==='count'?tr.b.Unit.byName.count_smallerIsBetter:this.unit;var key=statNameToKey(stat);var statValue=this.running[key];if(typeof statValue==='number'){results.set(stat,new tr.v.ScalarNumeric(statUnit,statValue));}}}return results;}get sampleValues(){return this.sampleValues_;}clone(){return Histogram.fromDict(this.asDict());}cloneEmpty(){var binBoundaries=HistogramBinBoundaries.fromDict(this.binBoundariesDict_);return new Histogram(this.name,this.unit,binBoundaries);}asDict(){var dict={};dict.binBoundaries=this.binBoundariesDict_;dict.name=this.name;dict.unit=this.unit.asJSON();dict.guid=this.guid;if(this.shortName){dict.shortName=this.shortName;}if(this.description){dict.description=this.description;}if(this.diagnostics.size){dict.diagnostics=this.diagnostics.asDict();}if(this.maxNumSampleValues!==this.defaultMaxNumSampleValues_){dict.maxNumSampleValues=this.maxNumSampleValues;}if(this.numNans){dict.numNans=this.numNans;}if(this.nanDiagnosticMaps.length){dict.nanDiagnostics=this.nanDiagnosticMaps.map(dm=>dm.asDict());}if(this.underflowBin.count){dict.underflowBin=this.underflowBin.asDict();}if(this.overflowBin.count){dict.overflowBin=this.overflowBin.asDict();}if(this.numValues){dict.sampleValues=this.sampleValues.slice();dict.running=this.running.asDict();dict.centralBins=this.centralBinsAsDict_();}var summaryOptions={};var anyOverriddenSummaryOptions=false;for(var[name,option]of this.summaryOptions){if(name==='percentile'){if(option.length===0){continue;}option=option.slice();}else if(option===DEFAULT_SUMMARY_OPTIONS.get(name)){continue;}summaryOptions[name]=option;anyOverriddenSummaryOptions=true;}if(anyOverriddenSummaryOptions){dict.summaryOptions=summaryOptions;}return dict;}centralBinsAsDict_(){var numCentralBins=this.centralBins.length;var emptyBins=0;for(var i=0;i<numCentralBins;++i){if(this.centralBins[i].count===0){++emptyBins;}}if(emptyBins===numCentralBins){return undefined;}if(emptyBins>numCentralBins/2){var centralBinsDict={};for(var i=0;i<numCentralBins;++i){var bin=this.centralBins[i];if(bin.count>0){centralBinsDict[i]=bin.asDict();}}return centralBinsDict;}var centralBinsArray=[];for(var i=0;i<numCentralBins;++i){centralBinsArray.push(this.centralBins[i].asDict());}return centralBinsArray;}get defaultMaxNumSampleValues_(){return this.allBins.length*10;}}var HISTOGRAM_BIN_BOUNDARIES_CACHE=new Map();class HistogramBinBoundaries{static createLinear(min,max,numBins){return new HistogramBinBoundaries(min).addLinearBins(max,numBins);}static createExponential(min,max,numBins){return new HistogramBinBoundaries(min).addExponentialBins(max,numBins);}static createWithBoundaries(binBoundaries){var builder=new HistogramBinBoundaries(binBoundaries[0]);for(var boundary of binBoundaries.slice(1))builder.addBinBoundary(boundary);return builder;}static createFromSamples(samples){var range=new tr.b.Range();for(var sample of samples)if(!isNaN(Math.max(sample)))range.addValue(sample);if(range.isEmpty)range.addValue(1);if(range.min===range.max)range.addValue(range.min-1);var numBins=Math.ceil(Math.sqrt(samples.length));var builder=new HistogramBinBoundaries(range.min);builder.addLinearBins(range.max,numBins);return builder;}constructor(minBinBoundary){this.boundaries_=undefined;this.builder_=[minBinBoundary];this.range_=new tr.b.Range();this.range_.addValue(minBinBoundary);}get range(){return this.range_;}asDict(){return this.builder_.slice();}static fromDict(dict){var cacheKey=JSON.stringify(dict);if(HISTOGRAM_BIN_BOUNDARIES_CACHE.has(cacheKey)){return HISTOGRAM_BIN_BOUNDARIES_CACHE.get(cacheKey);}var binBoundaries=new HistogramBinBoundaries(dict[0]);for(var slice of dict.slice(1)){if(!(slice instanceof Array)){binBoundaries.addBinBoundary(slice);continue;}switch(slice[0]){case HistogramBinBoundaries.SLICE_TYPE.LINEAR:binBoundaries.addLinearBins(slice[1],slice[2]);break;case HistogramBinBoundaries.SLICE_TYPE.EXPONENTIAL:binBoundaries.addExponentialBins(slice[1],slice[2]);break;default:throw new Error('Unrecognized HistogramBinBoundaries slice type');}}HISTOGRAM_BIN_BOUNDARIES_CACHE.set(cacheKey,binBoundaries);return binBoundaries;}*binRanges(){if(this.boundaries_===undefined){this.build_();}for(var i=0;i<this.boundaries_.length-1;++i){yield tr.b.Range.fromExplicitRange(this.boundaries_[i],this.boundaries_[i+1]);}}build_(){if(typeof this.builder_[0]!=='number'){throw new Error('Invalid start of builder_');}this.boundaries_=[this.builder_[0]];for(var slice of this.builder_.slice(1)){if(!(slice instanceof Array)){this.boundaries_.push(slice);continue;}var nextMaxBinBoundary=slice[1];var binCount=slice[2];var curMaxBinBoundary=this.boundaries_[this.boundaries_.length-1];switch(slice[0]){case HistogramBinBoundaries.SLICE_TYPE.LINEAR:var binWidth=(nextMaxBinBoundary-curMaxBinBoundary)/binCount;for(var i=1;i<binCount;i++){var boundary=curMaxBinBoundary+i*binWidth;this.boundaries_.push(boundary);}break;case HistogramBinBoundaries.SLICE_TYPE.EXPONENTIAL:var binExponentWidth=Math.log(nextMaxBinBoundary/curMaxBinBoundary)/binCount;for(var i=1;i<binCount;i++){var boundary=curMaxBinBoundary*Math.exp(i*binExponentWidth);this.boundaries_.push(boundary);}break;default:throw new Error('Unrecognized HistogramBinBoundaries slice type');}this.boundaries_.push(nextMaxBinBoundary);}}addBinBoundary(nextMaxBinBoundary){if(nextMaxBinBoundary<=this.range.max){throw new Error('The added max bin boundary must be larger than '+'the current max boundary');}this.boundaries_=undefined;this.builder_.push(nextMaxBinBoundary);this.range.addValue(nextMaxBinBoundary);return this;}addLinearBins(nextMaxBinBoundary,binCount){if(binCount<=0)throw new Error('Bin count must be positive');if(nextMaxBinBoundary<=this.range.max){throw new Error('The new max bin boundary must be greater than '+'the previous max bin boundary');}this.boundaries_=undefined;this.builder_.push([HistogramBinBoundaries.SLICE_TYPE.LINEAR,nextMaxBinBoundary,binCount]);this.range.addValue(nextMaxBinBoundary);return this;}addExponentialBins(nextMaxBinBoundary,binCount){if(binCount<=0){throw new Error('Bin count must be positive');}if(this.range.max<=0){throw new Error('Current max bin boundary must be positive');}if(this.range.max>=nextMaxBinBoundary){throw new Error('The last added max boundary must be greater than '+'the current max boundary boundary');}this.boundaries_=undefined;this.builder_.push([HistogramBinBoundaries.SLICE_TYPE.EXPONENTIAL,nextMaxBinBoundary,binCount]);this.range.addValue(nextMaxBinBoundary);return this;}}HistogramBinBoundaries.SLICE_TYPE={LINEAR:0,EXPONENTIAL:1};DEFAULT_BOUNDARIES_FOR_UNIT.set(tr.b.Unit.byName.timeDurationInMs.unitName,HistogramBinBoundaries.createExponential(1e-3,1e6,1e2));DEFAULT_BOUNDARIES_FOR_UNIT.set(tr.b.Unit.byName.timeStampInMs.unitName,HistogramBinBoundaries.createLinear(0,1e10,1e3));DEFAULT_BOUNDARIES_FOR_UNIT.set(tr.b.Unit.byName.normalizedPercentage.unitName,HistogramBinBoundaries.createLinear(0,1.0,20));DEFAULT_BOUNDARIES_FOR_UNIT.set(tr.b.Unit.byName.sizeInBytes.unitName,HistogramBinBoundaries.createExponential(1,1e12,1e2));DEFAULT_BOUNDARIES_FOR_UNIT.set(tr.b.Unit.byName.energyInJoules.unitName,HistogramBinBoundaries.createExponential(1e-3,1e3,50));DEFAULT_BOUNDARIES_FOR_UNIT.set(tr.b.Unit.byName.powerInWatts.unitName,HistogramBinBoundaries.createExponential(1e-3,1,50));DEFAULT_BOUNDARIES_FOR_UNIT.set(tr.b.Unit.byName.unitlessNumber.unitName,HistogramBinBoundaries.createExponential(1e-3,1e3,50));DEFAULT_BOUNDARIES_FOR_UNIT.set(tr.b.Unit.byName.count.unitName,HistogramBinBoundaries.createExponential(1,1e3,20));return{Histogram:Histogram,HistogramBinBoundaries:HistogramBinBoundaries};});