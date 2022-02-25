<script>
  import { createEventDispatcher } from "svelte";

  export let path = "";
  export let active = false;
  export let preview = false;
  export let single = false;
  let name = path.match(/.*[/\\](.*)/)?.[1] ?? path;

  const dispatch = createEventDispatcher();

  function openFile() {
    dispatch("openfile", { path });
  }

  function closeTab() {
    dispatch("closefile", { path });
  }
</script>

<div class="container" on:mousedown={openFile} class:active class:preview>
  <div class="active-indicator" style="display: {active ? 'block' : 'none'};" />
  <span class="name">{name}</span>
  <span
    on:click|stopPropagation={closeTab}
    on:mousedown|stopPropagation
    style="visibility: {active ? 'visible' : 'hidden'};"
    class="close-button"
    class:single
  >
    <div class="close-icon" />
  </span>
</div>

<style>
  .container {
    background-color: var(--side-bar-bg-color, gray);
    height: 100%;
    min-width: 100px;

    position: relative;

    padding: 0 15px;
    padding-right: 10px;

    border-bottom: solid 1px rgba(0, 0, 0, 0.07);

    display: flex;
    align-items: center;
    justify-content: space-between;

    user-select: none;

    flex-shrink: 0;

    cursor: pointer;
  }

  .name {
    max-width: 350px;
    padding-right: 15px;
    font-size: 14px;

    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    pointer-events: none;
  }

  .close-button {
    padding: 4px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 5px;
  }

  .container:hover > .close-button {
    visibility: visible !important;
  }

  .close-icon {
    position: relative;
    width: 11px;
    height: 11px;

    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .close-icon::before,
  .close-icon::after {
    content: "";
    position: absolute;
    width: 100%;
    height: 2px;
    background-color: var(--active-file-border-color, black);
  }

  .close-icon::before {
    transform: rotate(45deg);
  }

  .close-icon::after {
    transform: rotate(-45deg);
  }

  .close-button:hover {
    background-color: var(--active-file-bg-color, lightgray);
  }

  .active {
    border: solid 1px rgba(0, 0, 0, 0.07);
    border-bottom: none;
    background-color: var(--bg-color, white);
  }

  .active-indicator {
    position: absolute;
    top: -1px;
    left: -1px;
    width: calc(100% + 2px);
    height: 3px;

    background-color: var(--active-file-border-color, black);
  }

  .preview {
    font-style: italic !important;
  }

  .single {
    visibility: hidden;
    opacity: 0;
  }
</style>
