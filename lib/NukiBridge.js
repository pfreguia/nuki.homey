const Homey = require('homey');
const NukiDevice = require('../../lib/NukiDevice.js');
const NukiApp = require('../../app.js');
const fetch = require('node-fetch');

const myCallbackPathname = '/api/app/nuki.homey/callback/';
var bridges = [];
var createdBridgeCnt = 0;


class NukiBridge extends Homey.SimpleClass {

  constructor(ip, port, token) {
    super();
    this.ip = ip;
    this.port = port;
    this.token = token;
    this.devices = [];
    this._id = createdBridgeCnt++;
    this._callbackChecked = false;
    this._checkCallbackTimer = null;
    this._refreshDevicesTimer = null;
  }


  log(...args) {
    let d = new Date();
    let z = function (n) {
        if (n <= 9) {
          return '0' + n;
      }
      return n;
    };
    let formatted_date = d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' +
      z(d.getDate()) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes()) + ':' +
      z(d.getSeconds());
    console.log(formatted_date, '[log]', '[' + this.constructor.name + ']',
      '[' + this._id + ']', ...args);
  }


  async _checkCallback() {
    this._checkCallbackTimer = null;
    try {
      const homeyLocalAddress = await this.devices[0].homey.cloud.getLocalAddress();
      const callbackObj = await this.sendRequest('callback/list', [], 4000);
      const callbacks = callbackObj.callbacks;
      let callbackCount = 0;
      let aCallbackId = '';
      for (let callback of callbacks) {
        callbackCount++;
        aCallbackId = callback.id;
        const aURL = new URL(callback.url);
        if (aURL.pathname == myCallbackPathname) {
          // A callback for this app is already present in the Bridge.
          this.log('A callback for this app is already present in the Bridge');
          let urlLocalAddress = aURL.hostname;
          if (aURL.port) {
            urlLocalAddress = urlLocalAddress + ':' + aURL.port;
          }
          else {
            urlLocalAddress = urlLocalAddress + ':80';
          }
          if (urlLocalAddress == homeyLocalAddress) {
            // The callback URL for this app is up to date.
            this.log('The Bridge callback URL for this app is up to date');
            this._callbackChecked = true;
          }
          else {
            // The callback URL for this app needs to be updated (a likely
            //  reason is: Homey local address has been changed). Remove the
            //  existing callback. 
            await this.sendRequest('callback/remove', [['id', callback.id]], 4000);
            callbackCount--;
          }
          break;
        }
      }
      if (!this._callbackChecked) {
        if (callbackCount >= 3) {
          // Nuki does not allow more than 3 callback in the list. Remove
          //  at random one of the existing callbacks (this may damage other apps).
          await this.sendRequest('callback/remove', [['id', aCallbackId]], 4000);
        }
        // Add the callback
        const callbackUrl = 'http://' + homeyLocalAddress + myCallbackPathname;
        await this.sendRequest('callback/add', [['url', encodeURI(callbackUrl)]], 4000);
        this._callbackChecked = true;
      }
    }
    catch (error) {
      this.log('Bridge callback check error. Retry after 10 seconds');
      for (let device of this.devices) {
        if (device.getAvailable()) {
          device.setUnavailable();
        }
      }
      this._checkCallbackTimer = setTimeout(() => this._checkCallback(), 10000);
      return;
    }
    this.log('Bridge callback successfully checked');
    for (let device of this.devices) {
      if (!device.getAvailable()) {
        device.setAvailable();
      }
    }
    this._refreshDevices();
  }


  async _removeCallback() {
    if (this._checkCallbackTimer) {
      clearTimeout(this._checkCallbackTimer);
      this._checkCallbackTimer = null;
    }
    const callbackObj = await this.sendRequest('callback/list', [], 4000);
    const callbacks = callbackObj.callbacks;
    for (let callback of callbacks) {
      const aURL = new URL(callback.url);
      if (aURL.pathname == myCallbackPathname) {
        // Found the callback to be deleted. Send a request for removing 
        //  the callback.
        await this.sendRequest('callback/remove', [['id', callback.id]], 4000);
        break;
      }
    }
  }

  _checkResponse = (res) => {
    if (res.ok) {
      return res;
    } else {
      if (res.status == 400) {
        throw new Error(this.devices[0].homey.__('util.400'));
      } else if (res.status == 401) {
        throw new Error(this.devices[0].homey.__('util.401'));
      } else if (res.status == 404) {
        throw new Error(this.devices[0].homey.__('util.404'));
      } else if (res.status == 503) {
        throw new Error(this.devices[0].homey.__('util.503'));
      } else {
        throw new Error('HTTP error ' + res.status);
      }
    }
  }


  async _refreshDevices() {
    this.log('refreshDevices');
    this._refreshDevicesTimer = null;
    let bridgeItems = [];
    try {
      bridgeItems = await this.sendRequest('list', [], 4000);
    }
    catch (error) {
      this._refreshDevicesTimer = setTimeout(() => this._refreshDevices(), 10000);
      for (let device of this.devices) {
        if (device.getAvailable()) {
          device.setUnavailable();
        }
      }
      return;
    }
    this._refreshDevicesTimer = setTimeout(() => this._refreshDevices(), 300000);
    for (let device of this.devices) {
      const bridgeItem = bridgeItems.find(el => el.nukiId === device.getData().id);
      if (bridgeItem.lastKnownState) {
        if (!device.getAvailable()) {
          device.setAvailable();
        }
        device.updateCapabilitiesValue(bridgeItem.lastKnownState);
      }
      else {
        if (device.getAvailable()) {
          device.setUnavailable();
        }
        device.log('device unavailable');
      }
    }
  }


  static addDevice(deviceToBeAdded) {
    const deviceIp = deviceToBeAdded.getSetting('address');
    const devicePort = deviceToBeAdded.getSetting('port');
    const deviceToken = deviceToBeAdded.getSetting('token');
    let deviceBridge = null;
    for (let bridge of bridges) {
      if (deviceIp == bridge.ip && devicePort == bridge.port) {
        deviceBridge = bridge;
        break;
      }
    }
    if (!deviceBridge) {
      deviceToBeAdded.log('First device of the Bridge');
      deviceBridge = new NukiBridge(deviceIp, devicePort, deviceToken);
      bridges.push(deviceBridge);
      deviceBridge.devices.push(deviceToBeAdded);
      // First device for this Bridge. Check the callback URL. 
      deviceBridge._checkCallback();
    }
    else {
      deviceToBeAdded.log('Next device of the Bridge');
      deviceBridge.token = deviceToken;
      deviceBridge.devices.push(deviceToBeAdded);
    }
    return deviceBridge;
  }


  removeDevice(deviceToBeRemoved) {
    for (let i in this.devices) {
      if (this.devices[i] == deviceToBeRemoved) {
        this.devices.splice(i, 1);
        if (this.devices.length == 0) {
          // No more devices for this Bridge. Remove the callback without 
          //  waiting for the outcome.
          this._removeCallback();
        }
        break;
      }
    }
  }


  static onCallback(body) {
    for (let bridge of bridges) {
      let deviceOfCallback = null;
      for (let device of bridge.devices) {
        if (device.getData().id == body.nukiId) {
          deviceOfCallback = device;
          break;
        }
      }
      if (deviceOfCallback) {
        if (bridge._refreshDevicesTimer) {
          clearTimeout(bridge._refreshDevicesTimer);
          bridge._refreshDevicesTimer = null;
        }
        bridge._refreshDevicesTimer = setTimeout(() => bridge._refreshDevices(), 300000);
        deviceOfCallback.log('HTTP event', body);
        deviceOfCallback.updateCapabilitiesValue(body);
        break;
      }
    }
  }


  sendRequest(path, searchParams, timeout) {
    const base = 'http://' + this.ip + ':' + this.port;
    const aURL = new URL(path, base);
    if (searchParams) {
      for (let pair of searchParams) {
        aURL.searchParams.append(pair[0], pair[1]);
      }
    }
    aURL.searchParams.append('token', this.token);
    this.log('HTTP request', aURL.toString());
    const requestDateTime = new Date();
    return new Promise((resolve, reject) => {
      fetch(aURL.toString(), {
        method: 'GET',
        timeout: timeout
      })
        .then(this._checkResponse)
        .then(res => res.json())
        .then(json => {
          const elapsedMsecs = new Date().getTime() - requestDateTime.getTime();
          this.log('HTTP response (' + elapsedMsecs + 'ms)', json);
          return resolve(json);
        })
        .catch(error => {
          return reject(error);
        });
    })
  }


  async forceRefresh() {
    this._refreshDevices();
  }

}


module.exports = NukiBridge;

