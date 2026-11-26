# 0011: ffmpeg replaces the Swift video encoder

## Status

Accepted

## Context

Date: 2026-11-26.

`tools/enc.swift` encodes the film to MP4 through macOS AVFoundation, fed with JPEG frames by `tools/record.mjs`, and muxes an AAC file made by hand. It runs only on macOS, so CI cannot run it, and the policy has no Swift profile. It is custom code where an established tool exists.

## Decision

Video export uses ffmpeg, reading the same JPEG frame stream and the build's FLAC directly. `tools/enc.swift` is removed.

## Consequences

Encapsulated by the video export tool in `tools/` (increment I1). Removes Swift from the repository.
