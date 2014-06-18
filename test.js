'use strict';

var IpUtil = require('./index.js');
var co = require('co');
var isIp = IpUtil.isIP;

describe('ipUtil utils method', function () {
  it('#isIp()', function() {
    isIp('1.1').should.be.false;
    isIp('').should.be.false;
    isIp().should.be.false;
    isIp('300.255.255.255').should.be.false;
    isIp('0.0.0').should.be.false;

    isIp('0.0.0.0').should.be.true;
    isIp('255.255.255.255').should.be.true;
  });
  it('#ipToLong()', function () {
    var l = IpUtil.ip2Long('61.172.201.235');
    (l).should.be.type('number');
    (l).should.be.eql(1034734059);
    var l2 = IpUtil.ip2Long('173.194.127.243');
    (l2).should.be.eql(2915205107);

    var l3 = IpUtil.ip2Long('224.224.224.224');
    (l3).should.be.eql(3772834016);
  });

  it('#longToIp()', function () {
    var ip = IpUtil.long2Ip(1034734059);
    (ip).should.be.type('string');
    (ip).should.be.eql('61.172.201.235');
  });
});

describe('find ip info, gbk', function() {
  var ipUtil;
  before(function(done) {
    ipUtil = new IpUtil('ip-gbk.txt');
    ipUtil.on('done', function() {
      done();
    });
  });

  it('getIPInfo()', function() {
    (ipUtil.getIpInfo('10.1.1.1') === null).should.be.ok;
    (ipUtil.getIpInfo('10.1.') === null).should.be.ok;
    ipUtil.getIpInfo('1.26.6.0').city.should.be.eql('呼伦贝尔');
  });
});

describe('find ip info, utf8', function() {
  var ipUtil;
  before(function(done) {
    ipUtil = new IpUtil('ip-utf8.txt', 'utf8');
    ipUtil.on('done', function() {
      done();
    });
  });

  it('getIPInfo()', function() {
    (ipUtil.getIpInfo('10.1.1.1') === null).should.be.ok;
    (ipUtil.getIpInfo('10.1.') === null).should.be.ok;
    ipUtil.getIpInfo('1.26.6.0').city.should.be.eql('呼伦贝尔');
  });
});


describe('test generator', function() {
  var ipUtil;
  before(function(done) {
    co(function*(){
      ipUtil = yield IpUtil.getIpUtil('ip-utf8.txt', 'utf8');
      done();
    })();
  });

  it('getIPInfo()', function() {
    (ipUtil.getIpInfo('10.1.1.1') === null).should.be.ok;
    (ipUtil.getIpInfo('10.1.') === null).should.be.ok;
    ipUtil.getIpInfo('1.26.6.0').city.should.be.eql('呼伦贝尔');
  });
});

describe('test generator not found file.', function() {
  var ipUtil;
  before(function(done) {
    co(function* (){
      try {
        ipUtil = yield IpUtil.getIpUtil('ip-utf81.txt', 'utf8');
      } catch(e) {
        ipUtil = null;
      }
      done();
    })();
  });

  it('ipUtil is null.', function() {
    (ipUtil === null).should.be.ok;
  });
});

describe('test loading the foreign ip address.', function() {
  var ipUtil;
  before(function(done) {
    ipUtil = new IpUtil('ip-gbk.txt', function(country) {
      if (country === '中国') {
        return false;
      } else {
        return true;
      }
    });

    ipUtil.on('done', function() {
      done();
    });
  });

  it('国内 ip 返回都为空.', function() {
    (ipUtil.getIpInfo('10.1.1.1') === null).should.be.ok;
    (ipUtil.getIpInfo('1.26.6.0') === null).should.be.ok;
    (ipUtil.getIpInfo('1.194.184.0') === null).should.be.ok;

    ipUtil.getIpInfo('1.0.0.0').country.should.equal('澳大利亚');
    ipUtil.getIpInfo('1.1.64.0').country.should.equal('日本');
  });
});
