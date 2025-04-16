import json


class MdLink():

    def __init__(self, source: str, target: str, label: str):
        self.source = source
        self.target = target
        self.label = label

    def __str__(self) -> str:
        return f'{self.source}, {self.target}, {self.label}'

    def __repr__(self) -> str:
        return self.toJSON()

    def __hash__(self) -> int:
        return hash((self.source, self.target, self.label))

    def __eq__(self, __o: object) -> bool:
        if not isinstance(__o, type(self)):
            return NotImplemented
        return (self.source == __o.source and
                self.target == __o.target and
                self.label == __o.label)

    def toJSON(self):
        return json.dumps(self, default=lambda o: o.__dict__,
                          sort_keys=True, indent=4)
