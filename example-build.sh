#!/bin/bash

echo "Building md-graph"
echo "================="
# Check if MD_DIR is set
if [ -z "$MD_DIR" ]; then
  echo "Error: MD_DIR environment variable is not set."
  exit 1
fi
if [ -z "$BRANCH" ]; then
  echo "Error: BRANCH environment variable is not set."
  exit 1
fi
# Check if DEST_DIR is set
if [ -z "$DEST_DIR" ]; then
  # Set a default value for DEST_DIR
  DEST_DIR="./"
fi

echo "Removing old data located at ./static/data/input_graph_data.json"
rm $DEST_DIR/input_graph_data.json

echo "Linking md files..."
python3 md-graph/mdgraph.py --commit $MD_DIR --branch $BRANCH --md_dir $DEST_DIR/graphs/$MD_DIR --include_external_resources true

# cd server

# flask --app server run