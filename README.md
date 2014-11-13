Xboxclipdownload
================

This little tool uses xboxapi.com to download all your xbox account's videos (unsaved videos on xbox live are not processed for smooth streaming, which makes for a dreadful experience when you just want to watch again that funny moment in your gaming).


setup
-----

You need to get an xboxapi api key to use this tool and pass it as a -k parameter upon starting. Visit https://xboxapi.com/ and create a free account for 120 api requests hourly on your key, more than enough for personal use.


usage
-----
just run

    nodejs index.js -k api_key [-d download_directory]
    
if you do not specify a download directory, it'll try to use _cwd/xboxclips_. 

The tool creates a _store.json_ file inside the download directory to keep track of which videos it has already downloaded (unique ID's are stored). So you can crontab it and it'll just download new clips whenever it runs. 

