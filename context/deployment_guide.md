# SiteFlow ERP Online Deployment Guide

This document outlines the step-by-step process to deploy the SiteFlow Construction Management ERP Software online.

---

## Architecture Overview

* **Frontend**: Next.js 16 (App Router) deployed on **Vercel**.
* **Backend**: FastAPI (Python 3.12) deployed on **Render** (or Railway/Fly.io) using Docker.
* **Database**: PostgreSQL database hosted on **Supabase** (or any Postgres provider).

---

## Phase 1: Database Setup (Supabase)

1. Go to [Supabase](https://supabase.com) and create a new project.
2. Under **Project Settings** -> **Database**, copy the **Transaction Connection Pooler** string (or direct connection string).
   * It should look like: `postgresql://postgres.[your-project-ref]:[your-password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
3. Save this URL. You will use it as the `DATABASE_URL` in your backend deployment.

---

## Phase 2: Backend Deployment (Render)

We have provided a production-ready `Dockerfile` in the `backend/` directory.

1. Go to [Render](https://render.com) and sign in.
2. Click **New** -> **Web Service**.
3. Connect your GitHub repository.
4. Set the following details:
   * **Name**: `siteflow-backend` (or any custom name)
   * **Root Directory**: `backend`
   * **Language**: `Docker`
   * **Branch**: `main`
5. Click **Advanced** to add Environment Variables:
   * `DATABASE_URL`: *Your Supabase connection string* (from Phase 1)
   * `SECRET_KEY`: *A secure random string* (e.g. generated via `openssl rand -hex 32` or similar)
   * `ALGORITHM`: `HS256`
   * `ACCESS_TOKEN_EXPIRE_MINUTES`: `1440`
6. Click **Deploy Web Service**.
7. Once deployed, copy the Render service URL (e.g. `https://siteflow-backend.onrender.com`).

---

## Phase 3: Frontend Deployment (Vercel)

Vercel has native support for Next.js and builds it with zero configuration.

1. Go to [Vercel](https://vercel.com) and sign in.
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. In the configuration settings:
   * **Root Directory**: `frontend`
   * **Framework Preset**: `Next.js`
5. Add Environment Variables:
   * **Key**: `NEXT_PUBLIC_API_URL`
   * **Value**: *Your Render backend service URL* (from Phase 2, e.g. `https://siteflow-backend.onrender.com`)
6. Click **Deploy**.
7. Once completed, Vercel will provide your live website URL (e.g., `https://your-project.vercel.app`).

---

## Troubleshooting & Verification

### 1. Database Schema Initialization
On the very first run, FastAPI's startup event executes `Base.metadata.create_all(bind=engine)` which automatically creates all 20+ required tables in the Supabase PostgreSQL database. No manual DDL migrations are required.

### 2. CORS Issues
If you experience request failures on the frontend, check that the backend is allowing cross-origin requests from your Vercel URL. The backend CORS middleware configuration is defined in `backend/app/main.py` and is currently set to allow all origins (`allow_origins=["*"]`) for convenience. You can restrict this to your specific Vercel URL in production for extra security.
