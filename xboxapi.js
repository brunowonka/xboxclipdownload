

var request = require('request');


var baseUrl = "https://xboxapi.com/v2";

function XboxApi(apikey,options) {
    this.apiKey = apikey;
    this.myxuid = null;
    this.proxy = options.proxy;
    this.remainingCalls = null;
}


function makeRequestOptions(api,path) {
    var r = {
        url : baseUrl + path,
        headers: {
            "X-AUTH" : api.apiKey

        }
    };
    if( api.proxy ) {
        r.proxy = api.proxy;
    }
    return r;
}



XboxApi.prototype.updateCalls = function(response) {
    this.remainingCalls = parseInt(response.headers['x-ratelimit-remaining']);
    console.log(this.remainingCalls + " calls remaining");
};

XboxApi.prototype.getXuid = function(callback) {
    request(makeRequestOptions(this,"/accountXuid"),function(error,response,body) {
        if( error ) {
            callback && callback(error);
        } else {
            this.updateCalls(response);
            body = JSON.parse(body);
            if( body ) {
                this.myxuid = body.xuid;
                callback && callback(null,this.myxuid);
            } else {
              callback && callback("unable to parse body");
            }
        }
    }.bind(this));
};


XboxApi.prototype.getGameClips = function(uid,callback) {
    request(makeRequestOptions(this,"/"+uid+"/game-clips"),function(error,response,body) {
        if( error ) {
            callback && callback(error);
        } else {
            this.updateCalls(response);
            body = JSON.parse(body);
            if( body ) {
                callback && callback(null,body);
            } else {
                callback && callback("unable to parse body");
            }
        }
    }.bind(this));
};



module.exports = XboxApi;


