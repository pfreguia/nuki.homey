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
        switch (args.body.deviceType) {
          case 0:  // SmartLock
            let device = Homey.ManagerDrivers.getDriver("nuki").getDevice({"id": args.body.nukiId});
            let state = util.returnLockState(args.body.state);
            let locked = util.returnLocked(args.body.state);

            // update capability locked
            if (locked != device.getCapabilityValue('locked')) {
              device.setCapabilityValue('locked', locked);
            }

            // update capability lockstate & trigger lockstateChanged
            if (state != device.getCapabilityValue('lockstate')) {
              device.setCapabilityValue('lockstate', state);
              Homey.ManagerFlow.getCard('trigger', 'lockstateChanged').trigger(device, { lockstate: state }, {});
            }

            // trigger batteryCritical
            if (args.body.batteryCritical == true && (device.getCapabilityValue('alarm_battery') == false || device.getCapabilityValue('alarm_battery') == null)) {
              device.setCapabilityValue('alarm_battery', true);
            } else if (args.body.batteryCritical == false && device.getCapabilityValue('alarm_battery') == true) {
              device.setCapabilityValue('alarm_battery', false);
            }
            break;
          case 2: // Opener
            let opener = Homey.ManagerDrivers.getDriver("opener").getDevice({ "id": args.body.nukiId });
            opener.updateCapabilitiesValue(args.body);
            break;
        }
      } catch (error) {
        callback(error, false);
      }
		}
	}
]
