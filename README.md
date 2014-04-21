iputil
======

查询指定 ip 所在地. 
### 支持的 IP 数据格式

```
10.5.18.0, 10.5.18.255, 中国, 福建, null, 中国福建省
10.5.0.0, 10.5.255.255, 中国, 福建, 福州, 中国福建省
1.0.0.0, 1.0.0.255, 澳大利亚, null, null, 澳大利亚
1.0.1.0, 1.0.3.255, 中国, 福建, null, 中国福建省
1.0.4.0, 1.0.7.255, 澳大利亚, null, null, 澳大利亚
1.0.8.0, 1.0.15.255, 中国, 广东, null, 中国广东省
```

### 使用

```
var IpUtil = require('iputil');

ipUtil = new IpUtil('ip-utf8.txt', 'utf8');

ipUtil.getIpInfo('1.12.0.0').country; // 中国
ipUtil.getIpInfo('1.12.0.0').province; // 北京 
ipUtil.getIpInfo('1.12.0.0').city; // 北京   );

ipUtil_gbk = new IpUtil('ip-gbk.txt');

ipUtil_gbk.getIpInfo('1.12.0.0').country; // 中国
ipUtil_gbk.getIpInfo('1.12.0.0').province; // 北京 
ipUtil_gbk.getIpInfo('1.12.0.0').city; // 北京 ;

```

### 注意
用到了 es6 的生成器, 所以需要使用 node 0.11.x 以上的版本.
