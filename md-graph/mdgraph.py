# parse through markdown files and build link dictionary

import sys
import os
import json
from mdparser import MdParser, MdParserConfig
from mdd3graph import MdD3Graph
from parse_arguments import parse_arguments


# if path does not exist, fatal exit
def assert_exists(file_path):
    if not os.path.exists(file_path):
        print(f'{file_path} could not be found.')
        exit(1)

# load pyvis options from file
def load_pyvis_opts(file_path):
    assert_exists(file_path)
    with open(file_path, 'r') as f:
        return f.read()

def main():
    # parse arguments
    args = parse_arguments()

    # parse markdown files and build relationships
    parser = MdParser(MdParserConfig(
        args.branch,
        args.commit,
        args.md_dir,
        args.include_external_resources
    ))
    parsed_nodes, parsed_links = parser.parse_to_node_links()

    data = MdD3Graph(list(parsed_nodes), list(parsed_links))

    # write to file input_graph_data.json
    file1 = open("./static/data/input_graph_data.json", 'w')
    file1.write(str(data))
    file1.close()

if __name__ == "__main__":
    main()
