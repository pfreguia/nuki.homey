const Homey = require('homey');
const fetch = require('node-fetch');
var devices = {};

exports.sendCommand = function (path, timeout) {
  return new Promise(function (resolve, reject) {
    fetch(path, {
        method: 'GET',
        timeout: timeout
      })
      .then(checkStatus)
      .then(res => res.json())
      .then(json => {
        return resolve(json);
      })
      .catch(error => {
        return reject(error);
      });
  })
}

exports.returnLockState = function (state) {
  switch (state) {
    case 0:
      return Homey.__('uncalibrated');
      break;
    case 1:
      return Homey.__('locked');
      break;
    case 2:
      return Homey.__('unlocking');
      break;
    case 3:
      return Homey.__('unlocked');
      break;
    case 4:
      return Homey.__('locking');
      break;
    case 5:
      return Homey.__('unlatched');
      break;
    case 6:
      return Homey.__('unlocked (lock ‘n’ go)');
      break;
    case 7:
      return Homey.__('unlatching');
      break;
    case 254:
      return Homey.__('motor blocked');
      break;
    default:
      return Homey.__('undefined');
      break;
  }
}

exports.returnLocked = function (state) {
  switch (state) {
    case 1:
      return true;
      break;
    default:
      return false;
      break;
  }
}

exports.getHomeyIp = function () {
  return new Promise(function (resolve, reject) {
    Homey.ManagerCloud.getLocalAddress()
      .then(localAddress => {
        return resolve(localAddress);
      })
      .catch(error => {
        return reject(error);
      })
  })
}

function checkStatus(res) {
  if (res.ok) {
    return res;
  } else {
    console.log(res.status);
    throw new Error(res.status);
  }
}

function isEmpty(obj) {
  for(var prop in obj) {
    if(obj.hasOwnProperty(prop))
      return false;
  }
  return true;
}
