# Restoration Acceptance Gates

This checklist is the acceptance gate for the restoration work. A build passing is necessary but not sufficient.

## Stage 1: IPC contract

Run the app through Tauri, not a browser mock:

```bash
npm run tauri dev
```

Smoke check every command listed in:

```text
docs/ipc-contract-smoke-checklist.md
```

Pass condition:

```text
No missing arg
No invalid args
No unexpected timeout
No project/task not found caused by wrong argument wrapper
```

## Stage 2: workflow recovery

Golden path:

```text
Create project from InspirationHub
Generate Step 1-8
Save one manual overwrite
Approve Step 6 and generate after-step-6 checkpoint
Approve Step 8 and finalize
Restart app
Open project from ProjectsPage
```

Pass condition:

```text
Every generated step has an active version in the project record
Switching back to old steps preserves content
Restart restores currentStep, doneSteps, active versions, and checkpoint
Manual overwrite remains after switching/restart
Sidebar completion is based only on doneSteps
Finalize is idempotent and reuses linked script task
```

## Stage 3: prompt provenance

Run:

```bash
npm run prompt:manifest
```

Pass condition:

```text
23/23 active prompts match original-prompt-archive/raw-original byte-for-byte
src-tauri/src/llm/prompts/manifest.json has activeSha256/rawSha256/archiveSha256/exactMatch fields
```

Then run real model calls and verify:

```bash
ls data/debug-prompts
cat data/debug-prompts/prompt_hash_index.jsonl | tail -20
```

Pass condition:

```text
prompt_hash_index.jsonl exists
Each real model call writes a prompt dump
Dump rows include promptHash, promptFile, promptSlug or contextType, command, model, maxTokens, dumpFile, createdAtEpochMs
```

## Stage 4: backend functions exposed to frontend

Required function families:

```text
prompt/image -> run_image_generation
prompt/video -> run_video_generation
prompt/image-review -> run_image_review
prompt/video-review -> run_video_review
generate-outline -> confirm-outline -> run-generation -> run-group-generation
seedance phase-ad -> list-units -> run-unit -> run-all
```

Pass condition:

```text
Each function family has a front-end entry and uses the corresponding backend command
No page silently calls a different chain than its label implies
```

## Stage 5: asset matrix

Required checks:

```text
asset/get-all uses camelCase scalar taskId
asset/extract calls local asset_character, asset_scene, asset_prop prompts
asset_records receives character/scene/prop records
UI reports real status and errors, even if progress is coarse-grained
```

Pass condition:

```text
SQLite asset_records contains all three asset categories after extraction
Reloading AssetsForge restores records from SQLite
Failures show real error text
```

## Stage 6: local-only and no regression

Run:

```bash
npm run audit:local-only
```

Pass condition:

```text
No disallowed hardcoded endpoint
No obvious secret literal
No generic prompt fallback in prompt files
```

Also verify manually:

```text
All prompts are loaded from src-tauri/src/llm/prompts
Business data is stored in SQLite or screenplay project files
Keys are only user settings/local config, not source, prompt audit, or logs
```

## Baseline compile checks

Always run:

```bash
npm run frontend:typecheck
npm run frontend:build
cd src-tauri && cargo check && cargo test
```

Passing these commands does not replace the six restoration gates above.
