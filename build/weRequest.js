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
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
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
        typeof callback === "function" && callback();
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
    var url = obj.url.startsWith('http') ? obj.url : (urlPerfix + obj.url);
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

    try {
        session = wx.getStorageSync(sessionName) || '';
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
        'urlPerfix': urlPerfix
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly93ZVJlcXVlc3Qvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vd2VSZXF1ZXN0Ly4vc3JjL2xpYi9mbG93LmpzIiwid2VicGFjazovL3dlUmVxdWVzdC8uL3NyYy9sb2FkaW5nLmpzIiwid2VicGFjazovL3dlUmVxdWVzdC8uL3NyYy93ZVJlcXVlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGtEQUEwQyxnQ0FBZ0M7QUFDMUU7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxnRUFBd0Qsa0JBQWtCO0FBQzFFO0FBQ0EseURBQWlELGNBQWM7QUFDL0Q7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlEQUF5QyxpQ0FBaUM7QUFDMUUsd0hBQWdILG1CQUFtQixFQUFFO0FBQ3JJO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsbUNBQTJCLDBCQUEwQixFQUFFO0FBQ3ZELHlDQUFpQyxlQUFlO0FBQ2hEO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLDhEQUFzRCwrREFBK0Q7O0FBRXJIO0FBQ0E7OztBQUdBO0FBQ0E7Ozs7Ozs7Ozs7OztBQ2xGQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsQzs7Ozs7Ozs7Ozs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxDOzs7Ozs7Ozs7OztBQ2hCQSxnQkFBZ0IsbUJBQU8sQ0FBQyxtQ0FBVztBQUNuQyxhQUFhLG1CQUFPLENBQUMscUNBQVk7O0FBRWpDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNULEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVCxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNULEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLCtCQUErQjs7QUFFL0I7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGdDQUFnQztBQUNoQztBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EscUJBQXFCO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDZCQUE2QjtBQUM3QjtBQUNBLHFCQUFxQjtBQUNyQixpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQkFBcUI7QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5QkFBeUI7QUFDekI7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBLFNBQVM7QUFDVDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0EsU0FBUztBQUNUO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGdGQUFnRixjQUFjO0FBQzlGLGlCQUFpQjtBQUNqQixnRkFBZ0YsY0FBYztBQUM5RjtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNULEtBQUs7QUFDTDtBQUNBO0FBQ0E7O0FBRUE7QUFDQSw2QkFBNkI7QUFDN0I7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6IndlUmVxdWVzdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKSB7XG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG4gXHRcdH1cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGdldHRlciB9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yID0gZnVuY3Rpb24oZXhwb3J0cykge1xuIFx0XHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcbiBcdFx0fVxuIFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuIFx0fTtcblxuIFx0Ly8gY3JlYXRlIGEgZmFrZSBuYW1lc3BhY2Ugb2JqZWN0XG4gXHQvLyBtb2RlICYgMTogdmFsdWUgaXMgYSBtb2R1bGUgaWQsIHJlcXVpcmUgaXRcbiBcdC8vIG1vZGUgJiAyOiBtZXJnZSBhbGwgcHJvcGVydGllcyBvZiB2YWx1ZSBpbnRvIHRoZSBuc1xuIFx0Ly8gbW9kZSAmIDQ6IHJldHVybiB2YWx1ZSB3aGVuIGFscmVhZHkgbnMgb2JqZWN0XG4gXHQvLyBtb2RlICYgOHwxOiBiZWhhdmUgbGlrZSByZXF1aXJlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnQgPSBmdW5jdGlvbih2YWx1ZSwgbW9kZSkge1xuIFx0XHRpZihtb2RlICYgMSkgdmFsdWUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKHZhbHVlKTtcbiBcdFx0aWYobW9kZSAmIDgpIHJldHVybiB2YWx1ZTtcbiBcdFx0aWYoKG1vZGUgJiA0KSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICYmIHZhbHVlLl9fZXNNb2R1bGUpIHJldHVybiB2YWx1ZTtcbiBcdFx0dmFyIG5zID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yKG5zKTtcbiBcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG5zLCAnZGVmYXVsdCcsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHZhbHVlIH0pO1xuIFx0XHRpZihtb2RlICYgMiAmJiB0eXBlb2YgdmFsdWUgIT0gJ3N0cmluZycpIGZvcih2YXIga2V5IGluIHZhbHVlKSBfX3dlYnBhY2tfcmVxdWlyZV9fLmQobnMsIGtleSwgZnVuY3Rpb24oa2V5KSB7IHJldHVybiB2YWx1ZVtrZXldOyB9LmJpbmQobnVsbCwga2V5KSk7XG4gXHRcdHJldHVybiBucztcbiBcdH07XG5cbiBcdC8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSBmdW5jdGlvbihtb2R1bGUpIHtcbiBcdFx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0RGVmYXVsdCgpIHsgcmV0dXJuIG1vZHVsZVsnZGVmYXVsdCddOyB9IDpcbiBcdFx0XHRmdW5jdGlvbiBnZXRNb2R1bGVFeHBvcnRzKCkgeyByZXR1cm4gbW9kdWxlOyB9O1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCAnYScsIGdldHRlcik7XG4gXHRcdHJldHVybiBnZXR0ZXI7XG4gXHR9O1xuXG4gXHQvLyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGxcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubyA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KTsgfTtcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiXCI7XG5cblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSBcIi4vc3JjL3dlUmVxdWVzdC5qc1wiKTtcbiIsInZhciBzdG9yZSA9IHt9O1xuXG5mdW5jdGlvbiBlbWl0IChrZXksZGF0YSl7XG4gICAgdmFyIGZsb3cgPSBnZXRGbG93KGtleSk7XG4gICAgZmxvdy5yZXN1bHQgPSBkYXRhIHx8IHRydWU7XG4gICAgZmxvdy53YWl0aW5nTGlzdC5mb3JFYWNoKGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICAgICAgY2FsbGJhY2soZGF0YSk7XG4gICAgfSk7XG4gICAgZmxvdy53YWl0aW5nTGlzdC5sZW5ndGggPSAwIDtcbn1cblxuZnVuY3Rpb24gd2FpdCAoa2V5LGNhbGxiYWNrKXtcbiAgICB2YXIgZmxvdyA9IGdldEZsb3coa2V5KTtcbiAgICBpZihmbG93LnJlc3VsdCl7XG4gICAgICAgIGNhbGxiYWNrKGZsb3cucmVzdWx0KVxuICAgIH1lbHNle1xuICAgICAgICBmbG93LndhaXRpbmdMaXN0LnB1c2goY2FsbGJhY2spXG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRGbG93KGtleSl7XG4gICAgaWYoIXN0b3JlW2tleV0pe1xuICAgICAgICBzdG9yZVtrZXldID0ge1xuICAgICAgICAgICAgd2FpdGluZ0xpc3Q6W10sXG4gICAgICAgICAgICByZXN1bHQ6bnVsbFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0b3JlW2tleV07XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHdhaXQ6IHdhaXQsXG4gICAgZW1pdDogZW1pdFxufSIsImZ1bmN0aW9uIHNob3codHh0KSB7XG4gICAgd3guc2hvd1RvYXN0KHtcbiAgICAgICAgdGl0bGU6IHR5cGVvZiB0eHQgPT09ICdib29sZWFuJyA/ICfliqDovb3kuK0nIDogdHh0LFxuICAgICAgICBpY29uOiAnbG9hZGluZycsXG4gICAgICAgIG1hc2s6IHRydWUsXG4gICAgICAgIGR1cmF0aW9uOiA2MDAwMFxuICAgIH0pXG59XG5cbmZ1bmN0aW9uIGhpZGUoKSB7XG4gICAgd3guaGlkZVRvYXN0KCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHNob3c6IHNob3csXG4gICAgaGlkZTogaGlkZVxufSIsImNvbnN0IGxvYWRpbmcgPSByZXF1aXJlKCcuL2xvYWRpbmcnKTtcbmNvbnN0IGZsb3cgPSByZXF1aXJlKCcuL2xpYi9mbG93Jyk7XG5cbi8vcGFyYW1zXG52YXIgc2Vzc2lvbk5hbWUgICAgPSBcInNlc3Npb25cIjtcbnZhciBsb2dpblRyaWdnZXIgICA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZmFsc2Vcbn07XG52YXIgZ2V0U2Vzc2lvbiAgICAgPSBmdW5jdGlvbiAocmVzKSB7XG4gICAgcmV0dXJuIHJlcy5zZXNzaW9uX2lkXG59O1xudmFyIGNvZGVOYW1lICAgICAgID0gXCJjb2RlXCI7XG52YXIgc3VjY2Vzc1RyaWdnZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWVcbn07XG52YXIgdXJsUGVyZml4ICAgICAgPSBcIlwiO1xudmFyIHN1Y2Nlc3NEYXRhICAgID0gZnVuY3Rpb24gKHJlcykge1xuICAgIHJldHVybiByZXNcbn07XG52YXIgZXJyb3JUaXRsZSAgICAgPSBcIuaTjeS9nOWksei0pVwiO1xudmFyIGVycm9yQ29udGVudCAgID0gZnVuY3Rpb24gKHJlcykge1xuICAgIHJldHVybiByZXNcbn07XG52YXIgcmVMb2dpbkxpbWl0ICAgPSAzO1xudmFyIGVycm9yQ2FsbGJhY2sgID0gbnVsbDtcbnZhciByZXBvcnRDR0kgICAgICA9IGZhbHNlO1xudmFyIG1vY2tKc29uICAgICAgID0gZmFsc2U7XG52YXIgZ2xvYmFsRGF0YSAgICAgPSBmYWxzZTtcblxuLy9nbG9iYWwgZGF0YVxudmFyIHNlc3Npb24gICAgICAgICAgID0gJyc7XG52YXIgc2Vzc2lvbklzRnJlc2ggICAgPSBmYWxzZTtcbi8vIOato+WcqOeZu+W9leS4re+8jOWFtuS7luivt+axgui9ruivoueojeWQju+8jOmBv+WFjemHjeWkjeiwg+eUqOeZu+W9leaOpeWPo1xudmFyIGxvZ2luaW5nICAgICAgICAgID0gZmFsc2U7XG4vLyDmraPlnKjmn6Xor6JzZXNzaW9u5pyJ5pWI5pyf5Lit77yM6YG/5YWN6YeN5aSN6LCD55So5o6l5Y+jXG52YXIgaXNDaGVja2luZ1Nlc3Npb24gPSBmYWxzZTtcblxuZnVuY3Rpb24gY2hlY2tTZXNzaW9uKGNhbGxiYWNrLCBvYmopIHtcbiAgICBpZiAoaXNDaGVja2luZ1Nlc3Npb24pIHtcbiAgICAgICAgZmxvdy53YWl0KCdjaGVja1Nlc3Npb25GaW5pc2hlZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNoZWNrU2Vzc2lvbihjYWxsYmFjaywgb2JqKVxuICAgICAgICB9KVxuICAgIH0gZWxzZSBpZiAoIXNlc3Npb25Jc0ZyZXNoICYmIHNlc3Npb24pIHtcbiAgICAgICAgaXNDaGVja2luZ1Nlc3Npb24gPSB0cnVlO1xuICAgICAgICBvYmouY291bnQrKztcbiAgICAgICAgLy8g5aaC5p6c6L+Y5rKh5qOA6aqM6L+Hc2Vzc2lvbuaYr+WQpuacieaViO+8jOWImemcgOimgeajgOmqjOS4gOasoVxuICAgICAgICBvYmouX2NoZWNrU2Vzc2lvblN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICB3eC5jaGVja1Nlc3Npb24oe1xuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vIOeZu+W9leaAgeacieaViO+8jOS4lOWcqOacrOeUn+WRveWRqOacn+WGheaXoOmhu+WGjeajgOmqjOS6hlxuICAgICAgICAgICAgICAgIHNlc3Npb25Jc0ZyZXNoID0gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmYWlsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgLy8g55m75b2V5oCB6L+H5pyfXG4gICAgICAgICAgICAgICAgc2Vzc2lvbiA9ICcnO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaXNDaGVja2luZ1Nlc3Npb24gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBvYmouY291bnQtLTtcbiAgICAgICAgICAgICAgICBvYmouX2NoZWNrU2Vzc2lvbkVuZFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHJlcG9ydENHSSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcG9ydENHSSgnd3hfY2hlY2tTZXNzaW9uJywgb2JqLl9jaGVja1Nlc3Npb25TdGFydFRpbWUsIG9iai5fY2hlY2tTZXNzaW9uRW5kVGltZSwgcmVxdWVzdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRvTG9naW4oY2FsbGJhY2ssIG9iaik7XG4gICAgICAgICAgICAgICAgZmxvdy5lbWl0KCdjaGVja1Nlc3Npb25GaW5pc2hlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIOW3sue7j+ajgOmqjOi/h+S6hlxuICAgICAgICBkb0xvZ2luKGNhbGxiYWNrLCBvYmopO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZG9Mb2dpbihjYWxsYmFjaywgb2JqKSB7XG4gICAgaWYgKHNlc3Npb24pIHtcbiAgICAgICAgLy8g57yT5a2Y5Lit5pyJc2Vzc2lvblxuICAgICAgICB0eXBlb2YgY2FsbGJhY2sgPT09IFwiZnVuY3Rpb25cIiAmJiBjYWxsYmFjaygpO1xuICAgIH0gZWxzZSBpZiAobG9naW5pbmcpIHtcbiAgICAgICAgLy8g5q2j5Zyo55m75b2V5Lit77yM6K+35rGC6L2u6K+i56iN5ZCO77yM6YG/5YWN6YeN5aSN6LCD55So55m75b2V5o6l5Y+jXG4gICAgICAgIGZsb3cud2FpdCgnZG9Mb2dpbkZpbmlzaGVkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZG9Mb2dpbihjYWxsYmFjaywgb2JqKTtcbiAgICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyDnvJPlrZjkuK3ml6BzZXNzaW9uXG4gICAgICAgIGxvZ2luaW5nID0gdHJ1ZTtcbiAgICAgICAgb2JqLmNvdW50Kys7XG4gICAgICAgIC8vIOiusOW9leiwg+eUqHd4LmxvZ2lu5YmN55qE5pe26Ze05oizXG4gICAgICAgIG9iai5fbG9naW5TdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgd3gubG9naW4oe1xuICAgICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBvYmouY291bnQtLTtcbiAgICAgICAgICAgICAgICAvLyDorrDlvZV3eC5sb2dpbui/lOWbnuaVsOaNruWQjueahOaXtumXtOaIs++8jOeUqOS6juS4iuaKpVxuICAgICAgICAgICAgICAgIG9iai5fbG9naW5FbmRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiByZXBvcnRDR0kgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICByZXBvcnRDR0koJ3d4X2xvZ2luJywgb2JqLl9sb2dpblN0YXJ0VGltZSwgb2JqLl9sb2dpbkVuZFRpbWUsIHJlcXVlc3QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0eXBlb2Ygb2JqLmNvbXBsZXRlID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvdW50ID09IDAgJiYgb2JqLmNvbXBsZXRlKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgIGlmIChyZXMuY29kZSkge1xuICAgICAgICAgICAgICAgICAgICBvYmpbY29kZU5hbWVdID0gcmVzLmNvZGU7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBvYmpbc2Vzc2lvbk5hbWVdO1xuICAgICAgICAgICAgICAgICAgICB0eXBlb2YgY2FsbGJhY2sgPT09IFwiZnVuY3Rpb25cIiAmJiBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZhaWwob2JqLCByZXMpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKHJlcyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIOeZu+W9leWksei0pe+8jOino+mZpOmUge+8jOmYsuatouatu+mUgVxuICAgICAgICAgICAgICAgICAgICBsb2dpbmluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBmbG93LmVtaXQoJ2RvTG9naW5GaW5pc2hlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmYWlsOiBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgZmFpbChvYmosIHJlcyk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihyZXMpO1xuICAgICAgICAgICAgICAgIC8vIOeZu+W9leWksei0pe+8jOino+mZpOmUge+8jOmYsuatouatu+mUgVxuICAgICAgICAgICAgICAgIGxvZ2luaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgZmxvdy5lbWl0KCdkb0xvZ2luRmluaXNoZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHByZURvKG9iaikge1xuICAgIHR5cGVvZiBvYmouYmVmb3JlU2VuZCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5iZWZvcmVTZW5kKCk7XG5cbiAgICAvLyDnmbvlvZXmgIHlpLHmlYjvvIzph43lpI3nmbvlvZXorqHmlbBcbiAgICBpZiAodHlwZW9mIG9iai5yZUxvZ2luTGltaXQgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgb2JqLnJlTG9naW5MaW1pdCA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgb2JqLnJlTG9naW5MaW1pdCsrO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygb2JqLmNvdW50ID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIG9iai5jb3VudCA9IDA7XG4gICAgfVxuXG4gICAgaWYgKG9iai5zaG93TG9hZGluZykge1xuICAgICAgICBsb2FkaW5nLnNob3cob2JqLnNob3dMb2FkaW5nKTtcbiAgICAgICAgb2JqLmNvbXBsZXRlID0gKGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBsb2FkaW5nLmhpZGUoKTtcbiAgICAgICAgICAgICAgICB0eXBlb2YgZm4gPT09IFwiZnVuY3Rpb25cIiAmJiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KShvYmouY29tcGxldGUpXG4gICAgfVxuXG4gICAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gcmVxdWVzdChvYmopIHtcbiAgICBvYmouY291bnQrKztcblxuICAgIGlmICghb2JqLmRhdGEpIHtcbiAgICAgICAgb2JqLmRhdGEgPSB7fTtcbiAgICB9XG5cbiAgICBpZihzZXNzaW9uKSB7XG4gICAgICAgIG9ialtzZXNzaW9uTmFtZV0gPSBzZXNzaW9uO1xuICAgIH1cblxuICAgIC8vIOWmguaenOacieWFqOWxgOWPguaVsO+8jOWImea3u+WKoFxuICAgIHZhciBnZCA9IHt9O1xuICAgIGlmICh0eXBlb2YgZ2xvYmFsRGF0YSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGdkID0gZ2xvYmFsRGF0YSgpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGdsb2JhbERhdGEgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgZ2QgPSBnbG9iYWxEYXRhO1xuICAgIH1cbiAgICBvYmouZGF0YSA9IE9iamVjdC5hc3NpZ24oe30sIGdkLCBvYmouZGF0YSk7XG5cbiAgICBvYmoubWV0aG9kID0gb2JqLm1ldGhvZCB8fCAnR0VUJztcblxuICAgIC8vIOWmguaenOivt+axgueahFVSTOS4reS4jeaYr2h0dHDlvIDlpLTnmoTvvIzliJnoh6rliqjmt7vliqDphY3nva7kuK3nmoTliY3nvIBcbiAgICB2YXIgdXJsID0gb2JqLnVybC5zdGFydHNXaXRoKCdodHRwJykgPyBvYmoudXJsIDogKHVybFBlcmZpeCArIG9iai51cmwpO1xuICAgIC8vIOaLvOaOpWNvZGVcbiAgICBpZihvYmpbY29kZU5hbWVdKSB7XG4gICAgICAgIGlmICh1cmwuaW5kZXhPZignPycpID49IDApIHtcbiAgICAgICAgICAgIHVybCArPSAnJicgKyBjb2RlTmFtZSArICc9JyArIG9ialtjb2RlTmFtZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB1cmwgKz0gJz8nICsgY29kZU5hbWUgKyAnPScgKyBvYmpbY29kZU5hbWVdO1xuICAgICAgICB9XG4gICAgICAgIG9iai5kYXRhW2NvZGVOYW1lXSA9IG9ialtjb2RlTmFtZV07XG4gICAgfVxuICAgIC8vIOaLvOaOpXNlc3Npb25cbiAgICBpZihvYmpbc2Vzc2lvbk5hbWVdKSB7XG4gICAgICAgIGlmICh1cmwuaW5kZXhPZignPycpID49IDApIHtcbiAgICAgICAgICAgIHVybCArPSAnJicgKyBzZXNzaW9uTmFtZSArICc9JyArIG9ialtzZXNzaW9uTmFtZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB1cmwgKz0gJz8nICsgc2Vzc2lvbk5hbWUgKyAnPScgKyBvYmpbc2Vzc2lvbk5hbWVdO1xuICAgICAgICB9XG4gICAgICAgIG9iai5kYXRhW3Nlc3Npb25OYW1lXSA9IHNlc3Npb247XG4gICAgfVxuICAgIC8vIOWmguaenOacieWFqOWxgOWPguaVsO+8jOWImeWcqFVSTOS4rea3u+WKoFxuICAgIGZvciAodmFyIGkgaW4gZ2QpIHtcbiAgICAgICAgaWYgKHVybC5pbmRleE9mKCc/JykgPj0gMCkge1xuICAgICAgICAgICAgdXJsICs9ICcmJyArIGkgKyAnPScgKyBnZFtpXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHVybCArPSAnPycgKyBpICsgJz0nICsgZ2RbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8g5aaC5p6c5pyJ5LiK5oql5a2X5q616YWN572u77yM5YiZ6K6w5b2V6K+35rGC5Y+R5Ye65YmN55qE5pe26Ze05oizXG4gICAgaWYgKG9iai5yZXBvcnQpIHtcbiAgICAgICAgb2JqLl9yZXBvcnRTdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICB9XG5cbiAgICB3eC5yZXF1ZXN0KHtcbiAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgIGRhdGE6IG9iai5kYXRhLFxuICAgICAgICBtZXRob2Q6IG9iai5tZXRob2QsXG4gICAgICAgIGhlYWRlcjogb2JqLmhlYWRlciB8fCB7fSxcbiAgICAgICAgZGF0YVR5cGU6IG9iai5kYXRhVHlwZSB8fCAnanNvbicsXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgIGlmIChyZXMuc3RhdHVzQ29kZSA9PSAyMDApIHtcblxuICAgICAgICAgICAgICAgIC8vIOWmguaenOacieS4iuaKpeWtl+autemFjee9ru+8jOWImeiusOW9leivt+axgui/lOWbnuWQjueahOaXtumXtOaIs++8jOW5tui/m+ihjOS4iuaKpVxuICAgICAgICAgICAgICAgIGlmIChvYmoucmVwb3J0ICYmIHR5cGVvZiByZXBvcnRDR0kgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICBvYmouX3JlcG9ydEVuZFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgICAgICAgICAgcmVwb3J0Q0dJKG9iai5yZXBvcnQsIG9iai5fcmVwb3J0U3RhcnRUaW1lLCBvYmouX3JlcG9ydEVuZFRpbWUsIHJlcXVlc3QpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChnZXRTZXNzaW9uKHJlcy5kYXRhKSAmJiBnZXRTZXNzaW9uKHJlcy5kYXRhKSAhPSBzZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb24gPSBnZXRTZXNzaW9uKHJlcy5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgd3guc2V0U3RvcmFnZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXk6IHNlc3Npb25OYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogc2Vzc2lvblxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgLy8g5oiQ5Yqf5ou/5Yiw55m76ZmG5oCB77yM6K+35rGC55qE562J5b6F6Zif5YiX5Y+v5Lul6YeK5pS+XG4gICAgICAgICAgICAgICAgICAgIGxvZ2luaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGZsb3cuZW1pdCgnZG9Mb2dpbkZpbmlzaGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGxvZ2luVHJpZ2dlcihyZXMuZGF0YSkgJiYgb2JqLnJlTG9naW5MaW1pdCA8IHJlTG9naW5MaW1pdCkge1xuICAgICAgICAgICAgICAgICAgICAvLyDnmbvlvZXmgIHlpLHmlYjvvIzkuJTph43or5XmrKHmlbDkuI3otoXov4fphY3nva5cbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbiA9ICcnO1xuICAgICAgICAgICAgICAgICAgICB3eC5yZW1vdmVTdG9yYWdlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleTogc2Vzc2lvbk5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvTG9naW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmogPSBwcmVEbyhvYmopO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0KG9iaik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgb2JqKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc3VjY2Vzc1RyaWdnZXIocmVzLmRhdGEpICYmIHR5cGVvZiBvYmouc3VjY2VzcyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOaOpeWPo+i/lOWbnuaIkOWKn+eggVxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVhbERhdGEgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVhbERhdGEgPSBzdWNjZXNzRGF0YShyZXMuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGdW5jdGlvbiBzdWNjZXNzRGF0YSBvY2N1ciBlcnJvcjogXCIgKyBlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZighb2JqLm5vQ2FjaGVGbGFzaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5Li65LqG5L+d6K+B6aG16Z2i5LiN6Zeq54OB77yM5YiZ5LiN5Zue6LCD77yM5Y+q5piv57yT5a2Y5pyA5paw5pWw5o2u77yM5b6F5LiL5qyh6L+b5YWl5YaN55SoXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmouc3VjY2VzcyhyZWFsRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKG9iai5jYWNoZSA9PT0gdHJ1ZSB8fCAodHlwZW9mIG9iai5jYWNoZSA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jYWNoZShyZWFsRGF0YSkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3eC5zZXRTdG9yYWdlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk6IG9iai51cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogcmVhbERhdGFcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyDmjqXlj6Pov5Tlm57lpLHotKXnoIFcbiAgICAgICAgICAgICAgICAgICAgZmFpbChvYmosIHJlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmYWlsKG9iaiwgcmVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZmFpbDogZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgZmFpbChvYmosIHJlcyk7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKHJlcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBvYmouY291bnQtLTtcbiAgICAgICAgICAgIHR5cGVvZiBvYmouY29tcGxldGUgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY291bnQgPT0gMCAmJiBvYmouY29tcGxldGUoKTtcbiAgICAgICAgfVxuICAgIH0pXG59XG5cbmZ1bmN0aW9uIGZhaWwob2JqLCByZXMpIHtcbiAgICBpZiAodHlwZW9mIG9iai5mYWlsID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgb2JqLmZhaWwocmVzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdGl0bGUgPSBcIlwiO1xuICAgICAgICBpZiAodHlwZW9mIGVycm9yVGl0bGUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0aXRsZSA9IGVycm9yVGl0bGUocmVzLmRhdGEpXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGVycm9yVGl0bGUgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHRpdGxlID0gZXJyb3JUaXRsZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjb250ZW50ID0gXCJcIjtcbiAgICAgICAgaWYgKHR5cGVvZiBlcnJvckNvbnRlbnQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb250ZW50ID0gZXJyb3JDb250ZW50KHJlcy5kYXRhKVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBlcnJvckNvbnRlbnQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGNvbnRlbnQgPSBlcnJvckNvbnRlbnQ7XG4gICAgICAgIH1cblxuICAgICAgICB3eC5zaG93TW9kYWwoe1xuICAgICAgICAgICAgdGl0bGU6IHRpdGxlLFxuICAgICAgICAgICAgY29udGVudDogY29udGVudCB8fCBcIue9kee7nOaIluacjeWKoeW8guW4uO+8jOivt+eojeWQjumHjeivlVwiLFxuICAgICAgICAgICAgc2hvd0NhbmNlbDogZmFsc2VcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICAvLyDlpoLmnpzmnInphY3nva7nu5/kuIDplJnor6/lm57osIPlh73mlbDvvIzliJnmiafooYzlroNcbiAgICBpZiAodHlwZW9mIGVycm9yQ2FsbGJhY2sgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBlcnJvckNhbGxiYWNrKG9iaiwgcmVzKTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmVycm9yKHJlcyk7XG59XG5cbmZ1bmN0aW9uIGdldENhY2hlKG9iaiwgY2FsbGJhY2spIHtcbiAgICBpZiAob2JqLmNhY2hlKSB7XG4gICAgICAgIHd4LmdldFN0b3JhZ2Uoe1xuICAgICAgICAgICAga2V5OiBvYmoudXJsLFxuICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgIHR5cGVvZiBvYmouYmVmb3JlU2VuZCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5iZWZvcmVTZW5kKCk7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvYmouY2FjaGUgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY2FjaGUocmVzLmRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGVvZiBvYmouc3VjY2VzcyA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5zdWNjZXNzKHJlcy5kYXRhLCB7aXNDYWNoZTogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob2JqLmNhY2hlID09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZW9mIG9iai5zdWNjZXNzID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLnN1Y2Nlc3MocmVzLmRhdGEsIHtpc0NhY2hlOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHR5cGVvZiBvYmouY29tcGxldGUgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29tcGxldGUoKTtcbiAgICAgICAgICAgICAgICAvLyDmiJDlip/lj5blh7rnvJPlrZjvvIzov5jopoHljrvor7fmsYLmi7/mnIDmlrDnmoTlho3lrZjotbfmnaVcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhvYmopO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZhaWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIOaJvuS4jeWIsOe8k+WtmO+8jOebtOaOpeWPkei1t+ivt+axgu+8jOS4lOS4jeWGjemYsuatoumhtemdoumXqueDge+8iOacrOadpeWwseayoee8k+WtmOS6hu+8jOabtOS4jeWtmOWcqOabtOaWsOmhtemdouWvvOiHtOeahOmXqueDge+8iVxuICAgICAgICAgICAgICAgIG9iai5ub0NhY2hlRmxhc2ggPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhvYmopO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGNhbGxiYWNrKG9iaik7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBsb2dpbihjYWxsYmFjaykge1xuICAgIGNoZWNrU2Vzc2lvbihjYWxsYmFjaywge30pXG59XG5cbmZ1bmN0aW9uIGluaXQocGFyYW1zKSB7XG4gICAgc2Vzc2lvbk5hbWUgICAgPSBwYXJhbXMuc2Vzc2lvbk5hbWUgfHwgJ3Nlc3Npb24nO1xuICAgIGxvZ2luVHJpZ2dlciAgID0gcGFyYW1zLmxvZ2luVHJpZ2dlciB8fCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfTtcbiAgICBjb2RlTmFtZSAgICAgICA9IHBhcmFtcy5jb2RlTmFtZSB8fCBcImNvZGVcIjtcbiAgICBzdWNjZXNzVHJpZ2dlciA9IHBhcmFtcy5zdWNjZXNzVHJpZ2dlciB8fCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9O1xuICAgIGdldFNlc3Npb24gICAgID0gcGFyYW1zLmdldFNlc3Npb24gfHwgZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgcmV0dXJuIHJlcy5zZXNzaW9uX2lkXG4gICAgICAgIH07XG4gICAgdXJsUGVyZml4ICAgICAgPSBwYXJhbXMudXJsUGVyZml4IHx8IFwiXCI7XG4gICAgc3VjY2Vzc0RhdGEgICAgPSBwYXJhbXMuc3VjY2Vzc0RhdGEgfHwgZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgcmV0dXJuIHJlc1xuICAgICAgICB9O1xuICAgIGVycm9yVGl0bGUgICAgID0gcGFyYW1zLmVycm9yVGl0bGUgfHwgXCLmk43kvZzlpLHotKVcIjtcbiAgICBlcnJvckNvbnRlbnQgICA9IHBhcmFtcy5lcnJvckNvbnRlbnQgfHwgZmFsc2U7XG4gICAgcmVMb2dpbkxpbWl0ICAgPSBwYXJhbXMucmVMb2dpbkxpbWl0IHx8IDM7XG4gICAgZXJyb3JDYWxsYmFjayAgPSBwYXJhbXMuZXJyb3JDYWxsYmFjayB8fCBudWxsO1xuICAgIHNlc3Npb25Jc0ZyZXNoID0gcGFyYW1zLmRvTm90Q2hlY2tTZXNzaW9uIHx8IGZhbHNlO1xuICAgIHJlcG9ydENHSSAgICAgID0gcGFyYW1zLnJlcG9ydENHSSB8fCBmYWxzZTtcbiAgICBtb2NrSnNvbiAgICAgICA9IHBhcmFtcy5tb2NrSnNvbiB8fCBmYWxzZTtcbiAgICBnbG9iYWxEYXRhICAgICA9IHBhcmFtcy5nbG9iYWxEYXRhIHx8IGZhbHNlO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgc2Vzc2lvbiA9IHd4LmdldFN0b3JhZ2VTeW5jKHNlc3Npb25OYW1lKSB8fCAnJztcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZXF1ZXN0V3JhcHBlcihvYmopIHtcbiAgICBvYmogPSBwcmVEbyhvYmopO1xuICAgIGlmIChtb2NrSnNvbiAmJiBtb2NrSnNvbltvYmoudXJsXSkge1xuICAgICAgICAvLyBtb2NrIOaooeW8j1xuICAgICAgICBtb2NrKG9iaik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZ2V0Q2FjaGUob2JqLCBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgICAgICAgICAgY2hlY2tTZXNzaW9uKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVxdWVzdChvYmopO1xuICAgICAgICAgICAgICAgIH0sIG9iailcbiAgICAgICAgICAgIH1cbiAgICAgICAgKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gc2V0U2Vzc2lvbihzKSB7XG4gICAgc2Vzc2lvbiAgICAgICAgPSBzO1xuICAgIHNlc3Npb25Jc0ZyZXNoID0gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gbW9jayhvYmopIHtcbiAgICB2YXIgcmVzID0ge1xuICAgICAgICBkYXRhOiBtb2NrSnNvbltvYmoudXJsXVxuICAgIH07XG4gICAgaWYgKHN1Y2Nlc3NUcmlnZ2VyKHJlcy5kYXRhKSAmJiB0eXBlb2Ygb2JqLnN1Y2Nlc3MgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAvLyDmjqXlj6Pov5Tlm57miJDlip/noIFcbiAgICAgICAgb2JqLnN1Y2Nlc3Moc3VjY2Vzc0RhdGEocmVzLmRhdGEpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyDmjqXlj6Pov5Tlm57lpLHotKXnoIFcbiAgICAgICAgZmFpbChvYmosIHJlcyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygb2JqLmNvbXBsZXRlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgb2JqLmNvbXBsZXRlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBfZ2V0U2Vzc2lvbigpIHtcbiAgICByZXR1cm4gc2Vzc2lvbjtcbn1cblxuZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgICd1cmxQZXJmaXgnOiB1cmxQZXJmaXhcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGluaXQ6IGluaXQsXG4gICAgcmVxdWVzdDogcmVxdWVzdFdyYXBwZXIsXG4gICAgc2V0U2Vzc2lvbjogc2V0U2Vzc2lvbixcbiAgICBsb2dpbjogbG9naW4sXG4gICAgZ2V0U2Vzc2lvbjogX2dldFNlc3Npb24sXG4gICAgZ2V0Q29uZmlnOiBnZXRDb25maWdcbn07XG4iXSwic291cmNlUm9vdCI6IiJ9