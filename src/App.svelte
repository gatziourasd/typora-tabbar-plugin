<script>
  import TabBar from "./lib/TabBar.svelte";
  console.log("Tabs Plugin Running!");
</script>

<div class="container">
  <div class="tab-bar-container"><TabBar /></div>
</div>

<style>
  .container {
    position: relative;
    width: 100%;
    height: 40px;
  }

  .tab-bar-container {
    position: fixed;
    top: 0;
    width: 100%;
    height: 40px;
    z-index: 1;
  }
</style>
