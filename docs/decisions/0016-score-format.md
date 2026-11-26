# 0016: ABC for written scores, MusicXML as the hub

## Status

Accepted

## Context

Date: 2026-11-26, from the owner's direction and the score-format spike ([score format evidence](../knowledge/description/score-format.md)).

Songs and arrangements are to be written as notation, more often by an AI than by hand, and in due course in every genre. The owner set two requirements for the format: breadth, and familiarity to AI models from their training.

ABC is the plain-text format that most research on language models and music uses. MusicXML is the broadest interchange format, but the same score is about 44 times larger as MusicXML than as ABC. In the spike, music21's own ABC reader dropped every lyric, the dynamics, breath marks, fermatas and harmonics, and merged named voices into one part. abc2xml read the same file without loss, apart from some chord qualities.

## Decision

- An AI writes scores in ABC 2.1.
- A score written by hand may arrive as MusicXML from a notation program.
- ABC is read only through abc2xml, into MusicXML. MusicXML is read with music21. music21's ABC reader is not used.
- Every score becomes one internal score model in metric time (bars and beats), whatever its source format.
- A score model can be exported as MusicXML, for viewing and editing in a notation program.

## Consequences

Encapsulated by the score module (`score`, not yet built; increment I11). abc2xml is licensed under the LGPL and its PyPI wrapper has one maintainer; increment I11 settles how it is pinned or vendored under the dependency rules.
