---
title: RobotHub Arena Frontend
tags:
  - robotics
  - control
  - simulation
  - svelte
  - frontend
  - realtime
emoji: 🤖
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 8000
pinned: true
license: mit
fullWidth: true
short_description: Web interface of the RobotHub platform 
---

# 🤖 RobotHub Arena – Frontend

RobotHub is an **open-source, end-to-end robotics stack** that combines real-time communication, 3-D visualisation, and modern AI policies to control both simulated and physical robots.

**This repository contains the *Frontend*** – a SvelteKit web application that runs completely in the browser (or inside Electron / Tauri).  It talks to two backend micro-services that live in their own repositories:

1. **[RobotHub Transport Server](https://github.com/julien-blanchon/RobotHub-TransportServer)**  
   – WebSocket / WebRTC switch-board for video streams & robot joint messages.
2. **[RobotHub Inference Server](https://github.com/julien-blanchon/RobotHub-InferenceServer)**  
   – FastAPI service that loads large language- and vision-based policies (ACT, Pi-0, SmolVLA, …) and turns camera images + state into joint commands.

```text
┌────────────────────┐        ┌────────────────────────┐             ┌──────────────────────────┐
│  RobotHub Frontend │  HTTP  │  Transport Server      │   WebSocket │   Robot / Camera HW      │
│  (this repo)       │ <────► │  (rooms, WS, WebRTC)   │ ◄──────────►│   – servo bus, USB…      │
│                    │        └────────────────────────┘             └──────────────────────────┘
│  3-D scene (Threlte)│
│  UI / Settings     │        ┌────────────────────────┐
│  Svelte 5 runes    │  HTTP  │  Inference Server      │   HTTP/WS   │  GPU (Torch, HF models)  │
└────────────────────┘ <────► │  (FastAPI, PyTorch)     │ ◄──────────►└──────────────────────────┘
                           └────────────────────────┘
```

---

## ✨ Key Features

• **Digital-Twin 3-D Scene** – inspect robots, cameras & AI compute blocks in real-time.  
• **Multi-Workspace Collaboration** – share a hash URL and others join the *same* WS rooms instantly.  
• **Drag-&-Drop Add-ons** – spawn robots, cameras or AI models from the toolbar.  
• **Transport-Agnostic** – control physical hardware over USB, or send/receive via WebRTC rooms.  
• **Model Agnostic** – any policy exposed by the Inference Server can be used (ACT, Diffusion, …).  
• **Reactive Core** – built with *Svelte 5 runes* – state is automatically pushed into the UI.

---

## 📂 Repository Layout (short)

| Path                          | Purpose |
|-------------------------------|---------|
| `src/`                        | SvelteKit app (routes, components) |
| `src/lib/elements`            | Runtime domain logic (robots, video, compute) |
| `external/RobotHub-*`         | Git sub-modules for the backend services – used for generated clients & tests |
| `static/`                     | URDFs, STL meshes, textures, favicon |

A more in-depth component overview can be found in `/src/lib/components/**` – every major popup/modal has its own Svelte file.

---

## 🚀 Quick Start (dev)

```bash
# 1. clone with submodules (transport + inference)
$ git clone --recurse-submodules https://github.com/julien-blanchon/RobotHub-Frontend robothub-frontend
$ cd robothub-frontend

# 2. install deps (uses Bun)
$ bun install

# 3. start dev server (http://localhost:5173)
$ bun run dev -- --open
```

### Running the full stack locally

```bash
# 1. start Transport Server (rooms & streaming)
$ cd external/RobotHub-InferenceServer/external/RobotHub-TransportServer/server
$ uv run launch_with_ui.py  # →  http://localhost:8000

# 2. start Inference Server (AI brains)
$ cd ../../..
$ python launch_simple.py   # →  http://localhost:8001

# 3. frontend (separate terminal)
$ bun run dev -- --open     # →  http://localhost:5173  (hash = workspace-id)
```

The **workspace-id** in the URL hash ties all three services together.  Share `http://localhost:5173/#<id>` and a collaborator instantly joins the same set of rooms.

---

## 🛠️ Usage Walk-Through

1. **Open the web-app** → a fresh *workspace* is created (☝ left corner shows 🌐 ID).  
2. Click *Add Robot* → spawns an SO-100 6-DoF arm (URDF).  
3. Click *Add Sensor → Camera* → creates a virtual camera element.  
4. Click *Add Model → ACT* → spawns a *Compute* block.
5. On the Compute block choose *Create Session* – select model path (`LaetusH/act_so101_beyond`) and cameras (`front`).
6. Connect:  
   • *Video Input* – local webcam → `front` room.  
   • *Robot Input* – robot → *joint-input* room (producer).  
   • *Robot Output* – robot ← AI predictions (consumer).
7. Press *Start Inference* – the model will predict the next joint trajectory every few frames. 🎉

All modals (`AISessionConnectionModal`, `RobotInputConnectionModal`, …) expose precisely what is happening under the hood: which room ID, whether you are *producer* or *consumer*, and the live status.

---

## 🧩 Package Relations

| Package | Role | Artifacts exposed to this repo |
|---------|------|--------------------------------|
| **Transport Server** | Low-latency switch-board (WS/WebRTC).  Creates *rooms* for video & joint messages. | TypeScript & Python client libraries (imported from sub-module) |
| **Inference Server** | Loads checkpoints (ACT, Pi-0, …) and manages *sessions*.  Each session automatically asks the Transport Server to create dedicated rooms. | Generated TS SDK (`@robothub/inference-server-client`) – auto-called from `RemoteComputeManager` |
| **Frontend (this repo)** | UI + 3-D scene.  Manages *robots*, *videos* & *compute* blocks and connects them to the correct rooms. | – |

> Because the two backend repos are included as git sub-modules you can develop & debug the whole trio in one repo clone.

---

## 📜 Important Components (frontend)

• `RemoteComputeManager` – wraps the Inference Server REST API.  
• `RobotManager` – talks to Transport Server and USB drivers.  
• `VideoManager` – handles local/remote camera streams and WebRTC.

Each element is a small class with `$state` fields which Svelte 5 picks up automatically.  The modals listed below are *thin* UI shells around those classes:

```
AISessionConnectionModal     – create / start / stop AI sessions
RobotInputConnectionModal    – joint-states → AI
RobotOutputConnectionModal   – AI commands → robot
VideoInputConnectionModal    – camera → AI or screen
ManualControlSheet           – slider control, runs when no consumer connected
SettingsSheet                – configure base URLs of the two servers
```

---

## 🐳 Docker

A production-grade image is provided (multi-stage, 24 MB with Bun runtime):

```bash
$ docker build -t robothub-frontend .
$ docker run -p 8000:8000 robothub-frontend  # served by vite-preview
```

See `Dockerfile` for the full build – it also performs `bun test` & `bun run build` for the TS clients inside the sub-modules so that the image is completely self-contained.

---

## 🧑‍💻 Contributing

PRs are welcome!  The codebase is organised into **domain managers** (robot / video / compute) and **pure-UI** components.  If you add a new feature, create a manager first so that business logic can be unit-tested without DOM.

1. `bun test` – unit tests.  
2. `bun run typecheck` – strict TS config.

Please run `bun format` before committing – ESLint + Prettier configs are included.

---

## 🙏 Special Thanks

Huge gratitude to [Tim Qian](https://github.com/timqian) ([X/Twitter](https://x.com/tim_qian)) and the
[bambot project](https://bambot.org/) for open-sourcing **feetech.js** – the
delightful js driver that powers our USB communication layer. 
---

## 📄 License

MIT – see `LICENSE` in the root.

## 🌱 Project Philosophy

RobotHub follows a **separation-of-concerns** design:

* **Transport Server** is the single source of truth for *real-time* data – video frames, joint values, heart-beats.  Every participant (browser, Python script, robot firmware) only needs one WebSocket/WebRTC connection, no matter how many peers join later.
* **Inference Server** is stateless with regard to connectivity; it spins up / tears down *sessions* that rely on rooms in the Transport Server.  This lets heavy AI models live on a GPU box while cameras and robots stay on the edge.
* **Frontend** stays 100 % in the browser – no secret keys or device drivers required – and simply wires together rooms that already exist.

> By decoupling the pipeline we can deploy each piece on separate hardware or even different clouds, swap alternative implementations (e.g. ROS bridge instead of WebRTC) and scale each micro-service independently.

---

## 🛰  Transport Server – Real-Time Router

```
Browser / Robot ⟷  🌐 Transport Server  ⟷  Other Browser / AI / HW
```

* **Creates rooms** – `POST /robotics/workspaces/{ws}/rooms` or `POST /video/workspaces/{ws}/rooms`.
* **Manages roles** – every WebSocket identifies as *producer* (source) or *consumer* (sink).
* **Does zero processing** – it only forwards JSON (robotics) or WebRTC SDP/ICE (video).
* **Health-check** – `GET /api/health` returns a JSON heartbeat.

Why useful?

* You never expose robot hardware directly to the internet – it only speaks to the Transport Server.
* Multiple followers can subscribe to the *same* producer without extra bandwidth on the producer side (server fans out messages).
* Works across NAT thanks to WebRTC TURN support.

## 🏢  Workspaces – Lightweight Multi-Tenant Isolation

A **workspace** is simply a UUID namespace in the Transport Server.  Every room URL starts with:

```
/robotics/workspaces/{workspace_id}/rooms/{room_id}
/video/workspaces/{workspace_id}/rooms/{room_id}
```

Why bother?

1. **Privacy / Security** – clients in workspace *A* can neither list nor join rooms from workspace *B*. A workspace id is like a private password that keeps the rooms in the same workspace isolated from each other.
2. **Organisation** – keep each class, project or experiment separated without spinning up extra servers.
3. **Zero-config sharing** – the Frontend stores the workspace ID in the URL hash (e.g. `/#d742e85d-c9e9-4f7b-…`).  Send that link to a teammate and they automatically connect to the *same* namespace – all existing video feeds, robot rooms and AI sessions become visible.
4. **Stateless Scale-out** – Transport Server holds no global state; deleting a workspace removes all rooms in one call.

Typical lifecycle:

* **Create** – Frontend generates `crypto.randomUUID()` if the hash is empty.  Back-end rooms are lazily created when the first producer/consumer calls the REST API.
* **Share** – click the *#workspace* badge → *Copy URL* (handled by `WorkspaceIdButton.svelte`)

> Practical tip: Use one workspace per demo to prevent collisions, then recycle it afterwards.

---

## 🧠  Inference Server – Session Lifecycle

1. **Create session**  
   `POST /api/sessions` with JSON:
   ```jsonc
   {
     "session_id": "pick_place_demo",
     "policy_path": "LaetusH/act_so101_beyond",
     "camera_names": ["front", "wrist"],
     "transport_server_url": "http://localhost:8000",
     "workspace_id": "<existing-or-new>"  // optional
   }
   ```
2. **Receive response**  
   ```jsonc
   {
     "workspace_id": "ws-uuid",
     "camera_room_ids": { "front": "room-id-a", "wrist": "room-id-b" },
     "joint_input_room_id":  "room-id-c",
     "joint_output_room_id": "room-id-d"
   }
   ```
3. **Wire connections**
   * Camera PC joins `front` / `wrist` rooms as **producer** (WebRTC).
   * Robot joins `joint_input_room_id` as **producer** (joint states).
   * Robot (or simulator) joins `joint_output_room_id` as **consumer** (commands).
4. **Start inference**  
   `POST /api/sessions/{id}/start` – server loads the model and begins publishing commands.
5. **Stop / delete** as needed.  Stats & health are available via `GET /api/sessions`.

The Frontend automates steps 1-4 via the *AI Session* modal – you only click buttons.

---

## 🌐 Hosted Demo End-Points

| Service | URL | Status |
|---------|-----|--------|
| Transport Server | <https://blanchon-robothub-transportserver.hf.space/api> | Public & healthy |
| Inference Server | <https://blanchon-robothub-inferenceserver.hf.space/api> | `{"status":"healthy"}` |
| Frontend (read-only preview) | <https://blanchon-robothub-frontend.hf.space> | latest `main` |

Point the *Settings → Server Configuration* panel to these URLs and you can play without any local backend.

---

## 🎯 Main Use-Cases

Below are typical connection patterns you can set-up **entirely from the UI**.  Each example lists the raw data-flow (→ = producer to consumer/AI) plus a video placeholder you can swap for a screen-capture.

### Direct Tele-Operation (Leader ➜ Follower)
*Leader PC*  `USB` ➜ **Robot A** ➜ `Remote producer` → **Transport room** → `Remote consumer` ➜ **Robot B**  (`USB`)

> One human moves Robot A, Robot B mirrors the motion in real-time. Works with any number of followers – just add more consumers to the same room.
>
> 📺 *demo-teleop-1.mp4*

### Web-UI Manual Control
**Browser sliders** (`ManualControlSheet`) → `Remote producer` → **Robot (USB)**

> No physical master arm needed – drive joints from any device.
>
> 📺 *demo-webui.mp4*

### AI Inference Loop
**Robot (USB)** ➜ `Remote producer` → **joint-input room**  
**Camera PC** ➜ `Video producer` → **camera room(s)**  
**Inference Server** (consumer) → processes → publishes to **joint-output room** → `Remote consumer` ➜ **Robot**

> Lets a low-power robot PC stream data while a beefy GPU node does the heavy lifting.
>
> 📺 *demo-inference.mp4*

### Hybrid Classroom (Multi-Follower AI)
*Same as AI Inference Loop* with additional **Robot C, D…** subscribing to `joint_output_room_id` to run the same policy in parallel.

> Useful for swarm behaviours or classroom demonstrations.
>
> 📺 *demo-classroom.mp4*

### Split Video / Robot Across Machines
**Laptop A** (near cameras) → streams video → Transport  
**Laptop B** (near robot)   → joins joint rooms  
**Browser** anywhere        → watches video consumer & sends manual overrides

> Ideal when the camera PC stays close to sensors and you want minimal upstream bandwidth.
>
> 📺 *demo-splitio.mp4*
