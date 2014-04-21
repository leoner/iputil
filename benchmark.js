/**!
 * iputil - benchmark.js
 *
 * Copyright(c) fengmk2 and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   fengmk2 <fengmk2@gmail.com> (http://fengmk2.github.com)
 */

'use strict';

/**
 * Module dependencies.
 */

var path = require('path');
var Benchmark = require('benchmark');
var IpUtil = require('./');

var ipfile = path.join(__dirname, 'ip.dat');
var iputil;

function init() {
  var start = Date.now();
  console.log('initing iputil');
  iputil = new IpUtil(ipfile);
  console.log('done, use %d ms', Date.now() - start);
  run();
}

function run() {
  var suite = new Benchmark.Suite();

  var ips = [
    '115.193.152.250',
    '222.73.68.35',
    '220.191.113.36'
  ];

  for (var i = 0; i < ips.length; i++) {
    var ip = ips[i];
    console.log('iputil.getIpInfo("%s"): %j', ip, iputil.getIpInfo(ip));
  }

  // add tests
  suite
  .add('iputil.getIpInfo() one ip', function() {
    iputil.getIpInfo(ips[0]);
  })
  .add('iputil.getIpInfo() three ips', function() {
    iputil.getIpInfo(ips[0]);
    iputil.getIpInfo(ips[1]);
    iputil.getIpInfo(ips[2]);
  })

  // add listeners
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').pluck('name'));
  })
  // run async
  .run({ 'async': true });
}

init();
