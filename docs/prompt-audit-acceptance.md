# Prompt Audit Acceptance Protocol

This document defines the Stage 3 prompt provenance acceptance process. Compile success is not enough.

## Generate the prompt manifest

Run from repository root:

```bash
npm run prompt:manifest
```

This updates:

```text
src-tauri/src/llm/prompts/manifest.json
```

The generator computes these fields from local repository bytes:

```text
byteSize
sha256
lineCount
literalNewlineCount
exists
empty
auditStatus
```

The script fails when a prompt file is missing, empty, or contains many literal backslash-n sequences.

## Commit the generated manifest

```bash
git diff -- src-tauri/src/llm/prompts/manifest.json
git add src-tauri/src/llm/prompts/manifest.json
git commit -m "chore(prompts): refresh prompt manifest hashes"
```

Do not manually fill hashes.

## Original-source proof

Each manifest entry includes:

```text
originalSource
callEntry
contextType or promptSlug
exactMatch
diffReason
```

`exactMatch` must stay `unknown` until an original reference hash or source file is supplied.

## Runtime prompt dump proof

Run real app actions that trigger model calls. Then verify:

```bash
ls data/debug-prompts
cat data/debug-prompts/prompt_hash_index.jsonl | tail -20
```

Expected output exists for these chains:

```text
workflow step
workflow selfcheck
workflow checkpoint
script planning
script writing
script review
asset character
asset scene
asset prop
prompt segment planning
prompt seedance scene
seedance phase ad
seedance unit efg
```

Each `prompt_hash_index.jsonl` row should contain:

```text
promptHash
promptFile
promptSlug or contextType
command
model
maxTokens
dumpFile
createdAtEpochMs
```

## Failure record format

```text
Chain:
Expected prompt file:
Actual prompt file:
Prompt slug/context type:
Manifest sha256:
Runtime promptHash:
Dump file:
Observed problem:
Fix commit:
```

## Current non-pass items

```text
manifest.json must be regenerated locally after pulling the generator.
exactMatch remains unknown until original prompt hashes are supplied.
runtime audit is not accepted until prompt_hash_index.jsonl is produced by real model calls.
```
