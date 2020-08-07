'use strict';

const fetch = require('node-fetch');

class Util {

  constructor(opts) {
    this.homey = opts.homey;
  }

  getHomeyIp() {
    return new Promise(async (resolve, reject) => {
      try {
        let localAddress = await this.homey.cloud.getLocalAddress();
        return resolve(localAddress);
      } catch (error) {
        return reject(error);
      }
    })
  }

  sendCommand(path, timeout) {
    return new Promise((resolve, reject) => {
      fetch(path, {
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

  returnLockState(state) {
    switch (state) {
      case 0:
        return this.homey.__('util.uncalibrated');
        break;
      case 1:
        return this.homey.__('util.locked');
        break;
      case 2:
        return this.homey.__('util.unlocking');
        break;
      case 3:
        return this.homey.__('util.unlocked');
        break;
      case 4:
        return this.homey.__('util.locking');
        break;
      case 5:
        return this.homey.__('util.unlatched');
        break;
      case 6:
        return this.homey.__('util.unlocked_go');
        break;
      case 7:
        return this.homey.__('util.unlatching');
        break;
      case 254:
        return this.homey.__('util.motor_blocked');
        break;
      default:
        return this.homey.__('util.undefined');
        break;
    }
  }

  returnLocked(state) {
    switch (state) {
      case 1:
        return true;
        break;
      default:
        return false;
        break;
    }
  }

  checkStatus = (res) => {
    if (res.ok) {
      return res;
    } else {
      if (error == 400) {
        throw new Error(this.homey.__('util.400'));
      } else if (error == 401) {
        throw new Error(this.homey.__('util.401'));
      } else if (error == 404) {
        throw new Error(this.homey.__('util.404'));
      } else if (error == 503) {
        throw new Error(this.homey.__('util.503'));
      } else {
        throw new Error(error.status);
      }
    }
  }

}

module.exports = Util;
