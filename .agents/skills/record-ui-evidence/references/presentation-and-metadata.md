# Presentation and metadata

Read this reference when producing a storyboard, GIF, video, or reviewable metadata file.

## Storyboard

Choose three to six states that prove one claim, for example:

```text
initial list
→ input or selection complete
→ request running
→ request complete
→ Request/Attempt detail
```

- Keep viewport, zoom, and crop consistent across frames; cover the required widths for layout changes.
- Use lexically ordered names such as `00-initial.png`, `01-running.png`, and `02-settled.png`.
- Wait for a unique DOM state before capture and make the locator identify the intended element precisely.
- Use a precise result element as the completion condition; user-input echo must not create a false pass.
- Tool, Retry, Fallback, error, and recovery scenarios expose a stable Error Code, Attempt state, or diagnostic detail.

Store local evidence under a Git-ignored path:

```text
.artifacts/ui-evidence/<full-sha>/<scenario>/
.artifacts/ui-evidence/dirty-<short-sha>/<scenario>/
├── frames/
├── trace.zip
├── video.webm
├── demo.gif
└── metadata.json
```

Use the [metadata template](evidence-metadata.example.json). Never list an asset that does not exist.

## GIF encoding

Generate a GIF only when discrete interaction states need a lightweight demonstration. The encoder requires `python3`, `ffmpeg`, and `ffprobe`; report a missing dependency instead of installing it automatically.

```bash
python3 .agents/skills/record-ui-evidence/scripts/encode_gif.py \
  .artifacts/ui-evidence/<commit>/<scenario>/frames \
  .artifacts/ui-evidence/<commit>/<scenario>/demo.gif \
  --durations 1.5,1.5,1.5,3.5 \
  --fps 10 \
  --max-width 1200 \
  --colors 128
```

One duration may apply to every frame; otherwise provide one positive duration per frame. Keep the final settled state longest. Reduce width before colors or FPS when the file is too large, and preserve legibility of Chinese product text.

## Final verification

1. Check the encoder JSON summary for source frames, encoded frames, dimensions, duration, and bytes.
2. Inspect the final GIF, video, or trace rather than only its source screenshots.
3. Check final-frame dwell, ordering, Secrets, and personal data.
4. Confirm that artifacts exist only in ignored paths.
5. Record full commit, real dirty state, runtime mode, Provider type, viewport, commands, and claim in `metadata.json`.
6. A clean record has an empty `unverified` field; a dirty record states the unverified range.
7. Recheck source identity and reconsider evidence after a PR Head change.
