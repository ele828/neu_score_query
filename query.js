var dv = require('dv');
var http = require("http");
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var querystring = require("querystring");
var Promise = require("bluebird");

module.exports = function(id, pw) {
    var defer = Promise.defer();
    function init() {
        getVerifyCode(id, pw)
            .then(login)
            .then(fetchScore)
            .then(HTMLParser)
            .then(function(json) {
                defer.resolve(json);
            })
            .catch(function(err) {
                if(err === 'CODE-ERROR') {
                    init();
                } else if(err === 'LOGIN-ERROR') {
                    init();
                } else if(err === 'PW-ERROR') {
                    defer.reject(JSON.stringify('password_error'));
                }
            });
    }
    init();
    return defer.promise;
}

var contents = querystring.stringify({  
    YearTermNO: 15
});

var getVerifyCode = function(id ,pw) {
    return new Promise(function(resolve, reject) {
        var cookie = '';
        var options = {
            host:"202.118.31.197",  
            path:"/ACTIONVALIDATERANDOMPICTURE.APPPROCESS",  
            method:"get",
            headers:{  
                "Content-Length":contents.length,          
                "Cookie": cookie
            }
        };

        var req = http.request(options,function(res){
            var chunks = [];
            cookie = res.headers["set-cookie"][0];
            res.on("data",function(chunk){
                chunks.push(chunk);
            });
            res.on('end', function() {
                var imgBuff = Buffer.concat(chunks);
                // 解析验证码
                var image = new dv.Image('jpg', imgBuff);
                var tesseract = new dv.Tesseract('eng', image);
                var verifyCode = tesseract.findText('plain').trim();
                var len = verifyCode.length;
                if(len !== 4) {
                    reject('CODE-ERROR');
                } else {
                    var obj = {
                               id: id,
                               pw: pw,
                               cookie: cookie,
                               verifyCode: verifyCode
                           };
                    resolve(obj);
                }
            });
        });

        req.write(contents);
        req.end();

    });
}

var login = function(obj) {
    return new Promise(function(resolve, reject) {
        cookie = obj.cookie;
        verifyCode = obj.verifyCode;

        var loginInfo = querystring.stringify({
            'WebUserNO': obj.id,
            'Password': obj.pw,
            'Agnomen': verifyCode
        });
        var options = {
            host:"202.118.31.197",  
            path:"/ACTIONLOGON.APPPROCESS?mode=",  
            method:"post",
            headers:{  
                "Content-Type":"application/x-www-form-urlencoded; charset=UTF-8",  
                "Content-Length":loginInfo.length,         
                "Cookie": cookie,
                "Accept-Language":"zh-CN,zh;q=0.8,en;q=0.6,fr;q=0.4,zh-TW;q=0.2,ja;q=0.2",  
                "Cache-Control":"no-cache",  
                "Connection":"Keep-Alive",
                "Host":"202.118.31.197",  
                "Referer":"http://202.118.31.197/index.jsp",  
                "User-Agent":"Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_2_1 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8C148 Safari/6533.18.5"  
            } 
        }

        var req = http.request(options, function(res) {
            var chunk = [];
            res.on('data', function(chunks) {
                chunk.push(chunks);
            });
            res.on('end', function() {
                var decodedBody = iconv.decode(Buffer.concat(chunk), 'gbk');
                if(decodedBody.indexOf('script') > 0) {
                    // getCode();
                    // return;
                    if(decodedBody.indexOf('您的密码不正确')>0) {
                        reject('PW-ERROR');
                    } else {
                        reject('LOGIN-ERROR');
                    }
                } else {
                    resolve(cookie);
                }
            });
        });
        req.write(loginInfo);
        req.end();
    });
}

var fetchScore = function(cookie) {
    return new Promise(function(resolve, reject) {
        var ops = {
            host:"202.118.31.197",  
            path:"/ACTIONQUERYSTUDENTSCORE.APPPROCESS",  
            method:"get",
            headers:{  
                "Cookie": cookie 
            }
        }
        var req = http.request(ops, function(res) {
            var chunks = [];
            res.on('data', function(c) {
                chunks.push(c);
            });
            res.on('end', function() {
                var decodedBody = iconv.decode(Buffer.concat(chunks), 'gbk');
                resolve(decodedBody);
            });
        });
        req.write(contents);
        req.end();
    });
}

var HTMLParser = function(html) {
    return new Promise(function(resolve, reject) {
        $ = cheerio.load(html);
        var score = $('.color-rowNext');
        var ascore = $('.color-row');
        var ret = [];
        for (var i=0; i < score.length; i++) {
            var course = '';
            var mark = '';
            if(! (score[i]['children'][16]['children'] instanceof Array)) break;
            course = score[i]['children'][5]['children'][0]['data'].trim();
            mark = score[i]['children'][16]['children'][0]['data'].trim();
            ret.push({
                course: course,
                score: mark
            });
        }
        for (var i=0; i < ascore.length; i++) {
            var course = '';
            var mark = '';
            if(! (ascore[i]['children'][16]['children'] instanceof Array)) break;
            //console.log(score[i]['children'][5]['children'][0]['data']);
            course = ascore[i]['children'][5]['children'][0]['data'].trim();
            mark = ascore[i]['children'][16]['children'][0]['data'];
            ret.push({
                course: course,
                score: mark
            });
        }
        resolve(JSON.stringify(ret));
    });
}