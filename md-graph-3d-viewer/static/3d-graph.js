let initialData = {
    nodes: [],
    links: []
}
const elem = document.getElementById('chart-container');
const infoDisplayer = document.getElementById("node-info");
const graphInfo = document.getElementById("graph-info");
const versionGraphElement = document.getElementById("version-graph");

let displayedMd = "";

function resetInfo() {
    infoDisplayer.textContent = 'Click on a node to get its information';
}

function displayGraphInfo(version) {
    graphInfo.textContent = '';
    
    // insert color legend
    const colorLegend = document.createElement("div");

    const field = document.getElementById("node-coloration").value;
    Object.entries(field === "group" ? groups : types).forEach(([group, color]) => {
        const legendItem = document.createElement("div");
        legendItem.style.display = "flex";
        legendItem.style.alignItems = "center";
        legendItem.style.marginBottom = "5px";

        const colorBox = document.createElement("div");
        colorBox.style.width = "20px";
        colorBox.style.height = "20px";
        colorBox.style.backgroundColor = color;
        colorBox.style.marginRight = "10px";

        const label = document.createElement("span");
        label.innerText = group;

        legendItem.appendChild(colorBox);
        legendItem.appendChild(label);
        colorLegend.appendChild(legendItem);
    });

    graphInfo.appendChild(colorLegend);

    const { nodes, links } = Graph.graphData();
    const commitInfo = document.createElement("div");
    commitInfo.innerText = `${version ? "Commit:" + version : ""}
                Number of nodes: ${nodes.length}
                Number of links: ${links.length}`;
    graphInfo.appendChild(commitInfo);
}

function createImage(src) {
    const nodeContent = document.createElement("img");
    nodeContent.setAttribute("width", "460px");
    nodeContent.src = src;
    return nodeContent;
}

function readFileAndDisplayInfo(node) {
    infoDisplayer.textContent = '';

    // display div header as a window with a close button
    const header = document.createElement("div");
    header.setAttribute("id", "node-info-header");
    const title = document.createElement("span");
    title.setAttribute("id", "node-info-title");
    header.appendChild(title);
    const link = document.createElement("a");
    // FIXME : Fix the link to open the file in a new tab
    link.href = `http://localhost:8080/?file=/home/coder/project${node.id}&folder=/home/coder/project${node.id}`;
    link.innerText = node.id;
    link.setAttribute("target", "_blank");
    title.appendChild(link);
    const closeButton = document.createElement("button");
    closeButton.setAttribute("id", "close-button");
    closeButton.setAttribute("onclick", "resetInfo()");
    closeButton.innerText = "X";
    header.appendChild(closeButton);
    infoDisplayer.appendChild(header);

    let regex = new RegExp(/[^\s]+(.*?).(jpg|jpeg|png|gif|JPG|JPEG|PNG|GIF)$/);
    const infoDiv = document.createElement("div");

    infoDiv.innerText = `${node.type ? "Type: " + node.type : ""},
                ${node.group ? "Group: " + node.group : ""},
                ${node.val ? "Number of children: " + node.val : ""}
                ------------------------`

    infoDisplayer.appendChild(infoDiv);

    if (node.type === "External") {
        const link = `https://${node.id}`;
        if (regex.test(node.id)) {
            const child = createImage(link);
            infoDisplayer.appendChild(child);
        } else {
            const a = document.createElement("a");
            a.href = link;
            a.innerText = link;
            infoDisplayer.appendChild(a);
        }
    } else {
        fetch('/api/get_file_content', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: node.commit ? `${node.commit}${node.id}` : node.id })
        })
            .then(res => {
                if (!res.ok) {
                    throw Error(res.statusText);
                }
                if (regex.test(node.id)) {
                    return res.blob();
                } else {
                    return res.text();
                }
            })
            .then(data => {
                if (regex.test(node.id)) {
                    // images are displayed as img tags
                    const child = createImage(URL.createObjectURL(data));
                    infoDisplayer.appendChild(child);
                } else if (node.id.endsWith(".svg")) {
                    // svg are displayed as specific img tags
                    const url = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml' }))
                    const child = createImage(url)
                    child.setAttribute("xmlns", "http://www.w3.org/2000/svg");
                    child.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
                    infoDisplayer.appendChild(child);
                } else {
                    // create checkbox to display md files as html
                    if (node.id.endsWith(".md")) {
                        displayedMd = data;
                        const label = document.createElement("label");
                        label.setAttribute("for", "md-checkbox");
                        label.innerText = "Display as markdown";
                        infoDisplayer.appendChild(label);

                        const checkbox = document.createElement("input");
                        checkbox.setAttribute("type", "checkbox");
                        checkbox.setAttribute("id", "md-checkbox");
                        checkbox.setAttribute("name", "md-checkbox");
                        checkbox.setAttribute("checked", "true")
                        checkbox.setAttribute("onclick", "displayAsMdFile()");
                        infoDisplayer.appendChild(checkbox);
                    }

                    // other files are displayed as text
                    const nodeContent = document.createElement("div");
                    nodeContent.setAttribute("id", "node-content")
                    nodeContent.innerText = data;
                    infoDisplayer.appendChild(nodeContent)
                }
            })
            .catch(err => {
                console.error(err);
                const nodeContent = document.createElement("div");
                nodeContent.setAttribute("id", "node-content")
                nodeContent.innerText = "Error while fetching file content : file not found or not readable";
                infoDisplayer.appendChild(nodeContent)
            });
    }
}

function removeEndLink(link) {
    return link.substring(0, link.lastIndexOf("/"));
}

function displayAsMdFile() {
    const isMdFile = document.getElementById("md-checkbox").checked;
    const nodeContent = document.getElementById("node-content");

    if (isMdFile) {
        nodeContent.innerText = displayedMd;
    } else {
        const converter = new showdown.Converter();
        converter.setOption('tables', true);
        converter.setOption('simplifiedAutoLink', true);
        converter.setOption('tasklists', true);
        const html = converter.makeHtml(displayedMd);
        nodeContent.innerHTML = html;
    }
}

let Graph = null;
let types = {};
let groups = {};
let extensions = {};
let fields = new Set();
let currentVersion = null;

let VersionsGraph = null;

function transformGraphData(data) {
    // data is a json file with an array of {commit: str, author: str, date: str, message: str, refs: str[], parents: str[], files: str[]}
    const nodes = data.map(commit => ({
        id: commit.commit,
        commit: commit.commit,
        author: commit.author,
        date: commit.date,
        message: commit.message,
        parents: commit.parents,
    }));

    const links = [];
    const commitMap = new Map(data.map(commit => [commit.commit, commit]));

    data.forEach(commit => {
        commit.parents.forEach(parentHash => {
            if (commitMap.has(parentHash)) {
                links.push({
                    label: `${parentHash} to ${commit.commit}`,
                    source: commit.commit,
                    target: parentHash
                });
            }
        });
    });

    return { nodes, links };
}

fetch('./data/git_graph.json')
    .then(res => res.json())
    .then(data => {
        VersionsGraph = ForceGraph(transformGraphData(data));
        versionGraphElement.append(VersionsGraph);
    });

function ForceGraph({
    nodes, // an iterable of node objects (typically [{id}, …])
    links // an iterable of link objects (typically [{source, target}, …])
}, {
    nodeId = d => d.id, // given d in nodes, returns a unique identifier (string)
    nodeGroup, // given d in nodes, returns an (ordinal) value for color
    nodeGroups, // an array of ordinal values representing the node groups
    nodeTitle, // given d in nodes, a title string
    nodeFill = "currentColor", // node stroke fill (if not using a group color encoding)
    nodeStroke = "#fff", // node stroke color
    nodeStrokeWidth = 1.5, // node stroke width, in pixels
    nodeStrokeOpacity = 1, // node stroke opacity
    nodeRadius = 5, // node radius, in pixels
    nodeStrength = -15, // node strength
    linkSource = ({ source }) => source, // given d in links, returns a node identifier string
    linkTarget = ({ target }) => target, // given d in links, returns a node identifier string
    linkStroke = "#999", // link stroke color
    linkStrokeOpacity = 0.75, // link stroke opacity
    linkStrokeWidth = 1.25, // given d in links, returns a stroke width in pixels
    linkStrokeLinecap = "round", // link stroke linecap
    linkStrength,
    colors = d3.schemeTableau10, // an array of color strings, for the node groups
    width = '400', // outer width, in pixels
    height = '400', // outer height, in pixels
    invalidation // when this promise resolves, stop the simulation
} = {}) {
    // Compute values.
    const N = d3.map(nodes, nodeId).map(intern);
    const LS = d3.map(links, linkSource).map(intern);
    const LT = d3.map(links, linkTarget).map(intern);
    if (nodeTitle === undefined) nodeTitle = (_, i) => N[i];
    const T = nodeTitle == null ? null : d3.map(nodes, nodeTitle);
    const G = nodeGroup == null ? null : d3.map(nodes, nodeGroup).map(intern);
    const W = typeof linkStrokeWidth !== "function" ? null : d3.map(links, linkStrokeWidth);

    // Replace the input nodes and links with mutable objects for the simulation.
    nodes = d3.map(nodes, (_, i) => ({ id: N[i] }));
    links = d3.map(links, (_, i) => ({ source: LS[i], target: LT[i] }));

    // Compute default domains.
    if (G && nodeGroups === undefined) nodeGroups = d3.sort(G);

    // Construct the scales.
    const color = nodeGroup == null ? null : d3.scaleOrdinal(nodeGroups, colors);

    // Construct the forces.
    const forceNode = d3.forceManyBody();
    const forceLink = d3.forceLink(links).id(({ index: i }) => N[i]);
    if (nodeStrength !== undefined) forceNode.strength(nodeStrength);
    if (linkStrength !== undefined) forceLink.strength(linkStrength);

    const simulation = d3.forceSimulation(nodes)
        .force("link", forceLink)
        .force("charge", forceNode)
        .force("x", d3.forceX())
        .force("y", d3.forceY())
        .on("tick", ticked);

    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

    const link = svg.append("g")
        .attr("stroke", linkStroke)
        .attr("stroke-opacity", linkStrokeOpacity)
        .attr("stroke-width", typeof linkStrokeWidth !== "function" ? linkStrokeWidth : null)
        .attr("stroke-linecap", linkStrokeLinecap)
        .selectAll("line")
        .data(links)
        .join("line");

    if (W) link.attr("stroke-width", ({ index: i }) => W[i]);

    const node = svg.append("g")
        .attr("fill", nodeFill)
        .attr("stroke", nodeStroke)
        .attr("stroke-opacity", nodeStrokeOpacity)
        .attr("stroke-width", nodeStrokeWidth)
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", nodeRadius)
        .on("click", (event, d) => {
            event.stopPropagation();
            console.log(updateFileGraph(d.id))
        })
        .call(drag(simulation));

    if (G) node.attr("fill", ({ index: i }) => color(G[i]));
    if (T) node.append("title").text(({ index: i }) => T[i]);

    // Handle invalidation.
    if (invalidation != null) invalidation.then(() => simulation.stop());

    function intern(value) {
        return value !== null && typeof value === "object" ? value.valueOf() : value;
    }

    function ticked() {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    }

    function drag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }

    return Object.assign(svg.node(), { scales: { color } });
}

function updateFileGraph(version) {
    fetch('./data/graphs/' + version + '/input_graph_data.json')
        .then(res => res.json())
        .then(data => {
            initialData = data;

            extractAndDisplayTypes(data.nodes);
            extractAndDisplayGroups(data.nodes);
            extractAndDisplayExtensions(data.nodes);

            console.log(data, initialData)

            Graph = ForceGraph3D()(elem)
                .graphData(initialData)
                .nodeLabel(node => node.id)
                .onNodeClick(readFileAndDisplayInfo)
                .enableNodeDrag(false);

            colorGraph();

            resetInfo();
            displayGraphInfo(version);
        });
}

fetch('/api/get_random_version')
    .then(res => res.text())
    .then(randomVersion => {
        currentVersion = randomVersion;
        updateFileGraph(randomVersion);
    });

function getSelectedGroups(multipleSelectId) {
    const select = document.getElementById(multipleSelectId)
    let selected = [];

    if (select && select.options) {
        for (let i = 0, iLen = select.options.length; i < iLen; i++) {
            opt = select.options[i];

            if (opt.selected) {
                selected.push(opt.value || opt.text);
            }
        }
    }

    return selected;
}

function filterGraph(resetFolderFilter = false) {
    resetInfo()

    if (resetFolderFilter) {
        document.getElementById("folder-filter").value = "";
    }

    let { nodes, links } = initialData;
    const nodeType = document.getElementById("node-type").value;
    const nodeGroup = getSelectedGroups("node-group");
    const nodeExtension = getSelectedGroups("node-extension");

    console.log(nodeType, nodeGroup, nodeExtension);

    // Filter by group
    if (nodeGroup.findIndex(group => group === "All") < 0) {
        nodes = nodes.filter(n => nodeGroup.findIndex(nG => nG === n.group) >= 0)
        links = links.filter(l => nodeGroup.findIndex(nG => nG === l.source.group) >= 0 && nodeGroup.findIndex(nG => nG === l.target.group) >= 0);
    }

    // Filter by type
    if (nodeType !== "All") {
        nodes = nodes.filter(n => n.type === nodeType)
        links = links.filter(l => l.source.type === nodeType && l.target.type === nodeType);
    }

    // Filter by extension
    if (nodeExtension.findIndex(ext => ext === "All") < 0) {
        nodes = nodes.filter(n => nodeExtension.findIndex(nE => n.id.endsWith(nE)) >= 0)
        links = links.filter(l => nodeExtension.findIndex(nE => l.source.id.endsWith(nE)) >= 0 && nodeExtension.findIndex(nE => l.target.id.endsWith(nE)) >= 0);
    }

    Graph.graphData({ nodes, links });
    displayGraphInfo(currentVersion);
}

function isNodeConnectedToPath(node, path, links) {
    return links
        .filter(l => l.source.id.startsWith(path) && l.target && l.target.id)
        .findIndex(cL => cL.target.id === node.id) > -1;
}

function filterFolder() {
    filterGraph();

    // filter nodes by folder path
    let { nodes, links } = Graph.graphData();
    const path = document.getElementById("folder-filter").value;
    const includeLinkedNodes = document.getElementById("folder-filter-include-linked-nodes").checked

    if (includeLinkedNodes) {
        nodes = nodes.filter(n => n.id.startsWith(path) || isNodeConnectedToPath(n, path, links))
        links = links.filter(l => l.source.id.startsWith(path));
    } else {
        nodes = nodes.filter(n => n.id.startsWith(path))
        links = links.filter(l => l.source.id.startsWith(path) && l.target.id.startsWith(path));
    }

    Graph.graphData({ nodes, links });
    displayGraphInfo(currentVersion);
}

function getUniqueColor(colorNum, colors) {
    if (colors < 1) colors = 1; // defaults to one color - avoid divide by zero
    return "hsl(" + (colorNum * (360 / colors) % 360) + ",100%,50%)";
}

function colorGraph() {
    const field = document.getElementById("node-coloration").value;
    const data = Graph.graphData();

    switch (field) {
        case "type":
            data.nodes.forEach(n => n.color = types[n.type]);
            break;
        case "group":
            data.nodes.forEach(n => n.color = groups[n.group]);
            break;
        default:
            break;
    }

    Graph.graphData(data);
    displayGraphInfo(currentVersion);
}

function getDefaultOption() {
    const defaultOption = document.createElement("option");
    defaultOption.selected = true;
    defaultOption.value = "All";
    defaultOption.innerText = "All";
    return defaultOption;
}

function extractAndDisplayTypes(nodes) {
    // remove all types
    types = {};
    nodes.forEach((n) => types[n.type] = '');
    const typeSelector = document.getElementById("node-type");
    typeSelector.innerHTML = "";
    typeSelector.appendChild(getDefaultOption());
    Object.keys(types).forEach((type) => {
        const option = document.createElement("option");
        option.value = type;
        option.innerText = type;
        typeSelector.appendChild(option);
    });
    let count = 0;
    nodes.forEach(n =>
        types[n.type] = types.hasOwnProperty(n.type) && types[n.type] ?
            types[n.type] : getUniqueColor(++count, Object.keys(types).length)
    );
}

function extractAndDisplayGroups(nodes) {
    // remove all groups
    groups = {};
    nodes.forEach((n) => groups[n.group] = '');
    const groupSelector = document.getElementById("node-group");
    // remove all options
    groupSelector.innerHTML = "";
    groupSelector.appendChild(getDefaultOption());
    Object.keys(groups).forEach((group) => {
        const option = document.createElement("option");
        option.value = group;
        option.innerText = group;
        groupSelector.appendChild(option);
    });
    let count = 0;
    nodes.forEach(n => groups[n.group] = groups.hasOwnProperty(n.group) && groups[n.group] ? groups[n.group] : getUniqueColor(++count, Object.keys(groups).length));
}

function extractAndDisplayExtensions(nodes) {
    // remove all extensions
    extensions = {};
    nodes.forEach((n, index) => {
        if (n.type == "Internal") {
            const ext = n.id.split('.').pop();
            extensions[ext] = extensions.hasOwnProperty(ext) ? extensions[ext] : getUniqueColor(index);
        }
    });
    const extensionSelector = document.getElementById("node-extension");
    extensionSelector.innerHTML = "";
    extensionSelector.appendChild(getDefaultOption());
    Object.keys(extensions).forEach((ext) => {
        const option = document.createElement("option");
        option.value = ext;
        option.innerText = ext;
        extensionSelector.appendChild(option);
    });
}
