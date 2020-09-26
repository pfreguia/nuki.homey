# Nuki Direct
This is an alternative Homey app for the Nuki Smart Lock and Nuki Opener. Differently from The Nuki app created by Athom (https://apps.athom.com/app/io.nuki) that relies on the Nuki cloud service for controlling your devices, Nuki Direct uses nothing but your local network for communications between your Homey and your Nuki devices (internet access is optionally used for simplifying the initial pairing of a device). When a Nuki device changes its state, it will notify the new state directly to Homey. When Homey issues a command to a Smart Lock or to an Opener, it will send the request directly to the device.  
So, benefits of this approach over the cloud approach are:
* No internet connection needed for communication between Homey and Nuki.
* Improved reliability: it does work even if the internet is down or the Nuki cloud service is temporarily unavailable.
* Quick responsiveness thanks to the direct communication: the faster Homey knows about a state change, the better Homey can serve us.
* Simpler code, smaller memory footprint.

Nuki Direct can also manage the extra features provided by Nuki API in addition to the standard commands, settings, capabilities and flow cards supplied by Homey. With Nuki Direct you can fine-tune the settings and control the specific lock states and events of your Nuki devices.

Since Nuki Direct and Nuki app by Athom have been developed with distinct APIs, they can happily run side by side on the same Homey without interfering.

## Adding your devices
Follow these steps to add your Nuki devices to Homey.
* First, make sure the Bridge HTTP API (https://developer.nuki.io/page/nuki-bridge-http-api-1-11/4/) in your Nuki Bridge is enabled. You can do this within the Nuki smartphone app. Go to "Manage your devices" and select your Nuki Bridge. There you can enable the HTTP API.
* Once enabled, go to the Homey app and add a Nuki device by selecting the "Nuki Direct" icon and then "Nuki Smart Lock" or "Nuki Opener".
* Tap the "Connect" button and wait for the searching process to start.
* Press the button of your Nuki Bridge during the searching process.
* Select the Nuki device(s) you wish to add to Homey and confirm.

Your Nuki device(s) have now been added to Homey.

## Release Notes for the latest version (release notes of previous versions are available at https://github.com/pfreguia/nuki.homey/releases)
### v3.0.4 - 2020-09-25
* Overlapping actions. Electromechanical actions such as Unlock and Lock, take time to actuate (from a few seconds to a few tens of seconds for the Lock ‘n’ Go). Therefore, it may occur that an action (from user interface or from an action flow) starts when another action is already in progress. Previous versions of Nuki Direct did not handle explicitly overlapping actions and this could lead to unexpected behaviors. This version applies the following rules to overlapping actions (i.e.: action B starts before the action A is finished). RULE 1: If action B is the same as action A (for example: B is a Lock action in progress and A is also a Lock action) then action B simply waits for the completion of A and return success. RULE 2: If action B is different from action A (for example: A is a Lock action in progress and B is an Open/Unlatch action) then action B is rejected. The action flow card "Nuki action" provides a new setting that optionally enables the following RULE 3: If the action B defined in the flow card is different from action A (same as RULE 2) then the flow card defers the execution of action B after the completion of action A. These rules also apply to more than two actions.
* The ability to open a door directly from the Homey app user interface has been reintroduced (it was removed in v3.0.3 for security reason). In order to avoid accidental opening the original tap gesture has been replaced by a swipe gesture on a slider. The slider can be hidden in the "Advanced Settings" of the device.
* Added German UI language (partial translation).
* Pairing procedure reviewed. Manual pairing procedure improved (stronger input verification; "Test connection" button, "Connect" button, "Close" button merged into a single "Connect" button).
* Keypad battery (minimum firmware version required: Keypad firmware 1.7, Bridge firmware 2.7.0/1.17.1, Smart Lock firmware 2.8.3/1.10.1, Opener firmware 1.5.2). The availability of a Nuki Keypad is automatically detected. If a Keypad is detected, the Keypad battery status is shown in the \"Battery\" page of the device (Smart Lock or Opener) it is paired with. Also added trigger flow cards and condition flow card for Keypad battery alarm.
* Fixed an error introduced in v3.0.3: the Open/Unlatch action of the "Nuki action" action flow cards did not work.