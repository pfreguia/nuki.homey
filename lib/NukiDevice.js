'use strict';

const Homey = require('homey');

class NukiDevice extends Homey.Device {

  onAdded() {
    this.setCallbackUrl.bind(this);
  }

  async setCallbackUrl() {
    try {
      let homeyaddress = await this.util.getHomeyIp();
      let callbackUrl = 'http://' + homeyaddress + '/api/app/nuki.homey/callback/';
      let callbackListPath = 'http://' + this.getSetting('address') + ':' + this.getSetting('port') + '/callback/list?token=' + this.getSetting('token');
      let callbackList = await this.util.sendCommand(callbackListPath, 4000);
      let callbacks = JSON.stringify(callbackList.callbacks);
      if (!callbacks.includes(encodeURI(callbackUrl))) {
        let callbackAddPath = 'http://' + this.getSetting('address') + ':' + this.getSetting('port') + '/callback/add?url=' + encodeURI(callbackUrl) + '&token=' + this.getSetting('token');
        let result = await this.util.sendCommand(callbackAddPath, 4000);
      }
    } catch (error) {
      this.log(error);
    }
  }

}

module.exports = NukiDevice;
