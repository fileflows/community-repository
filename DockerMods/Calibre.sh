# ----------------------------------------------------------------------------------------------------
# Name: Calibre
# Description: Calibre is an open-source eBook management tool for converting and organizing digital books. It should be installed when using the Book plugin.
# Author: FileFlows
# Revision: 1
# Icon: data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiANCgkgdmlld0JveD0iMCAwIDUxMi4wMzIgNTEyLjAzMiIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQo8cmVjdCB4PSI4My4zNjgiIHk9IjI0LjMyIiBzdHlsZT0iZmlsbDojZWU5OyIgd2lkdGg9IjMyNC42NzIiIGhlaWdodD0iODYiLz4NCjxwYXRoIHN0eWxlPSJmaWxsOiNkZDAyMzQ7IiBkPSJNNDMyLjcxMiwxMDIuNjI0Yy01LjcyOC03LjM2LTE5LjIzMi0zMC45NiwwLjgxNi03MC42MjRoMTIuNTI4VjBIMTI0LjcxMg0KCWMtMzcuMDQsMC02Ny4xODQsMzAuMjA4LTY3LjE4NCw2Ny4zMTJ2MzU4LjI0YzAsMzAuMjg4LDguMzUyLDUzLjM3NiwyNC44MzIsNjguNjA4YzE3LjU4NCwxNi4yNzIsMzguMzIsMTcuODcyLDQ1LjQwOCwxNy44NzINCgljMS4zMjgsMCwyLjE5Mi0wLjA0OCwyLjQ0OC0wLjA4aDMyNC4yODhWMTAyLjYyNEg0MzIuNzEyeiBNMTI0LjcxMiwxMDIuNjI0Yy0xOS4zOTIsMC0zNS4xODQtMTUuODQtMzUuMTg0LTM1LjMxMg0KCVMxMDUuMzA0LDMyLDEyNC43MTIsMzJoMjczLjg3MmMtMTEuNiwzMC40LTguNDMyLDU0LjI0LTIuMDE2LDcwLjYyNEgxMjQuNzEyeiIvPg0KPHBvbHlsaW5lIHN0eWxlPSJmaWxsOiMyNUI2RDI7IiBwb2ludHM9IjE0My4yMDgsMTAyLjYyNCAxNDMuMjA4LDM1Ny42NjQgMjI2LjUzNiwyODQuMDY0IDMwNC4zMTIsMzU2LjMyIDMwNC4zMTIsMTAyLjYyNCAiLz4NCjwvc3ZnPg==
# ----------------------------------------------------------------------------------------------------

#!/bin/bash

# Function to handle errors
function handle_error {
    echo "An error occurred. Exiting..."
    exit 1
}

# Check if the --uninstall option is provided
if [ "$1" == "--uninstall" ]; then
    echo "Uninstalling Calibre..."
    if apt-get remove -y calibre; then
        echo "Calibre successfully uninstalled."
        exit 0
    else
        handle_error
    fi
fi

# Check if calibre is installed
if command -v ebook-convert &>/dev/null; then
    echo "Calibre is already installed."
    exit 0
fi

echo "Calibre is not installed. Installing..."

# Update package lists and install calibre
if ! apt-get -qq update || ! apt-get install -yqq calibre; then
    handle_error
fi

echo "Installation complete."

# Verify installation
if command -v ebook-convert &>/dev/null; then
    echo "Calibre successfully installed."
    exit 0
fi

echo "Failed to install Calibre."
exit 1