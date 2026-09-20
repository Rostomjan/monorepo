# interview-lab

Playground for Next.js 16 / React 19 + Clerk + GCP interview prep. Each route is a runnable Demo.

## Language

**Playground**:
The whole interview-lab app.
_Avoid_: lab (for the app), demo (for the app)

**Lab**:
A top-level section, a collection of Demos (`/gcp`, `/clerk`).
_Avoid_: playground (for a section), skill

**Demo**:
One route built with `DemoShell(title, intro, demo, code, interview)` (`/gcp/run`).
_Avoid_: lab, playground, tutorial

**Skill**:
An interview-tellable ability ("deploy Next.js to Cloud Run with min-instances=0").
_Avoid_: demo, lab, feature

**BFF**:
A server endpoint shaped for one screen, aggregating backends with redaction and per-backend degradation.
_Avoid_: BBF, gateway, proxy