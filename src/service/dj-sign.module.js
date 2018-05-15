!(function (angular, window, undefined) {

  var serviceModule = angular.module('dj-http', []);

  /** 解决 post 问题 */
  serviceModule.config(["$httpProvider", function ($httpProvider) {
    $httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';
    var param = function (obj) {
      var query = '', name, value, fullSubName, subName, subValue, innerObj, i;
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
        }
        else if (value instanceof Object) {
          for (subName in value) {
            subValue = value[subName];
            fullSubName = name + '[' + subName + ']';
            innerObj = {};
            innerObj[fullSubName] = subValue;
            query += param(innerObj) + '&';
          }
        }
        else if (value !== undefined && value !== null)
          query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
      }
      return query.length ? query.substr(0, query.length - 1) : query;
    };

    // Override $http service's default transformRequest
    $httpProvider.defaults.transformRequest = [function (data) {
      return angular.isObject(data) && String(data) !== '[object File]' ? param(data) : data;
    }];
  }])
  serviceModule.config(['$qProvider', function ($qProvider) {
    $qProvider.errorOnUnhandledRejections(false);
  }]);


  /** 模拟 response 响应的数据类型 */
  var CHttpMockResponse;
  function OK(datas, other) {
    return angular.extend({
      errcode: 0,
      datas
    }, other);
  }
  function error(errcode, errmsg, other) {
    return angular.extend({
      errcode,
      errmsg
    }, other);
  }
  serviceModule.run(['$q', '$http', function ($q, $http) {
    /** 为识别模拟服务器数据 */
    CHttpMockResponse = function (data) {
      if (!(this instanceof CHttpMockResponse)) {
        return new CHttpMockResponse(data);
      }
      this.data = data;
    }

    var prototype = {
      $q,
      $http,
      OK: function (datas, other) {
        return CHttpMockResponse.resolve(OK(datas, other));
      },
      error: function (errcode, errmsg, other) {
        return CHttpMockResponse.reject(error(errcode, errmsg, other));
      },
      reject: function (data) {
        if (this instanceof CHttpMockResponse) {
          this.data = $q.reject(data);
          return this;
        }
        return new CHttpMockResponse($q.reject(data));
      },
      resolve: function (data) {
        if (this instanceof CHttpMockResponse) {
          this.data = $q.when(data);
          return this;
        }
        return new CHttpMockResponse($q.when(data));
      }
    }

    angular.extend(CHttpMockResponse, prototype);
    CHttpMockResponse.prototype = prototype
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
    this.setApiRoot = (apiRoot) => {
      theApiRoot = apiRoot;
      if (!/\/$/.test(theApiRoot)) theApiRoot += '/';
    }


    /**
     * 登记或注销 request/response 拦截
     */
    var theHttpHookRegistered = [];
    var registerHttpHook =
      this.registerHttpHook = (hook) => {
        theHttpHookRegistered.indexOf(hook) < 0 && theHttpHookRegistered.push(hook);
        return hook;
      };
    this.unRegisterHttpHook = (hook) => {
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
    this.registerDefaultRequestHook((config, mockResponse) => {
      var url = config.url;
      var data = config.data;
      if (!/^(http(s)?\:)?\/\//.test(url)) {
        url = theApiRoot + url
      }
      return { url, data }
    });


    /**
     * 默认的 response 拦截器，当拦截器中未定义响应处理进，按此处理
     * 用户可以自定义该拦截器, 多次定义，则最后一次有效
     */
    function defaultResponseHook(fn) {
      defaultResponseHook.fn = fn;
    }
    this.registerDefaultResponseHook = defaultResponseHook;
    this.registerDefaultResponseHook((response, $q) => {
      return $q.when(response.data).then(json => {
        if (json && +json.errcode === 0) return json;
        return $q.reject(json);
      })
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
          hooked = hook.hookRequest(config, CHttpMockResponse, match);
          if (hooked) {
            return hooked;
          }
        }
      }
      return defaultRequestHook.fn(config, CHttpMockResponse);
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
        registerHttpHook,
        OK,
        error,
        hookRequest: hookRequest,
        hookResponse: hookResponse,
        apiRoot: theApiRoot || './'
      }
    };
  }]);


  /** 签名拦截器 */
  serviceModule.factory('DJHttpHook', ['$q', '$rootScope', 'sign', function ($q, $rootScope, DJHttp) {

    return {
      request: function (config) {
        config.urlBase = config.url;
        // 不是post，不拦截
        if (config.method != "POST" || config.hook === false) return config;

        var hook = config.hook || {};

        if (hook.hookRequest === false) return config;

        var hooked = DJHttp.hookRequest(config, CHttpMockResponse);
        /** 如果签名后, 返回模拟服务器数据, 则不发出请求 */
        if (hooked instanceof CHttpMockResponse) {
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
      requestError: function (rejection) {
        // do something on request error
        console.log('签名拦截器, 请求拒绝=', rejection);
        return $q.reject(rejection)
      },
      response: function (response) {
        // 不是post，不拦截
        if (response.config.method != "POST" || response.config.hook === false) return response;

        var hook = response.config.hook || {};

        if (hook.hookResponse === false) return response;

        // 进行响应拦截
        return DJHttp.hookResponse(response, $q);
      },
      responseError: function (rejection) {
        /** 如果请求时, 使用模拟服务器数据, 则: 重新兑现 */
        if (rejection instanceof CHttpMockResponse) {
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

})(angular, window);
