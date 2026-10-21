# Deploying ACME Facilities Desk to AWS

The app deploys with the workshop scripts in `bin/` and the Terraform in `infra/`:

| Piece | AWS service | Created by |
|---|---|---|
| Backend API (`backend/facilities`) | Lambda `coding-workshop-facilities-<id>`, served at `/api/facilities` | `bin/deploy-backend.sh` |
| Database | Aurora PostgreSQL Serverless v2 (RDS) | `bin/deploy-backend.sh` |
| Frontend (`frontend/`) | S3 bucket + CloudFront | `bin/deploy-backend.sh` (infra), `bin/deploy-frontend.sh` (upload) |
| Tables and demo data | runs inside the Lambda | `bin/init-database.sh` |

The site and the API share one CloudFront address: pages come from S3, and `/api/facilities/*` goes to the Lambda.

## Before you start

Your shell needs the workshop participant settings (normally in `~/.bashrc`):

```bash
export AWS_REGION=us-east-2
export EVENT_ID=...
export PARTICIPANT_ID=...
export PARTICIPANT_CODE=...
```

Tools: `aws`, `terraform` (1.11+), `node`/`npm`, `jq`, `curl`, `dig`, Python 3.13. The scripts fetch fresh temporary AWS credentials each time they run (`bin/setup-participant.sh`).

## Deploy

Run from the repository root, in this order:

```bash
./bin/deploy-backend.sh     # Terraform: Lambda, Aurora database, S3, CloudFront (first run ~10-15 min)
./bin/init-database.sh      # create tables + load demo data (first run ~1 min)
./bin/deploy-frontend.sh    # build the React app, upload to S3, refresh CloudFront
```

`deploy-frontend.sh` prints the site URL (`https://<id>.cloudfront.net`). Redeploy after code changes with the same scripts; `init-database.sh` only needs to run once (it never re-seeds a database that already has users).

## Demo logins

| Role | Email | Password |
|---|---|---|
| Facility Admin | `admin@acme.inc` | `AdminPass123!` |
| Employee | `ben.carter@acme.inc` (and others) | `EmployeePass123!` |
| Engineer | `liam.ortiz@acme.inc` (and others) | `EngineerPass123!` |

These passwords are public in this repo. Change them, or don't load the demo data, for anything beyond the workshop.

## Check it

```bash
curl https://<cloudfront-domain>/api/facilities/health          # {"status":"OK"}
aws logs tail /aws/lambda/coding-workshop-facilities-$PARTICIPANT_ID --follow
```

The first request after the database has been idle can take ~15 seconds while Aurora resumes.

## Tear down

```bash
./bin/cleanup-environment.sh   # backs up the repo to S3, then terraform destroy
```

## How the backend is configured

- On Lambda, Terraform sets `POSTGRES_HOST/PORT/NAME/USER/PASS` and `SECRET_KEY` (generated once in `infra/secrets.tf`); `app/config.py` builds the database URL from them and connects with TLS.
- Locally, `backend/facilities/.env` provides `DATABASE_URL`, `SECRET_KEY` and `FRONTEND_ORIGIN` as before.

## Local development

The backend now lives in `backend/facilities` (Terraform deploys every `backend/<service>/` folder that has a `requirements.txt`):

```bash
cd backend/facilities
source ../.venv/bin/activate
uvicorn app.main:app --reload          # API on http://127.0.0.1:8000
python -m db.init_db                   # create tables + demo data in an empty local database
python -m scripts.add_issue_type       # older local databases only: the schema migrations
python -m scripts.add_building_department
python -m scripts.add_note_author
```

`backend/facilities/requirements.txt` is the lean list packaged into the Lambda; `backend/requirements.txt` is the full local environment.
