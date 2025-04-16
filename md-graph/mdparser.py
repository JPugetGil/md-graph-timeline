import os
import re
import yaml
from mdfile import MdFile
from mdnode import MdNode
from mdlink import MdLink
from urllib.parse import urlparse

# ./path or ../path
RE_INTERNAL_LINK = r'\.\.?\/[^\n"?:*<>|\'\)\] ]+\.[a-zA-Z0-9_.-]{2,3}'
RE_HTTP_LINK = r'(https?:\/\/(?:www[a-zA-Z0-9-]+\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})'
RE_MDFM = r'(?<=(\-{3}))(.*?)(?=(\-{3}))'  # front matter yaml


class MdParserConfig():

    def __init__(self, branch, commit, target_dir, include_external_resources=False, external_resources_level_detail="path"):
        self.target_dir = []
        self.branch = branch
        self.commit = commit
        rootdir = os.path.abspath(target_dir)
        for it in os.scandir(rootdir):
            if it.is_dir():
                self.target_dir.append(it.path)

        self.include_external_resources = include_external_resources
        self.external_resources_level_detail = external_resources_level_detail
        for path in self.target_dir:
            t_dir = os.path.abspath(path)
            self.assert_exists(t_dir)

    # if path does not exist, fatal exit
    def assert_exists(self, file_path):
        if not os.path.exists(file_path):
            print(f'{file_path} could not be found.')
            exit(1)

class MdParser():

    def __init__(self, config):
        self.config = config
        self.pages = []
        self.current_t_dir = None

    # parse markdown front matter (yaml)
    def parse_frontmatter(self, content):
        flags = re.MULTILINE + re.IGNORECASE + re.DOTALL
        fm = re.search(RE_MDFM, content, flags=flags).group(0)
        try:
            formated_yaml = yaml.safe_load(fm)
        except:
            return ""
        return formated_yaml

    # grab all the information needed from the markdown file
    def parse_md(self, file_name, group):
        base_name = os.path.basename(file_name)

        with open(file_name, 'r') as f:
            content = f.read()
            try:
                title = self.parse_frontmatter(content)['title']
            except (AttributeError, TypeError, KeyError):
                title = base_name

            http_link = set()

            if self.config.include_external_resources:
                with_path = self.config.external_resources_level_detail == 'path'
                http_link = set(map(lambda l: self.format_link(l, with_path=with_path), filter(
                    lambda e: not (isinstance(e, list)) and self.is_valid_url(e), re.findall(RE_HTTP_LINK, content))))

            internal_link = set(map(lambda l: self.getProjectLocalPath(os.path.realpath(os.path.join(
                file_name.rsplit('/', 1)[0], l))), re.findall(RE_INTERNAL_LINK, content)))

        return MdFile(self.getProjectLocalPath(file_name), base_name, title, internal_link, http_link, group, self.config.commit, self.config.branch)

    def is_valid_url(self, url):
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except:
            return False

    # parse all markdown files in directory
    def parse_to_pages(self):
        uid = 1

        # parse each markdown file
        for t_dir in self.config.target_dir:
            self.current_t_dir = t_dir
            # f'https://github.com/VCityTeam/{t_dir.split("/")[-1]}/tree/master/'
            group = t_dir.split("/")[-1]

            for subdir, dirs, files in os.walk(t_dir):
                for f in files:
                    if f.endswith('md'):
                        path = os.path.join(subdir, f)

                        if not any(x for x in self.pages if x.file_path == path):
                            md = self.parse_md(path, group)
                            md.uid = uid
                            uid += 1
                            self.pages.append(md)
            if (self.config.target_dir.index(t_dir) != 0 and self.config.include_external_resources):
                self.connect_pages()

    def connect_pages(self):
        # foreach page in self.pages
        for page in (page for page in self.pages if len(page.external_links) > 0):
            # foreach external link in page
            for external_link in (external_link for external_link in page.external_links.copy()):
                # if external link is a project link and has a corresponding page : link them
                for page2 in (page2 for page2 in self.pages if (page2.file_path == external_link.replace("github.com/VCityTeam", "").replace("blob/master/", ""))):
                    # Debug
                    # print(
                    #     f'doc: {page.file_path} -> external_link:  {external_link.replace("github.com/VCityTeam", "").replace("blob/master/", "")} \n at {page2.file_path}')

                    # connect pages page links with page2 md
                    page.mdlinks.add(page2.file_path)
                    page.external_links.remove(external_link)

        return None

    def parse_to_node_links(self):
        self.parse_to_pages()
        nodes = set()
        links = set()

        for page in self.pages:
            nodes.add(MdNode(
                id=page.file_path,
                group=self.getProjectLocalPath(page.group),
                commit=self.config.commit,
                branch=self.config.branch,
                type="Internal",
                val=(len(page.mdlinks) + len(page.external_links))
            ))
            for md_link in page.mdlinks:
                nodes.add(MdNode(
                    id=md_link,
                    group=self.getMdLinkGroup(md_link),
                    branch=self.config.branch,
                    commit=self.config.commit,
                    type="Internal"
                ))
                links.add(MdLink(
                    source=page.file_path,
                    target=md_link,
                    label="1"
                ))
            if (self.config.include_external_resources and len(page.external_links) > 0):
                for external_link in page.external_links:
                    nodes.add(MdNode(
                        id=self.clean_string(external_link),
                        group=(self.getProjectLocalPath(
                            page.group
                        ) if "github.com/VCityTeam" in external_link else "External"),
                        branch=self.config.branch,
                        commit=self.config.commit,
                        type="External"
                    ))
                    links.add(MdLink(
                        source=page.file_path,
                        target=external_link,
                        label="1"
                    ))
        return nodes, links

    def format_link(self, string, with_hostname=True, with_path=True):
        string = self.clean_string(string)
        try:
            parsed_link = urlparse(string)
            if parsed_link is None:
                return string
            else:
                return f'{parsed_link.hostname if with_hostname else ""}{parsed_link.path if with_path else ""}'
        except ValueError:
            return string

    def clean_string(self, string):
        bad_chars = [';', ')', "|", ",", " ",
                     "{", "}", "\\", "`", "\"", " ", "]"]
        for i in bad_chars:
            string = string.split(i, 1)[0]
        return string

    def getProjectLocalPath(self, path):
        '''
        Extract the project-local path of the system absolute path

                Parameters:
                        path (str): The system absolute path
                Returns:
                        project-path (str): the project-local path
                Example:
                        # /.../Project-Name/X -> /Project-Name/X
        '''
        return path.replace(os.path.realpath(os.path.join(os.getcwd(), self.current_t_dir)).rsplit('/', 1)[0], "")

    def buildGitHubRepo(self, path):
        '''
        Builds the Repo project path with the repository name

                Parameters:
                        path (str): The repository name
                Returns:
                        project-path (str): the repository URL
                Example:
                        # Project-Name -> https://github.com/VCityTeam/Project-Name/tree/master/
        '''
        return f'https://github.com/VCityTeam/{path}/tree/master/'

    def getMdLinkGroup(self, link):
        '''
        Returns the group of the md-link

                Parameters:
                        link (str): 
                Returns:
                        md-link-group (str): 
                Example:
                        #  -> 
        '''
        separator = '/'
        res = link.split(separator)
        # f'/VCityTeam{separator.join(res[:2])}/tree/master/'
        return res[1]
