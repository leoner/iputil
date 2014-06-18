var fs = require('fs');
var join = require('path').join;
var iconv = require('iconv-lite');
var debug = require('debug')('ip');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var thunkify = require('thunkify-wrap');

function IpUtil(ipFile, encoding, isLoad) {
  if (typeof encoding === 'function') {
    isLoad = encoding;
    encoding = null;
  }

  this.ipFile = joinDirectory(process.cwd(), ipFile);
  this.ipList = [];
  if (encoding && encoding.toLowerCase().indexOf('utf') > -1) {
    this.filter = function(buf) {
      return buf.toString();
    };
  } else {
    this.filter = function(buf) {
      return iconv.decode(new Buffer(buf), 'gbk');
    };
  }

  this.isLoad = isLoad || function(){
    return true;
  };

  this.init();
}

util.inherits(IpUtil, EventEmitter);

IpUtil.prototype.init = function() {
  var that = this;
  var isLoad = this.isLoad;

  debug('begin parse ipfile %s', this.ipFile);
  if (!fs.existsSync(this.ipFile)) {
    debug('not found ip file!');
    that.emit('error', 'ipfile_not_found');
    return;
  }

  var ipMap = this.ipMap = {};
  var ipList = this.ipList;

  var getLine = readLine(this.ipFile, this.filter);
  var result = getLine.next();
  var line;
  var lineNum = 0;

  var counter = 1;
  var _readLine = function () {
    if (result.done) {
      that.emit('loaded');
      return;
    }

    // 避免ip读取独占cpu.
    if (counter % 100000 === 0) {
      counter = 1;
      setImmediate(_readLine);
      return;
    }
    counter++;

    lineNum++;

    line = result.value;

    if (!line || !line.trim()) {
      result = getLine.next();
      _readLine();
      return;
    }

    var tokens = line.split(',', 6);

    if (tokens.length !== 6) {
      debug('第%d行格式不正确: %s', lineNum, line);
      result = getLine.next();
      _readLine();
      return;
    }

    var startIp = ip2Long(tokens[0]);
    var endIp = ip2Long(tokens[1]);

    if (!startIp || !endIp) {
      debug('第%d行格式不正确: %s', lineNum, line);
      result = getLine.next();
      _readLine();
      return;
    }

    var country = getValue(tokens[2]);
    var province = getValue(tokens[3]);
    var city = getValue(tokens[4]);
    var address = getValue(tokens[5]);

    // 针对国家、省份、城市解析的统一判空修改
    // 首先对特殊值的解析
    if ('IANA' === country) {
      country = 'IANA';
      province = 'IANA';
      city = 'IANA';
    }

    if ('局域网' === country) {
      country = '局域网';
      province = '局域网';
      city = '局域网';
    }

    if('国外' === country) {
      country = '国外';
      province = '国外';
      city = '国外';
    }

    if('中国' === country && ('中国' === province || '中国' === city)) {
      country = '中国';
      province = '中国';
      city = '中国';
    }

    if (!isLoad(country, province, city)) {
      result = getLine.next();
      setImmediate(_readLine);
      return;
    }

    ipMap[startIp] = {
      startIp: startIp,
      endIp: endIp,
      country: country,
      province: province,
      city: city,
      address: address
    };
    ipList.push(startIp);

    result = getLine.next();

    setImmediate(_readLine);
  };

  _readLine();

  var sortIp = function () {
    //debug(this.ipMap)
    debug('完成IP库的载入. 共载入 %d 条IP纪录', ipList.length);
    ipList.sort(function(a, b) {
      return a - b;
    });
    debug('ip 索引排序完成.');
    that.emit('done');
  };

  this.on('loaded', sortIp);
};

function getValue(val) {
  if (!val) {
    return null;
  }

  val = val.trim();

  if (val === 'null') {
    return null;
  }

  return val;
}

IpUtil.prototype.getIpInfo = function(ip) {
  if (!isIp(ip)) {
    return null;
  }
  if (typeof ip === 'string') {
    ip = ip2Long(ip);
  }

  var ipStart = this.locatStartIP(ip);
  debug('开始获取 ip 信息: %d', ipStart);
  var ipInfo = this.ipMap[ipStart];

  debug('查找IP, %s 成功.', long2IP(ip));

  if (ipInfo.endIp < ip) {
    debug('在IP库中找不到IP[%s]', long2IP(ip));
    return null;
  }
  return ipInfo;
};

IpUtil.prototype.refreshData = function() {

};


/**
 * 查找ip对应的开始IP地址。如果IP库中正好有以该ip开始的IP信息，那么就是返回这个ip。
 * 如果没有，则应该是比这个ip小的最大的start
 * @param ip
 * @return
*/
IpUtil.prototype.locatStartIP = function(ip) {
  debug('开始查找IP: %d', ip);
  var centerIP = 0;
  var centerIndex = 0; // 当前指针位置
  var startIndex = 0; // 起始位置
  var endIndex = this.ipList.length - 1; // 结束位置
  var count = 0; // 循环次数

  while (true) {
    debug('%d. start = %d, end = %d', count++, startIndex, endIndex);
    // 中间位置
    centerIndex = Math.floor((startIndex + endIndex) / 2);
    centerIP = this.ipList[centerIndex];
    if (centerIP < ip) {
      // 如果中间位置的IP小于要查询的IP，那么下一次查找后半段
      startIndex = centerIndex;
    } else if (centerIP > ip) {
      // 如果中间位置的IP大于要查询的IP，那么下一次查找前半段
      endIndex = centerIndex;
    } else {
      // 如果相等，那么已经找到要查询的IP
      break;
    }

    if (startIndex + 1 === endIndex) {
      // 如果开始指针和结束指针相差只有1，那么说明IP库中没有正好以该ip开始的IP信息
      // 只能返回IP信息的start ip比这个ip小的最大的那条IP信息的start ip
      if (centerIP > ip) {
        centerIP = this.ipList[centerIndex - 1];
      }
      break;
    }
  }

  debug('对应的IP开始地址为: %d', centerIP, centerIndex);
  return centerIP;
};

/**
 * a,b,c ==> a/b/c
 * a,b,/tmp ==> /tmp
 * /a/b, c ==> /a/b/c
 */
function joinDirectory() {
  var dirs = [].slice.call(arguments, 1);
  var dir;
  for (var i = 0, len = dirs.length; i < len; i++) {
    dir = dirs[i];
    if (/^\//.test(dir)) {
      // 发现根目录, 直接返回.
      return dir;
    }
  }
  return join.apply(null, [].slice.call(arguments));
}

function ip2Long(ip) {

  if (!isIp(ip)) {
    return 0;
  }

  var segs = ip.split('.');
  var iplong =(parseInt(segs[0]) << 24
      | parseInt(segs[1]) << 16
      | parseInt(segs[2]) << 8
      | parseInt(segs[3])) >>> 0;
  return iplong;
}

var IP_REGEXP = /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/;
function isIp(str) {
  if (!str) {
    return false;
  }

  str = str.trim();

  return IP_REGEXP.test(str);

  /**
  var tokens = str.split('.');

  if (tokens.length !== 4) {
    return false;
  }

  for (var i = 0, len = tokens.length; i < len; i++) {
    if (parseInt(tokens[i]) > 255 || parseInt(tokens[i]) < 0) {
      return false;
    }
  }
  return true;
  **/
}

function long2IP(ipLong) {
  var ip = [ipLong >> 24];
  ip.push((ipLong & 16711680) >> 16);
  ip.push((ipLong & 65280) >> 8);
  ip.push(ipLong & 255);
  return ip.join('.');
}


function *readLine(file, filter) {
  var buffer = fs.readFileSync(file);
  var i = 0, len = 0 || buffer.length;
  debug('load file succ', len);

  // 换行符.
  var nl = require('os').EOL.charCodeAt(0);
  var buf = [];
  while(i < len) {
    if (buffer[i] !== nl) {
      buf.push(buffer[i]);
    } else {
      yield filter(new Buffer(buf));
      buf = [];
    }
    i++;
  }
}

module.exports = IpUtil;
module.exports.isIP = isIp;
module.exports.ip2Long = ip2Long;
module.exports.long2Ip = long2IP;
module.exports.getIpUtil = function *(ipFile, encoding, ipFilter) {
  var iputil = new IpUtil(ipFile, encoding, ipFilter);
  var end = thunkify.event(iputil, ['done', 'error']);
  yield end();
  return iputil;
};
