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
export TF_VAR_aws_vpc_id=vpc-045fddc9fddda225f   # the "coding-workshop" VPC
```

`TF_VAR_aws_vpc_id` is required in this account: it has no default VPC, and without it Terraform stops with `no matching EC2 VPC found`. Use the VPC that contains the `coding-workshop-<id>` security group:

```bash
aws ec2 describe-security-groups --filters "Name=group-name,Values=coding-workshop-$PARTICIPANT_ID" --query 'SecurityGroups[0].VpcId' --output text
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

## Sample tickets

Add realistic sample tickets (and engineer notes) for demos and analytics, or remove them again:

```bash
./bin/generate-tickets.sh              # 1000 tickets created over the last 90 days
./bin/generate-tickets.sh 500 30       # 500 tickets over the last 30 days
./bin/generate-tickets.sh --remove     # delete every generated ticket and its notes
```

Each ticket's issue type follows its building's department, most older tickets are closed, and engineers stay within their open-ticket limit. Generated tickets end with "(sample data)" in their description, which is how `--remove` finds them; real tickets are never touched. Locally: `python -m db.generate_tickets 1000` / `python -m db.generate_tickets --remove` from `backend/facilities`.

## Check it

```bash
curl https://<cloudfront-domain>/api/facilities/health          # {"status":"OK"}
aws logs tail /aws/lambda/coding-workshop-facilities-$PARTICIPANT_ID --follow
```

The database pauses after 5 idle minutes. The backend retries its connection while Aurora resumes (up to 25 seconds per request, 2 minutes for `init-database.sh`), so the first request after a quiet period is slow rather than failing. CloudFront gives up after 30 seconds, so if Aurora takes longer than that the request can still fail; retry and it works.

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

## Tests

```bash
cd backend/facilities
source ../.venv/bin/activate
pytest
```

The suite (`backend/facilities/tests/`) needs the local PostgreSQL server from `.env`. Each run creates a separate `acme_facilities_test` database, loads the demo data, and drops it at the end, so your development data is untouched. Run it before deploying; the tests aren't included in the Lambda package.
