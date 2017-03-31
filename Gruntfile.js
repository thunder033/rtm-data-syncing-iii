/**
 * Created by gjr8050 on 2/24/2017.
 */

const browserify = {
    files: {
        'public/dist/bundle.js': 'src/ng/app.module.js',
    },
    options: {
        alias: {
            angular: './scripts/angular.min.proxy.js',
            'angular-ui-router': './node_modules/angular-ui-router/release/angular-ui-router.min.js',
            'event-types': './node_modules/pulsar-lib/dist/src/event-types',
            'game-params': './node_modules/pulsar-lib/dist/src/game-params',
            'entity-types': './node_modules/pulsar-lib/dist/src/entity-types',
        },
        browserifyOptions: {
            paths: ['./node_modules', './src/'],
        },
    },
};

module.exports = (grunt) => {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        browserify: {
            dev: {
                files: browserify.files,
                options: {
                    alias: browserify.options.alias,
                    browserifyOptions: {
                        debug: true,
                        paths: ['./node_modules', './src/'],
                    },
                },
            },
            dist: browserify,
        },
        // jshint: {
        //     options: {
        //         jshintrc: true,
        //         reporter: require('jshint-stylish')
        //     },
        //     all: ['src/ng/**/*.js']
        // },
        clean: {
            all: ['public/dist/*'],
            pulsarDist: ['public/dist/*'],
            tmp: ['.tmp/*'],
        },
        copy: {
            prod: {
                files: [{expand: true,
                    src: [
                    // Pulsar
                    'public/dist/**/*.js',
                    'public/index.html',
                    'public/assets/**',
                    'public/views/**',

                    'src/**/*.js',
                    'src/tsconfig.json',
                    // angular js included in dist bundle
                    '!src/ng/**/*.js',

                    'LICENSE',
                    'tsconfig.json',
                    'package.json',
                ],
                    dest: '.tmp'}],
            },
            pulsarAssets: {
                files: [
                    { expand: true, cwd: 'pulsar/assets/fonts', src: ['*'], dest: 'pulsar/dist/fonts/'},
                ],
            },
        },
        watch: {
            js: {
                files: ['src/ng/**/*.js'],
                tasks: ['browserify:dev'],
            },
        },
    });

    grunt.loadNpmTasks('grunt-browserify');
    // grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');

    grunt.registerTask('default', ['build-dev']);

    grunt.registerTask('build-dev', [
        // 'jshint:all',
        'clean:pulsarDist',
        'browserify:dev',
        //'copy:pulsarAssets'
    ]);

    grunt.registerTask('build-prod', [
        // 'jshint:all',
        'clean:pulsarDist',
        'browserify:dist',
        // 'copy:pulsarAssets',
        'copy:prod',
        //'clean:pulsarDist'
    ]);
};
