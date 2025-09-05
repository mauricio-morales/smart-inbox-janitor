# TrashMail Panda — Provider Setup Dashboard Redesign

This document proposes a **calm, trustworthy, and professional style** for the **Provider Setup Dashboard** of TrashMail Panda. The goal is to replace the current chaotic color mix with a consistent scheme that reflects trust and tranquility.

---

## 🎨 Style Guide

### Base Colors
- **Background**: Soft warm gray `#F7F8FA`
- **Primary**: Calm blue `#3A7BD5` (buttons, highlights)
- **Success**: Soft green `#4CAF50`
- **Warning**: Amber `#FFB300` (gentler than bright red)
- **Error**: Desaturated red `#E57373`
- **Text (primary)**: Dark charcoal `#2E2E2E`
- **Text (secondary)**: Medium gray `#6E6E6E`

### Typography
- Font: Sans-serif (Inter, SF Pro, Segoe UI)
- Headings: Semi-bold
- Body: Regular, 14–15px

### Layout & Components
- Light card backgrounds with **rounded corners** and **soft shadows**
- Consistent **grid alignment** (3 columns for providers)
- Clear **header** (logo + title) and **footer** (status info)

---

## 🖼️ Wireframe

```
┌──────────────────────────────────────────────────────────────┐
│  [🐼 TrashMail Panda]                 Provider Setup Dashboard│
│──────────────────────────────────────────────────────────────│
│  ⚠️ 2 providers need setup (1 of 3 healthy)                  │
│  Issues: Gmail not connected · OpenAI API key missing         │
│──────────────────────────────────────────────────────────────│
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │ Local Storage│   │ Gmail        │   │ OpenAI GPT   │      │
│  │──────────────│   │──────────────│   │──────────────│      │
│  │ ✅ Connected │   │ ⚠️ Setup     │   │ ⚠️ Setup     │      │
│  │ Last check ✔ │   │ OAuth needed │   │ API key needed│     │
│  │              │   │ [Setup Now]  │   │ [Enter Key]  │      │
│  └──────────────┘   └──────────────┘   └──────────────┘      │
│                                                              │
│──────────────────────────────────────────────────────────────│
│   Status: Last updated just now · All data stored securely   │
└──────────────────────────────────────────────────────────────┘
```

## 🔑 Key Improvements
1.	Unified card style: Each provider in a white rounded card with subtle shadow.
2.	Neutral background: Light gray instead of stark black → calmer, professional.
3.	Simpler error/warning colors:
	•	Use amber for “needs setup”.
	•	Reserve red only for hard errors.
4.	Gentle hierarchy:
	•	Status line at the top (single amber warning, not giant red box).
	•	Providers shown equally, green for healthy, amber for pending.
5.	Action buttons:
	•	Primary actions in calm blue.
	•	Smaller footprint, no loud highlight unless hovered.
6.	Header/Footer framing:
	•	Header: Logo + “Provider Setup Dashboard”.
	•	Footer: Status + reassurance (“All data stored securely”).

## Example Mockup

<img width="1415" height="945" alt="Image" src="https://github.com/user-attachments/assets/15210bb9-4fdf-4604-a29d-c67ba47945a5" />

Don't pay too much attention to the app logo, we'll use a new one in the future. But it does make sense to use the Gmail and OpenAI GPT logos for the provider cards. 