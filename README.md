# ILIAS Exercise Reminder

This is a CLI tool to add google tasks for ILIAS Exercises

[![Prebuild Binary Status](https://github.com/IcyTv/ilias-exercise-reminder/actions/workflows/generate-executables.yaml/badge.svg)](https://github.com/IcyTv/ilias-exercise-reminder/actions/workflows/generate-executables.yaml)

## Disclaimer

At the moment, this is pretty much pure jank, if you find issues or have improvement suggestions
please add a new issue [here](https://github.com/IcyTv/ilias-exercise-reminder/issues).

Also right now this is limited to the KIT ILIAS system, since I cannot validate it for any other systems
and cannot implement login for other systems.

## Usage

Run `<PROGRAM NAME> -u <U Abbreviation>`

For more information (since this program is probably prone to changes)
run `<PROGRAM NAME> --help`

## Development

This uses `yarn@berry` for package management.

Make sure you have yarn installed (if not run `npm -g install yarn`)

Then you can run `yarn` to install

`yarn start` starts the program
