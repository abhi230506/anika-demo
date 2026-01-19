# Anika

▶ Watch the demo video  
[![Anika Demo](assets/Anika%20video%20play.jpg)](https://youtu.be/kAmNQjdwiRA)

---

## About

Anika is a long-term, state-aware personal reflection system designed to observe patterns in how a person lives and surface insights they are usually too close to notice.

This repository represents a public-facing demonstration build of the system.

<p align="center">
  <img src="assets/Anika%20Demo%201.jpg" width="70%" />
</p>

---

## About This Repository

This repo contains a constrained, repurposed early-stage build of Anika.

The code here originated as an earlier experimental version created during the initial stages of the project. It has since been intentionally adapted and stabilized to function as a standalone demonstration of Anika’s core ideas.

**This demo version can run on any platform** (Windows, macOS, Linux) and is designed to showcase Anika's capabilities. However, **the actual production system is designed to run on a Raspberry Pi 5**, where it operates as a dedicated, always-on companion integrated into the physical environment.

While the foundational algorithms and behavioral logic are present, the system is:
- simplified
- partially abstracted
- intentionally limited in scope

This separation is deliberate.

The complete system operates beyond what is exposed in this repository.

---

## Core Idea

People are bad at seeing themselves clearly in the moment.

Anika exists to:
- observe behavior over long time horizons
- detect recurring patterns across energy, focus, and habits
- reflect those patterns back at moments where course-correction is still possible

She responds to state, not commands.

---

## Long-Term Pattern Modeling

Anika builds and maintains an evolving internal model based on:
- behavioral consistency
- energy and focus cycles
- habit formation and decay
- divergence between intention and action

Observed behavior is prioritized over declared goals.

<p align="center">
  <img src="assets/Anika%20Demo%202.jpg" width="70%" />
</p>

---

## State-Aware Interaction

Anika reacts to shifts in state, including:
- extended inactivity
- over-optimization loops
- avoidance behavior
- sustained high-focus phases

In many cases, the correct response is restraint.

<p align="center">
  <img src="assets/Anika%20Demo%203.jpg" width="70%" />
</p>

---

## Pattern Reflection, Not Motivation

Rather than reminders or encouragement, Anika surfaces quiet observations:
- recurring failure points
- predictable burnout loops
- performance conditions that repeat over time

The goal is clarity, not motivation.

---

## Adaptive Presence and Coaching

As discipline and self-awareness increase, Anika becomes:
- quieter
- more selective
- more interpretive

The system is designed to reduce its own visibility over time.

<p align="center">
  <img src="assets/Anika%20Demo%205.jpg" width="70%" />
</p>

---

## Real-World Use

Anika is designed to exist alongside daily work, not replace it.

It integrates quietly into real environments and responds only when useful.

<p align="center">
  <img src="assets/Anika%20Demo%204.jpg" width="70%" />
</p>

---

## What Anika Is Not

- Not a chatbot
- Not a productivity app
- Not a habit tracker
- Not a motivational system
- Not a gamified AI companion

Anika avoids dopamine-driven feedback entirely.

---

## Design Philosophy

- Long-term signal over short-term metrics
- Observation over instruction
- Reflection over motivation
- Silence over noise
- Intentional constraint over feature sprawl

---

## System Status

This repository reflects an early, intentionally limited layer of Anika.

Additional system layers, integrations, and behavioral mechanisms remain private by design. The public demo exists to communicate the system’s philosophy and foundational logic without exposing the complete architecture.

---

## Why the Full System Remains Private

Anika is an ongoing project with a clear long-term direction.

This repository is intentionally limited. Additional system layers and newer implementations exist, but are not being publicly released yet. The goal here is to share the core ideas, design philosophy, and foundational algorithms without exposing the full system.

This demo is primarily meant to give reviewers, such as co-op interviewers, something concrete to inspect while the project continues to evolve. A more recent and more complete version will be released later.

---

## Tech Stack

- Framework: Next.js 16
- Language: TypeScript
- AI: OpenAI GPT-4
- TTS: ElevenLabs
- UI: React, Tailwind CSS
- **Demo Platform**: Cross-platform (Windows, macOS, Linux)
- **Production Platform**: Raspberry Pi 5 (ARM64)

---

## Getting Started

Install dependencies:

```bash
pnpm install
```

---

## Environment Variables

Copy the example environment file:

    cp .env.example .env.local

Required:
- OPENAI_API_KEY
- ELEVENLABS_API_KEY
- ELEVENLABS_VOICE_ID

Optional:
- OPENWEATHER_API_KEY

---

## Building

A memory-constrained build script is included for ARM devices:

```bash
pnpm run build:pi
```

---

## Running

Development:

```bash
pnpm dev
```

Production:

```bash
pnpm run build:pi
pnpm run start:prod
```

---

## Notes

- **Demo**: This repurposed version can run on any platform
- **Production**: The actual system is built for ARM64 (Raspberry Pi 5)
- Uses Next.js standalone output
- Memory-limited build scripts included for Raspberry Pi deployment
- Designed to run headless if needed

---

## Why This Exists

> What happens when a system remembers your behavior longer than you do and reflects it back without judgment?