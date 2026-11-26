# 0004: Warn on shortfall by default

## Status

Accepted

## Context

Date: 2026-11-26, from the register-and-compromise design note, marked "decided".

When no permitted compromise makes a syllable feasible, preflight can either refuse to render or render the best it can.

## Decision

By default preflight warns, reports the shortfall with remedies cheapest first, and renders the best feasible version. A strict mode refuses instead.

## Consequences

Encapsulated by preflight's plan check (not yet built).
