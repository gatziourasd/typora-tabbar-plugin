# Typora TabBar Plugin

https://user-images.githubusercontent.com/41538138/157715474-1b9433e3-dd62-4407-acfc-46c3319217d3.mp4


Behavior is mainly the same as VSCode

- Click once to open file in preview mode
- Double click to open file in tab
- Click "x" to close the tab
- Drag to move the tab
- Scroll to to reveal all tabs


## Installation

Download [tabbar-plugin.zip](https://github.com/gatziourasd/releases) under Releases.

### Windows

#### Save Plugin

1. Navigate to  ``%userprofile%/AppData/Roaming/Typora/``.
2. Create a folder ``plugins``.

3. Extract  the ``tabbar-plugin.zip`` contents to ``%userprofile%/AppData/Roaming/Typora/plugins/``.

You should now have a folder structure that looks like this: ``%userprofile%/AppData/Roaming/Typora/plugins/tabbar/``.



#### Add Plugin to Typora

1. Locate your Typora installation (Typically: ``C:/Program Files/Typora`` ).
2. Open a text editor with \<right click> **Run as administrator** and open the file ``C:/Program Files/Typora/resources/window.html`` . 
    (Don't forget to select ``All Files (\*.*)`` to see .html files)
3. 
    Insert the lines:

  ```html
  <script src="typora://userData/plugins/tabbar/bundle.js" defer></script>
  <link rel="stylesheet" href="typora://userData/plugins/tabbar/bundle.css">
  ```

  Exactly after ``<!DOCTYPE html><html lang="en"><head>``.

4. Save your changes to ``C:/Program Files/Typora/resources/window.html``.  **This may require Windows administrator privileges!**



Your ``window.html`` should now look something like this:

```html
<!doctype html><html lang="en"><head>
    <script src="typora://userData/plugins/tabbar/bundle.js" defer></script>
	<link rel="stylesheet" href="typora://userData/plugins/tabbar/bundle.css">
    <meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
    [...]
```



### Other Platforms

The plugin should work on any platform than can run Typora.

**Save Plugin**

Save the plugin to your Typora user folder or any other folder.

**Add Plugin to Typora**

Find the ``resources/window.html`` file in your Typora installation location and perform step 3. and 4. in [Add Plugin to Typora](#add-plugin-to-typora) (replace the src and href attributes with a path to your plugin location).



## Uninstallation

Simply reinstall Typora or remove the added lines ( [Add Plugin to Typora](#add-plugin-to-typora) ) from `<your_installation_path>/Typora/resources/window.html`

