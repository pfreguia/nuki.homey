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
Follow these steps to add your Nuki to Homey.
* First, make sure the Bridge HTTP API (https://developer.nuki.io/page/nuki-bridge-http-api-1-11/4/) in your Nuki Bridge is enabled. You can do this within the Nuki smartphone app. Go to “Manage your devices” and select your Nuki Bridge. There you can enable the HTTP API.
* Once enabled, go to the Homey app and add a Nuki device by selecting the “Nuki Direct” icon and then “Nuki Smart Lock” or “Nuki Homey”.
* Tap the “Connect” button and wait for the searching process to start.
* Press the button of your Nuki Bridge during the searching process.
* Select the Nuki device(s) you wish to add to Homey and confirm.

Your Nuki device(s) have now been added to Homey.

## Release Notes
### v3.0.3 - 2020-08-28
This is the first version after the handover of the app development. New developer and new intents.

* **Differentiate the aspect from the Nuki app by Athom to avoid appearing as a duplicate app**  
The new name "Nuki Direct" emphasizes straight, fast, reliable communication between Homey and Nuki devices. The app's icon and color have also been changed.
* **Highlight the extra features offered by Nuki and implemented by this app over the standard features of Homey**  
For this purpose, the icon and title of the device status displayed by the app have been changed; the trigger flow cards related to specific Nuki events have also been modified.
* **Make Smart Lock and Opener devices more homogeneous**  
Before this version the devices were managed by two different developers and it was difficult to adopt the same model and the same terminology for the two devices.
* **Simplify the app**  
Whenever a new version is released, new features are introduced; when introducing new features, existing features should also be re-evaluated: Is the new functionality consistent with the existing ones? Is the application getting too complicated? Am I creating overlapping features?   
After this re-evaluation the Continuous mode of the Opener and the Smart Lock battery status have been simplified. The device settings have been reordered. The pairing instructions have been refined.
* **Improve security**  
In my opinion the possibility to unlatch a Smart Lock (or an Opener) directly from the Homey app user interface is dangerous; a single wrong tap can open the door when you are miles away from home! For now, I have hidden the unlatch command from the user interface. If there are no counter-observations, I will remove it completely in the future.
* **Resolve known issues**  
The "Nuki Opener Ring Action" trigger flow card added to version 3.0.0 did not work correctly; furthermore, the Timestamp tag associated with this flow-card was difficult to use in practice.  
The problem has been solved and the tag has been removed and replaced by a new condition flow card: "Doorbell rang {less | more} than n seconds ago".

### v3.0.2 - 2020-08-17
* App structure refactored using Homeycompose model in order to reduce the duplicated code between SmartLock driver and Opener driver.
* Smartlock and Opener have different objects (SmartLock: 4xAA batteries; Opener: power supply or 4xAAA batteries). Created a specific Energy object for each driver.
* Added to Opener devices an event handler that reacts immediately to Power Settings change.
* Fixed a small comparison error that prevents the manual pairing of a SmartLock device.
* Manual pairing of SmartLock and Opener: fixed the resolved promise argument (the custom view needs a result object, not the true constant).

### v3.0.1 - 2020-08-08
* Started updating the app structure using Homeycompose.
* Fixed manual pairing.

### v3.0.0 - 2020-08-06
* Updated to SDK3 (this require Homey firmware 5.x).
* Fixed issue with triggercards for Continuous mode for Nuki opener.
* Added instructions in pairing wizard.
* Added battery percentage for Nuki Lock (requires Nuki Bridge firmware 2.7.0 and Nuki Lock firmware 2.8.1)
* Added triggercard for Nuki Opener Ring actions including timestamp token (requires Nuki Bridge firmware 2.7.0 and Nuki Opener firmware 1.5.1)
* Added Nuki Opener setting for configuring battery powered device. When enabled the battery alarm capability will be available
* Added functionality where the Nuki will show as unreachable when it cant be reached
