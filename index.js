var request = require('request'),
    minimist = require('minimist'),
    path = require('path'),
    fs = require('fs'),
    xboxapi = require('./xboxapi');


var args = minimist(process.argv.slice(2));

var authKey = null;

var directory = path.join(process.cwd(), "xboxclips");
if (args.d !== undefined) {
    directory = args.d;
}

if( args.k !== undefined ) {
    authKey = args.k;
}

if( authKey === null ) {
    console.error("please provide xboxapi key: -k [auth key] (get one at https://xboxapi.com/)");
    process.exit(1);
}


console.log("download directory is " + directory);

function createDownloadDir(dir, done) {
    fs.stat(dir, function (err, stats) {
        if (err) {
            /* directory does not exist */
            fs.mkdir(dir, function (err) {
                if (err) {
                    console.log("cannot create destination directory");
                } else {
                    done && done(dir);
                }
            });

        } else if (!stats.isDirectory()) {

            console.log(dir + " is not a directory");
            process.exit(1);
        } else {
            done && done(dir);
        }
    });
}


var api = null;
var running_downloads = 0;
var download_objects = {};


var progressItv = null;

function progressBars() {
    if( progressItv === null ) {
        progressItv = setInterval(showProgressBars,1000);
    }
}

function showProgressBars() {
    var i;
    process.stdout.write('\u001B[2J\u001B[0;0f');
    process.stdout.write("============ Downloading ============ \n");

    var M = 10;
    var dd = Object.keys(download_objects);
    var mxl = 0;
    dd.forEach(function(k){
        var o = download_objects[k].name;
        mxl = Math.max(o.length,mxl);
    });

    dd.forEach(function(k){
        var obj = download_objects[k];
        var str = obj.name;
        while(str.length < mxl) {
            str += " ";
        }
        str += " [";
        var D =  Math.floor(obj.progress/10);
        for( var i = 0 ; i < D ; i++ ) {
            str += "=";
        }
        while( i < 10 ) {
            str += " ";
            i++;
        }
        str += "] " + (obj.progress === undefined ? "queued" : obj.progress + "%");
        process.stdout.write(str+"\n");
    });

    if( dd.length == 0 ) {
        clearInterval(progressItv);
        progressItv = null;
    }
}

function downloadClips(dstdir,clips) {
    clips.forEach(function (clip) {
        if( inStore(clip.gameClipId) ) {
            return; /* skip */
        }

        var dst_name = clip.titleName + " " + clip.clipName,
            usename,
            i = -1,
            topath = null;
        do {
            i++;
            usename = dst_name + ( i > 0 ? "_" + i : "" );
            topath = path.join(dstdir, usename + ".mp4" );
        } while(fs.existsSync(topath));
        var writeStream = fs.createWriteStream(topath);
        if( writeStream == null ) {
            console.error("cannot create output file");
        } else {
            var failed = function() {
                writeStream.end();
                fs.unlinkSync(topath);
            };

            var download = clip.gameClipUris.some(function(element){
                if( element.uriType === "Download" ) {
                    var downloaded = 0;
                    var len = element.fileSize;
                    running_downloads++;
                    download_objects[clip.gameClipId] = {
                        name : usename
                    };
                    request.get(element.uri)
                        .on('end',function(){
                            delete download_objects[clip.gameClipId];
                            running_downloads--;
                            writeToStore(clip.gameClipId);
                            progressBars();
                        })
                        .on('data',function(data){
                            downloaded += data.length;
                            download_objects[clip.gameClipId].progress = Math.floor(downloaded/len * 100.0);
                            progressBars();
                        })
                        .on('error',function(err){
                            delete download_objects[clip.gameClipId];
                            running_downloads--;
                            progressBars();
                            failed();
                            console.error("download error " + err);
                        }).pipe(writeStream);
                    return true;
                } else{
                    return false;
                }
            });


            if( ! download  ) {
                console.error(usename + " does not have downloadable Uris");
                failed();
            }

        }

    });
}

function fetchVideos( done) {
    if (!api) {
        api = new xboxapi(authKey, {
            proxy: "http://web-proxy.boi.hp.com:8088"
        });
    }

    var perform_fetch = function (error, uid) {
        console.log("fetching clips...");
        if (error) {
            console.error(error);
        } else {
            api.getGameClips(uid,function (error, clips) {
                if (error) {
                    console.error(error);
                } else {
                    done && done(clips);
                }
            });
        }
    };
    if (api.myxuid == null) {
        console.log("finding xbox user id...");
        api.getXuid(perform_fetch);
    } else {
        perform_fetch(null, api.myxuid);
    }
}

var downloaded = [];
var store_name = "store.json";

function readDownloaded(cb) {
    fs.readFile(path.join(directory,store_name),function(err,data){
        if( err ) {
            cb && cb(null);
        } else {
            cb && cb(data ? JSON.parse(data) : null );
        }
    });
}

function writeToStore(id) {
    downloaded.push(id);
    fs.writeFile(path.join(directory,store_name),JSON.stringify(downloaded),{ flag : "w"},function(err){
        if( err ) {
            console.error(err);
        }
    });
}

function inStore(id) {
    return downloaded.indexOf(id) >= 0;
}


createDownloadDir(directory, function (dir) {
    readDownloaded(function(data){
        if( data ) {
            downloaded = data;
        }
        fetchVideos( function (clips) {
            downloadClips(dir,clips);
        });
    });
});







