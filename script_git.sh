#!/bin/bash

# Check if a Git repository path is provided as an argument.
if [ $# -ne 1 ]; then
  echo "Usage: $0 <git_repository>"
  exit 1
fi

git_repository="$1"

# Check if the provided link is a valid Git repository.
if ! git ls-remote "$git_repository" &> /dev/null; then
  echo "Error: Invalid Git repository URL."
  exit 1
fi

# Clone the Git repository.
repo_path=$(basename "$git_repository" .git)
git clone "$git_repository" "$repo_path" || {
  echo "Error: Failed to clone the repository."
  exit 1
}

md_data_repo_path="md-graph-3d-viewer/static/data"
mkdir -p "$md_data_repo_path" || {
  echo "Error: Failed to create directory $md_data_repo_path."
  continue # Continue to the next commit if mkdir fails.
}

# run the get_parents.py script
git_graph_file="git_graph.json"
GIT_DIRECTORY="$repo_path" GIT_GRAPH_FILE="$git_graph_file" python3 get_parents.py || {
  echo "Error: Failed to run get_parents.py script."
  exit 1
}

mv "$git_graph_file" "$md_data_repo_path/$git_graph_file" || {
  echo "Error: Failed to move $git_graph_file to $md_data_repo_path."
  exit 1
}

# Change directory to the Git repository.
cd "$repo_path" || {
  echo "Error: Failed to change directory to $repo_path."
  exit 1
}

# Get a list of all branches.
branches=$(git for-each-ref --format='%(refname:short)' refs/heads/)

# Iterate through each branch.
for branch in $branches; do
  # Checkout the branch.
  git checkout "$branch" || {
    echo "Error: Failed to checkout branch $branch."
    continue # Continue to the next branch if checkout fails.
  }

  # Get a list of all commits on the current branch.
  commits=$(git log --pretty=format:"%H")

  # Iterate through each commit on the current branch.
  for commit in $commits; do
    # Checkout the commit.
    git checkout "$commit" || {
      echo "Error: Failed to checkout commit $commit on branch $branch."
      continue # Continue to the next commit if checkout fails.
    }
    # Perform any operations at each commit
    echo "Checked out commit $commit on branch $branch"

    # Create a directory for the commit if it doesn't exist.
    commit_prefix_dest_dir="$md_data_repo_path/graphs/$commit"
    commit_dest_dir="../$commit_prefix_dest_dir"
    mkdir -p "$commit_dest_dir" || {
      echo "Error: Failed to create directory $commit_dest_dir."
      continue # Continue to the next commit if mkdir fails.
    }

    # Move the current commit's files to the commit directory
    cp -r ./* "$commit_dest_dir/" || {
      echo "Error: Failed to copy files to $commit_dest_dir."
      continue # Continue to the next commit if cp fails.
    }

    # Example operation: You can add your own commands here.
    # cd to the directory where the script is located
    # and run the example-build.sh script.
    cd ..
    MD_DIR="$commit_dest_dir" COMMIT="$commit" BRANCH="$branch" DEST_DIR="$commit_prefix_dest_dir" ./example-build.sh 

    # cd back to the original repository
    cd "$repo_path" || {
      echo "Error: Failed to change directory back to $repo_path."
      continue # Continue to the next commit if cd fails.
    }
  done
done

# Return to the original branch (e.g., main or master)
original_branch=$(git rev-parse --abbrev-ref HEAD)
if [ -n "$original_branch" ]; then
    git checkout "$original_branch" || {
        echo "Error: Failed to return to original branch $original_branch"
    }
fi

echo "Finished processing all commits on all branches."

echo "Lauching server..."

cd ../md-graph-3d-viewer/server || {
  echo "Error: Failed to change directory to md-graph-3d-viewer/server."
  exit 1
}

# Start the server
flask --app server run
