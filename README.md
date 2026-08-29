# ⚡ FlowAI — AI Workflow Builder

> A modern, interactive workflow builder for designing, connecting, and executing node-based AI workflows.

**FlowAI** is a frontend-focused AI Workflow Builder built with **Next.js, TypeScript, Tailwind CSS, Zustand, and React Flow**.
It provides a visual environment where users can create workflows by connecting different nodes, configure node properties, define variables, resolve dynamic values, execute workflows, and monitor execution logs.

---

## 🌐 Language

- 🇬🇧 [English](#-flowai--ai-workflow-builder)
- 🇮🇷 [فارسی](#-flowai--ai-workflow-builder-1)

---

# ✨ Features

### 🎨 Visual Workflow Builder

Create and manage workflows through an interactive node-based canvas powered by React Flow.

- Drag & drop workflow nodes
- Connect nodes visually
- Add and remove nodes
- Create and manage workflow edges
- Select and inspect nodes
- Zoom and pan across the canvas
- Mini-map navigation
- Interactive workflow controls

### 🧩 Node-Based Architecture

Each workflow is composed of independent nodes with their own configuration and behavior.

The architecture makes it possible to extend the workflow engine by introducing new node types without tightly coupling them to the UI.

### 🔗 Dynamic Connections

Nodes can be connected to define the execution flow.

```text
Trigger
   │
   ▼
HTTP Request
   │
   ▼
Transform
   │
   ▼
Output
```

### 🔤 Workflow Variables

FlowAI includes a variable system for defining and using dynamic values inside workflow configurations.

Variables can be referenced using dynamic expressions and resolved during workflow execution.

Example:

```text
{{user.name}}
{{response.data}}
{{workflow.apiKey}}
```

The variable system is responsible for:

- Creating variable keys
- Parsing variable expressions
- Resolving dynamic values
- Providing workflow context
- Handling nested values

### ⚙️ Workflow Execution Engine

Workflows can be executed based on their node and edge relationships.

The execution engine handles:

- Node execution
- Execution order
- Passing data between nodes
- Variable resolution
- Execution state
- Execution events
- Error handling

### 📋 Execution Logs

FlowAI provides an execution panel for monitoring workflow execution.

Each execution can expose information such as:

- Node status
- Execution result
- Errors
- Execution order
- Input/output data
- Execution progress

This makes debugging and understanding workflow behavior much easier.

### 🛠️ Workflow Inspector

Selecting a node opens its configuration inside the workflow inspector.

Users can inspect and modify:

- Node configuration
- Inputs
- Outputs
- Variables
- Node-specific settings

### 🗂️ Node Library

The Node Library provides a centralized place for discovering and adding available workflow nodes.

This structure also makes the application easier to extend as new node types are introduced.

---

# 🏗️ Architecture

FlowAI follows a modular frontend architecture where the workflow editor, canvas, node system, state management, variable system, and execution engine are separated into independent responsibilities.

```text
                    ┌────────────────────┐
                    │   Workflow Editor  │
                    └─────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌────────────┐  ┌────────────┐  ┌──────────────┐
       │ Node       │  │ Workflow   │  │ Inspector    │
       │ Library    │  │ Canvas     │  │              │
       └────────────┘  └─────┬──────┘  └──────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Zustand Store    │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
      ┌────────────────┐           ┌─────────────────┐
      │ Variable       │           │ Execution       │
      │ System         │           │ Engine          │
      └────────────────┘           └────────┬────────┘
                                            │
                                            ▼
                                    ┌─────────────────┐
                                    │ Execution Logs  │
                                    └─────────────────┘
```

---

# 🧠 State Management

Application state is managed using **Zustand**.

The workflow store is responsible for managing the core workflow state, including:

- Current workflow
- Workflow nodes
- Workflow edges
- Selected node
- Workflow variables
- Execution state
- Workflow updates

This keeps workflow-related state centralized while allowing individual UI components to remain focused on presentation and interaction.

---

# 🔤 Variable System

The variable system is separated into multiple responsibilities:

```text
variable-context
       │
       ▼
variable-parser
       │
       ▼
variable-resolver
       │
       ▼
Resolved Value
```

### Variable Context

Provides the data available during workflow execution.

### Variable Parser

Identifies and parses dynamic variable expressions.

### Variable Resolver

Resolves parsed expressions against the current workflow context and returns the corresponding value.

This separation makes the variable system easier to test, maintain, and extend.

---

# 🚀 Tech Stack

| Technology       | Purpose                   |
| ---------------- | ------------------------- |
| **Next.js**      | Application framework     |
| **React**        | UI development            |
| **TypeScript**   | Type-safe development     |
| **Tailwind CSS** | Styling and responsive UI |
| **Zustand**      | Global state management   |
| **React Flow**   | Visual workflow editor    |
| **ESLint**       | Code quality and linting  |

---

# 📁 Project Structure

```text
src/
├── app/
│
├── components/
│   └── workflow/
│       ├── canvas/
│       ├── execution/
│       ├── inspector/
│       ├── node-library/
│       ├── nodes/
│       └── workflow-editor/
│
├── lib/
│   └── workflow/
│       ├── execution/
│       └── variables/
│           ├── variable-context.ts
│           ├── variable-parser.ts
│           └── variable-resolver.ts
│
├── store/
│   └── workflow-store.ts
│
└── types/
    └── workflow.ts
```

---

# 🔄 Workflow Lifecycle

A typical FlowAI workflow follows this lifecycle:

```text
Create Workflow
       │
       ▼
Add Nodes
       │
       ▼
Configure Nodes
       │
       ▼
Connect Nodes
       │
       ▼
Define Variables
       │
       ▼
Resolve Dynamic Values
       │
       ▼
Execute Workflow
       │
       ▼
Track Execution
       │
       ▼
View Execution Logs
```

---

# 🎯 Project Goals

The main goals of FlowAI are:

- Build a reusable visual workflow editor
- Create a scalable node-based architecture
- Implement a flexible workflow execution engine
- Provide dynamic variable resolution
- Centralize workflow state management
- Make workflow debugging easier through execution logs
- Create a strong foundation for future AI-powered workflow nodes

---

# 🔮 Future Improvements

Potential future improvements include:

- 🤖 LLM / AI nodes
- 🌐 HTTP/API nodes
- 🔀 Conditional branching
- 🔁 Loops and iteration nodes
- ⏱️ Delayed/scheduled execution
- 💾 Workflow persistence
- 📤 Import/export workflows
- ↩️ Undo/redo
- 🧪 Workflow validation
- 🔐 Authentication and user accounts
- ☁️ Backend-based workflow execution
- 📊 Advanced execution analytics

---

# 🖥️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/flowai.git
cd flowai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# 📌 Project Status

**Status:** 🚧 In Development

FlowAI is currently a frontend-focused project. The architecture is designed to support future backend integration and more advanced AI workflow capabilities.

---

# 👨‍💻 Author

Built with ❤️ using modern frontend technologies.

---

# 🇮🇷 FlowAI — سازنده گردش‌کار هوش مصنوعی

> یک Workflow Builder مدرن و تعاملی برای طراحی، اتصال و اجرای گردش‌کارهای مبتنی بر Node.

**FlowAI** یک پروژه Frontend محور است که با استفاده از **Next.js، TypeScript، Tailwind CSS، Zustand و React Flow** توسعه داده شده است.

این پروژه یک محیط بصری در اختیار کاربر قرار می‌دهد تا بتواند Workflowهای مختلف را با استفاده از Nodeها ایجاد و مدیریت کند، Nodeها را به یکدیگر متصل کند، تنظیمات آن‌ها را تغییر دهد، متغیرهای داینامیک تعریف کند و اجرای Workflow را مشاهده و بررسی کند.

---

# ✨ قابلیت‌ها

### 🎨 ساخت بصری Workflow

کاربر می‌تواند Workflow خود را در یک Canvas تعاملی طراحی کند.

قابلیت‌های اصلی:

- اضافه کردن Node
- حذف Node
- جابه‌جایی Nodeها
- اتصال Nodeها
- مدیریت Edgeها
- انتخاب Node
- مشاهده تنظیمات Node
- Zoom و Pan
- MiniMap
- کنترل‌های تعاملی

### 🧩 معماری مبتنی بر Node

هر Workflow از مجموعه‌ای از Nodeهای مستقل تشکیل شده است که هرکدام configuration و رفتار مخصوص خود را دارند.

این معماری باعث می‌شود اضافه کردن Nodeهای جدید بدون وابستگی شدید به بخش‌های دیگر سیستم امکان‌پذیر باشد.

### 🔗 اتصال Nodeها

کاربر می‌تواند Nodeها را به یکدیگر متصل کند تا ترتیب و مسیر اجرای Workflow مشخص شود.

برای مثال:

```text
Trigger
   │
   ▼
HTTP Request
   │
   ▼
Transform
   │
   ▼
Output
```

### 🔤 سیستم متغیرها

FlowAI دارای یک سیستم مدیریت Variable برای استفاده از مقادیر داینامیک در Workflow است.

برای مثال:

```text
{{user.name}}
{{response.data}}
{{workflow.apiKey}}
```

این سیستم وظیفه‌ی موارد زیر را بر عهده دارد:

- ساخت Variable Key
- Parse کردن Expressionها
- Resolve کردن مقادیر
- مدیریت Workflow Context
- پشتیبانی از مقادیر Nested

### ⚙️ موتور اجرای Workflow

Workflowها بر اساس ارتباط بین Nodeها و Edgeها اجرا می‌شوند.

Execution Engine مسئول مدیریت موارد زیر است:

- اجرای Nodeها
- تعیین ترتیب اجرای Nodeها
- انتقال داده بین Nodeها
- Resolve کردن Variableها
- مدیریت وضعیت Execution
- ایجاد Execution Event
- مدیریت خطاها

### 📋 Execution Logs

FlowAI دارای پنل اختصاصی برای مشاهده روند اجرای Workflow است.

کاربر می‌تواند وضعیت اجرای Nodeها، نتایج، خطاها و اطلاعات مربوط به Execution را مشاهده کند.

این قابلیت برای Debug کردن Workflow و بررسی رفتار هر مرحله بسیار کاربردی است.

### 🛠️ Workflow Inspector

با انتخاب هر Node، تنظیمات آن در بخش Inspector نمایش داده می‌شود.

از طریق این بخش می‌توان مواردی مانند:

- Configuration
- Input
- Output
- Variables
- تنظیمات اختصاصی Node

را مشاهده و مدیریت کرد.

### 🗂️ Node Library

Node Library امکان مشاهده و اضافه کردن Nodeهای قابل استفاده در Workflow را فراهم می‌کند.

ساختار آن به شکلی طراحی شده که در آینده بتوان Nodeهای جدید را به سیستم اضافه کرد.

---

# 🏗️ معماری پروژه

FlowAI با یک معماری ماژولار طراحی شده است که در آن بخش‌هایی مانند Workflow Editor، Canvas، Node System، State Management، Variable System و Execution Engine مسئولیت‌های جداگانه‌ای دارند.

```text
                    ┌────────────────────┐
                    │   Workflow Editor  │
                    └─────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌────────────┐  ┌────────────┐  ┌──────────────┐
       │ Node       │  │ Workflow   │  │ Inspector    │
       │ Library    │  │ Canvas     │  │              │
       └────────────┘  └─────┬──────┘  └──────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Zustand Store    │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
      ┌────────────────┐           ┌─────────────────┐
      │ Variable       │           │ Execution       │
      │ System         │           │ Engine          │
      └────────────────┘           └────────┬────────┘
                                            │
                                            ▼
                                    ┌─────────────────┐
                                    │ Execution Logs  │
                                    └─────────────────┘
```

---

# 🧠 مدیریت State

مدیریت State پروژه با استفاده از **Zustand** انجام شده است.

Store اصلی Workflow وظیفه مدیریت موارد زیر را دارد:

- Workflow فعلی
- Nodes
- Edges
- Selected Node
- Variables
- Execution State
- تغییرات Workflow

با این ساختار، State مربوط به Workflow به صورت متمرکز مدیریت می‌شود و Componentهای UI مسئولیت‌های مشخص و محدودتری خواهند داشت.

---

# 🔤 سیستم Variable

سیستم Variable به چند بخش مستقل تقسیم شده است:

```text
variable-context
       │
       ▼
variable-parser
       │
       ▼
variable-resolver
       │
       ▼
Resolved Value
```

### Variable Context

اطلاعات قابل دسترسی در زمان اجرای Workflow را فراهم می‌کند.

### Variable Parser

Expressionهای مربوط به Variableها را شناسایی و Parse می‌کند.

### Variable Resolver

Expressionهای Parse شده را با استفاده از Workflow Context بررسی کرده و مقدار نهایی را استخراج می‌کند.

این تفکیک باعث شده سیستم Variable قابلیت توسعه و نگهداری بهتری داشته باشد.

---

# 🚀 تکنولوژی‌های استفاده‌شده

| تکنولوژی         | کاربرد               |
| ---------------- | -------------------- |
| **Next.js**      | Framework اصلی       |
| **React**        | توسعه رابط کاربری    |
| **TypeScript**   | Type Safety          |
| **Tailwind CSS** | طراحی و Styling      |
| **Zustand**      | مدیریت State         |
| **React Flow**   | ساخت Workflow Canvas |
| **ESLint**       | بررسی کیفیت کد       |

---

# 📁 ساختار پروژه

```text
src/
├── app/
│
├── components/
│   └── workflow/
│       ├── canvas/
│       ├── execution/
│       ├── inspector/
│       ├── node-library/
│       ├── nodes/
│       └── workflow-editor/
│
├── lib/
│   └── workflow/
│       ├── execution/
│       └── variables/
│           ├── variable-context.ts
│           ├── variable-parser.ts
│           └── variable-resolver.ts
│
├── store/
│   └── workflow-store.ts
│
└── types/
    └── workflow.ts
```

---

# 🔄 چرخه اجرای Workflow

فرآیند کلی Workflow در FlowAI به شکل زیر است:

```text
ساخت Workflow
       │
       ▼
اضافه کردن Nodeها
       │
       ▼
تنظیم Nodeها
       │
       ▼
اتصال Nodeها
       │
       ▼
تعریف Variableها
       │
       ▼
Resolve کردن مقادیر
       │
       ▼
اجرای Workflow
       │
       ▼
Tracking Execution
       │
       ▼
مشاهده Execution Logs
```

---

# 🎯 اهداف پروژه

اهداف اصلی FlowAI:

- ساخت یک Workflow Editor بصری و قابل توسعه
- ایجاد معماری مقیاس‌پذیر مبتنی بر Node
- پیاده‌سازی Workflow Execution Engine
- ایجاد سیستم Dynamic Variable Resolution
- مدیریت متمرکز State
- فراهم کردن ابزار مناسب برای Debug کردن Workflow
- ایجاد پایه مناسب برای اضافه کردن قابلیت‌های AI در آینده

---

# 🔮 توسعه‌های آینده

برخی قابلیت‌هایی که می‌توان در نسخه‌های آینده اضافه کرد:

- 🤖 Nodeهای مبتنی بر LLM
- 🌐 Nodeهای HTTP/API
- 🔀 Conditional Branching
- 🔁 Loop و Iteration
- ⏱️ Scheduled Execution
- 💾 ذخیره Workflowها
- 📤 Import / Export
- ↩️ Undo / Redo
- 🧪 Workflow Validation
- 🔐 Authentication
- ☁️ اجرای Workflow در Backend
- 📊 Execution Analytics

---

# 🖥️ اجرای پروژه

### ۱. دریافت پروژه

```bash
git clone https://github.com/your-username/flowai.git
cd flowai
```

### ۲. نصب Dependencies

```bash
npm install
```

### ۳. اجرای Development Server

```bash
npm run dev
```

سپس پروژه را در آدرس زیر باز کنید:

```text
http://localhost:3000
```

---

# 📌 وضعیت پروژه

**Status:** 🚧 در حال توسعه

FlowAI در حال حاضر یک پروژه Frontend محور است و معماری آن به شکلی طراحی شده که در آینده بتوان Backend و قابلیت‌های پیشرفته‌تر AI Workflow را به آن اضافه کرد.

---

# 👨‍💻 توسعه‌دهنده

ساخته‌شده با ❤️ با استفاده از تکنولوژی‌های مدرن Frontend.
