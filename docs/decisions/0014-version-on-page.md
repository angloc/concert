# 0014: The version is visible on the page

## Status

Accepted

## Context

Date: 2026-11-26.

The policy requires the application to report its version through a documented interface.

## Decision

The page shows the application version (the release tag without the leading `v`) as visible text in the page shell (`film/index.src.html`), not drawn into the film. `make package` injects it from `VERSION_TAG`.

## Consequences

Encapsulated by page assembly (`tools/build.py`) and the page shell (increment I2).
