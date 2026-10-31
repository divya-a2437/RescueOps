# RescueOps

**Incident Management & Evidence Coordination Platform**

RescueOps is a web-based platform designed to help teams report incidents, organize supporting evidence, and coordinate follow-up actions from a shared workspace. It brings incident records, evidence assets, and response tasks into one structured workflow.

**Live Demo:** [https://rescueops.vercel.app/](https://rescueops.vercel.app/)

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Key Features](#key-features)
- [Cloudinary Integration](#cloudinary-integration)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Data and Access Management](#data-and-access-management)
- [Current Limitations](#current-limitations)
- [Future Improvements](#future-improvements)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Project Status](#project-status)

---

## Overview

Incident response often involves multiple people, supporting documents or images, and follow-up actions. When these are managed separately, maintaining context and coordinating the next steps can become difficult.

RescueOps provides a centralized workflow for recording incidents, attaching evidence, and managing response activities. Workspace collaboration allows team members to work with shared incident records, while cloud-based media handling makes evidence easier to access and review.

## Problem Statement

Teams handling operational incidents need a reliable way to:

- Record incident details in a consistent format.
- Keep supporting evidence associated with the relevant incident.
- Coordinate responsibilities and follow-up actions.
- Share incident information with authorized team members.
- Maintain a clear record of incident status and supporting information.

RescueOps addresses these needs through a unified incident-management and evidence-coordination workflow.

## Solution

RescueOps combines incident tracking, evidence management, and team collaboration in a single application.

The platform allows users to create and manage incident records, upload supporting images, view optimized evidence previews, and organize work through shared workspaces. Supabase manages authentication and application data, while Cloudinary handles image storage and delivery.

The project also explores AI-assisted evidence tagging to make evidence easier to categorize. This integration remains under verification and is not considered a confirmed working feature.

## Key Features

### 1. Incident Management

- Create incident records with relevant details.
- Organize incidents by category, severity, and status.
- Record incident locations and occurrence details.
- View incident information in a centralized interface.

### 2. Evidence Management

- Upload supporting image evidence for an incident.
- Associate evidence assets with their corresponding incident.
- Store evidence metadata in Supabase.
- Generate optimized previews for efficient viewing.
- Record image-quality scores when returned by Cloudinary.

### 3. Workspace Collaboration

- Create a workspace for team collaboration.
- Generate invitation codes for workspace access.
- Join an existing workspace using an invitation code.
- Manage workspace membership with defined roles.
- Share incident information within the applicable workspace, subject to access policies.

### 4. Response Coordination

- Organize follow-up interventions linked to incidents.
- Track intervention ownership, status, and due dates.
- Keep response activities connected to the relevant incident record.

### 5. Authentication and Access Control

- Authenticate users through Supabase.
- Associate incident and evidence operations with authenticated users.
- Use organization membership and database access policies to support workspace-level data access.

---

## Cloudinary Integration

Cloudinary is a core component of RescueOps' evidence-handling workflow.

### Implemented Capabilities

- **Image uploads:** Evidence images are uploaded to Cloudinary.
- **Cloud storage:** Cloudinary stores the uploaded media and provides secure asset URLs.
- **Optimized previews:** Image transformations generate resized previews with automatic quality and format optimization.
- **Image-quality analysis:** The upload workflow requests Cloudinary quality analysis and stores a numeric quality score when the response provides one.
- **Incident association:** Cloudinary asset identifiers and URLs are stored alongside evidence metadata in Supabase.
- **Failure handling:** The upload workflow includes cleanup logic for uploaded assets when subsequent database persistence fails.

### AI-Assisted Evidence Tagging

RescueOps includes an experimental integration with Cloudinary's AI vision tagging endpoint. It is intended to help categorize evidence into operationally relevant groups, such as visible damage, packaging issues, spillage, and delivery evidence.

**Current status:** End-to-end AI tagging has not yet been verified. Recent uploads returned empty `ai_tags` arrays, so automatic tagging should be considered in progress rather than a completed capability.

---

## Technology Stack

| Technology | Purpose |
| --- | --- |
| Next.js | Application framework and API routes |
| TypeScript | Type-safe application development |
| Tailwind CSS | User interface styling |
| Supabase | Authentication, database, and access policies |
| Cloudinary | Evidence image storage, transformations, and quality analysis |
| Cloudinary AI Vision | AI integration infrastructure, where configured |
| Vercel | Application deployment |

---

## System Architecture

```text
User
 |
 v
Next.js Web Application
 |
 +---------------------------+
 |                           |
 v                           v
Supabase                  Next.js API Routes
 |                           |
 +-- Authentication          +-- Incident management
 +-- PostgreSQL data         +-- Evidence uploads
 +-- Workspace memberships   +-- Evidence retrieval
 +-- Access policies         +-- Workspace operations
                                 |
                                 v
                             Cloudinary
                                 |
                                 +-- Image storage
                                 +-- Optimized previews
                                 +-- Quality analysis
                                 +-- Experimental AI tagging
```

### Evidence Workflow

1. An authenticated user selects an incident and uploads an image.
2. The application validates the file type, size, and file signature.
3. The image is uploaded to Cloudinary.
4. The application obtains the Cloudinary asset information and any available quality-analysis result.
5. Evidence metadata is saved in Supabase and linked to the incident.
6. The application retrieves the evidence metadata and generates optimized preview URLs for display.

---

## Data and Access Management

RescueOps uses Supabase to manage its application data.

The database includes records for:

- Incidents
- Evidence assets
- Response interventions
- Organizations and workspace memberships
- Organization invitation codes

Workspace collaboration is supported through membership relationships and role-based permissions. Row-level security and server-side access checks are used to restrict access to authorized records.

## Current Limitations

- AI tagging is still experimental and not yet confirmed as a production-ready feature.
- Evidence metadata and response workflows are still being refined as the application matures.
- Access policies and collaboration logic continue to evolve alongside the application’s operational use cases.

## Future Improvements

- Strengthen AI-based evidence classification and summarization.
- Expand intervention tracking and response lifecycle workflows.
- Improve alerting and reporting for incident trends across workspaces.
- Increase automation for evidence review and categorization.
- Add deeper analytics around resolution timelines and team performance.

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- A Supabase project
- A Cloudinary account

### Installation

1. Clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Configure your environment variables.
4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

These values are used for:

- Supabase authentication and database access
- Cloudinary uploads and media processing
- Secure server-side evidence operations

---

## Running Locally

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

## Project Status

RescueOps is currently in active development. The core workflow is in place for incident capture, evidence upload, workspace collaboration, and response coordination. AI-assisted features remain under evaluation and are not yet considered fully production-ready.

---

