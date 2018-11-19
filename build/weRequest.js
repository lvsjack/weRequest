module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/weRequest.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/lib/flow.js":
/*!*************************!*\
  !*** ./src/lib/flow.js ***!
  \*************************/
/*! no static exports found */
/***/ (function(module, exports) {

var store = {};

function emit (key,data){
    var flow = getFlow(key);
    flow.result = data || true;
    flow.waitingList.forEach(function(callback){
        callback(data);
    });
    flow.waitingList.length = 0 ;
}

function wait (key,callback){
    var flow = getFlow(key);
    if(flow.result){
        callback(flow.result)
    }else{
        flow.waitingList.push(callback)
    }
}

function getFlow(key){
    if(!store[key]){
        store[key] = {
            waitingList:[],
            result:null
        }
    }

    return store[key];
}

module.exports = {
    wait: wait,
    emit: emit
}

/***/ }),

/***/ "./src/loading.js":
/*!************************!*\
  !*** ./src/loading.js ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

function show(txt) {
    wx.showToast({
        title: typeof txt === 'boolean' ? '加载中' : txt,
        icon: 'loading',
        mask: true,
        duration: 60000
    })
}

function hide() {
    wx.hideToast();
}

module.exports = {
    show: show,
    hide: hide
}

/***/ }),

/***/ "./src/weRequest.js":
/*!**************************!*\
  !*** ./src/weRequest.js ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

const loading = __webpack_require__(/*! ./loading */ "./src/loading.js");
const flow = __webpack_require__(/*! ./lib/flow */ "./src/lib/flow.js");

//params
var sessionName    = "session";
var loginTrigger   = function () {
    return false
};
var getSession     = function (res) {
    return res.session_id
};
var codeName       = "code";
var successTrigger = function () {
    return true
};
var urlPerfix      = "";
var successData    = function (res) {
    return res
};
var errorTitle     = "操作失败";
var errorContent   = function (res) {
    return res
};
var reLoginLimit   = 3;
var errorCallback  = null;
var reportCGI      = false;
var mockJson       = false;
var globalData     = false;
// session在本地缓存的有效时间
var sessionExpireTime = null;
// session在本地缓存的key
var sessionExpireKey = "sessionExpireKey";
// session过期的时间点
var sessionExpire = Infinity;

//global data
var session           = '';
var sessionIsFresh    = false;
// 正在登录中，其他请求轮询稍后，避免重复调用登录接口
var logining          = false;
// 正在查询session有效期中，避免重复调用接口
var isCheckingSession = false;

function checkSession(callback, obj) {
    if (isCheckingSession) {
        flow.wait('checkSessionFinished', function () {
            checkSession(callback, obj)
        })
    } else if (!sessionIsFresh && session) {
        isCheckingSession = true;
        obj.count++;
        // 如果还没检验过session是否有效，则需要检验一次
        obj._checkSessionStartTime = new Date().getTime();
        wx.checkSession({
            success: function () {
                // 登录态有效，且在本生命周期内无须再检验了
                sessionIsFresh = true;
            },
            fail: function () {
                // 登录态过期
                session = '';
            },
            complete: function () {
                isCheckingSession = false;
                obj.count--;
                obj._checkSessionEndTime = new Date().getTime();
                if (typeof reportCGI === "function") {
                    reportCGI('wx_checkSession', obj._checkSessionStartTime, obj._checkSessionEndTime, request);
                }
                doLogin(callback, obj);
                flow.emit('checkSessionFinished');
            }
        })
    } else {
        // 已经检验过了
        doLogin(callback, obj);
    }
}

function doLogin(callback, obj) {
    if (session) {
        // 缓存中有session
        if(sessionExpireTime && new Date().getTime() > sessionExpire) {
            // 如果有设置本地session缓存时间，且缓存时间已到
            session = '';
            doLogin(callback, obj);
        } else {
            typeof callback === "function" && callback();
        }
    } else if (logining) {
        // 正在登录中，请求轮询稍后，避免重复调用登录接口
        flow.wait('doLoginFinished', function () {
            doLogin(callback, obj);
        })
    } else {
        // 缓存中无session
        logining = true;
        obj.count++;
        // 记录调用wx.login前的时间戳
        obj._loginStartTime = new Date().getTime();
        wx.login({
            complete: function () {
                obj.count--;
                // 记录wx.login返回数据后的时间戳，用于上报
                obj._loginEndTime = new Date().getTime();
                if (typeof reportCGI === "function") {
                    reportCGI('wx_login', obj._loginStartTime, obj._loginEndTime, request);
                }
                typeof obj.complete === "function" && obj.count == 0 && obj.complete();
            },
            success: function (res) {
                if (res.code) {
                    obj[codeName] = res.code;
                    delete obj[sessionName];
                    typeof callback === "function" && callback();
                } else {
                    fail(obj, res);
                    console.error(res);
                    // 登录失败，解除锁，防止死锁
                    logining = false;
                    flow.emit('doLoginFinished');
                }
            },
            fail: function (res) {
                fail(obj, res);
                console.error(res);
                // 登录失败，解除锁，防止死锁
                logining = false;
                flow.emit('doLoginFinished');
            }
        })
    }
}

function preDo(obj) {
    typeof obj.beforeSend === "function" && obj.beforeSend();

    // 登录态失效，重复登录计数
    if (typeof obj.reLoginLimit === "undefined") {
        obj.reLoginLimit = 0;
    } else {
        obj.reLoginLimit++;
    }

    if (typeof obj.count === "undefined") {
        obj.count = 0;
    }

    if (obj.showLoading) {
        loading.show(obj.showLoading);
        obj.complete = (function (fn) {
            return function () {
                loading.hide();
                typeof fn === "function" && fn.apply(this, arguments);
            }
        })(obj.complete)
    }

    return obj;
}

function request(obj) {
    obj.count++;

    if (!obj.data) {
        obj.data = {};
    }

    if(session) {
        obj[sessionName] = session;
    }

    // 如果有全局参数，则添加
    var gd = {};
    if (typeof globalData === "function") {
        gd = globalData();
    } else if (typeof globalData === "object") {
        gd = globalData;
    }
    obj.data = Object.assign({}, gd, obj.data);

    obj.method = obj.method || 'GET';

    // 如果请求的URL中不是http开头的，则自动添加配置中的前缀
    var url = obj.url.startsWith('http') ? obj.url : ((typeof urlPerfix === "function" ? urlPerfix() : urlPerfix) + obj.url);
    // 拼接code
    if(obj[codeName]) {
        if (url.indexOf('?') >= 0) {
            url += '&' + codeName + '=' + obj[codeName];
        } else {
            url += '?' + codeName + '=' + obj[codeName];
        }
        obj.data[codeName] = obj[codeName];
    }
    // 拼接session
    if(obj[sessionName]) {
        if (url.indexOf('?') >= 0) {
            url += '&' + sessionName + '=' + obj[sessionName];
        } else {
            url += '?' + sessionName + '=' + obj[sessionName];
        }
        obj.data[sessionName] = session;
    }
    // 如果有全局参数，则在URL中添加
    for (var i in gd) {
        if (url.indexOf('?') >= 0) {
            url += '&' + i + '=' + gd[i];
        } else {
            url += '?' + i + '=' + gd[i];
        }
    }
    // 如果有上报字段配置，则记录请求发出前的时间戳
    if (obj.report) {
        obj._reportStartTime = new Date().getTime();
    }

    wx.request({
        url: url,
        data: obj.data,
        method: obj.method,
        header: obj.header || {},
        dataType: obj.dataType || 'json',
        success: function (res) {
            if (res.statusCode == 200) {

                // 如果有上报字段配置，则记录请求返回后的时间戳，并进行上报
                if (obj.report && typeof reportCGI === "function") {
                    obj._reportEndTime = new Date().getTime();
                    reportCGI(obj.report, obj._reportStartTime, obj._reportEndTime, request);
                }

                if (getSession(res.data) && getSession(res.data) != session) {
                    session = getSession(res.data);
                    sessionIsFresh = true;
                    // 如果有设置本地session过期时间
                    if(sessionExpireTime) {
                        sessionExpire = new Date().getTime() + sessionExpireTime;
                        wx.setStorage({
                            key: sessionExpireKey,
                            data: sessionExpire
                        })
                    }
                    wx.setStorage({
                        key: sessionName,
                        data: session
                    });
                    // 成功拿到登陆态，请求的等待队列可以释放
                    logining = false;
                    flow.emit('doLoginFinished');
                }

                if (loginTrigger(res.data) && obj.reLoginLimit < reLoginLimit) {
                    // 登录态失效，且重试次数不超过配置
                    session = '';
                    wx.removeStorage({
                        key: sessionName,
                        complete: function () {
                            doLogin(function () {
                                obj = preDo(obj);
                                request(obj);
                            }, obj)
                        }
                    })
                } else if (successTrigger(res.data) && typeof obj.success === "function") {
                    // 接口返回成功码
                    var realData = null;
                    try {
                        realData = successData(res.data);
                    } catch (e) {
                        console.error("Function successData occur error: " + e);
                    }
                    if(!obj.noCacheFlash) {
                        // 如果为了保证页面不闪烁，则不回调，只是缓存最新数据，待下次进入再用
                        obj.success(realData);
                    }
                    if (obj.cache === true || (typeof obj.cache === "function" && obj.cache(realData))) {
                        wx.setStorage({
                            key: obj.url,
                            data: realData
                        })
                    }
                } else {
                    // 接口返回失败码
                    fail(obj, res);
                }
            } else {
                fail(obj, res);
            }
        },
        fail: function (res) {
            fail(obj, res);
            console.error(res);
        },
        complete: function () {
            obj.count--;
            typeof obj.complete === "function" && obj.count == 0 && obj.complete();
        }
    })
}

function fail(obj, res) {
    if (typeof obj.fail === "function") {
        obj.fail(res);
    } else {
        var title = "";
        if (typeof errorTitle === "function") {
            try {
                title = errorTitle(res.data)
            } catch (e) {
            }
        } else if (typeof errorTitle === "string") {
            title = errorTitle;
        }

        var content = "";
        if (typeof errorContent === "function") {
            try {
                content = errorContent(res.data)
            } catch (e) {
            }
        } else if (typeof errorContent === "string") {
            content = errorContent;
        }

        wx.showModal({
            title: title,
            content: content || "网络或服务异常，请稍后重试",
            showCancel: false
        })
    }

    // 如果有配置统一错误回调函数，则执行它
    if (typeof errorCallback === "function") {
        errorCallback(obj, res);
    }

    console.error(res);
}

function getCache(obj, callback) {
    if (obj.cache) {
        wx.getStorage({
            key: obj.url,
            success: function (res) {
                typeof obj.beforeSend === "function" && obj.beforeSend();
                if (typeof obj.cache === "function" && obj.cache(res.data)) {
                    typeof obj.success === "function" && obj.success(res.data, {isCache: true});
                } else if (obj.cache == true) {
                    typeof obj.success === "function" && obj.success(res.data, {isCache: true});
                }
                typeof obj.complete === "function" && obj.complete();
                // 成功取出缓存，还要去请求拿最新的再存起来
                callback(obj);
            },
            fail: function() {
                // 找不到缓存，直接发起请求，且不再防止页面闪烁（本来就没缓存了，更不存在更新页面导致的闪烁）
                obj.noCacheFlash = false;
                callback(obj);
            }
        })
    } else {
        callback(obj);
    }
}

function login(callback) {
    checkSession(callback, {})
}

function init(params) {
    sessionName    = params.sessionName || 'session';
    loginTrigger   = params.loginTrigger || function () {
            return false
        };
    codeName       = params.codeName || "code";
    successTrigger = params.successTrigger || function () {
            return true
        };
    getSession     = params.getSession || function (res) {
            return res.session_id
        };
    urlPerfix      = params.urlPerfix || "";
    successData    = params.successData || function (res) {
            return res
        };
    errorTitle     = params.errorTitle || "操作失败";
    errorContent   = params.errorContent || false;
    reLoginLimit   = params.reLoginLimit || 3;
    errorCallback  = params.errorCallback || null;
    sessionIsFresh = params.doNotCheckSession || false;
    reportCGI      = params.reportCGI || false;
    mockJson       = params.mockJson || false;
    globalData     = params.globalData || false;
    sessionExpireTime = params.sessionExpireTime || null;
    sessionExpireKey = params.sessionExpireKey || "sessionExpireKey";

    try {
        session = wx.getStorageSync(sessionName) || '';
        sessionExpire = wx.getStorageSync(sessionExpireKey) || Infinity;
        // 如果有设置本地session过期时间，且验证已过期，则直接清空session
        if(new Date().getTime() > sessionExpire) {
            session = '';
        }
    } catch (e) {
    }
}

function requestWrapper(obj) {
    obj = preDo(obj);
    if (mockJson && mockJson[obj.url]) {
        // mock 模式
        mock(obj);
    } else {
        getCache(obj, function (obj) {
                checkSession(function () {
                    request(obj);
                }, obj)
            }
        )
    }
}

function setSession(s) {
    session        = s;
    sessionIsFresh = true;
}

function mock(obj) {
    var res = {
        data: mockJson[obj.url]
    };
    if (successTrigger(res.data) && typeof obj.success === "function") {
        // 接口返回成功码
        obj.success(successData(res.data));
    } else {
        // 接口返回失败码
        fail(obj, res);
    }
    if (typeof obj.complete === "function") {
        obj.complete();
    }
}

function _getSession() {
    return session;
}

function getConfig() {
    return {
        urlPerfix: urlPerfix,
        sessionExpireTime: sessionExpireTime,
        sessionExpireKey: sessionExpireKey,
        sessionExpire: sessionExpire
    }
}

module.exports = {
    init: init,
    request: requestWrapper,
    setSession: setSession,
    login: login,
    getSession: _getSession,
    getConfig: getConfig
};


/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly93ZVJlcXVlc3Qvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vd2VSZXF1ZXN0Ly4vc3JjL2xpYi9mbG93LmpzIiwid2VicGFjazovL3dlUmVxdWVzdC8uL3NyYy9sb2FkaW5nLmpzIiwid2VicGFjazovL3dlUmVxdWVzdC8uL3NyYy93ZVJlcXVlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLHlEQUFpRCxjQUFjO0FBQy9EOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG1DQUEyQiwwQkFBMEIsRUFBRTtBQUN2RCx5Q0FBaUMsZUFBZTtBQUNoRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQSw4REFBc0QsK0RBQStEOztBQUVySDtBQUNBOzs7QUFHQTtBQUNBOzs7Ozs7Ozs7Ozs7QUNuRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEM7Ozs7Ozs7Ozs7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsQzs7Ozs7Ozs7Ozs7QUNoQkE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVCxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1QsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNULEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLCtCQUErQjs7QUFFL0I7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGdDQUFnQztBQUNoQztBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5QkFBeUI7QUFDekI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQkFBcUI7QUFDckI7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNkJBQTZCO0FBQzdCO0FBQ0EscUJBQXFCO0FBQ3JCLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFCQUFxQjtBQUNyQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHlCQUF5QjtBQUN6QjtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0EsU0FBUztBQUNUO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQSxTQUFTO0FBQ1Q7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0ZBQWdGLGNBQWM7QUFDOUYsaUJBQWlCO0FBQ2pCLGdGQUFnRixjQUFjO0FBQzlGO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1QsS0FBSztBQUNMO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLDZCQUE2QjtBQUM3Qjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJ3ZVJlcXVlc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSkge1xuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuIFx0XHR9XG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHtcbiBcdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gXHRcdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuIFx0XHRcdFx0Z2V0OiBnZXR0ZXJcbiBcdFx0XHR9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yID0gZnVuY3Rpb24oZXhwb3J0cykge1xuIFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjtcblxuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKF9fd2VicGFja19yZXF1aXJlX18ucyA9IFwiLi9zcmMvd2VSZXF1ZXN0LmpzXCIpO1xuIiwidmFyIHN0b3JlID0ge307XHJcblxyXG5mdW5jdGlvbiBlbWl0IChrZXksZGF0YSl7XHJcbiAgICB2YXIgZmxvdyA9IGdldEZsb3coa2V5KTtcclxuICAgIGZsb3cucmVzdWx0ID0gZGF0YSB8fCB0cnVlO1xyXG4gICAgZmxvdy53YWl0aW5nTGlzdC5mb3JFYWNoKGZ1bmN0aW9uKGNhbGxiYWNrKXtcclxuICAgICAgICBjYWxsYmFjayhkYXRhKTtcclxuICAgIH0pO1xyXG4gICAgZmxvdy53YWl0aW5nTGlzdC5sZW5ndGggPSAwIDtcclxufVxyXG5cclxuZnVuY3Rpb24gd2FpdCAoa2V5LGNhbGxiYWNrKXtcclxuICAgIHZhciBmbG93ID0gZ2V0RmxvdyhrZXkpO1xyXG4gICAgaWYoZmxvdy5yZXN1bHQpe1xyXG4gICAgICAgIGNhbGxiYWNrKGZsb3cucmVzdWx0KVxyXG4gICAgfWVsc2V7XHJcbiAgICAgICAgZmxvdy53YWl0aW5nTGlzdC5wdXNoKGNhbGxiYWNrKVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRGbG93KGtleSl7XHJcbiAgICBpZighc3RvcmVba2V5XSl7XHJcbiAgICAgICAgc3RvcmVba2V5XSA9IHtcclxuICAgICAgICAgICAgd2FpdGluZ0xpc3Q6W10sXHJcbiAgICAgICAgICAgIHJlc3VsdDpudWxsXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzdG9yZVtrZXldO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIHdhaXQ6IHdhaXQsXHJcbiAgICBlbWl0OiBlbWl0XHJcbn0iLCJmdW5jdGlvbiBzaG93KHR4dCkge1xyXG4gICAgd3guc2hvd1RvYXN0KHtcclxuICAgICAgICB0aXRsZTogdHlwZW9mIHR4dCA9PT0gJ2Jvb2xlYW4nID8gJ+WKoOi9veS4rScgOiB0eHQsXHJcbiAgICAgICAgaWNvbjogJ2xvYWRpbmcnLFxyXG4gICAgICAgIG1hc2s6IHRydWUsXHJcbiAgICAgICAgZHVyYXRpb246IDYwMDAwXHJcbiAgICB9KVxyXG59XHJcblxyXG5mdW5jdGlvbiBoaWRlKCkge1xyXG4gICAgd3guaGlkZVRvYXN0KCk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgc2hvdzogc2hvdyxcclxuICAgIGhpZGU6IGhpZGVcclxufSIsImNvbnN0IGxvYWRpbmcgPSByZXF1aXJlKCcuL2xvYWRpbmcnKTtcclxuY29uc3QgZmxvdyA9IHJlcXVpcmUoJy4vbGliL2Zsb3cnKTtcclxuXHJcbi8vcGFyYW1zXHJcbnZhciBzZXNzaW9uTmFtZSAgICA9IFwic2Vzc2lvblwiO1xyXG52YXIgbG9naW5UcmlnZ2VyICAgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gZmFsc2VcclxufTtcclxudmFyIGdldFNlc3Npb24gICAgID0gZnVuY3Rpb24gKHJlcykge1xyXG4gICAgcmV0dXJuIHJlcy5zZXNzaW9uX2lkXHJcbn07XHJcbnZhciBjb2RlTmFtZSAgICAgICA9IFwiY29kZVwiO1xyXG52YXIgc3VjY2Vzc1RyaWdnZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdHJ1ZVxyXG59O1xyXG52YXIgdXJsUGVyZml4ICAgICAgPSBcIlwiO1xyXG52YXIgc3VjY2Vzc0RhdGEgICAgPSBmdW5jdGlvbiAocmVzKSB7XHJcbiAgICByZXR1cm4gcmVzXHJcbn07XHJcbnZhciBlcnJvclRpdGxlICAgICA9IFwi5pON5L2c5aSx6LSlXCI7XHJcbnZhciBlcnJvckNvbnRlbnQgICA9IGZ1bmN0aW9uIChyZXMpIHtcclxuICAgIHJldHVybiByZXNcclxufTtcclxudmFyIHJlTG9naW5MaW1pdCAgID0gMztcclxudmFyIGVycm9yQ2FsbGJhY2sgID0gbnVsbDtcclxudmFyIHJlcG9ydENHSSAgICAgID0gZmFsc2U7XHJcbnZhciBtb2NrSnNvbiAgICAgICA9IGZhbHNlO1xyXG52YXIgZ2xvYmFsRGF0YSAgICAgPSBmYWxzZTtcclxuLy8gc2Vzc2lvbuWcqOacrOWcsOe8k+WtmOeahOacieaViOaXtumXtFxyXG52YXIgc2Vzc2lvbkV4cGlyZVRpbWUgPSBudWxsO1xyXG4vLyBzZXNzaW9u5Zyo5pys5Zyw57yT5a2Y55qEa2V5XHJcbnZhciBzZXNzaW9uRXhwaXJlS2V5ID0gXCJzZXNzaW9uRXhwaXJlS2V5XCI7XHJcbi8vIHNlc3Npb27ov4fmnJ/nmoTml7bpl7TngrlcclxudmFyIHNlc3Npb25FeHBpcmUgPSBJbmZpbml0eTtcclxuXHJcbi8vZ2xvYmFsIGRhdGFcclxudmFyIHNlc3Npb24gICAgICAgICAgID0gJyc7XHJcbnZhciBzZXNzaW9uSXNGcmVzaCAgICA9IGZhbHNlO1xyXG4vLyDmraPlnKjnmbvlvZXkuK3vvIzlhbbku5bor7fmsYLova7or6LnqI3lkI7vvIzpgb/lhY3ph43lpI3osIPnlKjnmbvlvZXmjqXlj6NcclxudmFyIGxvZ2luaW5nICAgICAgICAgID0gZmFsc2U7XHJcbi8vIOato+WcqOafpeivonNlc3Npb27mnInmlYjmnJ/kuK3vvIzpgb/lhY3ph43lpI3osIPnlKjmjqXlj6NcclxudmFyIGlzQ2hlY2tpbmdTZXNzaW9uID0gZmFsc2U7XHJcblxyXG5mdW5jdGlvbiBjaGVja1Nlc3Npb24oY2FsbGJhY2ssIG9iaikge1xyXG4gICAgaWYgKGlzQ2hlY2tpbmdTZXNzaW9uKSB7XHJcbiAgICAgICAgZmxvdy53YWl0KCdjaGVja1Nlc3Npb25GaW5pc2hlZCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgY2hlY2tTZXNzaW9uKGNhbGxiYWNrLCBvYmopXHJcbiAgICAgICAgfSlcclxuICAgIH0gZWxzZSBpZiAoIXNlc3Npb25Jc0ZyZXNoICYmIHNlc3Npb24pIHtcclxuICAgICAgICBpc0NoZWNraW5nU2Vzc2lvbiA9IHRydWU7XHJcbiAgICAgICAgb2JqLmNvdW50Kys7XHJcbiAgICAgICAgLy8g5aaC5p6c6L+Y5rKh5qOA6aqM6L+Hc2Vzc2lvbuaYr+WQpuacieaViO+8jOWImemcgOimgeajgOmqjOS4gOasoVxyXG4gICAgICAgIG9iai5fY2hlY2tTZXNzaW9uU3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgd3guY2hlY2tTZXNzaW9uKHtcclxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgLy8g55m75b2V5oCB5pyJ5pWI77yM5LiU5Zyo5pys55Sf5ZG95ZGo5pyf5YaF5peg6aG75YaN5qOA6aqM5LqGXHJcbiAgICAgICAgICAgICAgICBzZXNzaW9uSXNGcmVzaCA9IHRydWU7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGZhaWw6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIC8vIOeZu+W9leaAgei/h+acn1xyXG4gICAgICAgICAgICAgICAgc2Vzc2lvbiA9ICcnO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgaXNDaGVja2luZ1Nlc3Npb24gPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIG9iai5jb3VudC0tO1xyXG4gICAgICAgICAgICAgICAgb2JqLl9jaGVja1Nlc3Npb25FbmRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHJlcG9ydENHSSA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVwb3J0Q0dJKCd3eF9jaGVja1Nlc3Npb24nLCBvYmouX2NoZWNrU2Vzc2lvblN0YXJ0VGltZSwgb2JqLl9jaGVja1Nlc3Npb25FbmRUaW1lLCByZXF1ZXN0KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGRvTG9naW4oY2FsbGJhY2ssIG9iaik7XHJcbiAgICAgICAgICAgICAgICBmbG93LmVtaXQoJ2NoZWNrU2Vzc2lvbkZpbmlzaGVkJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICAvLyDlt7Lnu4/mo4Dpqozov4fkuoZcclxuICAgICAgICBkb0xvZ2luKGNhbGxiYWNrLCBvYmopO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkb0xvZ2luKGNhbGxiYWNrLCBvYmopIHtcclxuICAgIGlmIChzZXNzaW9uKSB7XHJcbiAgICAgICAgLy8g57yT5a2Y5Lit5pyJc2Vzc2lvblxyXG4gICAgICAgIGlmKHNlc3Npb25FeHBpcmVUaW1lICYmIG5ldyBEYXRlKCkuZ2V0VGltZSgpID4gc2Vzc2lvbkV4cGlyZSkge1xyXG4gICAgICAgICAgICAvLyDlpoLmnpzmnInorr7nva7mnKzlnLBzZXNzaW9u57yT5a2Y5pe26Ze077yM5LiU57yT5a2Y5pe26Ze05bey5YiwXHJcbiAgICAgICAgICAgIHNlc3Npb24gPSAnJztcclxuICAgICAgICAgICAgZG9Mb2dpbihjYWxsYmFjaywgb2JqKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0eXBlb2YgY2FsbGJhY2sgPT09IFwiZnVuY3Rpb25cIiAmJiBjYWxsYmFjaygpO1xyXG4gICAgICAgIH1cclxuICAgIH0gZWxzZSBpZiAobG9naW5pbmcpIHtcclxuICAgICAgICAvLyDmraPlnKjnmbvlvZXkuK3vvIzor7fmsYLova7or6LnqI3lkI7vvIzpgb/lhY3ph43lpI3osIPnlKjnmbvlvZXmjqXlj6NcclxuICAgICAgICBmbG93LndhaXQoJ2RvTG9naW5GaW5pc2hlZCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgZG9Mb2dpbihjYWxsYmFjaywgb2JqKTtcclxuICAgICAgICB9KVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICAvLyDnvJPlrZjkuK3ml6BzZXNzaW9uXHJcbiAgICAgICAgbG9naW5pbmcgPSB0cnVlO1xyXG4gICAgICAgIG9iai5jb3VudCsrO1xyXG4gICAgICAgIC8vIOiusOW9leiwg+eUqHd4LmxvZ2lu5YmN55qE5pe26Ze05oizXHJcbiAgICAgICAgb2JqLl9sb2dpblN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgICAgIHd4LmxvZ2luKHtcclxuICAgICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIG9iai5jb3VudC0tO1xyXG4gICAgICAgICAgICAgICAgLy8g6K6w5b2Vd3gubG9naW7ov5Tlm57mlbDmja7lkI7nmoTml7bpl7TmiLPvvIznlKjkuo7kuIrmiqVcclxuICAgICAgICAgICAgICAgIG9iai5fbG9naW5FbmRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHJlcG9ydENHSSA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVwb3J0Q0dJKCd3eF9sb2dpbicsIG9iai5fbG9naW5TdGFydFRpbWUsIG9iai5fbG9naW5FbmRUaW1lLCByZXF1ZXN0KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHR5cGVvZiBvYmouY29tcGxldGUgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY291bnQgPT0gMCAmJiBvYmouY29tcGxldGUoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKHJlcykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlcy5jb2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb2JqW2NvZGVOYW1lXSA9IHJlcy5jb2RlO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBvYmpbc2Vzc2lvbk5hbWVdO1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGVvZiBjYWxsYmFjayA9PT0gXCJmdW5jdGlvblwiICYmIGNhbGxiYWNrKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGZhaWwob2JqLCByZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IocmVzKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyDnmbvlvZXlpLHotKXvvIzop6PpmaTplIHvvIzpmLLmraLmrbvplIFcclxuICAgICAgICAgICAgICAgICAgICBsb2dpbmluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIGZsb3cuZW1pdCgnZG9Mb2dpbkZpbmlzaGVkJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGZhaWw6IGZ1bmN0aW9uIChyZXMpIHtcclxuICAgICAgICAgICAgICAgIGZhaWwob2JqLCByZXMpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihyZXMpO1xyXG4gICAgICAgICAgICAgICAgLy8g55m75b2V5aSx6LSl77yM6Kej6Zmk6ZSB77yM6Ziy5q2i5q276ZSBXHJcbiAgICAgICAgICAgICAgICBsb2dpbmluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgZmxvdy5lbWl0KCdkb0xvZ2luRmluaXNoZWQnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByZURvKG9iaikge1xyXG4gICAgdHlwZW9mIG9iai5iZWZvcmVTZW5kID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmJlZm9yZVNlbmQoKTtcclxuXHJcbiAgICAvLyDnmbvlvZXmgIHlpLHmlYjvvIzph43lpI3nmbvlvZXorqHmlbBcclxuICAgIGlmICh0eXBlb2Ygb2JqLnJlTG9naW5MaW1pdCA9PT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgICAgIG9iai5yZUxvZ2luTGltaXQgPSAwO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBvYmoucmVMb2dpbkxpbWl0Kys7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHR5cGVvZiBvYmouY291bnQgPT09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgICAgICBvYmouY291bnQgPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChvYmouc2hvd0xvYWRpbmcpIHtcclxuICAgICAgICBsb2FkaW5nLnNob3cob2JqLnNob3dMb2FkaW5nKTtcclxuICAgICAgICBvYmouY29tcGxldGUgPSAoZnVuY3Rpb24gKGZuKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBsb2FkaW5nLmhpZGUoKTtcclxuICAgICAgICAgICAgICAgIHR5cGVvZiBmbiA9PT0gXCJmdW5jdGlvblwiICYmIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KShvYmouY29tcGxldGUpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG9iajtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVxdWVzdChvYmopIHtcclxuICAgIG9iai5jb3VudCsrO1xyXG5cclxuICAgIGlmICghb2JqLmRhdGEpIHtcclxuICAgICAgICBvYmouZGF0YSA9IHt9O1xyXG4gICAgfVxyXG5cclxuICAgIGlmKHNlc3Npb24pIHtcclxuICAgICAgICBvYmpbc2Vzc2lvbk5hbWVdID0gc2Vzc2lvbjtcclxuICAgIH1cclxuXHJcbiAgICAvLyDlpoLmnpzmnInlhajlsYDlj4LmlbDvvIzliJnmt7vliqBcclxuICAgIHZhciBnZCA9IHt9O1xyXG4gICAgaWYgKHR5cGVvZiBnbG9iYWxEYXRhID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICBnZCA9IGdsb2JhbERhdGEoKTtcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGdsb2JhbERhdGEgPT09IFwib2JqZWN0XCIpIHtcclxuICAgICAgICBnZCA9IGdsb2JhbERhdGE7XHJcbiAgICB9XHJcbiAgICBvYmouZGF0YSA9IE9iamVjdC5hc3NpZ24oe30sIGdkLCBvYmouZGF0YSk7XHJcblxyXG4gICAgb2JqLm1ldGhvZCA9IG9iai5tZXRob2QgfHwgJ0dFVCc7XHJcblxyXG4gICAgLy8g5aaC5p6c6K+35rGC55qEVVJM5Lit5LiN5pivaHR0cOW8gOWktOeahO+8jOWImeiHquWKqOa3u+WKoOmFjee9ruS4reeahOWJjee8gFxyXG4gICAgdmFyIHVybCA9IG9iai51cmwuc3RhcnRzV2l0aCgnaHR0cCcpID8gb2JqLnVybCA6ICgodHlwZW9mIHVybFBlcmZpeCA9PT0gXCJmdW5jdGlvblwiID8gdXJsUGVyZml4KCkgOiB1cmxQZXJmaXgpICsgb2JqLnVybCk7XHJcbiAgICAvLyDmi7zmjqVjb2RlXHJcbiAgICBpZihvYmpbY29kZU5hbWVdKSB7XHJcbiAgICAgICAgaWYgKHVybC5pbmRleE9mKCc/JykgPj0gMCkge1xyXG4gICAgICAgICAgICB1cmwgKz0gJyYnICsgY29kZU5hbWUgKyAnPScgKyBvYmpbY29kZU5hbWVdO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHVybCArPSAnPycgKyBjb2RlTmFtZSArICc9JyArIG9ialtjb2RlTmFtZV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIG9iai5kYXRhW2NvZGVOYW1lXSA9IG9ialtjb2RlTmFtZV07XHJcbiAgICB9XHJcbiAgICAvLyDmi7zmjqVzZXNzaW9uXHJcbiAgICBpZihvYmpbc2Vzc2lvbk5hbWVdKSB7XHJcbiAgICAgICAgaWYgKHVybC5pbmRleE9mKCc/JykgPj0gMCkge1xyXG4gICAgICAgICAgICB1cmwgKz0gJyYnICsgc2Vzc2lvbk5hbWUgKyAnPScgKyBvYmpbc2Vzc2lvbk5hbWVdO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHVybCArPSAnPycgKyBzZXNzaW9uTmFtZSArICc9JyArIG9ialtzZXNzaW9uTmFtZV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIG9iai5kYXRhW3Nlc3Npb25OYW1lXSA9IHNlc3Npb247XHJcbiAgICB9XHJcbiAgICAvLyDlpoLmnpzmnInlhajlsYDlj4LmlbDvvIzliJnlnKhVUkzkuK3mt7vliqBcclxuICAgIGZvciAodmFyIGkgaW4gZ2QpIHtcclxuICAgICAgICBpZiAodXJsLmluZGV4T2YoJz8nKSA+PSAwKSB7XHJcbiAgICAgICAgICAgIHVybCArPSAnJicgKyBpICsgJz0nICsgZ2RbaV07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdXJsICs9ICc/JyArIGkgKyAnPScgKyBnZFtpXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyDlpoLmnpzmnInkuIrmiqXlrZfmrrXphY3nva7vvIzliJnorrDlvZXor7fmsYLlj5Hlh7rliY3nmoTml7bpl7TmiLNcclxuICAgIGlmIChvYmoucmVwb3J0KSB7XHJcbiAgICAgICAgb2JqLl9yZXBvcnRTdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgIH1cclxuXHJcbiAgICB3eC5yZXF1ZXN0KHtcclxuICAgICAgICB1cmw6IHVybCxcclxuICAgICAgICBkYXRhOiBvYmouZGF0YSxcclxuICAgICAgICBtZXRob2Q6IG9iai5tZXRob2QsXHJcbiAgICAgICAgaGVhZGVyOiBvYmouaGVhZGVyIHx8IHt9LFxyXG4gICAgICAgIGRhdGFUeXBlOiBvYmouZGF0YVR5cGUgfHwgJ2pzb24nLFxyXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChyZXMpIHtcclxuICAgICAgICAgICAgaWYgKHJlcy5zdGF0dXNDb2RlID09IDIwMCkge1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIOWmguaenOacieS4iuaKpeWtl+autemFjee9ru+8jOWImeiusOW9leivt+axgui/lOWbnuWQjueahOaXtumXtOaIs++8jOW5tui/m+ihjOS4iuaKpVxyXG4gICAgICAgICAgICAgICAgaWYgKG9iai5yZXBvcnQgJiYgdHlwZW9mIHJlcG9ydENHSSA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb2JqLl9yZXBvcnRFbmRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVwb3J0Q0dJKG9iai5yZXBvcnQsIG9iai5fcmVwb3J0U3RhcnRUaW1lLCBvYmouX3JlcG9ydEVuZFRpbWUsIHJlcXVlc3QpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChnZXRTZXNzaW9uKHJlcy5kYXRhKSAmJiBnZXRTZXNzaW9uKHJlcy5kYXRhKSAhPSBzZXNzaW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbiA9IGdldFNlc3Npb24ocmVzLmRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb25Jc0ZyZXNoID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzmnInorr7nva7mnKzlnLBzZXNzaW9u6L+H5pyf5pe26Ze0XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoc2Vzc2lvbkV4cGlyZVRpbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbkV4cGlyZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpICsgc2Vzc2lvbkV4cGlyZVRpbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHd4LnNldFN0b3JhZ2Uoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5OiBzZXNzaW9uRXhwaXJlS2V5LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogc2Vzc2lvbkV4cGlyZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB3eC5zZXRTdG9yYWdlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAga2V5OiBzZXNzaW9uTmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogc2Vzc2lvblxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOaIkOWKn+aLv+WIsOeZu+mZhuaAge+8jOivt+axgueahOetieW+hemYn+WIl+WPr+S7pemHiuaUvlxyXG4gICAgICAgICAgICAgICAgICAgIGxvZ2luaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgZmxvdy5lbWl0KCdkb0xvZ2luRmluaXNoZWQnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobG9naW5UcmlnZ2VyKHJlcy5kYXRhKSAmJiBvYmoucmVMb2dpbkxpbWl0IDwgcmVMb2dpbkxpbWl0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g55m75b2V5oCB5aSx5pWI77yM5LiU6YeN6K+V5qyh5pWw5LiN6LaF6L+H6YWN572uXHJcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbiA9ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIHd4LnJlbW92ZVN0b3JhZ2Uoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXk6IHNlc3Npb25OYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9Mb2dpbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqID0gcHJlRG8ob2JqKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0KG9iaik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBvYmopXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzdWNjZXNzVHJpZ2dlcihyZXMuZGF0YSkgJiYgdHlwZW9mIG9iai5zdWNjZXNzID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDmjqXlj6Pov5Tlm57miJDlip/noIFcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVhbERhdGEgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWxEYXRhID0gc3VjY2Vzc0RhdGEocmVzLmRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkZ1bmN0aW9uIHN1Y2Nlc3NEYXRhIG9jY3VyIGVycm9yOiBcIiArIGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZighb2JqLm5vQ2FjaGVGbGFzaCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzkuLrkuobkv53or4HpobXpnaLkuI3pl6rng4HvvIzliJnkuI3lm57osIPvvIzlj6rmmK/nvJPlrZjmnIDmlrDmlbDmja7vvIzlvoXkuIvmrKHov5vlhaXlho3nlKhcclxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqLnN1Y2Nlc3MocmVhbERhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob2JqLmNhY2hlID09PSB0cnVlIHx8ICh0eXBlb2Ygb2JqLmNhY2hlID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNhY2hlKHJlYWxEYXRhKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd3guc2V0U3RvcmFnZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk6IG9iai51cmwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiByZWFsRGF0YVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5o6l5Y+j6L+U5Zue5aSx6LSl56CBXHJcbiAgICAgICAgICAgICAgICAgICAgZmFpbChvYmosIHJlcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBmYWlsKG9iaiwgcmVzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZmFpbDogZnVuY3Rpb24gKHJlcykge1xyXG4gICAgICAgICAgICBmYWlsKG9iaiwgcmVzKTtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihyZXMpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgb2JqLmNvdW50LS07XHJcbiAgICAgICAgICAgIHR5cGVvZiBvYmouY29tcGxldGUgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY291bnQgPT0gMCAmJiBvYmouY29tcGxldGUoKTtcclxuICAgICAgICB9XHJcbiAgICB9KVxyXG59XHJcblxyXG5mdW5jdGlvbiBmYWlsKG9iaiwgcmVzKSB7XHJcbiAgICBpZiAodHlwZW9mIG9iai5mYWlsID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICBvYmouZmFpbChyZXMpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB2YXIgdGl0bGUgPSBcIlwiO1xyXG4gICAgICAgIGlmICh0eXBlb2YgZXJyb3JUaXRsZSA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB0aXRsZSA9IGVycm9yVGl0bGUocmVzLmRhdGEpXHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGVycm9yVGl0bGUgPT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgdGl0bGUgPSBlcnJvclRpdGxlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGNvbnRlbnQgPSBcIlwiO1xyXG4gICAgICAgIGlmICh0eXBlb2YgZXJyb3JDb250ZW50ID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBlcnJvckNvbnRlbnQocmVzLmRhdGEpXHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGVycm9yQ29udGVudCA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICBjb250ZW50ID0gZXJyb3JDb250ZW50O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgd3guc2hvd01vZGFsKHtcclxuICAgICAgICAgICAgdGl0bGU6IHRpdGxlLFxyXG4gICAgICAgICAgICBjb250ZW50OiBjb250ZW50IHx8IFwi572R57uc5oiW5pyN5Yqh5byC5bi477yM6K+356iN5ZCO6YeN6K+VXCIsXHJcbiAgICAgICAgICAgIHNob3dDYW5jZWw6IGZhbHNlXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICAvLyDlpoLmnpzmnInphY3nva7nu5/kuIDplJnor6/lm57osIPlh73mlbDvvIzliJnmiafooYzlroNcclxuICAgIGlmICh0eXBlb2YgZXJyb3JDYWxsYmFjayA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgZXJyb3JDYWxsYmFjayhvYmosIHJlcyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5lcnJvcihyZXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRDYWNoZShvYmosIGNhbGxiYWNrKSB7XHJcbiAgICBpZiAob2JqLmNhY2hlKSB7XHJcbiAgICAgICAgd3guZ2V0U3RvcmFnZSh7XHJcbiAgICAgICAgICAgIGtleTogb2JqLnVybCxcclxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKHJlcykge1xyXG4gICAgICAgICAgICAgICAgdHlwZW9mIG9iai5iZWZvcmVTZW5kID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmJlZm9yZVNlbmQoKTtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqLmNhY2hlID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNhY2hlKHJlcy5kYXRhKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGVvZiBvYmouc3VjY2VzcyA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5zdWNjZXNzKHJlcy5kYXRhLCB7aXNDYWNoZTogdHJ1ZX0pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvYmouY2FjaGUgPT0gdHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGVvZiBvYmouc3VjY2VzcyA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5zdWNjZXNzKHJlcy5kYXRhLCB7aXNDYWNoZTogdHJ1ZX0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdHlwZW9mIG9iai5jb21wbGV0ZSA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb21wbGV0ZSgpO1xyXG4gICAgICAgICAgICAgICAgLy8g5oiQ5Yqf5Y+W5Ye657yT5a2Y77yM6L+Y6KaB5Y676K+35rGC5ou/5pyA5paw55qE5YaN5a2Y6LW35p2lXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhvYmopO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBmYWlsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIC8vIOaJvuS4jeWIsOe8k+WtmO+8jOebtOaOpeWPkei1t+ivt+axgu+8jOS4lOS4jeWGjemYsuatoumhtemdoumXqueDge+8iOacrOadpeWwseayoee8k+WtmOS6hu+8jOabtOS4jeWtmOWcqOabtOaWsOmhtemdouWvvOiHtOeahOmXqueDge+8iVxyXG4gICAgICAgICAgICAgICAgb2JqLm5vQ2FjaGVGbGFzaCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sob2JqKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNhbGxiYWNrKG9iaik7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvZ2luKGNhbGxiYWNrKSB7XHJcbiAgICBjaGVja1Nlc3Npb24oY2FsbGJhY2ssIHt9KVxyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0KHBhcmFtcykge1xyXG4gICAgc2Vzc2lvbk5hbWUgICAgPSBwYXJhbXMuc2Vzc2lvbk5hbWUgfHwgJ3Nlc3Npb24nO1xyXG4gICAgbG9naW5UcmlnZ2VyICAgPSBwYXJhbXMubG9naW5UcmlnZ2VyIHx8IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfTtcclxuICAgIGNvZGVOYW1lICAgICAgID0gcGFyYW1zLmNvZGVOYW1lIHx8IFwiY29kZVwiO1xyXG4gICAgc3VjY2Vzc1RyaWdnZXIgPSBwYXJhbXMuc3VjY2Vzc1RyaWdnZXIgfHwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH07XHJcbiAgICBnZXRTZXNzaW9uICAgICA9IHBhcmFtcy5nZXRTZXNzaW9uIHx8IGZ1bmN0aW9uIChyZXMpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHJlcy5zZXNzaW9uX2lkXHJcbiAgICAgICAgfTtcclxuICAgIHVybFBlcmZpeCAgICAgID0gcGFyYW1zLnVybFBlcmZpeCB8fCBcIlwiO1xyXG4gICAgc3VjY2Vzc0RhdGEgICAgPSBwYXJhbXMuc3VjY2Vzc0RhdGEgfHwgZnVuY3Rpb24gKHJlcykge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzXHJcbiAgICAgICAgfTtcclxuICAgIGVycm9yVGl0bGUgICAgID0gcGFyYW1zLmVycm9yVGl0bGUgfHwgXCLmk43kvZzlpLHotKVcIjtcclxuICAgIGVycm9yQ29udGVudCAgID0gcGFyYW1zLmVycm9yQ29udGVudCB8fCBmYWxzZTtcclxuICAgIHJlTG9naW5MaW1pdCAgID0gcGFyYW1zLnJlTG9naW5MaW1pdCB8fCAzO1xyXG4gICAgZXJyb3JDYWxsYmFjayAgPSBwYXJhbXMuZXJyb3JDYWxsYmFjayB8fCBudWxsO1xyXG4gICAgc2Vzc2lvbklzRnJlc2ggPSBwYXJhbXMuZG9Ob3RDaGVja1Nlc3Npb24gfHwgZmFsc2U7XHJcbiAgICByZXBvcnRDR0kgICAgICA9IHBhcmFtcy5yZXBvcnRDR0kgfHwgZmFsc2U7XHJcbiAgICBtb2NrSnNvbiAgICAgICA9IHBhcmFtcy5tb2NrSnNvbiB8fCBmYWxzZTtcclxuICAgIGdsb2JhbERhdGEgICAgID0gcGFyYW1zLmdsb2JhbERhdGEgfHwgZmFsc2U7XHJcbiAgICBzZXNzaW9uRXhwaXJlVGltZSA9IHBhcmFtcy5zZXNzaW9uRXhwaXJlVGltZSB8fCBudWxsO1xyXG4gICAgc2Vzc2lvbkV4cGlyZUtleSA9IHBhcmFtcy5zZXNzaW9uRXhwaXJlS2V5IHx8IFwic2Vzc2lvbkV4cGlyZUtleVwiO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgICAgc2Vzc2lvbiA9IHd4LmdldFN0b3JhZ2VTeW5jKHNlc3Npb25OYW1lKSB8fCAnJztcclxuICAgICAgICBzZXNzaW9uRXhwaXJlID0gd3guZ2V0U3RvcmFnZVN5bmMoc2Vzc2lvbkV4cGlyZUtleSkgfHwgSW5maW5pdHk7XHJcbiAgICAgICAgLy8g5aaC5p6c5pyJ6K6+572u5pys5Zywc2Vzc2lvbui/h+acn+aXtumXtO+8jOS4lOmqjOivgeW3sui/h+acn++8jOWImeebtOaOpea4heepunNlc3Npb25cclxuICAgICAgICBpZihuZXcgRGF0ZSgpLmdldFRpbWUoKSA+IHNlc3Npb25FeHBpcmUpIHtcclxuICAgICAgICAgICAgc2Vzc2lvbiA9ICcnO1xyXG4gICAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVxdWVzdFdyYXBwZXIob2JqKSB7XHJcbiAgICBvYmogPSBwcmVEbyhvYmopO1xyXG4gICAgaWYgKG1vY2tKc29uICYmIG1vY2tKc29uW29iai51cmxdKSB7XHJcbiAgICAgICAgLy8gbW9jayDmqKHlvI9cclxuICAgICAgICBtb2NrKG9iaik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGdldENhY2hlKG9iaiwgZnVuY3Rpb24gKG9iaikge1xyXG4gICAgICAgICAgICAgICAgY2hlY2tTZXNzaW9uKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXF1ZXN0KG9iaik7XHJcbiAgICAgICAgICAgICAgICB9LCBvYmopXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICApXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNldFNlc3Npb24ocykge1xyXG4gICAgc2Vzc2lvbiAgICAgICAgPSBzO1xyXG4gICAgc2Vzc2lvbklzRnJlc2ggPSB0cnVlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtb2NrKG9iaikge1xyXG4gICAgdmFyIHJlcyA9IHtcclxuICAgICAgICBkYXRhOiBtb2NrSnNvbltvYmoudXJsXVxyXG4gICAgfTtcclxuICAgIGlmIChzdWNjZXNzVHJpZ2dlcihyZXMuZGF0YSkgJiYgdHlwZW9mIG9iai5zdWNjZXNzID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICAvLyDmjqXlj6Pov5Tlm57miJDlip/noIFcclxuICAgICAgICBvYmouc3VjY2VzcyhzdWNjZXNzRGF0YShyZXMuZGF0YSkpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICAvLyDmjqXlj6Pov5Tlm57lpLHotKXnoIFcclxuICAgICAgICBmYWlsKG9iaiwgcmVzKTtcclxuICAgIH1cclxuICAgIGlmICh0eXBlb2Ygb2JqLmNvbXBsZXRlID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICBvYmouY29tcGxldGUoKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gX2dldFNlc3Npb24oKSB7XHJcbiAgICByZXR1cm4gc2Vzc2lvbjtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICB1cmxQZXJmaXg6IHVybFBlcmZpeCxcclxuICAgICAgICBzZXNzaW9uRXhwaXJlVGltZTogc2Vzc2lvbkV4cGlyZVRpbWUsXHJcbiAgICAgICAgc2Vzc2lvbkV4cGlyZUtleTogc2Vzc2lvbkV4cGlyZUtleSxcclxuICAgICAgICBzZXNzaW9uRXhwaXJlOiBzZXNzaW9uRXhwaXJlXHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgaW5pdDogaW5pdCxcclxuICAgIHJlcXVlc3Q6IHJlcXVlc3RXcmFwcGVyLFxyXG4gICAgc2V0U2Vzc2lvbjogc2V0U2Vzc2lvbixcclxuICAgIGxvZ2luOiBsb2dpbixcclxuICAgIGdldFNlc3Npb246IF9nZXRTZXNzaW9uLFxyXG4gICAgZ2V0Q29uZmlnOiBnZXRDb25maWdcclxufTtcclxuIl0sInNvdXJjZVJvb3QiOiIifQ==