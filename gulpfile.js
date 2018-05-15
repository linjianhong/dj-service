
var theName = 'dj-service';

var
  gulp = require('gulp'),
  concat = require('gulp-concat'),
  babel = require("gulp-babel"),
  uglify = require('gulp-uglify'),
  cleanCSS = require('gulp-clean-css');


gulp.task('make-modules', function () {
  return gulp.src(['src/**/*.module.js'])
    .pipe(concat("1.js"))
    .pipe(gulp.dest("tmp"));
});

gulp.task('make-js', function () {
  return gulp.src(['src/**/*.js', '!src/**/*.module.js'])
    .pipe(concat("2.js"))
    .pipe(gulp.dest("tmp"));
});

gulp.task('make-css', function () {
  return gulp.src(['src/**/*.css'])
    .pipe(concat(theName + ".css"))
    .pipe(gulp.dest("dist"))
    .pipe(cleanCSS())
    .pipe(concat(theName + ".min.css"))
    .pipe(gulp.dest("dist"));
});

gulp.task('demo', function () {
  return gulp.src([
    "bower_components/angular/angular.js",
    "bower_components/angular-animate/angular-animate.js"
  ])
    .pipe(gulp.dest("demo"));
});

gulp.task('make-dist', ['make-modules', 'make-js', 'make-css', 'demo'], function () {
  return gulp.src(['tmp/1.js', 'tmp/2.js'])
    .pipe(concat(theName + ".js"))
    .pipe(babel({ presets: ['es2015'] }))
    .on('error', function (err) {
      console.log('babel 转换错误：', err);
      this.end();
    })
    .pipe(gulp.dest("dist"))
    .pipe(uglify({ compress: { drop_console: true } }))
    .pipe(concat(theName + ".min.js"))
    .pipe(gulp.dest("dist"));
});


gulp.task('default', ['make-dist']);
