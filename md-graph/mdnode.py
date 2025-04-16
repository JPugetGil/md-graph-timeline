import json


class MdNode():

    def __init__(self, id: str, branch: str, group: str, commit: str, type: str, val: int = 1):
        self.id = id
        self.branch = branch
        self.group = group
        self.commit = commit
        self.type = type
        self.val = val

    def __str__(self) -> str:
        return f'{self.id}, {self.branch}, {self.group}, {self.commit}, {self.type}, {self.val}'

    def __repr__(self) -> str:
        return self.toJSON()

    def __hash__(self) -> int:
        return hash((self.id, self.branch, self.group, str(self.commit), self.type, self.val))

    def __eq__(self, __o: object) -> bool:
        if not isinstance(__o, type(self)):
            return NotImplemented
        return (self.id == __o.id and
                self.branch == __o.branch and
                self.group == __o.group and
                self.commit == __o.commit and
                self.type == __o.type and
                self.val == __o.val)

    def toJSON(self):
        return json.dumps(self, default=lambda o: o.__dict__,
                          sort_keys=True, indent=4)
