# ----------------------------------------------------------------------------------------------------
# Name: rsvg-convert
# Description: Installs rsvg-convert (from librsvg2-bin) for converting SVG files into PNG, PDF, and other formats.
# Author: FileFlows
# Revision: 1
# Icon: fas fa-vector-square:#FFFF00
# ----------------------------------------------------------------------------------------------------

#!/bin/bash

# Function to handle errors
function handle_error {
    echo "An error occurred. Exiting..."
    exit 1
}

# Check if the --uninstall option is provided
if [ "$1" == "--uninstall" ]; then
    echo "Uninstalling rsvg-convert..."
    if apt-get remove -y librsvg2-bin; then
        echo "rsvg-convert successfully uninstalled."
        exit 0
    else
        handle_error
    fi
fi

# Check if rsvg-convert is installed
if command -v rsvg-convert &>/dev/null; then
    echo "rsvg-convert is already installed."
    exit 0
fi

echo "rsvg-convert is not installed. Installing..."

# Update package lists and install rsvg-convert
if ! apt-get -qq update || ! apt-get install -yqq librsvg2-bin; then
    handle_error
fi

# Verify installation
if command -v rsvg-convert &>/dev/null; then
    echo "rsvg-convert successfully installed."
    exit 0
fi

echo "Failed to install rsvg-convert."
exit 1
