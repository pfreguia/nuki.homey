"use strict";

const NukiDriver = require('../../lib/NukiDriver.js');
const Util = require('/lib/util.js');

class OpenerDriver extends NukiDriver {

  get nukiDeviceType() {
    return 2;
  }

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey });

    this.homey.flow.getDeviceTriggerCard('openerstateChanged');
    this.homey.flow.getDeviceTriggerCard('continuous_mode_true');
    this.homey.flow.getDeviceTriggerCard('continuous_mode_false');
    this.homey.flow.getDeviceTriggerCard('ring_action');
  }

}

module.exports = OpenerDriver;
