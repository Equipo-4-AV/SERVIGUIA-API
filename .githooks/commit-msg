#!/bin/bash

# Get the commit message
commit_msg=$(cat "$1")

# Define a regex pattern to match the conventional commit message format declared in README
# Supports compound types like feat&fix or feat&fix&refactor
pattern='^((feat|fix|refactor|perf|style|test|docs|build|ops|chore)(\&(feat|fix|refactor|perf|style|test|docs|build|ops|chore))*)(\([a-z-]+\))?!?: .+$'

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test if the commit message matches the pattern
if ! [[ "$commit_msg" =~ $pattern ]]; then
  echo -e "${RED}ERROR: The commit message does not match the Conventional Commits format.${NC}"
  echo ""
  echo -e "${YELLOW}       Written keyword is not a keyword in declared convention${NC}"
  echo -e "${YELLOW}       All commit messages should be in English${NC}"
  echo -e "${YELLOW}       Example: \"feat: new endpoint\"${NC}"
  echo -e "${YELLOW}       Opening Convention...${NC}"

  code -g README.md:1
  exit 1
fi

# If the commit message matches the pattern, exit successfully hola
exit 0