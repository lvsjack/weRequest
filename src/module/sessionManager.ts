import status from "../store/status";
import config from "../store/config";
import errorHandler from "./errorHandler";
import durationReporter from "./durationReporter";
import requestHandler from "./requestHandler";
import loading from "../util/loading";


/* 生命周期内只做一次的checkSession */
let checkSessionPromise: any = null;

function checkSession() {
  if (!checkSessionPromise) {
    checkSessionPromise = new Promise((resolve) => {
      console.log("wx.checkSession()");
      const start = new Date().getTime();
      wx.checkSession({
        success() {
          // 登录态有效，且在本生命周期内无须再检验了
          return resolve();
        },
        fail() {
          // 登录态过期
          delSession();
          return resolve();
        },
        complete() {
          const end = new Date().getTime();
          durationReporter.report("wx_checkSession", start, end);
        }
      });
    });
  }
  return checkSessionPromise;
}

/* 判断session是否为空或已过期 */
function isSessionExpireOrEmpty() {
  if (!status.session) {
    // 如果缓存中没有session
    return true;
  }
  if (config.sessionExpireTime && new Date().getTime() > status.sessionExpire) {
    // 如果有设置本地session缓存时间，且缓存时间已到
    delSession();
    return true;
  }
  return false;
}

function checkLogin(token: string) {
  return new Promise((resolve, reject) => {
    if (isSessionExpireOrEmpty()) {
      return doLogin(token).then(() => {
        return resolve();
      }, (res: any) => {
        return reject(res);
      });
    } else {
      // 缓存中有session且未过期
      return resolve();
    }
  });
}

/* 登陆流程的promise */
let loginPromise: any = null;

function doLogin(token: string) {
  if (!loginPromise) {
    loginPromise = new Promise((resolve, reject) => {
      login(token).then(() => {
        loginPromise = null;
        return resolve();
      }).catch((res) => {
        loginPromise = null;
        return reject(res);
      });
    });
  }
  return loginPromise;
}

function login(token: string) {
  return new Promise((resolve, reject) => {
    console.log("wx.login");
    const start = new Date().getTime();
    wx.login({
      success(res) {
        if (res.code) {
          code2Session(res.code, token).then(() => {
            return resolve();
          }).catch((res) => {
            return reject(res);
          });
        } else {
          return reject({ title: "登录失败", "content": "请稍后重试[code 获取失败]" });
        }
      },
      complete() {
        const end = new Date().getTime();
        durationReporter.report("wx_login", start, end);
      },
      fail(res) {
        return reject({ title: "登录失败", "content": res.errMsg });
      }
    });
  });
}

function code2Session(code: string, token: string) {
  let data: any;
  // codeToSession.data支持函数
  if (typeof config.codeToSession.data === "function") {
    data = config.codeToSession.data();
  } else {
    data = config.codeToSession.data || {};
  }
  data[config.codeToSession.codeName!] = code;

  console.log(data);

  return new Promise((resolve, reject) => {
    let start = new Date().getTime();
    wx.request({
      url: requestHandler.format(config.codeToSession.url),
      data,
      header: {
        "content-type": "application/x-www-form-urlencoded",
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json"
      },
      method: config.codeToSession.method || "GET",
      success(res: wx.RequestSuccessCallbackResult) {
        if (res.statusCode === 200) {
          // 耗时上报
          if (config.codeToSession.report) {
            let end = new Date().getTime();
            durationReporter.report(config.codeToSession.report, start, end);
          }

          let s = "";
          try {
            s = config.codeToSession.success(res.data);
          } catch (e) {
          }

          if (s) {
            status.session = s;
            // 换回来的session，不需要再checkSession
            config.doNotCheckSession = true;
            // 如果有设置本地session过期时间
            // if (config.sessionExpireTime) {
            //   status.sessionExpire = new Date().getTime() + config.sessionExpireTime;
            //   wx.setStorage({
            //     key: config.sessionExpireKey,
            //     data: String(status.sessionExpire)
            //   });
            // }

            // 设置本地session过期时间
            if (res.data && res.data.expires_in) {
              status.sessionExpire = new Date().getTime() + res.data.expires_in * 1000;
            }
            wx.setStorage({
              key: config.sessionExpireKey,
              data: status.sessionExpire
            });
            wx.setStorage({
              key: config.sessionName,
              data: status.session
            });
            return resolve();
          } else {
            return reject(errorHandler.getErrorMsg(res));
          }
        } else {
          return reject({ title: "登录失败", "content": "请稍后重试" });
        }
      },
      complete() {
      },
      fail: () => {
        loading.hide();
        return reject({ title: "登录失败", "content": "请稍后重试" });
      }
    });
  });
}

/* 清空session */
function delSession() {
  status.session = "";
  wx.removeStorage({
    key: config.sessionName
  });
}

function main(token: string) {
  return new Promise((resolve, reject) => {
    return checkLogin(token).then(() => {
      return config.doNotCheckSession ? Promise.resolve() : checkSession();
    }, ({ title, content }) => {
      errorHandler.doError(title, content);
      return reject({ title, content });
    }).then(() => {
      return resolve();
    });
  });
}

export default {
  main,
  delSession
};
