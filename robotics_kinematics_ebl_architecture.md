# Robotics Kinematics EBL Web App Architecture Guide

**Project:** Robotics Kinematics EBL Web App
**Course context:** MFE309TC Robotics Kinematics
**Architecture type:** Lightweight static-first frontend architecture
**Recommended repository name:** `robotics-kinematics-ebl-webapp`
**Version:** v1.0
**Date:** 2026-06-25

---

## 1. Executive Summary

This project should be built as a **lightweight static-first interactive learning web app**.

The first version does **not** need a backend, database, login system, or teacher dashboard. The core learning interactions can run directly in the browser:

* dragging and assembling robot-arm parts;
* moving a point or ball inside a coordinate frame;
* rotating an object or coordinate frame;
* changing joint angles with sliders;
* clicking a target point for inverse kinematics;
* updating matrices and formulas in real time;
* showing immediate visual feedback and hints.

The recommended technical stack is:

```text
Next.js + TypeScript + React
Tailwind CSS
SVG-first interaction
KaTeX for formulas
React Context or Zustand for state
Static deployment on Vercel / Netlify / GitHub Pages / university server
```

The guiding principle is:

> Interaction first, formula second.
> Visual intuition first, mathematical expression second.

---

## 2. Project Goals

The purpose of the website is to convert robotics kinematics lecture content into an interactive EBL learning experience.

The website should help beginner students understand:

1. what a robotic arm is made of;
2. what position means;
3. what orientation means;
4. how a transformation matrix combines position and orientation;
5. how forward kinematics calculates end-effector position from joint angles;
6. how inverse kinematics calculates joint angles from a target position;
7. how advanced tools such as rotation operators, coordinate systems, RPY angles, and DH notation support formal robot modeling.

The project should not be treated as a simple PDF-to-web conversion. It should become an interactive learning system.

---

## 3. Architecture Decision

### 3.1 Recommended Architecture

Use a **static-first frontend architecture**.

This means:

* pages are generated as static web pages;
* all interaction logic runs in the browser;
* mathematical calculations run in TypeScript functions;
* no backend is required for the MVP;
* deployment is simple and low-cost;
* future backend features can be added later if required.

### 3.2 Why This Architecture Fits the Project

The current project requirements are mostly frontend-based:

| Requirement                     | Backend Needed? | Frontend Solution                  |
| ------------------------------- | --------------: | ---------------------------------- |
| Drag robot parts                |              No | React + SVG / pointer events       |
| Move ball / point Q             |              No | SVG + React state                  |
| Rotate coordinate frame         |              No | SVG transform / CSS transform      |
| Update formula values           |              No | TypeScript calculation functions   |
| Show matrix highlights          |              No | React component state              |
| Click inverse kinematics target |              No | SVG onClick + TypeScript IK solver |
| Save simple local progress      |              No | `localStorage`                     |
| Deploy online                   |              No | Static hosting                     |

Therefore, a full-stack architecture would be unnecessary for the MVP.

---

## 4. Recommended Technology Stack

### 4.1 Core Stack

```text
Next.js
TypeScript
React
Tailwind CSS
```

### 4.2 Interaction and Visualization

```text
SVG first
Konva.js only if drag-and-drop becomes complex
Three.js / React Three Fiber only for optional advanced 3D modules
```

### 4.3 Formula Rendering

```text
KaTeX
```

### 4.4 State Management

```text
React Context for simple state
Zustand if cross-page state becomes more complex
```

### 4.5 Deployment

Recommended deployment options:

```text
Vercel
Netlify
GitHub Pages
University server
```

For a Next.js static build, Vercel is the easiest option. GitHub Pages is also possible if the project is exported as static files.

---

## 5. What Should Be Lightweight

The project should be lightweight in these areas:

### 5.1 No Backend in MVP

Do not build these in the first version:

* login system;
* user account system;
* database;
* teacher dashboard;
* score tracking;
* server-side API;
* file upload system.

These can be added later if the teacher requests them.

### 5.2 SVG Before 3D

Most pages can be built with 2D or 2.5D graphics.

Use SVG for:

* robot arm links;
* joints;
* end effector;
* coordinate axes;
* draggable objects;
* workspace circles;
* matrix highlighting.

Do not use Three.js for the entire website at the beginning.

### 5.3 Minimal External Dependencies

Avoid large UI libraries unless necessary.

Recommended dependencies:

```text
next
react
react-dom
typescript
tailwindcss
katex
```

Optional dependencies:

```text
zustand
react-katex
konva
react-konva
three
@react-three/fiber
```

Only add optional dependencies when the feature clearly needs them.

---

## 6. Website Structure

The website should have seven learning pages.

| Page | Route                 | Topic                 | Core Learning Outcome                                              |
| ---: | --------------------- | --------------------- | ------------------------------------------------------------------ |
|    1 | `/robot-basics`       | Robot Arm Basics      | A robotic arm is built from base, joints, links, and end effector. |
|    2 | `/position`           | Position              | Position tells where an object is. Axis direction does not change. |
|    3 | `/orientation`        | Orientation           | Orientation tells which direction an object faces.                 |
|    4 | `/transformation`     | Transformation Matrix | A 4 by 4 matrix combines rotation and translation.                 |
|    5 | `/forward-kinematics` | Forward Kinematics    | Given joint angles, calculate end-effector position.               |
|    6 | `/inverse-kinematics` | Inverse Kinematics    | Given a target position, calculate joint angles.                   |
|    7 | `/advanced`           | Advanced Kinematics   | Rotation operators, coordinate systems, RPY, and DH notation.      |

The home page `/` should introduce the app and guide users to Page 1.

---

## 7. Global Page Layout

Every learning page should use the same layout.

```text
+------------------------------------------------------+
| TopBar: title + progress + help                      |
+--------------+----------------------+----------------+
| ChapterSide- | InteractiveCanvas    | Explanation    |
| bar          |                      | Panel          |
|              |                      | FormulaPanel   |
+--------------+----------------------+----------------+
| BottomPanel: step hint + check button + next button  |
+------------------------------------------------------+
```

### 7.1 Main Layout Areas

| Area              | Purpose                                                   |
| ----------------- | --------------------------------------------------------- |
| TopBar            | Shows current page title, progress, and help button.      |
| ChapterSidebar    | Shows seven chapters and current page status.             |
| InteractiveCanvas | Main area for drag, rotate, click, or slider interaction. |
| ExplanationPanel  | Uses short beginner-friendly explanations.                |
| FormulaPanel      | Shows formulas progressively, not immediately.            |
| BottomPanel       | Shows hints, checks, feedback, and next step.             |

### 7.2 Design Rule

Every page should follow this learning sequence:

1. real-life analogy;
2. visual demonstration;
3. interactive action;
4. immediate feedback;
5. formula reveal;
6. short check question.

---

## 8. Recommended File Structure

Use this structure from the start.

```text
src/
  app/
    page.tsx
    layout.tsx
    globals.css

    robot-basics/
      page.tsx

    position/
      page.tsx

    orientation/
      page.tsx

    transformation/
      page.tsx

    forward-kinematics/
      page.tsx

    inverse-kinematics/
      page.tsx

    advanced/
      page.tsx

  components/
    layout/
      AppShell.tsx
      TopBar.tsx
      ChapterSidebar.tsx
      BottomPanel.tsx
      StepProgress.tsx

    visual/
      RobotArm2D.tsx
      CoordinateFrame.tsx
      MatrixViewer.tsx
      Workspace2D.tsx
      ObjectFrame2D.tsx
      FormulaHighlight.tsx

    interaction/
      DragPartBuilder.tsx
      AngleSlider.tsx
      TargetPicker.tsx
      AxisSelector.tsx
      RotationControl.tsx
      NumberInput.tsx

    learning/
      FormulaPanel.tsx
      ExplanationPanel.tsx
      HintBox.tsx
      CheckButton.tsx
      NextButton.tsx
      PageSummary.tsx

    ui/
      Button.tsx
      Card.tsx
      Tabs.tsx
      Badge.tsx

  lib/
    kinematics/
      forward2D.ts
      inverse2D.ts
      rotationMatrix.ts
      transformMatrix.ts
      coordinateSystems.ts
      dh.ts

    math/
      angle.ts
      vector.ts
      matrix.ts
      formatNumber.ts

    storage/
      progressStorage.ts

    constants/
      routes.ts
      colors.ts

  content/
    chapters.ts
    pages.ts
    formulas.ts
    questions.ts
    hints.ts

  store/
    useProgressStore.ts
    useKinematicsStore.ts

  types/
    robot.ts
    matrix.ts
    page.ts
    interaction.ts
```

---

## 9. Layered Architecture

The codebase should be divided into five layers.

### 9.1 Page Layer

Location:

```text
src/app/
```

Responsibility:

* define routes;
* compose page components;
* pass data to components;
* avoid complex mathematical logic.

Example:

```tsx
// src/app/forward-kinematics/page.tsx
import { ForwardKinematicsPage } from "@/components/pages/ForwardKinematicsPage";

export default function Page() {
  return <ForwardKinematicsPage />;
}
```

### 9.2 Component Layer

Location:

```text
src/components/
```

Responsibility:

* reusable UI;
* visual objects;
* interaction controls;
* learning panels.

Do not duplicate components across pages.

For example:

* Page 5 and Page 6 should both use `RobotArm2D`.
* Page 2, Page 3, Page 4, and Page 7 should all use `MatrixViewer`.

### 9.3 Mathematical Logic Layer

Location:

```text
src/lib/kinematics/
```

Responsibility:

* pure mathematical functions;
* no UI code;
* no React state;
* easy to test.

Example function:

```ts
export function forward2D(theta1: number, theta2: number, a1: number, a2: number) {
  const t1 = degToRad(theta1);
  const t2 = degToRad(theta2);

  return {
    x: a1 * Math.cos(t1) + a2 * Math.cos(t1 + t2),
    y: a1 * Math.sin(t1) + a2 * Math.sin(t1 + t2),
  };
}
```

### 9.4 Content Layer

Location:

```text
src/content/
```

Responsibility:

* page titles;
* learning objectives;
* explanation text;
* formula text;
* hints;
* check questions.

This makes it easier to update the course language without editing component code.

### 9.5 State Layer

Location:

```text
src/store/
```

Responsibility:

* learning progress;
* completed pages;
* current joint angles;
* selected target point;
* current page interaction state.

For MVP, store progress in `localStorage`.

---

## 10. Component Design

### 10.1 Core Layout Components

| Component        | Purpose                      |
| ---------------- | ---------------------------- |
| `AppShell`       | Shared page layout wrapper.  |
| `TopBar`         | Page title, progress, help.  |
| `ChapterSidebar` | Seven-chapter navigation.    |
| `BottomPanel`    | Hint, feedback, check, next. |
| `StepProgress`   | Current step in each page.   |

### 10.2 Visual Components

| Component         | Purpose                                             |
| ----------------- | --------------------------------------------------- |
| `RobotArm2D`      | Draws a 2-link or 3-link robot arm.                 |
| `CoordinateFrame` | Shows X, Y, Z axes or 2D axes.                      |
| `MatrixViewer`    | Displays matrices with highlight support.           |
| `Workspace2D`     | Shows robot reachable workspace.                    |
| `ObjectFrame2D`   | Shows object frame B relative to universal frame U. |

### 10.3 Interaction Components

| Component         | Purpose                                    |
| ----------------- | ------------------------------------------ |
| `DragPartBuilder` | Page 1 drag-and-assemble activity.         |
| `AngleSlider`     | Joint angle and rotation controls.         |
| `TargetPicker`    | Click target point for inverse kinematics. |
| `AxisSelector`    | Choose X, Y, Z axis.                       |
| `RotationControl` | Rotate object or coordinate frame.         |

### 10.4 Learning Components

| Component          | Purpose                             |
| ------------------ | ----------------------------------- |
| `FormulaPanel`     | Progressive formula display.        |
| `ExplanationPanel` | Short beginner explanation.         |
| `HintBox`          | Correct / incorrect feedback.       |
| `CheckButton`      | Checks student answer.              |
| `PageSummary`      | Fixed end-of-page learning summary. |

---

## 11. Page-Level Implementation Plan

## Page 1: Robot Arm Basics

### Goal

Students understand the parts of a robotic arm:

* base;
* joint;
* link;
* end effector;
* wrist;
* actuator;
* controller;
* sensors.

### Main Interaction

Students drag parts to assemble a simple robot arm:

```text
Base -> Joint -> Link -> Joint -> Link -> Joint -> End Effector
```

### Components

```text
DragPartBuilder
RobotArm2D
HintBox
CheckButton
```

### Acceptance Criteria

* Students can drag at least four part types.
* Parts snap to valid positions.
* Wrong connections show hints.
* Completed robot arm is displayed.
* Students can count base, joints, links, and end effector.

---

## Page 2: Position

### Goal

Students understand that position describes where an object is.

Position vector:

```text
UQ = [qx, qy, qz]^T
```

### Main Interaction

Students move a ball or point Q in a room-like coordinate frame.

The interface updates:

```text
qx = ...
qy = ...
qz = ...
```

### Components

```text
CoordinateFrame
TargetPicker or draggable point
MatrixViewer
AxisSelector
HintBox
```

### Acceptance Criteria

* Students can move point Q.
* qx, qy, and qz update immediately.
* Axis colors and matrix variables match.
* Students distinguish fixed frame U from movable object Q.

---

## Page 3: Orientation

### Goal

Students understand that orientation describes which direction an object faces.

Rotation matrix:

```text
R = [X_B, Y_B, Z_B]
```

### Main Interaction

Students rotate object frame B while universal frame U stays fixed.

### Components

```text
CoordinateFrame
ObjectFrame2D
RotationControl
MatrixViewer
FormulaPanel
```

### Acceptance Criteria

* Students can rotate object/frame B.
* U frame remains fixed.
* B frame rotates.
* Rotation matrix updates.
* Students can explain position versus orientation.

---

## Page 4: Transformation Matrix

### Goal

Students understand that a homogeneous transformation matrix combines rotation and translation.

```text
T = [ R  q ]
    [ 0  1 ]
```

### Main Interaction

Students test three modes:

1. translation only;
2. rotation only;
3. translation plus rotation.

### Components

```text
CoordinateFrame
ObjectFrame2D
MatrixViewer
FormulaPanel
RotationControl
TargetPicker
```

### Acceptance Criteria

* Translation action highlights the q column.
* Rotation action highlights the R block.
* Combined action highlights both R and q.
* Students understand that the 4 by 4 matrix represents position plus orientation.

---

## Page 5: Forward Kinematics

### Goal

Students understand:

> Given joint angles and link lengths, where is the robot hand?

For a two-link robot:

```text
x = a1 cos(theta1) + a2 cos(theta1 + theta2)
y = a1 sin(theta1) + a2 sin(theta1 + theta2)
```

### Main Interaction

Students adjust:

```text
theta1
theta2
a1
a2
```

The robot arm and end-effector position update immediately.

### Components

```text
RobotArm2D
AngleSlider
NumberInput
MatrixViewer or FormulaPanel
Workspace2D
```

### Acceptance Criteria

* Students can adjust theta1 and theta2.
* Students can adjust a1 and a2.
* Robot animation updates immediately.
* x and y are calculated in real time.
* Formula highlights the variable being changed.

---

## Page 6: Inverse Kinematics

### Goal

Students understand:

> Given a target point, what joint angles should the robot use?

### Main Interaction

Students click a target point.

The system calculates:

```text
theta1
theta2
```

It should also show:

* elbow-up solution;
* elbow-down solution;
* unreachable target warning.

### Components

```text
RobotArm2D
TargetPicker
Workspace2D
FormulaPanel
HintBox
```

### Acceptance Criteria

* Students can click a target point.
* The system calculates theta1 and theta2.
* The page can switch between elbow-up and elbow-down.
* Unreachable targets show clear feedback.
* Formula variables link visually to the drawing.

---

## Page 7: Advanced Kinematics

### Goal

Students connect earlier pages to formal robotics modeling tools.

### Structure

Use tabs instead of one long page:

```text
Tab 1: Translation Operator
Tab 2: Rotation Operator
Tab 3: Coordinate Systems
Tab 4: Roll, Pitch, Yaw
Tab 5: DH Notation
```

### Components

```text
Tabs
CoordinateFrame
MatrixViewer
AngleSlider
NumberInput
RobotArm2D
FormulaPanel
```

### Acceptance Criteria

* Page 7 uses tabs.
* Each tab has at least one interaction.
* Translation commutativity is visualized.
* Rotation non-commutativity is visualized.
* DH notation starts with a two-link planar robot.

---

## 12. Mathematical Function Design

### 12.1 `forward2D.ts`

Purpose:

```text
Calculate end-effector position from theta1, theta2, a1, a2.
```

Input:

```ts
theta1: number
theta2: number
a1: number
a2: number
```

Output:

```ts
{
  joint1: { x: number; y: number },
  endEffector: { x: number; y: number }
}
```

### 12.2 `inverse2D.ts`

Purpose:

```text
Calculate joint angles from target x, y and link lengths.
```

Input:

```ts
x: number
y: number
a1: number
a2: number
mode: "elbow-up" | "elbow-down"
```

Output:

```ts
{
  reachable: boolean
  theta1?: number
  theta2?: number
  reason?: string
}
```

### 12.3 `rotationMatrix.ts`

Purpose:

```text
Generate rotation matrices around X, Y, and Z axes.
```

Functions:

```ts
rotX(theta: number)
rotY(theta: number)
rotZ(theta: number)
```

### 12.4 `transformMatrix.ts`

Purpose:

```text
Combine rotation matrix R and translation vector q into a 4 by 4 matrix.
```

Function:

```ts
makeTransformMatrix(R: number[][], q: [number, number, number])
```

### 12.5 `coordinateSystems.ts`

Purpose:

```text
Convert cylindrical and spherical coordinate values into Cartesian qx, qy, qz.
```

Functions:

```ts
cylindricalToCartesian(r, theta, z)
sphericalToCartesian(r, alpha, beta)
```

---

## 13. State Management Design

### 13.1 Simple MVP State

For early development, local component state is enough:

```tsx
const [theta1, setTheta1] = useState(30);
const [theta2, setTheta2] = useState(45);
```

### 13.2 Shared Progress State

Use `localStorage` to store completed pages:

```ts
type ProgressState = {
  completedPages: string[];
  currentPage: string;
};
```

Example storage key:

```text
robotics-ebl-progress
```

### 13.3 When to Use Zustand

Use Zustand only if:

* multiple pages need shared state;
* progress unlock logic becomes complex;
* many components need the same interaction state.

Possible store:

```ts
type KinematicsStore = {
  theta1: number;
  theta2: number;
  a1: number;
  a2: number;
  targetX: number;
  targetY: number;
  setTheta1: (value: number) => void;
  setTheta2: (value: number) => void;
};
```

---

## 14. Interaction Design Rules

### 14.1 Feedback Rules

| Student Action           | Feedback                           |
| ------------------------ | ---------------------------------- |
| Correct drag / selection | Green highlight + “Good Job!”      |
| Wrong drag / selection   | Object returns + short hint        |
| Target outside workspace | “Target unreachable” + explanation |
| Formula opened           | Highlight related visual variable  |
| Page completed           | Unlock next page                   |

### 14.2 Formula Display Rule

Do not show full equations first.

Use progressive disclosure:

1. show the visual change;
2. show variable names;
3. show the full formula;
4. explain each term only when students click “Explain Formula”.

### 14.3 Beginner Language Rule

Use short, direct sentences.

Good:

```text
Move the ball.
Watch qx, qy, and qz change.
```

Avoid:

```text
The displacement vector in Euclidean 3-space is represented by a 3 by 1 column vector.
```

---

## 15. Styling and UI Rules

### 15.1 General UI Style

Use:

* clean academic interface;
* high contrast text;
* large interaction area;
* consistent sidebar;
* clear next-step button;
* minimal decorative elements.

### 15.2 Tailwind Usage

Use Tailwind utility classes for:

* layout;
* spacing;
* typography;
* cards;
* panels;
* buttons;
* responsive behavior.

Avoid writing large custom CSS files unless necessary.

### 15.3 Responsive Design

Priority:

1. desktop first for complex interactions;
2. tablet readable;
3. mobile readable but not all interactions need to be perfect.

The learning text should remain readable on mobile. Complex dragging and robot simulation can prioritize desktop.

---

## 16. Performance Strategy

### 16.1 Keep the First Version Fast

Use:

* SVG instead of canvas or 3D where possible;
* static generation;
* small dependency list;
* lazy load advanced modules;
* avoid full-page Three.js.

### 16.2 Lazy Loading

Page 7 can lazy-load heavier modules:

```ts
const Advanced3DView = dynamic(() => import("./Advanced3DView"), {
  ssr: false,
});
```

### 16.3 Avoid Unnecessary Re-renders

For interactive components:

* keep state local where possible;
* memoize heavy calculations only if needed;
* avoid storing every mouse movement globally;
* throttle drag updates if performance drops.

---

## 17. Testing Plan

### 17.1 Manual Testing Checklist

Every page must pass:

* page loads without console errors;
* interaction works;
* formula updates correctly;
* wrong answer shows hint;
* next button works;
* layout is consistent;
* desktop view is usable.

### 17.2 Mathematical Testing

Test pure functions in `lib/kinematics`.

Examples:

```text
forward2D(0, 0, 5, 3) should return x = 8, y = 0.
```

```text
Target distance greater than a1 + a2 should be unreachable.
```

### 17.3 Team Review Checklist

Before merging a Pull Request:

* code runs locally;
* no duplicate component was created;
* formulas are placed in `lib/kinematics`;
* text is placed in `content`;
* UI follows shared layout;
* PR description explains the change.

---

## 18. GitHub Collaboration Workflow

### 18.1 Branches

Use this branch structure:

```text
main       stable production branch
dev        integration branch
feature/*  individual development branches
```

Examples:

```text
feature/layout-shell
feature/page-1-robot-basics
feature/page-2-position
feature/page-5-forward-kinematics
feature/matrix-viewer
feature/robot-arm-2d
```

### 18.2 Workflow

Each developer should do:

```bash
git checkout dev
git pull origin dev
git checkout -b feature/page-name
```

After coding:

```bash
git add .
git commit -m "feat: add forward kinematics interaction"
git push origin feature/page-name
```

Then open a Pull Request:

```text
feature/page-name -> dev
```

Do not directly push to `main`.

### 18.3 Commit Message Convention

Use simple conventional commits:

```text
feat: add position page draggable ball
fix: correct inverse kinematics angle calculation
style: update sidebar spacing
refactor: move formulas to lib folder
docs: update architecture guide
```

### 18.4 Pull Request Template

```md
## What changed

- 

## Page or component affected

- 

## How to test

- Run `npm run dev`
- Open `/...`
- Test ...

## Checklist

- [ ] No console error
- [ ] UI follows shared layout
- [ ] Formula logic is in `lib/kinematics`
- [ ] Reusable components are used
- [ ] Page works locally
```

---

## 19. Team Role Allocation

Suggested team split:

| Role                 | Responsibility                                                 |
| -------------------- | -------------------------------------------------------------- |
| Tech Lead            | Maintains architecture, reviews PRs, manages `dev` and `main`. |
| UI/Layout Developer  | Builds `AppShell`, sidebar, top bar, bottom panel.             |
| Page 1 Developer     | Robot Arm Basics drag-and-drop.                                |
| Page 2 Developer     | Position page and coordinate interaction.                      |
| Page 3 Developer     | Orientation page and rotation interaction.                     |
| Page 5 Developer     | Forward kinematics slider interaction.                         |
| Page 6 Developer     | Inverse kinematics target clicking.                            |
| Math/Logic Developer | Maintains `lib/kinematics` functions.                          |
| Content Developer    | Maintains text, formulas, hints, and check questions.          |

One person can take multiple roles if the team is small.

---

## 20. Development Roadmap

### Phase 0: Repository Setup

Tasks:

* create Next.js project;
* configure TypeScript;
* configure Tailwind CSS;
* create folder structure;
* create `main`, `dev`, and feature branch rules;
* add README;
* add architecture document.

Deliverable:

```text
Project runs locally with npm run dev.
```

### Phase 1: MVP Pages

Build:

1. Page 1 Robot Arm Basics;
2. Page 2 Position;
3. Page 3 Orientation;
4. Page 5 Forward Kinematics;
5. Page 6 Inverse Kinematics.

Why:

These pages show the strongest EBL value through drag, movement, rotation, sliders, and target clicking.

### Phase 2: Matrix Integration

Build:

1. Page 4 Transformation Matrix;
2. improved MatrixViewer;
3. R and q region highlighting;
4. formula explanation overlay.

### Phase 3: Advanced Module

Build Page 7 tabs:

1. Translation Operator;
2. Rotation Operator;
3. Coordinate Systems;
4. Roll, Pitch, Yaw;
5. DH Notation.

### Phase 4: Polish and Deployment

Tasks:

* unify UI style;
* add loading states;
* improve feedback text;
* test all pages;
* deploy online;
* write final README;
* prepare presentation or demo script.

---

## 21. Deployment Plan

### 21.1 Vercel Deployment

Recommended for easiest deployment.

Steps:

1. push code to GitHub;
2. connect repository to Vercel;
3. set framework as Next.js;
4. deploy automatically from `main`.

### 21.2 GitHub Pages Deployment

Possible if using static export.

Need configure:

```js
// next.config.js
const nextConfig = {
  output: "export",
};

module.exports = nextConfig;
```

Then build:

```bash
npm run build
```

The exported static files can be deployed to GitHub Pages.

### 21.3 University Server

If the university server only accepts static files, use static export and upload the generated output.

---

## 22. Future Backend Extension

The MVP does not need a backend.

Add backend only if future requirements include:

* user login;
* student progress saved across devices;
* teacher dashboard;
* quiz score tracking;
* database;
* user-generated content;
* AI tutor or chatbot;
* analytics.

Possible future backend options:

```text
Next.js API Routes
Supabase
Firebase
PostgreSQL
University server API
```

Do not build these unless they are confirmed requirements.

---

## 23. Risk Management

### Risk 1: Every teammate writes different UI

Solution:

* create `AppShell` first;
* force all pages to use shared layout;
* review PRs for consistency.

### Risk 2: Duplicate components

Solution:

* shared components must go into `components/`;
* no page-specific duplicate robot arm or matrix viewer.

### Risk 3: Math formulas scattered everywhere

Solution:

* all formulas and calculations go into `lib/kinematics/`;
* components only display results.

### Risk 4: Overbuilding 3D too early

Solution:

* SVG-first MVP;
* Three.js only for advanced optional features.

### Risk 5: Merge conflicts

Solution:

* feature branches;
* Pull Requests;
* pull from `dev` daily;
* avoid multiple people editing the same file.

---

## 24. Definition of Done

A page is considered done only when:

1. it has one clear learning objective;
2. the page uses the shared layout;
3. at least one interaction works;
4. interaction updates both visual object and formula;
5. incorrect actions show hints;
6. formulas are not static images;
7. code runs locally without console errors;
8. page is readable on desktop;
9. PR is reviewed and merged into `dev`.

---

## 25. Recommended README Summary

The repository README can include this paragraph:

```md
This project uses a lightweight static-first frontend architecture based on Next.js, TypeScript, React, Tailwind CSS, SVG-based interactions, and KaTeX. The MVP does not require a backend, database, or user authentication. All learning interactions, formula updates, and kinematics calculations run directly in the browser. The codebase is organized into page routes, reusable components, pure kinematics functions, content files, and shared state.
```

---

## 26. Final Recommendation

The team should use:

```text
Next.js + TypeScript + React + Tailwind CSS + SVG + KaTeX
```

The first version should be:

```text
static-first
frontend-only
lightweight
component-based
browser-calculated
easy to deploy
easy to extend
```

This gives the team the best balance between:

* development speed;
* long-term maintainability;
* interactive learning quality;
* simple deployment;
* future extensibility.
