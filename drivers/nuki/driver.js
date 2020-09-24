'use strict';

const NukiDriver = require('../../lib/NukiDriver.js');
const Util = require('/lib/util.js');

class SmartLockDriver extends NukiDriver {

  get nukiDeviceType() {
    return 0;
  }

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.homey.flow.getDeviceTriggerCard('lockstateChanged');
  }

}

module.exports = SmartLockDriver;
