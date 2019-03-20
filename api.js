const Homey = require('homey');
const util = require('/lib/util.js');

module.exports = [
	{
		description: 'Nuki Callbacks',
		method   : 'POST',
		path     : '/callback/',
		public   : true,
		fn: function(args, callback) {
      try {
        let smartlocks = Homey.ManagerDrivers.getDriver("nuki").getDevices();
        let state = util.returnLockState(args.body.state);
        let locked = util.returnLocked(args.body.state);

        Object.keys(smartlocks).forEach((key) => {
          if (smartlocks[key].getSetting('nukiId') == args.body.nukiId.toString()) {

            // update capability locked
            if (locked != smartlocks[key].getCapabilityValue('locked')) {
              smartlocks[key].setCapabilityValue('locked', locked);
            }

            // update capability lockstate & trigger lockstateChanged
            if (state != smartlocks[key].getCapabilityValue('lockstate')) {
              smartlocks[key].setCapabilityValue('lockstate', state);
              Homey.ManagerFlow.getCard('trigger', 'lockstateChanged').trigger(smartlocks[key], { lockstate: state }, {});
            }

            // trigger batteryCritical
            if (args.body.batteryCritical == true && smartlocks[key].getStoreValue('batteryCritical') == false) {
              Homey.ManagerFlow.getCard('trigger', 'batteryCritical').trigger(this, {}, {});
              smartlocks[key].setStoreValue('batteryCritical', true);
            } else if (args.body.batteryCritical == false && smartlocks[key].getStoreValue('batteryCritical') == true) {
              smartlocks[key].setStoreValue('batteryCritical', false);
            }

            callback(null, true);
          } else {
            callback('No Nuki added to Homey with this ID', false);
          }
        });
      } catch (error) {
        callback(error, false);
      }
		}
	}
]
