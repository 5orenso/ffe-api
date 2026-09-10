#!/usr/bin/env bash
set -e

# To be able to run this script you need jq
# $ brew install jq

NPM_VERSION=$(jq -r '.version' package.json)
GITHUB_TOKEN=$(perl -ne '/^\s*token\s*=\s*([\s\w@\d,\._-]+)/ && do {print $1; exit;}' ~/.gitconfig)

JSON=$(cat <<EOM
{
  "tag_name": "${NPM_VERSION}",
  "target_commitish": "master",
  "name": "${NPM_VERSION}",
  "body": "Release of version ${NPM_VERSION}",
  "draft": false,
  "prerelease": false
}
EOM
)

# Do Github.com release
GITHUB_REPO_API_URL="https://api.github.com/repos/"
GITHUB_REPO_URL=$(jq -r '.repository.url' package.json | perl -pe 's|^git\+||; s|https://github.com/||; s|\.git$||') # "5orenso/integer-base-converter"
GITHUB_REPO_API_ENDPOINT="/releases"
GITHUB_FINAL_URL=${GITHUB_REPO_API_URL}${GITHUB_REPO_URL}${GITHUB_REPO_API_ENDPOINT}

echo "+ Doing a github.com release of version ${NPM_VERSION} ${GITHUB_FINAL_URL}"
GITHUB_RESPONSE=$(echo ${JSON} | curl -sS -H "Authorization: Bearer ${GITHUB_TOKEN}" -H "Accept: application/vnd.github+json" "${GITHUB_FINAL_URL}" --data-binary @-)
echo "$GITHUB_RESPONSE" | jq '.'

echo "$GITHUB_RESPONSE" | jq -e '.id' >/dev/null || { echo "GitHub release failed; not publishing"; exit 1; }

echo "+ Doing a npm release of version ${NPM_VERSION}"
npm publish
