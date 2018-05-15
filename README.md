# dj-service angular modules

## Guide

* wxjssdk
* dj-http
* dj-localStorage-table


## Install with Bower
$ bower install dj-service


## Usage

#### Use after download

```
<!-- after include angular.js  -->
<script src="yourlibpath/dj-service-0.1.0.js"></script>
```


#### Use with Bower
add dependencies in `bower.json` like this:
```
  "dependencies": {
    "angular": "^1.6.1",
    "dj-service": "0.1.0",
    //...
  }
```


#### incluce the angular modules as need

```
  angular.module('my-app', [
    'wx-jssdk',
    'dj-http',
    'dj-localStorage-table',
    // ...
  ]);
```





