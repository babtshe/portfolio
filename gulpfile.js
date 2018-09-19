const del = require(`del`);
const gulp = require(`gulp`);
const sass = require(`gulp-sass`);
const plumber = require(`gulp-plumber`);
const postcss = require(`gulp-postcss`);
const autoprefixer = require(`autoprefixer`);
const server = require(`browser-sync`).create();
const mqpacker = require(`css-mqpacker`);
const minify = require(`gulp-csso`);
const rename = require(`gulp-rename`);
const imagemin = require(`gulp-imagemin`);
const svgstore = require(`gulp-svgstore`);
const rollup = require(`gulp-better-rollup`);
const sourcemaps = require(`gulp-sourcemaps`);
const mocha = require(`gulp-mocha`);
const commonjs = require(`rollup-plugin-commonjs`);
const babel = require(`rollup-plugin-babel`);
const nodeResolve = require(`rollup-plugin-node-resolve`);
const uglify = require(`gulp-uglify`);

gulp.plumbedSrc = (path) => {
  return gulp.src(path)
  .pipe(plumber());
};

gulp.task(`style`, () => {
  return gulp.plumbedSrc(`source/scss/style.scss`).
    pipe(sass()).
    pipe(postcss([
      autoprefixer({
        browsers: [
          `last 1 version`,
          `last 2 Chrome versions`,
          `last 2 Firefox versions`,
          `last 2 Opera versions`,
          `last 2 Edge versions`
        ]
      }),
      mqpacker({sort: true})
    ])).
    pipe(gulp.dest(`build/css`)).
    pipe(server.stream()).
    pipe(minify()).
    pipe(rename(`style.min.css`)).
    pipe(gulp.dest(`build/css`));
});

gulp.task(`sprite`, () => {
  return gulp.plumbedSrc(`source/img/sprite/*.svg`)
  .pipe(svgstore({
    inlineSvg: true
  }))
  .pipe(rename(`sprite.svg`))
  .pipe(gulp.dest(`build/img`));
});

gulp.task(`scripts`, () => {
  return gulp.plumbedSrc(`source/js/main.js`)
    .pipe(sourcemaps.init())
    .pipe(rollup({
      plugins: [
        nodeResolve(),
        commonjs(),
        babel({
          babelrc: false,
          exclude: `node_modules/**`,
          presets: [`@babel/env`]
        })
      ]
    }, `iife`))
    .pipe(uglify())
    .pipe(sourcemaps.write(``))
    .pipe(gulp.dest(`build/js`));
});

gulp.task(`imagemin`, [`copy`], () => {
  return gulp.plumbedSrc(`source/img/**/*.{jpg,png,gif}`).
    pipe(imagemin([
      imagemin.optipng({optimizationLevel: 3}),
      imagemin.jpegtran({progressive: true})
    ])).
    pipe(gulp.dest(`build/img`));
});

gulp.task(`copy-html`, () => {
  return gulp.plumbedSrc(`source/*.{html,ico}`).
    pipe(gulp.dest(`build`)).
    pipe(server.stream());
});

gulp.task(`copy`, [`copy-html`, `scripts`, `style`, `sprite`], () => {
  return gulp.plumbedSrc([
    `source/fonts/**/*.{woff,woff2}`], {base: `.`}).
    pipe(gulp.dest(`build`));
});

gulp.task(`clean`, () => {
  return del(`build`);
});

gulp.task(`js-watch`, [`scripts`], (done) => {
  server.reload();
  done();
});

gulp.task(`serve`, [`build`], () => {
  server.init({
    server: `./build`,
    notify: false,
    open: true,
    port: 3502,
    ui: false
  });

  gulp.watch(`source/scss/**/*.{scss,sass}`, [`style`]);
  gulp.watch(`source/*.html`).on(`change`, (e) => {
    if (e.type !== `deleted`) {
      gulp.start(`copy-html`);
    }
  });
  gulp.watch(`source/js/**/*.js`, [`js-watch`]);
});

gulp.task(`assemble`, [`clean`], () => {
  gulp.start(`copy`, `style`);
});

gulp.task(`build`, [`assemble`], () => {
  gulp.start(`imagemin`);
});

gulp.task(`test`, function () {
  return gulp
  .plumbedSrc([`source/js/**/*.test.js`])
  .pipe(rollup({
    plugins: [
      commonjs()
    ]}, `cjs`))
  .pipe(gulp.dest(`build/test`))
  .pipe(mocha({
    reporter: `spec`
  }));
});
