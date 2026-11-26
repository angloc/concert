# 0010: Diverge from upstream and adopt the development policy

## Status

Accepted

## Context

Date: 2026-11-26.

`angloc/concert` is a fork of `ChetasLua/bide`. Upstream builds from the Python standard library only and has no tests, plan or knowledge base. Bringing the fork under the development policy means restructuring and reformatting, which makes merging from upstream impractical.

## Decision

`angloc/concert` is its own project. It follows `POLICY.md`. The upstream constraint of standard-library-only Python with nothing to install is dropped; dependencies follow the policy's rules on reuse and pinning.

## Consequences

Project-wide. Upstream changes are not merged; useful ones are ported by hand.
