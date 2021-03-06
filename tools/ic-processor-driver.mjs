// Copyright 2017 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { Processor } from "./system-analyzer/processor.mjs";
import { WebInspector } from "./sourcemap.mjs";
import { BaseArgumentsProcessor } from "./arguments.mjs";

function processArguments(args) {
  var processor = new ArgumentsProcessor(args);
  if (processor.parse()) {
    return processor.result();
  } else {
    processor.printUsageAndExit();
  }
}

/**
 * A thin wrapper around shell's 'read' function showing a file name on error.
 */
export function readFile(fileName) {
  try {
    return read(fileName);
  } catch (e) {
    print(fileName + ': ' + (e.message || e));
    throw e;
  }
}

function initSourceMapSupport() {
  // Pull dev tools source maps into our name space.
  SourceMap = WebInspector.SourceMap;

  // Overwrite the load function to load scripts synchronously.
  SourceMap.load = function(sourceMapURL) {
    var content = readFile(sourceMapURL);
    var sourceMapObject = (JSON.parse(content));
    return new SourceMap(sourceMapURL, sourceMapObject);
  };
}

class ArgumentsProcessor extends BaseArgumentsProcessor {
  getArgsDispatch() {
    return {
      '--range': ['range', 'auto,auto',
          'Specify the range limit as [start],[end]'],
      '--source-map': ['sourceMap', null,
          'Specify the source map that should be used for output']
    };
  }
  getDefaultResults() {
   return {
      logFileName: 'v8.log',
      range: 'auto,auto',
    };
  }
}

const params = processArguments(arguments);
let sourceMap = null;
if (params.sourceMap) {
  initSourceMapSupport();
  sourceMap = SourceMap.load(params.sourceMap);
}
const processor = new Processor();
processor.processLogFile(params.logFileName);

const typeAccumulator = new Map();

const accumulator = {
  __proto__: null, 
  LoadGlobalIC: 0,
  StoreGlobalIC: 0,
  LoadIC: 0,
  StoreIC: 0,
  KeyedLoadIC: 0,
  KeyedStoreIC: 0,
  StoreInArrayLiteralIC: 0, 
}
for (const ic of processor.icTimeline.all) {
  print(
      ic.type + ' (' + ic.oldState + '->' + ic.newState + ic.modifier + ') at ' +
      ic.filePosition + ' ' + ic.key +
      ' (map 0x' + ic.map.toString(16) + ')' +
      (ic.reason ? ' ' + ic.reason : '') + ' time: ' + ic.time);
  accumulator[ic.type]++;
}

print("========================================");
for (const key of Object.keys(accumulator)) {
  print(key + ": " + accumulator[key]);
}


