import os
import subprocess
import json

def create_git_graph_file(git_directory, git_graph_file):
    """
    Creates a git graph from the specified git directory and saves it to a JSON file.
    :param git_directory: Path to the git directory.
    :return: None
    """
    # Check if the directory is a git repository
    if not os.path.isdir(os.path.join(git_directory, '.git')):
        raise ValueError(f"The directory {git_directory} is not a valid git repository.")

    # Get the commit history
    try:
        commit_history = subprocess.check_output(
            ['git', 'log', '--pretty=format:%H%x00%an <%ae>%x00%ad%x00%s'],
            cwd=git_directory,
            text=True
        ).strip().split('\n')
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Failed to get git log: {e}")

    # Parse the commit history into a graph structure
    git_repo = []
    graph = {}
    for line in commit_history:
        parts = line.split("\u0000")
        graph = {
            "commit": parts[0],
            "author": parts[1],
            "date": parts[2],
            "message": parts[3]
        }
        git_repo.append(graph)

    # Save the graph to a JSON file
    with open(git_graph_file, 'w') as f:
        json.dump(git_repo, f, indent=4)

def get_git_commit_parents(git_directory, commit_hash):
    """
    Get the parent commits of a given commit hash.
    :param commit_hash: The commit hash to get parents for.
    :return: List of parent commit hashes.
    """
    try:
        parents = subprocess.check_output(
            ['git', 'rev-list', '--parents', '-n', '1', commit_hash],
            cwd=git_directory,
            text=True
        ).strip().split()
        return parents[1:]  # Skip the first element which is the commit itself
    except subprocess.CalledProcessError as e:
        print(f"Failed to get parents for commit {commit_hash}: {e}")
        return []

def add_new_value_to_objects(git_directory, json_file):
    try:
        # Open and load the JSON file
        with open(json_file, 'r') as file:
            data = json.load(file)
        
        # Ensure the JSON data is an array of objects
        if isinstance(data, list):
            for obj in data:
                if isinstance(obj, dict):
                    obj['parents'] = get_git_commit_parents(git_directory, obj['commit'])
                else:
                    print("Warning: Encountered a non-object in the array.")
        else:
            print("Error: JSON data is not an array.")
            return
        
        # Save the updated data back to the file
        with open(json_file, 'w') as file:
            json.dump(data, file, indent=4)
        print("Successfully updated the JSON file.")
    
    except FileNotFoundError:
        print(f"Error: File '{json_file}' not found.")
    except json.JSONDecodeError:
        print("Error: Failed to decode JSON. Ensure the file contains valid JSON.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")


if __name__ == "__main__":
    git_directory = os.getenv('GIT_DIRECTORY', '.')
    git_graph_file = os.getenv('GIT_GRAPH_FILE', 'git_graph.json')

    create_git_graph_file(git_directory, git_graph_file)
    add_new_value_to_objects(git_directory, git_graph_file)