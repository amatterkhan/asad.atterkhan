#!/usr/bin/env bash
# One-time setup for .github/workflows/site-{ci,deploy,preview}.yml (see docs/rebuild/ci-cd.md).
# Creates keyless GitHub → Google Cloud authentication (Workload Identity Federation), a deploy
# identity, the API's runtime identity and an image repository, then stores the non-secret
# configuration as GitHub repository variables. Safe to re-run. Needs gcloud and gh, signed in
# as the project owner. Review before running: it changes IAM on the project.
#
#   PROJECT_ID=asad-atterkhan REPO=amatterkhan/amatterkhan.github.io \
#     .github/scripts/setup-firebase-deploy.sh
set -euo pipefail

PROJECT_ID=${PROJECT_ID:?set PROJECT_ID}
REPO=${REPO:?set REPO (owner/name)}
REGION=${REGION:-europe-west1}
BUCKET=${BUCKET:-}            # e.g. asad-atterkhan.firebasestorage.app; empty skips Storage
OWNER_UID=${OWNER_UID:-}      # Firebase Auth UID of the owner account
SITE_URL=${SITE_URL:-https://$PROJECT_ID.web.app}
POOL=github
PROVIDER=github
DEPLOYER=github-deployer@$PROJECT_ID.iam.gserviceaccount.com
RUNTIME=asad-api@$PROJECT_ID.iam.gserviceaccount.com

run() { printf '+ %s\n' "$*" >&2; "$@"; }
exists() { "$@" >/dev/null 2>&1; }

NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
# Bind to the repository's numeric ID as well as its name, so a deleted-and-recreated repository
# with the same name cannot assume this identity.
REPO_ID=$(gh api "repos/$REPO" --jq .id)

run gcloud services enable --project "$PROJECT_ID" \
  iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  firebase.googleapis.com firebasehosting.googleapis.com firebaserules.googleapis.com \
  firestore.googleapis.com run.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com identitytoolkit.googleapis.com

exists gcloud iam workload-identity-pools describe "$POOL" --project "$PROJECT_ID" --location global ||
  run gcloud iam workload-identity-pools create "$POOL" --project "$PROJECT_ID" --location global \
    --display-name "GitHub Actions"
exists gcloud iam workload-identity-pools providers describe "$PROVIDER" --project "$PROJECT_ID" \
  --location global --workload-identity-pool "$POOL" ||
  run gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" --project "$PROJECT_ID" \
    --location global --workload-identity-pool "$POOL" --display-name "GitHub $REPO" \
    --issuer-uri https://token.actions.githubusercontent.com \
    --attribute-mapping 'google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_id=assertion.repository_id,attribute.ref=assertion.ref' \
    --attribute-condition "assertion.repository_id == '$REPO_ID'"
WIF_PROVIDER=projects/$NUMBER/locations/global/workloadIdentityPools/$POOL/providers/$PROVIDER

for sa in github-deployer:"GitHub deploys" asad-api:"asad-api Cloud Run runtime"; do
  name=${sa%%:*}
  exists gcloud iam service-accounts describe "$name@$PROJECT_ID.iam.gserviceaccount.com" --project "$PROJECT_ID" ||
    run gcloud iam service-accounts create "$name" --project "$PROJECT_ID" --display-name "${sa#*:}"
done

# Only workflows from this repository may act as the deployer.
run gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER" --project "$PROJECT_ID" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/$NUMBER/locations/global/workloadIdentityPools/$POOL/attribute.repository_id/$REPO_ID" \
  --condition None >/dev/null

# Deployer: Hosting + rules, read published content for the export, roll out the API.
for role in roles/firebasehosting.admin roles/firebaserules.admin roles/datastore.indexAdmin \
  roles/datastore.viewer roles/run.admin roles/serviceusage.serviceUsageConsumer \
  roles/serviceusage.apiKeysViewer; do
  run gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$DEPLOYER" \
    --role "$role" --condition None >/dev/null
done
run gcloud iam service-accounts add-iam-policy-binding "$RUNTIME" --project "$PROJECT_ID" \
  --role roles/iam.serviceAccountUser --member "serviceAccount:$DEPLOYER" --condition None >/dev/null

exists gcloud artifacts repositories describe asad --project "$PROJECT_ID" --location "$REGION" ||
  run gcloud artifacts repositories create asad --project "$PROJECT_ID" --location "$REGION" \
    --repository-format docker --description "asad-api images"
run gcloud artifacts repositories add-iam-policy-binding asad --project "$PROJECT_ID" --location "$REGION" \
  --role roles/artifactregistry.writer --member "serviceAccount:$DEPLOYER" >/dev/null

# Runtime: read/write Firestore, check ID tokens and revocation, private files in the bucket.
for role in roles/datastore.user roles/firebaseauth.viewer; do
  run gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$RUNTIME" \
    --role "$role" --condition None >/dev/null
done
if [ -n "$BUCKET" ]; then
  run gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" \
    --member "serviceAccount:$RUNTIME" --role roles/storage.objectAdmin >/dev/null
fi
# Optional rebuild hook token (fine-grained PAT for this repository, Contents: read and write).
if ! exists gcloud secrets describe asad-api-github-token --project "$PROJECT_ID"; then
  echo "Later, for REBUILD_HOOK=github: printf %s \"\$TOKEN\" | gcloud secrets create asad-api-github-token --project $PROJECT_ID --data-file=-" >&2
fi
exists gcloud secrets describe asad-api-github-token --project "$PROJECT_ID" &&
  run gcloud secrets add-iam-policy-binding asad-api-github-token --project "$PROJECT_ID" \
    --role roles/secretmanager.secretAccessor --member "serviceAccount:$RUNTIME" >/dev/null

# GitHub: a protected environment for deploys, and the configuration as repository variables
# (job conditions can only read repository-level variables). None of these are secrets.
run gh api -X PUT "repos/$REPO/environments/site-production" --silent \
  -F 'deployment_branch_policy[protected_branches]=false' -F 'deployment_branch_policy[custom_branch_policies]=true'
for branch in frontend-redesign main; do
  gh api -X POST "repos/$REPO/environments/site-production/deployment-branch-policies" \
    -f name="$branch" -f type=branch --silent 2>/dev/null || true
done
set_var() { [ -n "$2" ] && run gh variable set "$1" --repo "$REPO" --body "$2"; return 0; }
set_var WIF_PROVIDER "$WIF_PROVIDER"
set_var DEPLOY_SERVICE_ACCOUNT "$DEPLOYER"
set_var API_SERVICE_ACCOUNT "$RUNTIME"
set_var FIREBASE_PROJECT_ID "$PROJECT_ID"
set_var FIREBASE_AUTH_DOMAIN "$PROJECT_ID.firebaseapp.com"
set_var FIREBASE_STORAGE_BUCKET "$BUCKET"
set_var FIREBASE_OWNER_UID "$OWNER_UID"
set_var API_REGION "$REGION"
set_var SITE_URL "$SITE_URL"
cat >&2 <<EOF

Done. Still to set by hand (gh variable set NAME --repo $REPO --body VALUE):
  FIREBASE_WEB_API_KEY   from: firebase apps:sdkconfig web --project $PROJECT_ID
  API_ENABLED=true       after Blaze billing, Storage and Auth are ready (first API deploy)
  CONTENT_SOURCE=firestore, INDEX_SITE=true, ENABLE_*_ADMIN=true   when you are ready for each
EOF
