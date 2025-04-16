import json


class MdD3Graph():

    def __init__(self, nodes: list, links: list):
        self.nodes = nodes
        self.links = links

    def __str__(self) -> str:
        return self.toJSON()

    def toJSON(self) -> str:
        return json.dumps(self, default=lambda o: o.__dict__, sort_keys=True, indent=4)
