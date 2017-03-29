/**
 * Deploys the build artifact to heroku
 * @author Greg Rozmarynowycz <greg@thunderlab.net>
 */
'use strict';

const deploy = require('heroku-deploy-tarball');

const tarball = 'dist.tar.gz';
const config = {
    master    : {tarball, app: 'pulsar-api-stage'},
};

deploy(config[process.env.CIRCLE_BRANCH || 'master']);
