
class MdFile():

    def __init__(self, file_path, base_name, title, mdlinks, external_links, group, commit=None, branch=None):
        self.uid = 0
        self.file_path = file_path
        self.base_name = base_name
        self.title = title if title else base_name
        self.mdlinks = mdlinks
        self.external_links = external_links
        self.group = group
        self.commit = commit
        self.branch = branch

    def __str__(self) -> str:
        return f'{self.uid}: {self.file_path}, {self.title}, {self.mdlinks}, {self.external_links}, {self.group}, {self.commit}, {self.branch}'

    def __hash__(self) -> int:
        return hash((self.uid, self.file_path, self.base_name, self.title, self.mdlinks, self.external_links, self.group, self.commit, self.branch))

    def __eq__(self, __o: object) -> bool:
        if not isinstance(__o, type(self)):
            return NotImplemented
        return (self.uid == __o.uid and
                self.file_path == __o.file_path and
                self.base_name == __o.base_name and
                self.title == __o.title and
                self.mdlinks == __o.mdlinks and
                self.external_links == __o.external_links and
                self.group == __o.group and
                self.commit == __o.commit and
                self.branch == __o.branch)
