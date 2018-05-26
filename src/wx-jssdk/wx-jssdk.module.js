!(function (angular, window, undefined) {
  // 只在微信浏览器中运行
  // @var useWX: 是否应该使用微信 JSSDK
  var isWx = (/micromessenger/i).test(navigator.userAgent);
  var useWX = location.origin.length > 12 && location.origin.indexOf('192.168') < 0 && isWx;
  var initWx;
  var theModule = angular.module('wx-jssdk', []);
  var theCounter = 80000;

  /** 微信 JSSDK 初始化 */
  theModule.run(['$http', '$q', function ($http, $q) {

    initWx = function () {
      // 只在微信浏览器中运行
      if (!useWX) return $q.reject('not wx');
      if (initWx.promise) {
        return $q.when(initWx.promise);
      }

      var deferred = $q.defer();
      var wx_app_name = window.theSiteConfig && window.theSiteConfig.wx_app.wx.name || 'pgy-wx';
      var url = location.href.split('#')[0];

      $http.post("app/jsapi_sign", { name: wx_app_name, url: encodeURIComponent(url) })
        .then(function (json) {
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
              'onMenuShareTimeline',
              'onMenuShareAppMessage',
              'onMenuShareQQ',
              'onMenuShareWeibo',
              'onMenuShareQZone',
              'startRecord',
              'stopRecord',
              'onVoiceRecordEnd',
              'playVoice',
              'pauseVoice',
              'stopVoice',
              'onVoicePlayEnd',
              'uploadVoice',
              'downloadVoice',
              'chooseImage',
              'previewImage',
              'uploadImage',
              'downloadImage',
              'translateVoice',
              'getNetworkType',
              'openLocation',
              'getLocation',

              'hideOptionMenu',
              'showOptionMenu',
              'hideMenuItems',
              'showMenuItems',
              'hideAllNonBaseMenuItem',
              'showAllNonBaseMenuItem',
              'closeWindow',
              'scanQRCode',
              'chooseWXPay'
            ]
          });

          wx.ready(function () {
            deferred.resolve(initWx.promise = wx);
          });
        })
        .catch(e => {
          deferred.reject('getWjSign error!');
        });

      return initWx.promise = deferred.promise;
    }

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
        success: function (res) {
          deferTimeline.resolve(res);
        },
        cancel: function (res) {
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
        success: function (res) {
          deferAppMessage.resolve(res);
        },
        cancel: function (res) {
          deferAppMessage.reject(res);
        }
      });
      return {
        onMenuShareTimeline: deferTimeline.promise,
        onMenuShareAppMessage: deferAppMessage.promise,
      }
    };

    return {
      initWx: function () { return initWx(); },
      setShare: function (options) {
        var defaultShare = window.theSiteConfig && window.theSiteConfig.wx_share || {};
        options = angular.extend({}, defaultShare, options);
        options.shareTitle = options.shareTitle || options.title; // 发送到朋友圈标题

        return initWx().then(wx => reshare(wx, options));
      },
    }
  }]);



  /** 提供 JSSDK 功能 */
  theModule.run(['$rootScope', '$http', '$q', 'sign', 'WxJssdk', function ($rootScope, $http, $q, sign, WxJssdk) {

    /**
     * 用 $http 模拟 WX-JSSDK
     */
    sign.registerHttpHook({
      match: /^WxJssdk\/(.*)$/i,
      hookRequest: function (config, mockResponse, match) {
        return mockResponse.resolve(WxJssdk[match[1]]());
      }
    });


    /**
     * 请求二维码扫描
     */
    sign.registerHttpHook({
      match: /^扫描二维码$/,
      hookRequest: function (config, mockResponse) {
        var deferred = $q.defer();
        initWx().then(wx => {
          wx.scanQRCode({
            needResult: 1, // 默认为0，扫描结果由微信处理，1则直接返回扫描结果，
            scanType: ["qrCode", "barCode"], // 可以指定扫二维码还是一维码，默认二者都有
            success: function (res) {
              var result = res.resultStr; // 当needResult 为 1 时，扫码返回的结果
              console.log('扫描结果 = ', result);
              deferred.resolve(result);
            },
            fail: function (res) {
              deferred.reject(res);
            }
          });
        }).catch(e => {
          deferred.resolve('10' + ++theCounter);
          //deferred.reject(e);
          //console.log("请求二维码扫描错误", e);
        })
        return mockResponse.resolve(deferred.promise)
      }
    });

    /**
     * 请求二维码扫描（模拟，用于调试）
     */
    sign.registerHttpHook({
      match: /^模拟扫描二维码$/,
      hookRequest: function (config, mockResponse) {
        var deferred = $q.defer();
        window.setTimeout(() => {
          console.log('模拟扫描结果 = ', config.data || '模拟数据');
          deferred.resolve(config.data || '模拟数据');
        }, 120)
        return mockResponse.resolve(deferred.promise)
      }
    });

  }]);

})(angular, window);
