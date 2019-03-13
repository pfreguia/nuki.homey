# Nuki for Homey (Bridge API version)
This is an alternative Homey app for the Nuki Smart Lock. The official app in the Homey app store created by Athom uses the web API for communication with your Nuki. This app polls your device for changes in the lockstate which reduces the battery life of your Nuki and depends on an internet connection between your Nuki Bridge and the Nuki cloud. This alternative app only requires internet access during pairing of your Nuki but relies completely on local communication between Homey and your Nuki for updates in lockstate changes. When your Nuki changes the lockstate it will notify Homey directly of the changed lockstate without the need to poll your Nuki. Another difference it that it brings back the other possible lockactions like "Lock n Go" which are missing in the official Homey app. So benefits from this app of the official app are:
* no internet connection needed for communication between Homey and Nuki
* no polling needed for lockstate updates
* faster response times because direct communication
* being able to set all possible lock actions

The app works similar to the previous community app (which was removed from the app store when Athom published their app) but has been completely rewritten with the following additions:
- SDK2 and therefor future proof
- auto discovery of Nuki Smart Locks during pairing (no manual entries)
- better mechanism for adding the callback URL to Nuki (needed for sending lockstate changes from Nuki to Homey)
- better icons
- custom capabilities for lockstate and lockaction
- less code, smaller footprint

## Adding your Nuki
Follow these steps to add your Nuki to Homey.
* Select the 'Nuki Smart Lock' app when adding a device and select a Nuki Smart Lock
* Confirm adding a Nuki Smart Lock and wait for the discovery process to start
* Press the button of your Nuki Bridge(s) during the discovery process
* Select the Nuki(s) you wish to add to Homey and confirm
You Nuki(s) have now been added to Homey.
