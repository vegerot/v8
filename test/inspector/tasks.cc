// Copyright 2020 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "test/inspector/tasks.h"

#include <vector>

#include "include/v8-inspector.h"
#include "include/v8.h"
#include "test/inspector/isolate-data.h"
#include "test/inspector/utils.h"

namespace v8 {
namespace internal {

void ExecuteStringTask::Run(IsolateData* data) {
  v8::MicrotasksScope microtasks_scope(data->isolate(),
                                       v8::MicrotasksScope::kRunMicrotasks);
  v8::HandleScope handle_scope(data->isolate());
  v8::Local<v8::Context> context = data->GetDefaultContext(context_group_id_);
  v8::Context::Scope context_scope(context);
  v8::ScriptOrigin origin(
      ToV8String(data->isolate(), name_),
      v8::Integer::New(data->isolate(), line_offset_),
      v8::Integer::New(data->isolate(), column_offset_),
      /* resource_is_shared_cross_origin */ v8::Local<v8::Boolean>(),
      /* script_id */ v8::Local<v8::Integer>(),
      /* source_map_url */ v8::Local<v8::Value>(),
      /* resource_is_opaque */ v8::Local<v8::Boolean>(),
      /* is_wasm */ v8::Local<v8::Boolean>(),
      v8::Boolean::New(data->isolate(), is_module_));
  v8::Local<v8::String> source;
  if (expression_.size() != 0)
    source = ToV8String(data->isolate(), expression_);
  else
    source = ToV8String(data->isolate(), expression_utf8_);

  v8::ScriptCompiler::Source scriptSource(source, origin);
  v8::Isolate::SafeForTerminationScope allowTermination(data->isolate());
  if (!is_module_) {
    v8::Local<v8::Script> script;
    if (!v8::ScriptCompiler::Compile(context, &scriptSource).ToLocal(&script))
      return;
    v8::MaybeLocal<v8::Value> result;
    result = script->Run(context);
  } else {
    // Register Module takes ownership of {buffer}, so we need to make a copy.
    int length = static_cast<int>(name_.size());
    v8::internal::Vector<uint16_t> buffer =
        v8::internal::Vector<uint16_t>::New(length);
    std::copy(name_.begin(), name_.end(), buffer.begin());
    data->RegisterModule(context, buffer, &scriptSource);
  }
}

}  // namespace internal
}  // namespace v8
