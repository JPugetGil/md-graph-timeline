import configargparse

def parse_arguments():
    graph_parser = configargparse.ArgParser()
    # Add the default parser extensions
    graph_parser.add(
        "--commit",
        help="Commit hash to use (e.g. 'HEAD')",
        type=str,
    )

    graph_parser.add(
        "--branch",
        help="Branch name used",
        type=str,
    )

    graph_parser.add(
        "--md_dir",
        help="Path to the directory where the md files are stored (e.g. '.')",
        type=str,
    )

    graph_parser.add(
        "--include_external_resources",
        help="Include external resources in the graph (e.g. 'True')",
        type=bool,
    )

    return graph_parser.parse_args()
