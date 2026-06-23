**# comma.ai Design Challenge — Weather HUD Concept

openpilot is a Level 2 self-driving system that continuously evaluates its own confidence and understands when it is approaching its physical limits. Yet, it communicates neither of these states to the driver until something goes wrong. The driver is only notified when the system beeps, alerts, or disengages—often at the worst possible moment.

## The Gaps

### Gap 1 — Confidence

The system continuously scores its own reliability in real time, but that information remains hidden from the driver. As a result, drivers have no visibility into whether openpilot is confidently handling the road or operating near the edge of its capabilities.

### Gap 2 — Physical Limits

The vehicle knows exactly how close it is to its steering torque, braking, and acceleration limits at every moment. However, it only communicates this after those limits have already been reached, triggering a sudden alert that startles the driver and leaves little time to react.

## My Approach — Weather HUD

Weather is one of the most universal visual languages humans understand. Regardless of age, language, or technical background, everyone intuitively knows what fog means while driving: slow down, stay alert, and be prepared to take control.

This concept borrows that instinctive language. Instead of displaying abstract confidence scores, the camera feed itself becomes the confidence signal.

## How the UI Works

### 1. Confidence — Fog System

**State 1: Clear** *(Above 65% Confidence)*
The system is operating comfortably and visibility remains clear.

**State 2: Hazy** *(30–65% Confidence)*
Confidence begins to decrease, subtly signaling the driver to pay closer attention.

**State 3: Heavy Fog** *(Below 30% Confidence)*
The system is approaching its limits and the driver should be prepared to take over.

### 2. Steering Load — Steering Wheel Icon

**Low Load**
The steering wheel icon remains white and clear.

**Moderate Load (50%+)**
The icon glows amber, indicating increasing steering effort.

**Near Limit (80%+)**
The icon glows red, signaling that the system is nearing its steering capacity and driver assistance may soon be required.

## Technical Implementation

### Stack

* **React + Vite** — Component-based architecture with fast development and build performance.
* **HTML5 Canvas** — Powers all HUD rendering for smooth 60 FPS visual updates.
* **No External Libraries** — Built entirely with React and the native Canvas API.
**
