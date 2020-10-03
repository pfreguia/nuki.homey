const Homey = require('homey');
const NukiDevice = require('../../lib/NukiDevice.js');
const Util = require('/lib/util.js');


class NukiBridge {

  constructor(ip, port, token) {
    this.ip = ip;
    this.port = port;
    this.token = token;
    this.devices = [];
  }

  static addDevice(device) {
    const deviceIp = device.getSetting('address');
    const devicePort = device.getSetting('port');
    const deviceToken = device.getSetting('token');
    let deviceBridge = null;
    for (let bridge of bridges) {
      if (deviceIp == bridge.ip && devicePort == bridge.port) {
        deviceBridge = bridge;
        break;
      }
    }
    if (!deviceBridge) {
      deviceBridge = new NukiBridge(deviceIp, devicePort, deviceToken);
      bridges.push(deviceBridge);
    }
    else
      deviceBridge.token = deviceToken;
    deviceBridge.devices.push(device);
    return deviceBridge;
  }

  removeDevice(device) {

  }

  sendRequest(path, searchParams, timeout) {
    const base = 'http://' + this.ip + ':' + this.port;
    const aURL = new URL(path, base);
    if (searchParams) {
      for (let pair of searchParams) {
        aURL.searchParams.append(pair[0], pair[1]);
      }
    }
    aURL.searchParams.append('token', this.getSetting('token'));
    return new Promise((resolve, reject) => {
      fetch(aURL.toString(), {
        method: 'GET',
        timeout: timeout
      })
        .then(this.checkStatus)
        .then(res => res.json())
        .then(json => {
          return resolve(json);
        })
        .catch(error => {
          console.log(error);
          return reject(error);
        });
    })
  }

}

var bridges = [];

module.exports = NukiBridge;

