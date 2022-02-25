import App from "./App.svelte";

const target = document.createElement("div");
target.setAttribute("id", "svelte-target");

document
  .getElementById("write-style")
  .parentElement.insertBefore(target, document.getElementById("write-style"));

const app = new App({
  target: target,
});

export default app;
