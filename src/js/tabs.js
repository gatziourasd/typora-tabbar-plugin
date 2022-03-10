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
