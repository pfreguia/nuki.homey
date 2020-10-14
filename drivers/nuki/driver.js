'use strict';

const NukiDriver = require('../../lib/NukiDriver.js');


class SmartLockDriver extends NukiDriver {

  get nukiDeviceType() {
    return 0;
  }

  onInit() {
    this.homey.flow.getDeviceTriggerCard('lockstateChanged');
  }

}

module.exports = SmartLockDriver;
