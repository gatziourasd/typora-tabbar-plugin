<script>
  import Tab from "./Tab.svelte";
  import * as tabs from "../js/tabs.js";
  import { onMount } from "svelte";

  tabs.addEventListener((newTabs) => {
    tabList = newTabs;
  });

  onMount(() => {
    tabs.onMount();
  });

  let tabList = [];

  let draggedItemData = {};
  let draggedItemIndex = null;
  let hoveredItemIndex = null;
  let mouseClientX;
  let mouseGrabOffset;

  $: {
    if (
      draggedItemIndex !== null &&
      hoveredItemIndex !== null &&
      draggedItemIndex !== hoveredItemIndex
    ) {
      [tabList[draggedItemIndex], tabList[hoveredItemIndex]] = [
        tabList[hoveredItemIndex],
        tabList[draggedItemIndex],
      ];
      draggedItemIndex = hoveredItemIndex;
    }
  }

  let cloneContainer;

  let scrollContainer;
</script>

<svelte:body
  on:mousemove={(e) => {
    mouseClientX = e.clientX;
  }}
  on:mouseup={(e) => {
    draggedItemData = {};
    draggedItemIndex = null;
    hoveredItemIndex = null;
    mouseClientX = e.clientX;
  }}
  on:mouseleave={(e) => {
    draggedItemData = {};
    draggedItemIndex = null;
    hoveredItemIndex = null;
    mouseClientX = e.clientX;
  }} />

<div class="clone-container" bind:this={cloneContainer}>
  {#if mouseClientX && draggedItemIndex !== null}
    <div
      class="tab-clone"
      style="left: {mouseClientX -
        mouseGrabOffset -
        (cloneContainer?.getBoundingClientRect()?.left ?? 0)}px;"
    >
      <Tab
        path={draggedItemData.path}
        active={draggedItemData.active}
        preview={draggedItemData.preview}
        single={tabList.length === 1}
      />
    </div>
  {/if}
</div>

<div
  class="container"
  style="width: calc(100vw - var(--sidebar-width, 0));"
  bind:this={scrollContainer}
  on:wheel|preventDefault={(e) => {
    console.log(e.deltaY);
    scrollContainer.scrollLeft += e.deltaY;
  }}
>
  {#each tabList as tab, index (tab.path)}
    <!-- svelte-ignore a11y-mouse-events-have-key-events -->
    <div
      class="grab-container"
      class:invisible={tab.path === draggedItemData?.path}
      on:mousedown|stopPropagation={(e) => {
        draggedItemData = tab;
        draggedItemIndex = index;
        mouseClientX = e.clientX;
        mouseGrabOffset = e.clientX - e.target.getBoundingClientRect().left;
      }}
      on:mouseover={(e) => {
        hoveredItemIndex = index;
      }}
    >
      <Tab
        path={tab.path}
        active={tab.active}
        preview={tab.preview}
        single={tabList.length === 1}
        on:openfile={(e) => {
          tabs.openFile(e.detail.path);
        }}
        on:closefile={(e) => {
          tabs.closeFile(e.detail.path);
        }}
      />
    </div>
  {/each}
</div>

<style>
  .grab-container {
    height: 100%;
    width: fit-content;
  }

  .tab-clone {
    pointer-events: none;
    width: fit-content;
    height: 40px;
    position: absolute;
    top: 0;

    z-index: 1000;
  }

  .clone-container {
    position: relative;
  }

  .container {
    background-color: var(--bg-color, white);
    height: 100%;

    display: flex;
    align-items: center;
    justify-content: flex-start;

    box-sizing: border-box;

    overflow-x: scroll;
  }

  .container::after {
    content: "";
    height: 100%;
    width: 100vw;
    background-color: var(--side-bar-bg-color, gray);
    border-bottom: solid 1px rgba(0, 0, 0, 0.07);
  }

  .invisible {
    opacity: 0;
  }

  .container:hover::-webkit-scrollbar-thumb {
    visibility: visible;
  }

  .container::-webkit-scrollbar {
    height: 5px;
  }

  .container::-webkit-scrollbar-thumb {
    height: 5px;
    background-color: var(----active-file-bg-color, gray);
    visibility: hidden;
  }
</style>
