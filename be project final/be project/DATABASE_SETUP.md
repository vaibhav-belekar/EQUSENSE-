# Database Setup Plan

## Recommendation

Yes, we can use **Supabase**, and for this project it is the best next step.

Why it fits:
- Postgres is better than NoSQL for users, watchlists, saved analyses, and prediction history.
- Supabase gives us managed Postgres, auth, row-level security, and a dashboard quickly.
- The current project already has natural relational data, so we do not need document-style storage first.

## Reliable Database Options

Recommended order for this project:

1. **Supabase Postgres**
   - Best balance of speed, features, auth, and student-friendly setup.
   - Great if we want login, watchlists, saved reports, and secure per-user data.
2. **Neon Postgres**
   - Very good managed Postgres.
   - Strong choice if we only want database hosting and prefer to manage auth separately.
3. **AWS RDS Postgres**
   - Production-grade and highly reliable.
   - Better later, but heavier to manage for a college/demo-stage product.
4. **Railway Postgres / Render Postgres**
   - Simple to start with.
   - Good for demos, but Supabase is a stronger fit here because of auth + RLS.

## Best Architecture For This Project

- **Database**: Supabase Postgres
- **Auth**: Supabase Auth
- **Backend access**: Python backend connects using `DATABASE_URL`
- **Frontend access**: keep business logic in FastAPI for now
- **Security**: use RLS in Supabase for user-owned rows

## What We Should Add Next

Phase 1:
- Database connection health check
- Core schema
- Save watchlists in database
- Save analysis history in database

Phase 2:
- User authentication
- Per-user dashboard state
- Prediction snapshot history
- Portfolio persistence

Phase 3:
- Backtesting tables
- Scheduled retraining logs
- News sentiment storage
- Model performance tracking

## Current Starter Files Added

- [backend/database.py](/D:/BE%20FINAL%20YEAR%20PROJECT/EQUISENSE/be%20project%20final/be%20project/backend/database.py)
- [backend/sql/schema.sql](/D:/BE%20FINAL%20YEAR%20PROJECT/EQUISENSE/be%20project%20final/be%20project/backend/sql/schema.sql)

## Environment Variables

Add these to your local `.env`:

```env
DATABASE_PROVIDER=supabase
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
DIRECT_DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
DATABASE_SSL_MODE=require
```

Use `DIRECT_DATABASE_URL` for migrations/admin tasks and `DATABASE_URL` for pooled app traffic.

## Honest Recommendation

If the goal is to make this project feel much more real and much more polished, the first two database-backed features should be:

1. Replace `localStorage` watchlists with per-user watchlists
2. Save every investment analysis result for later comparison

Those two upgrades will immediately improve demo quality and make the project feel like an actual product instead of a stateless analyzer.
