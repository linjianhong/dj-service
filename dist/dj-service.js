'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function (angular, window, undefined) {
  // 只在微信浏览器中运行
  // @var useWX: 是否应该使用微信 JSSDK
  var isWx = /micromessenger/i.test(navigator.userAgent);
  var useWX = location.origin.length > 12 && location.origin.indexOf('192.168') < 0 && isWx;
  var _initWx;
  var theModule = angular.module('wx-jssdk', []);
  var theCounter = 80000;

  /** 微信 JSSDK 初始化 */
  theModule.run(['$http', '$q', function ($http, $q) {

    _initWx = function initWx() {
      // 只在微信浏览器中运行
      if (!useWX) return $q.reject('not wx');
      if (_initWx.promise) {
        return $q.when(_initWx.promise);
      }

      var deferred = $q.defer();
      var wx_app_name = window.theSiteConfig && window.theSiteConfig.wx_app.wx.name || 'pgy-wx';
      var url = location.href.split('#')[0];

      $http.post("app/jsapi_sign", { name: wx_app_name, url: encodeURIComponent(url) }).then(function (json) {
        var config = json.datas.config;
        if (!config) {
          deferred.reject('config error!');
          return;
        }
        wx.config({
          debug: false,
          appId: config.appId,
          timestamp: config.timestamp,
          nonceStr: config.nonceStr,
          signature: config.signature,
          jsApiList: [
          // 所有要调用的 API 都要加到这个列表中
          'onMenuShareTimeline', 'onMenuShareAppMessage', 'onMenuShareQQ', 'onMenuShareWeibo', 'onMenuShareQZone', 'startRecord', 'stopRecord', 'onVoiceRecordEnd', 'playVoice', 'pauseVoice', 'stopVoice', 'onVoicePlayEnd', 'uploadVoice', 'downloadVoice', 'chooseImage', 'previewImage', 'uploadImage', 'downloadImage', 'translateVoice', 'getNetworkType', 'openLocation', 'getLocation', 'hideOptionMenu', 'showOptionMenu', 'hideMenuItems', 'showMenuItems', 'hideAllNonBaseMenuItem', 'showAllNonBaseMenuItem', 'closeWindow', 'scanQRCode', 'chooseWXPay']
        });

        wx.ready(function () {
          deferred.resolve(_initWx.promise = wx);
        });
      }).catch(function (e) {
        deferred.reject('getWjSign error!');
      });

      return _initWx.promise = deferred.promise;
    };
  }]);

  /** 提供 JSSDK 功能 */
  theModule.factory('WxJssdk', ['$http', '$q', function ($http, $q) {
    // ------------------------ 接口 ------------------------
    function reshare(wx, options) {
      var deferTimeline = $q.defer();
      var deferAppMessage = $q.defer();
      //分享到朋友圈
      wx.onMenuShareTimeline({
        title: options.shareTitle, // 分享标题
        link: options.link, // 分享链接
        imgUrl: options.imgUrl, // 分享图标
        success: function success(res) {
          deferTimeline.resolve(res);
        },
        cancel: function cancel(res) {
          deferTimeline.reject(res);
        }
      });
      //分享给朋友
      wx.onMenuShareAppMessage({
        title: options.title, // 分享标题
        desc: options.desc, // 分享描述
        link: options.link, // 分享链接
        imgUrl: options.imgUrl, // 分享图标
        type: options.type || 'link', // 分享类型,music、video或link，不填默认为link
        dataUrl: options.dataUrl || '', // 如果type是music或video，则要提供数据链接，默认为空
        success: function success(res) {
          deferAppMessage.resolve(res);
        },
        cancel: function cancel(res) {
          deferAppMessage.reject(res);
        }
      });
      return {
        onMenuShareTimeline: deferTimeline.promise,
        onMenuShareAppMessage: deferAppMessage.promise
      };
    };

    return {
      initWx: function initWx() {
        return _initWx();
      },
      setShare: function setShare(options) {
        var defaultShare = window.theSiteConfig && window.theSiteConfig.wx_share || {};
        options = angular.extend({}, defaultShare, options);
        options.shareTitle = options.shareTitle || options.title; // 发送到朋友圈标题

        return _initWx().then(function (wx) {
          return reshare(wx, options);
        });
      }
    };
  }]);

  /** 提供 JSSDK 功能 */
  theModule.run(['$rootScope', '$http', '$q', 'sign', 'WxJssdk', function ($rootScope, $http, $q, sign, WxJssdk) {

    /**
     * 用 $http 模拟 WX-JSSDK
     */
    sign.registerHttpHook({
      match: /^WxJssdk\/(.*)$/i,
      hookRequest: function hookRequest(config, mockResponse, match) {
        return mockResponse.resolve(WxJssdk[match[1]]());
      }
    });

    /**
     * 请求二维码扫描
     */
    sign.registerHttpHook({
      match: /^扫描二维码$/,
      hookRequest: function hookRequest(config, mockResponse) {
        var deferred = $q.defer();
        _initWx().then(function (wx) {
          wx.scanQRCode({
            needResult: 1, // 默认为0，扫描结果由微信处理，1则直接返回扫描结果，
            scanType: ["qrCode", "barCode"], // 可以指定扫二维码还是一维码，默认二者都有
            success: function success(res) {
              var result = res.resultStr; // 当needResult 为 1 时，扫码返回的结果
              console.log('扫描结果 = ', result);
              deferred.resolve(result);
            },
            fail: function fail(res) {
              deferred.reject(res);
            }
          });
        }).catch(function (e) {
          deferred.resolve('10' + ++theCounter);
          //deferred.reject(e);
          //console.log("请求二维码扫描错误", e);
        });
        return mockResponse.resolve(deferred.promise);
      }
    });

    /**
     * 请求二维码扫描（模拟，用于调试）
     */
    sign.registerHttpHook({
      match: /^模拟扫描二维码$/,
      hookRequest: function hookRequest(config, mockResponse) {
        var deferred = $q.defer();
        window.setTimeout(function () {
          console.log('模拟扫描结果 = ', config.data || '模拟数据');
          deferred.resolve(config.data || '模拟数据');
        }, 120);
        return mockResponse.resolve(deferred.promise);
      }
    });
  }]);
}(angular, window);

!function (angular, window, undefined) {
  var moduleLocalStorageTable = angular.module('dj-localStorage-table', []);
  /**
   * 本地存贮数据表工厂
   */
  moduleLocalStorageTable.factory('LocalStorageTable', ['$q', function ($q) {
    var LocalStorageTable = function () {
      function LocalStorageTable(tableName) {
        _classCallCheck(this, LocalStorageTable);

        this.tableName = tableName;
        this.initTable();
      }

      _createClass(LocalStorageTable, [{
        key: 'initTable',
        value: function initTable() {
          var _this = this;

          var str = window.localStorage.getItem(this.tableName) || JSON.stringify({ rows: [] });
          this.data = JSON.parse(str);
          this.rows = this.data.rows;
          this.maxId = 0;
          this.rows.map(function (row) {
            if (row.id > _this.maxId) _this.maxId = row.id;
          });
        }
      }, {
        key: 'autoInsertId',
        value: function autoInsertId() {
          return ++this.maxId;
        }
      }, {
        key: 'saveToLocalStorage',
        value: function saveToLocalStorage() {
          window.localStorage.removeItem(this.tableName);
          window.localStorage.setItem(this.tableName, JSON.stringify(this.data));
        }
      }, {
        key: 'insert',
        value: function insert(data, dontSave) {
          var id = this.autoInsertId();
          this.rows.push(angular.extend({
            id: id
          }, data));
          !dontSave && this.saveToLocalStorage();
          return $q.when(id);
        }
      }, {
        key: 'select',
        value: function select(where) {
          where = where || {};
          var list = this.rows.filter(function (row) {
            for (var k in where) {
              if (row[k] != where[k]) return false;
            }
            return true;
          });
          return $q.when(angular.merge([], list));
        }
      }, {
        key: 'update',
        value: function update(where, value, insertIfNotExist) {
          var _this2 = this;

          where = where || {};
          var list = this.rows.filter(function (row) {
            for (var k in where) {
              if (row[k] != where[k]) return false;
            }
            return true;
          });
          if (!list[0]) {
            if (!insertIfNotExist) return $q.reject('无此数据');
            return this.insert(angular.extend({}, where, value)).then(function (id) {
              return _this2.rows.find(function (row) {
                return row.id == id;
              });
            });
          }
          angular.extend(list[0], value);
          this.saveToLocalStorage();
          return $q.when(angular.merge({}, list[0]));
        }
      }]);

      return LocalStorageTable;
    }();

    return LocalStorageTable;
  }]);

  moduleLocalStorageTable.factory("LocalTable", ['$http', '$q', 'LocalStorageTable', function ($http, $q, LocalStorageTable) {

    function Table(name) {
      if (!Table[name]) {
        Table[name] = new LocalStorageTable("fac-table-" + name);
      }
      return Table[name];
    }

    var DEFAULT_OPTIONS = {
      name: 'default',
      ac: 'default',
      empty: ""
    };

    function LocalTable(ac, name, empty) {
      if (!(this instanceof LocalTable)) {
        return new LocalTable(name, ac, empty);
      }
      var options = {};
      if (angular.isObject(ac)) {
        options = ac;
      } else if (angular.isString(ac)) {
        options.ac = ac;
        options.empty = empty || "";
        if (!ac || !angular.isString(name)) {
          options.name = name;
        }
      }
      this.options = angular.mergy({}, DEFAULT_OPTIONS, options);
      this.table = Table(this.options.name);
    }
    LocalTable.prototype = {

      load: function load() {
        var _this3 = this;

        return this.table.select({ ac: this.options.ac }).then(function (list) {
          return list[0];
        }).catch(function (e) {
          return _this3.options.empty;
        });
      },
      save: function save(data) {
        return this.table.update({ ac: this.options.ac }, data, true);
      }

    };

    LocalTable.load = function (name, ac, empty) {
      return Table(name).select({ ac: ac }).then(function (list) {
        return list[0] || empty;
      }).catch(function (e) {
        return empty;
      });
    };
    LocalTable.save = function (name, ac, data) {
      return Table(name).update({ ac: ac }, data, true);
    };

    return LocalTable;
  }]);
}(window.angular, window);

!function (angular, window, undefined) {

  var serviceModule = angular.module('dj-http', []);

  /** 解决 post 问题 */
  serviceModule.config(["$httpProvider", function ($httpProvider) {
    $httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';
    var param = function param(obj) {
      var query = '',
          name,
          value,
          fullSubName,
          subName,
          subValue,
          innerObj,
          i;
      for (name in obj) {
        value = obj[name];
        if (value instanceof Array) {
          for (i = 0; i < value.length; ++i) {
            subValue = value[i];
            fullSubName = name + '[' + i + ']';
            innerObj = {};
            innerObj[fullSubName] = subValue;
            query += param(innerObj) + '&';
          }
        } else if (value instanceof Object) {
          for (subName in value) {
            subValue = value[subName];
            fullSubName = name + '[' + subName + ']';
            innerObj = {};
            innerObj[fullSubName] = subValue;
            query += param(innerObj) + '&';
          }
        } else if (value !== undefined && value !== null) query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
      }
      return query.length ? query.substr(0, query.length - 1) : query;
    };

    // Override $http service's default transformRequest
    $httpProvider.defaults.transformRequest = [function (data) {
      return angular.isObject(data) && String(data) !== '[object File]' ? param(data) : data;
    }];
  }]);
  serviceModule.config(['$qProvider', function ($qProvider) {
    $qProvider.errorOnUnhandledRejections(false);
  }]);

  /** 模拟 response 响应的数据类型 */
  var _CHttpMockResponse;
  function _OK(datas, other) {
    return angular.extend({
      errcode: 0,
      datas: datas
    }, other);
  }
  function _error(errcode, errmsg, other) {
    return angular.extend({
      errcode: errcode,
      errmsg: errmsg
    }, other);
  }
  serviceModule.run(['$q', '$http', function ($q, $http) {
    /** 为识别模拟服务器数据 */
    _CHttpMockResponse = function CHttpMockResponse(data) {
      if (!(this instanceof _CHttpMockResponse)) {
        return new _CHttpMockResponse(data);
      }
      this.data = data;
    };

    var prototype = {
      $q: $q,
      $http: $http,
      OK: function OK(datas, other) {
        return _CHttpMockResponse.resolve($q.when(datas).then(function (datas) {
          return _OK(datas, other);
        }));
      },
      error: function error(errcode, errmsg, other) {
        return _CHttpMockResponse.reject(_error(errcode, errmsg, other));
      },
      reject: function reject(data) {
        if (this instanceof _CHttpMockResponse) {
          this.data = $q.reject(data);
          return this;
        }
        return new _CHttpMockResponse($q.reject(data));
      },
      resolve: function resolve(data) {
        if (this instanceof _CHttpMockResponse) {
          this.data = $q.when(data);
          return this;
        }
        return new _CHttpMockResponse($q.when(data));
      }
    };

    angular.extend(_CHttpMockResponse, prototype);
    _CHttpMockResponse.prototype = prototype;
  }]);

  {
    /**
     * 签名供应商
     *
     *
     *
     * 重设 apiRoot
     * # Example
     * 拦截后，$http.post('abc/def') 将被重定向到 http://mysite.com/api/abc/def
     * ```js
       app.run(['sign', function(sign){
         sign.setApiRoot( 'http://mysite.com/api' );
       }]);
     * ```
     *
     *
     * 拦截默认的 request
     * # Example
     * ```js
        app.run(['sign', function(sign){
          sign.registerDefaultRequestHook((url, post, mockResponse) => {
            return {
              url: 'http://mysite.com/api/' + url,
              post
            }
          });
        }]);
     * ```
     *
     *
     * 拦截默认的 response
     * # Example
     * ```js
        app.run(['sign', function(sign){
          sign.registerDefaultResponseHook((response) => {
            return $q.when(response.data).then(json => {
              if (json && +json.errcode === 0) return json;
              return $q.reject(json);
            })
          });
        }]);
     * ```
     *
     *
     *
     * # 模拟服务器响应 mockResponse
     * # Example
     * ```js
        app.run(['sign', function(sign){
          sign.registerHttpHook( {
            match: /^test\/(.*)/i,
            hookRequest: function(config, mockResponse, match){
              return mockResponse({
                errcode: 0,
                datas: data
              });
              // 或:
              return mockResponse.resolve({
                errcode: 0,
                datas: data
              });
              // 或:
              return mockResponse.reject('error msg');
            }
          });
        }]);
     * ```
     * 或：
     * # Example
     * ```js
        app.run(['sign', function(sign){
          sign.registerHttpHook( {
            match: /^test\/(.*)/i,
            hookRequest: function(config, mockResponse, match){
              return mockResponse({
                errcode: 0,
                datas: data
              });
              // 或:
              return mockResponse.resolve({
                errcode: 0,
                datas: data
              });
              // 或:
              return mockResponse.reject('error msg');
            }
          });
        }]);
     *
     *
     * # 对旧的请求，修改url, 修改提交的post数据, 修改响应的数据
     * # Example
     * ```js
        app.run(['sign', function(sign){
          sign.registerHttpHook( {
            match: /^(old_api_name1|old_api_name2|old_api_name3)\/(.*)/i,
            hookRequest: function(config, mockResponse){
              return {
                url: config.url + "?a=1&b=2",
                post: {...config.data, oldSign: 'avsdf234sdfha'}
              }
            },
            hookResponse: function(response, $q){
              return $q.when(response.data).then(json => {
                if (json && +json.errcode === 0) return {
                  errcode: 0,
                  datas: json.data
                };
                return $q.reject(json);
              })
            }
          });
        }]);
     * ```
     *
     *
     */
  }
  serviceModule.provider('sign', [function () {

    /**
     * apiRoot, 默认的服务端主目录
     */
    var theApiRoot = './';

    function setApiRoot(apiRoot) {
      theApiRoot = apiRoot;
      if (!/\/$/.test(theApiRoot)) theApiRoot += '/';
    }

    this.setApiRoot = setApiRoot;

    /**
     * 登记或注销 request/response 拦截
     */
    var theHttpHookRegistered = [];
    var registerHttpHook = this.registerHttpHook = function (hook) {
      theHttpHookRegistered.indexOf(hook) < 0 && theHttpHookRegistered.push(hook);
      return hook;
    };
    this.unRegisterHttpHook = function (hook) {
      theHttpHookRegistered.splice(theHttpHookRegistered.indexOf(hook), 1);
    };

    /**
     * 默认的 request 拦截器，当拦截器中未定义请求处理进，按此处理
     * 用户可以自定义该拦截器, 多次定义，则最后一次有效
     */
    function defaultRequestHook(fn) {
      defaultRequestHook.fn = fn;
    }
    this.registerDefaultRequestHook = defaultRequestHook;
    this.registerDefaultRequestHook(function (config, mockResponse) {
      var url = config.url;
      var data = config.data;
      if (!/^(http(s)?\:)?\/\//.test(url)) {
        url = theApiRoot + url;
      }
      return { url: url, data: data };
    });

    /**
     * 默认的 response 拦截器，当拦截器中未定义响应处理进，按此处理
     * 用户可以自定义该拦截器, 多次定义，则最后一次有效
     */
    function defaultResponseHook(fn) {
      defaultResponseHook.fn = fn;
    }
    this.registerDefaultResponseHook = defaultResponseHook;
    this.registerDefaultResponseHook(function (response, $q) {
      return $q.when(response.data).then(function (json) {
        if (json && +json.errcode === 0) return json;
        return $q.reject(json);
      });
    });

    /**
     * 请求前，进行预处理
     * 返回 signed 类型数据 ，将阻止后续处理，并自动抛出 stoped 拒绝
     * 返回一个承诺，将重置原承诺
     * 返回一个 !==false，将改写json为该值
     */
    function hookRequest(config) {
      var hooked, match;
      for (var i = theHttpHookRegistered.length; i--;) {
        var hook = theHttpHookRegistered[i];
        // 是否被拦截
        if (hook.match && hook.hookRequest && (match = config.url.match(hook.match))) {
          hooked = hook.hookRequest(config, _CHttpMockResponse, match);
          if (hooked) {
            return hooked;
          }
        }
      }
      return defaultRequestHook.fn(config, _CHttpMockResponse);
    }

    /**
     * 响应后，进行预处理
     * 返回 signed 类型数据 ，将阻止后续处理，并自动抛出 stoped 拒绝
     * 返回一个承诺，将重置原承诺
     * 返回一个 !==false，将改写json为该值
     */
    function hookResponse(response, $q) {
      var hooked;
      for (var i = theHttpHookRegistered.length; i--;) {
        var hook = theHttpHookRegistered[i];
        // 有拦截的，直接拦截，不再其它处理
        if (hook.match && hook.hookResponse && response.config.urlBase.match(hook.match)) {
          hooked = hook.hookResponse(response, $q);
          if (hooked) return hooked;
        }
      }
      return defaultResponseHook.fn(response, $q);
    };

    /**
     * 暴露函数，以提供服务
     */
    this.$get = function () {
      return {
        setApiRoot: setApiRoot,
        registerDefaultRequestHook: defaultRequestHook,
        registerHttpHook: registerHttpHook,
        OK: _OK,
        error: _error,
        hookRequest: hookRequest,
        hookResponse: hookResponse,
        apiRoot: theApiRoot || './'
      };
    };
  }]);

  /** 签名拦截器 */
  serviceModule.factory('DJHttpHook', ['$q', '$rootScope', 'sign', function ($q, $rootScope, DJHttp) {

    return {
      request: function request(config) {
        config.urlBase = config.url;
        // 不是post，不拦截
        if (config.method != "POST" || config.hook === false) return config;

        var hook = config.hook || {};

        if (hook.hookRequest === false) return config;

        var hooked = DJHttp.hookRequest(config, _CHttpMockResponse);
        /** 如果签名后, 返回模拟服务器数据, 则不发出请求 */
        if (hooked instanceof _CHttpMockResponse) {
          /** 先使用该模拟服务器数据拒绝，阻止发出请求，然后在响应错误拦截中，将重新兑现 */
          return $q.reject(hooked);
        }

        // 只是进行 url 拦截
        if (hook.hookRequest == 'url') {
          config.url = hooked.url;
        }

        // 只是进行 签名 拦截
        else if (hook.hookRequest == 'sign') {
            config.data = hooked.post;
          }

          // 进行 url 和 签名 拦截
          else {
              config.data = hooked.post;
              config.url = hooked.url;
            }
        return config;
      },
      requestError: function requestError(rejection) {
        // do something on request error
        console.log('签名拦截器, 请求拒绝=', rejection);
        return $q.reject(rejection);
      },
      response: function response(_response) {
        // 不是post，不拦截
        if (_response.config.method != "POST" || _response.config.hook === false) return _response;

        var hook = _response.config.hook || {};

        if (hook.hookResponse === false) return _response;

        // 进行响应拦截
        return DJHttp.hookResponse(_response, $q);
      },
      responseError: function responseError(rejection) {
        /** 如果请求时, 使用模拟服务器数据, 则: 重新兑现 */
        if (rejection instanceof _CHttpMockResponse) {
          return $q.when(rejection.data);
        }
        return $q.reject(rejection);
      }
    };
  }]);

  /** 注册拦截器，立即生效 */
  serviceModule.config(["$httpProvider", function ($httpProvider) {
    $httpProvider.interceptors.push("DJHttpHook");
  }]);
}(angular, window);

!function (window, angular, undefined) {
  var theModule = angular.module('component-interceptor', []);

  /**
   * 拦截 angular 的默认组件构造方法，并重写
   */
  theModule.config(["$compileProvider", function ($compile) {
    var fn = $compile.component;
    $compile.component = function (name, options) {
      RegisterComponent(name, options);
      fn.call(this, name, options);
    };
  }]);

  /**
   * 拦截登记
   */
  function RegisterComponent(componentName, options) {
    RegisterComponent[componentName] = options;
  };

  /**
   * 拦截服务
   */
  theModule.provider("componentInterceptor", [function () {
    this.RegisterComponent = RegisterComponent;
    this.$get = function () {
      return RegisterComponent;
    };
  }]);

  theModule.component('djView', {
    bindings: {
      component: '@'
    },
    controller: ['$scope', '$element', '$compile', function ($scope, $element, $compile) {
      var _this4 = this;

      this.$onChanges = function (changes) {
        compileComponent(_this4.component);
      };

      /** 编译生成动态组件 */
      var compileComponent = function compileComponent(name) {
        if (!name) {
          $element.html("");
          return;
        }
        var a = $scope.$emit("dj-view-start", RegisterComponent[transformStr(name)]);
        $element.html('<' + name + '></' + name + '>');
        $compile($element.contents())($scope);
      };
    }]
  });

  /**
   * 字符串转成驼峰
   */
  function transformStr(str) {
    return str.replace(/-(\w)/g, function ($0, $1) {
      return $1.toUpperCase();
    });
  }
}(window, angular);