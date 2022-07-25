'use strict';

const NukiDriver = require('../../lib/NukiDriver.js');


class SmartLockDriver extends NukiDriver {

  get nukiDeviceType() {
    return [0, 4];
  }

  onInit() {
    
  }

}

module.exports = SmartLockDriver;
