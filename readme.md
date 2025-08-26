# FileFlows Repository

This is the official repository for FileFlows.

You can create a new script and submit a pull request to get it included in the official repository


## Types of Scipts
1. Flow Scripts
These are scripts that are executed during a flow and need to adhere to a strict format.
See the official [documentation](https://fileflows.com/docs/scripting/javascript/flow-scripts/) for more information.

2. System Scripts
These scripts are scirpts that are run by the system as either scheduled tasks or a pre-execute task on a processing node.
These do not have to follow such a strict format as the the Flow scripts as these take in no inputs and produce no outputs.

3. Shared Scripts
These are scripts that can be imported by other scripts and will not directly be called by FileFlows

## Types of Templates
1. Function
These are templates that are shown to the user when they edit a [Function](https://fileflows.com/docs/plugins/basic-nodes/function) node.
