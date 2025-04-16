#!/bin/bash

echo "Building md-graph"
echo "================="
if [ -z "$BRANCH" ]; then
  echo "Error: BRANCH environment variable is not set."
  exit 1
fi
# Check if DEST_DIR is set
if [ -z "$DEST_DIR" ]; then
  # Set a default value for DEST_DIR
  DEST_DIR="./"
fi
# Check if COMMIT is set
if [ -z "$COMMIT" ]; then
  echo "Error: COMMIT environment variable is not set."
  exit 1
fi

echo "Linking md files..."
python3 md-graph/mdgraph.py --commit $COMMIT --branch $BRANCH --md_dir $DEST_DIR --include_external_resources true
