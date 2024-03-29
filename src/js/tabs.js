const fileLibrary = document.getElementById("file-library");
const fileTreeObserver = new MutationObserver(() => {
  attachListenerToFileNode(fileLibrary, "[data-path][data-is-directory=false]");
});

const searchResult = document.getElementById("file-library-search-result");
const searchResultObserver = new MutationObserver(() => {
  attachListenerToFileNode(searchResult, "[data-path]");
});

// const listView = document.getElementById("file-library-list-children");
// const listViewObserver = new MutationObserver(() => {
//   attachListenerToFileNode(listView, "[data-path]");
// });

let activeFile;

let tabs = [];
let onTabChanged = () => {};

attachListenerToFileNode(fileLibrary, "[data-path][data-is-directory=false]");

export function addEventListener(callback) {
  onTabChanged = callback;
}

export function openFile(path) {
  fileLibrary
    .querySelector(
      `[data-path=\"${path.replace(/\\/gm, "\\\\")}\"] > div.file-node-content`
    )
    ?.click();
}
export function closeFile(path) {
  const pathIndex = tabs.findIndex((tab) => tab.path === path);

  if (tabs.length <= 1) {
  } else if (pathIndex === 0) {
    tabs.splice(0, 1);
    openFile(tabs[tabs.length - 1].path);
  } else {
    tabs.splice(pathIndex, 1);
    openFile(tabs[pathIndex - 1].path);
  }

  onTabChanged(tabs);
}

function openTab(path, preview = true) {
  const tab = {
    path,
    active: false,
    preview,
    scrollTop: 0,
  };

  const pathIndex = tabs.findIndex((tab) => tab.path === path);

  if (pathIndex > -1) {
    if (!tabs[pathIndex].preview) tab.preview = false;
    tabs[pathIndex].preview = tab.preview;
  } else {
    const previewIndex = tabs.findIndex((tab) => tab.preview === true);
    if (previewIndex > -1) {
      tabs[previewIndex].path = path;
    } else {
      tabs.push(tab);
    }
  }

  onTabChanged(tabs);
}

function attachListenerToFileNode(rootElm, selector) {
  const fileNodes = Array.from(rootElm.querySelectorAll(selector));

  fileNodes.forEach((node) => {
    const path = node.getAttribute("data-path");
    if (node.classList.contains("active")) activeFile = path;

    node.onclick = () => {
      openTab(path);
    };
    node.ondblclick = () => {
      openTab(path, false);
    };
  });

  tabs = tabs.map((tab) => {
    if (tab.path === activeFile) {
      tab.active = true;
      return tab;
    } else {
      tab.active = false;
      return tab;
    }
  });

  onTabChanged(tabs);
}

fileTreeObserver.observe(fileLibrary, {
  childList: true,
  subtree: true,
  attributeFilter: ["class"],
});

searchResultObserver.observe(searchResult, {
  childList: true,
  subtree: true,
  attributeFilter: ["class"],
});

// listViewObserver.observe(listView, {
//   childList: true,
//   subtree: true,
//   attributeFilter: ["class"],
// });

setTimeout(() => {
  const activeElm = fileLibrary.querySelector(
    "div.active[data-path][data-is-directory=false]"
  );
  if (!activeElm) return;
  const path = activeElm.getAttribute("data-path");
  tabs.push({ path, preview: false, active: true, scrollTop: 0 });
  onTabChanged(tabs);
}, 500);

//___REMEMBER-SCROLL-POSITION___

const contentNode = document.getElementsByTagName("content")[0];
const writeNode = document.getElementById("write");
const outlineNode = document.getElementById("outline-content");

export function onMount() {
  const TopBar = document.getElementById("svelte-target");

  let mouseOverSideBar = false;
  let mouseOverBar = false;

  fileLibrary.onmouseenter = () => {
    mouseOverSideBar = true;
  };

  fileLibrary.onmouseleave = () => {
    mouseOverSideBar = false;
  };

  TopBar.onmouseenter = () => {
    mouseOverBar = true;
  };

  TopBar.onmouseleave = () => {
    mouseOverBar = false;
  };

  contentNode.onscroll = () => {
    const activeTabIndex = tabs.findIndex((tab) => tab.active);
    if (activeTabIndex > -1 && !(mouseOverSideBar || mouseOverBar)) {
      tabs[activeTabIndex].scrollTop = contentNode.scrollTop;
    } else if (activeTabIndex > -1) {
      contentNode.scrollTop = tabs[activeTabIndex].scrollTop;
    }
  };
}

const loadTimer = setInterval(() => {
  if (File) {
    handleUrls();
    clearInterval(loadTimer);
  }
}, 500);

function handleUrls() {
  const urlPattern =
    /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;

  const tryOpenUrlCopy = File.editor.tryOpenUrl;
  File.editor.tryOpenUrl = (e, t) => {
    if (e.match(urlPattern)) {
      tryOpenUrlCopy.apply(this, [e, t]);
    } else if (e.match(/^#/)) {
      let anchorElement = editor.EditHelper.findAnchorElem(e);
      anchorElement && editor.selection.jumpIntoElemBegin(anchorElement);
      editor.selection.scrollAdjust(anchorElement, 10);
    } else if (
      [
        ".md",
        ".markdown",
        ".mmd",
        ".text",
        ".txt",
        ".mdown",
        ".mdwn",
        ".apib",
      ].includes(e.substring(e.lastIndexOf(".")).trim())
    ) {
      openFromLink(e);
    } else {
      tryOpenUrlCopy.apply(this, [e, t]);
    }
  };
}


function openFromLink(link) {
  if (!link) return;
  const path = getAbsolutePath(File.bundle.filePath, link);

  openFile(path);
}

function getAbsolutePath(currLocation, newLocation) {
  if (!currLocation) return "";
  if (!newLocation) return "";

  currLocation = currLocation.split(/[\\\/]/g);
  currLocation.pop();

  newLocation
    .split(/[\\\/]/g)
    .filter((item) => item != ".")
    .forEach((item) => {
      item === ".." ? currLocation.pop() : currLocation.push(item);
    });

  return currLocation.join("\\");
}
