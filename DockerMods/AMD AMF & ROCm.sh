# ----------------------------------------------------------------------------------------------------
# Name: AMD AMF & ROCm (Encode + Compute)
# Author: Lusoris
# Description: Full AMD GPU enablement for FileFlows. Installs the hardware video ENCODE capabilities - VA-API (universal Linux path, works on every AMD GPU incl. iGPUs) plus the AMF runtime for the discrete GPUs AMF supports - and optionally the ROCm / OpenCL COMPUTE stack (off by default, opt-in via AMD_AMF_PROFILE=standard/opencl). Choosing/configuring the encoder is done in FileFlows. Auto-detects the GPU (incl. iGPU ROCm via HSA override), amd64-only, uses AMD's official repos + amdgpu-install (--no-dkms, container-safe), self-updates with apt garbage-collection, and uninstalls cleanly.
# Revision: 1
# Icon: data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhLS0gQ3JlYXRlZCB3aXRoIElua3NjYXBlIChodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy8pIC0tPgoKPHN2ZwogICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iCiAgIHhtbG5zOmNjPSJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyMiCiAgIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyIKICAgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogICB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgaW5rc2NhcGU6ZXhwb3J0LXlkcGk9IjEwMCIKICAgaW5rc2NhcGU6ZXhwb3J0LXhkcGk9IjEwMCIKICAgaW5rc2NhcGU6ZXhwb3J0LWZpbGVuYW1lPSIvaG9tZS9hbGVjaXZlL1Njcml2YW5pYS9maXJlZm94VGVzdDEucG5nIgogICBzb2RpcG9kaTpkb2NuYW1lPSJhbWQtYXRpLnN2ZyIKICAgaW5rc2NhcGU6dmVyc2lvbj0iMC40OC4zLjEgcjk4ODYiCiAgIHZlcnNpb249IjEuMSIKICAgaWQ9InN2ZzIiCiAgIGhlaWdodD0iNTEyIgogICB3aWR0aD0iNTEyIj4KICA8c29kaXBvZGk6bmFtZWR2aWV3CiAgICAgaWQ9ImJhc2UiCiAgICAgcGFnZWNvbG9yPSIjZmZmZmZmIgogICAgIGJvcmRlcmNvbG9yPSIjNjY2NjY2IgogICAgIGJvcmRlcm9wYWNpdHk9IjEuMCIKICAgICBpbmtzY2FwZTpwYWdlb3BhY2l0eT0iMC4wIgogICAgIGlua3NjYXBlOnBhZ2VzaGFkb3c9IjIiCiAgICAgaW5rc2NhcGU6em9vbT0iMS41ODI5MDE2IgogICAgIGlua3NjYXBlOmN4PSIyOTkiCiAgICAgaW5rc2NhcGU6Y3k9IjIxMyIKICAgICBpbmtzY2FwZTpkb2N1bWVudC11bml0cz0icHgiCiAgICAgaW5rc2NhcGU6Y3VycmVudC1sYXllcj0ic3ZnMiIKICAgICBzaG93Z3JpZD0iZmFsc2UiCiAgICAgaW5rc2NhcGU6d2luZG93LXdpZHRoPSIxMzAxIgogICAgIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9Ijc0NCIKICAgICBpbmtzY2FwZTp3aW5kb3cteD0iNjUiCiAgICAgaW5rc2NhcGU6d2luZG93LXk9IjI0IgogICAgIGlua3NjYXBlOndpbmRvdy1tYXhpbWl6ZWQ9IjEiCiAgICAgaW5rc2NhcGU6b2JqZWN0LXBhdGhzPSJmYWxzZSIKICAgICBpbmtzY2FwZTpzbmFwLWludGVyc2VjdGlvbi1wYXRocz0iZmFsc2UiCiAgICAgaW5rc2NhcGU6b2JqZWN0LW5vZGVzPSJ0cnVlIgogICAgIGlua3NjYXBlOnNuYXAtc21vb3RoLW5vZGVzPSJ0cnVlIgogICAgIGlua3NjYXBlOnNuYXAtbm9kZXM9InRydWUiIC8+CiAgPGRlZnMKICAgICBpZD0iZGVmczQiPgogICAgPGxpbmVhckdyYWRpZW50CiAgICAgICBpZD0ibGluZWFyR3JhZGllbnQyNDYwIgogICAgICAgeTI9IjQ0Ljk4NDAwMSIKICAgICAgIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIgogICAgICAgeDI9IjE5LjM2MDAwMSIKICAgICAgIHkxPSIyMS4wMzA4MDQiCiAgICAgICB4MT0iMTkuMjQ0OTk5Ij4KICAgICAgPHN0b3AKICAgICAgICAgaWQ9InN0b3AzNjAyIgogICAgICAgICBzdHlsZT0ic3RvcC1jb2xvcjojZmFmYWZhO3N0b3Atb3BhY2l0eToxOyIKICAgICAgICAgb2Zmc2V0PSIwIiAvPgogICAgICA8c3RvcAogICAgICAgICBpZD0ic3RvcDM2MDQiCiAgICAgICAgIHN0eWxlPSJzdG9wLWNvbG9yOiNmMGYwZjA7c3RvcC1vcGFjaXR5OjE7IgogICAgICAgICBvZmZzZXQ9IjEiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50CiAgICAgICB5Mj0iMjAuNjI1OTE2IgogICAgICAgeDI9IjEwMDYuODA4MiIKICAgICAgIHkxPSI0ODQuNDE3MjEiCiAgICAgICB4MT0iMTAxMi41MTMzIgogICAgICAgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgxLjAzMTc3OTYsMCwwLDEuMDMxNzc5NiwtODMwLjg2NDA2LDU5Mi42Nzc5MSkiCiAgICAgICBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIKICAgICAgIGlkPSJsaW5lYXJHcmFkaWVudDQxMTQtMi02IgogICAgICAgeGxpbms6aHJlZj0iI0J1dHRvblNoYWRvdy0wLTEtMS01LTkiCiAgICAgICBpbmtzY2FwZTpjb2xsZWN0PSJhbHdheXMiIC8+CiAgICA8bGluZWFyR3JhZGllbnQKICAgICAgIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMS4wMDU4NjUyLDAsMCwwLjk5NDE2OSwxMDAsMCkiCiAgICAgICBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIKICAgICAgIGlkPSJCdXR0b25TaGFkb3ctMC0xLTEtNS05IgogICAgICAgeTI9IjcuMDE2NTM5NiIKICAgICAgIHgyPSI0NS40NDc3MjciCiAgICAgICB5MT0iOTIuNTM5NTk3IgogICAgICAgeDE9IjQ1LjQ0NzcyNyI+CiAgICAgIDxzdG9wCiAgICAgICAgIG9mZnNldD0iMCIKICAgICAgICAgc3R5bGU9InN0b3AtY29sb3I6IzAwMDAwMDtzdG9wLW9wYWNpdHk6MSIKICAgICAgICAgaWQ9InN0b3AzNzUwLTgtOS0zLTYtNCIgLz4KICAgICAgPHN0b3AKICAgICAgICAgb2Zmc2V0PSIxIgogICAgICAgICBzdHlsZT0ic3RvcC1jb2xvcjojMDAwMDAwO3N0b3Atb3BhY2l0eTowLjU4ODIzNTMyIgogICAgICAgICBpZD0ic3RvcDM3NTItNS02LTQtMi05IiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudAogICAgICAgeTI9IjIwLjYyNTkxNiIKICAgICAgIHgyPSIxMDA2LjgwODIiCiAgICAgICB5MT0iNDg0LjQxNzIxIgogICAgICAgeDE9IjEwMTIuNTEzMyIKICAgICAgIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMS4wNDAyNTQxLDAsMCwxLjA0MDI1NDEsLTgzNy45NTExNiw1OTIuNTE4MjUpIgogICAgICAgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiCiAgICAgICBpZD0ibGluZWFyR3JhZGllbnQ0MTEyLTItNiIKICAgICAgIHhsaW5rOmhyZWY9IiNCdXR0b25TaGFkb3ctMC0xLTEtNS05IgogICAgICAgaW5rc2NhcGU6Y29sbGVjdD0iYWx3YXlzIiAvPgogICAgPGxpbmVhckdyYWRpZW50CiAgICAgICB5Mj0iMjAuNjI1OTE2IgogICAgICAgeDI9IjEwMDYuODA4MiIKICAgICAgIHkxPSI0ODQuNDE3MjEiCiAgICAgICB4MT0iMTAxMi41MTMzIgogICAgICAgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgxLjAyMzMwNSwwLDAsMS4wMjMzMDUsLTgyMy43NzcwNCw1OTIuODM3NTcpIgogICAgICAgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiCiAgICAgICBpZD0ibGluZWFyR3JhZGllbnQ0MTEwLTYtNyIKICAgICAgIHhsaW5rOmhyZWY9IiNCdXR0b25TaGFkb3ctMC0xLTEtNS05IgogICAgICAgaW5rc2NhcGU6Y29sbGVjdD0iYWx3YXlzIiAvPgogICAgPGxpbmVhckdyYWRpZW50CiAgICAgICB5Mj0iMjAuNjI1OTE2IgogICAgICAgeDI9IjEwMDYuODA4MiIKICAgICAgIHkxPSI0ODQuNDE3MjEiCiAgICAgICB4MT0iMTAxMi41MTMzIgogICAgICAgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgxLjAxNDgzMDUsMCwwLDEuMDE0ODMwNSwtODE2LjY4OTk2LDU5Mi45OTcyMykiCiAgICAgICBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIKICAgICAgIGlkPSJsaW5lYXJHcmFkaWVudDQxMTYtNi0zIgogICAgICAgeGxpbms6aHJlZj0iI0J1dHRvblNoYWRvdy0wLTEtMS01LTkiCiAgICAgICBpbmtzY2FwZTpjb2xsZWN0PSJhbHdheXMiIC8+CiAgICA8bGluZWFyR3JhZGllbnQKICAgICAgIGlua3NjYXBlOmNvbGxlY3Q9ImFsd2F5cyIKICAgICAgIHhsaW5rOmhyZWY9IiNCdXR0b25TaGFkb3ctMC0xLTEtNS05IgogICAgICAgaWQ9ImxpbmVhckdyYWRpZW50NTM0Mi0zIgogICAgICAgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiCiAgICAgICBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDEuMDA3NDE1MywwLDAsMS4wMDc0MTUzLC04MTAuNDg4NzksNTkzLjEzNjkpIgogICAgICAgeDE9IjEwMTIuNTEzMyIKICAgICAgIHkxPSI0ODQuNDE3MjEiCiAgICAgICB4Mj0iMTAwNi44MDgyIgogICAgICAgeTI9IjIwLjYyNTkxNiIgLz4KICAgIDxsaW5lYXJHcmFkaWVudAogICAgICAgeTI9IjM2My43MzgyNSIKICAgICAgIHgyPSI5ODguNzg1NTIiCiAgICAgICB5MT0iNTEuNTExNzY1IgogICAgICAgeDE9Ijk5My40Mzg5NiIKICAgICAgIGdyYWRpZW50VHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzc4LjU5OTc5LC0zNjAuNTU5NjMpIgogICAgICAgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiCiAgICAgICBpZD0ibGluZWFyR3JhZGllbnQ0MDg0LTgiCiAgICAgICB4bGluazpocmVmPSIjbGluZWFyR3JhZGllbnQzNzM3LTkiCiAgICAgICBpbmtzY2FwZTpjb2xsZWN0PSJhbHdheXMiIC8+CiAgICA8bGluZWFyR3JhZGllbnQKICAgICAgIGlkPSJsaW5lYXJHcmFkaWVudDM3MzctOSI+CiAgICAgIDxzdG9wCiAgICAgICAgIG9mZnNldD0iMCIKICAgICAgICAgc3R5bGU9InN0b3AtY29sb3I6I2ZmZmZmZjtzdG9wLW9wYWNpdHk6MSIKICAgICAgICAgaWQ9InN0b3AzNzM5LTciIC8+CiAgICAgIDxzdG9wCiAgICAgICAgIG9mZnNldD0iMSIKICAgICAgICAgc3R5bGU9InN0b3AtY29sb3I6I2ZmZmZmZjtzdG9wLW9wYWNpdHk6MCIKICAgICAgICAgaWQ9InN0b3AzNzQxLTQiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50CiAgICAgICB5Mj0iLTU1Ljk0MTIxNiIKICAgICAgIHgyPSIxNzYzLjY5MDMiCiAgICAgICB5MT0iMTU1LjU5Njg1IgogICAgICAgeDE9IjE3NjQuNjQ4NyIKICAgICAgIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIgogICAgICAgaWQ9ImxpbmVhckdyYWRpZW50NDA4Ni0xMiIKICAgICAgIHhsaW5rOmhyZWY9IiNsaW5lYXJHcmFkaWVudDQwNDYtMyIKICAgICAgIGlua3NjYXBlOmNvbGxlY3Q9ImFsd2F5cyIgLz4KICAgIDxsaW5lYXJHcmFkaWVudAogICAgICAgaWQ9ImxpbmVhckdyYWRpZW50NDA0Ni0zIj4KICAgICAgPHN0b3AKICAgICAgICAgb2Zmc2V0PSIwIgogICAgICAgICBzdHlsZT0ic3RvcC1jb2xvcjojMDAwMDAwO3N0b3Atb3BhY2l0eToxOyIKICAgICAgICAgaWQ9InN0b3A0MDQ4LTciIC8+CiAgICAgIDxzdG9wCiAgICAgICAgIG9mZnNldD0iMSIKICAgICAgICAgc3R5bGU9InN0b3AtY29sb3I6I2ZmZmZmZjtzdG9wLW9wYWNpdHk6MC4yIgogICAgICAgICBpZD0ic3RvcDQwNTAtNzMiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50CiAgICAgICBpbmtzY2FwZTpjb2xsZWN0PSJhbHdheXMiCiAgICAgICB4bGluazpocmVmPSIjbGluZWFyR3JhZGllbnQ0MDcyIgogICAgICAgaWQ9ImxpbmVhckdyYWRpZW50NDA3OCIKICAgICAgIHgxPSIzNS45MzU4MjkiCiAgICAgICB5MT0iMTA0My45MjAyIgogICAgICAgeDI9IjM1LjkzNTgyOSIKICAgICAgIHkyPSIxMDEzLjExOCIKICAgICAgIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiAvPgogICAgPGxpbmVhckdyYWRpZW50CiAgICAgICBpbmtzY2FwZTpjb2xsZWN0PSJhbHdheXMiCiAgICAgICBpZD0ibGluZWFyR3JhZGllbnQ0MDcyIj4KICAgICAgPHN0b3AKICAgICAgICAgc3R5bGU9InN0b3AtY29sb3I6I2MzNDAwMDtzdG9wLW9wYWNpdHk6MTsiCiAgICAgICAgIG9mZnNldD0iMCIKICAgICAgICAgaWQ9InN0b3A0MDc0IiAvPgogICAgICA8c3RvcAogICAgICAgICBzdHlsZT0ic3RvcC1jb2xvcjojZmY3NTMxO3N0b3Atb3BhY2l0eToxIgogICAgICAgICBvZmZzZXQ9IjEiCiAgICAgICAgIGlkPSJzdG9wNDA3NiIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQKICAgICAgIHgxPSI2LjYyMDEzMDEiCiAgICAgICB5MT0iMTYuMzg0Njg3IgogICAgICAgeDI9IjYuNjIwMTMwMSIKICAgICAgIHkyPSIxLjA5MjMxMjIiCiAgICAgICBpZD0ibGluZWFyR3JhZGllbnQzMDUzIgogICAgICAgeGxpbms6aHJlZj0iI2xpbmVhckdyYWRpZW50MzczMSIKICAgICAgIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIgogICAgICAgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgtNC41MDU3ODgzLDAsMCwzLjg4NDI4ODcsODEuMTI4OTA2LDE0LjA1NzE0NCkiIC8+CiAgICA8bGluZWFyR3JhZGllbnQKICAgICAgIGlkPSJsaW5lYXJHcmFkaWVudDM3MzEiPgogICAgICA8c3RvcAogICAgICAgICBpZD0ic3RvcDM3MzMiCiAgICAgICAgIHN0eWxlPSJzdG9wLWNvbG9yOiNkY2RjZGM7c3RvcC1vcGFjaXR5OjEiCiAgICAgICAgIG9mZnNldD0iMCIgLz4KICAgICAgPHN0b3AKICAgICAgICAgaWQ9InN0b3AzNzU3IgogICAgICAgICBzdHlsZT0ic3RvcC1jb2xvcjojZWJlYmViO3N0b3Atb3BhY2l0eToxIgogICAgICAgICBvZmZzZXQ9IjAuMzA2NTQxNTMiIC8+CiAgICAgIDxzdG9wCiAgICAgICAgIGlkPSJzdG9wMzczNyIKICAgICAgICAgc3R5bGU9InN0b3AtY29sb3I6I2ZmZmZmZjtzdG9wLW9wYWNpdHk6MSIKICAgICAgICAgb2Zmc2V0PSIwLjcwNzA2MDc1IiAvPgogICAgICA8c3RvcAogICAgICAgICBpZD0ic3RvcDM3NTkiCiAgICAgICAgIHN0eWxlPSJzdG9wLWNvbG9yOiNmYWZhZmE7c3RvcC1vcGFjaXR5OjEiCiAgICAgICAgIG9mZnNldD0iMC44NDUwMTQ5MyIgLz4KICAgICAgPHN0b3AKICAgICAgICAgaWQ9InN0b3AzNzM1IgogICAgICAgICBzdHlsZT0ic3RvcC1jb2xvcjojZjBmMGYwO3N0b3Atb3BhY2l0eToxIgogICAgICAgICBvZmZzZXQ9IjEiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50CiAgICAgICB4MT0iNDgiCiAgICAgICB5MT0iOTAiCiAgICAgICB4Mj0iNDgiCiAgICAgICB5Mj0iNS45ODc3MTcyIgogICAgICAgaWQ9ImxpbmVhckdyYWRpZW50MzYxNyIKICAgICAgIHhsaW5rOmhyZWY9IiNsaW5lYXJHcmFkaWVudDI4ODEiCiAgICAgICBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgLz4KICAgIDxsaW5lYXJHcmFkaWVudAogICAgICAgaWQ9ImxpbmVhckdyYWRpZW50Mjg4MSI+CiAgICAgIDxzdG9wCiAgICAgICAgIGlkPSJzdG9wMjg4MyIKICAgICAgICAgc3R5bGU9InN0b3AtY29sb3I6I2E5MGMwYztzdG9wLW9wYWNpdHk6MSIKICAgICAgICAgb2Zmc2V0PSIwIiAvPgogICAgICA8c3RvcAogICAgICAgICBpZD0ic3RvcDI4ODUiCiAgICAgICAgIHN0eWxlPSJzdG9wLWNvbG9yOiNmMDU1MzA7c3RvcC1vcGFjaXR5OjEiCiAgICAgICAgIG9mZnNldD0iMSIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQKICAgICAgIGlkPSJsaW5lYXJHcmFkaWVudDI4ODEtOSI+CiAgICAgIDxzdG9wCiAgICAgICAgIGlkPSJzdG9wMjg4My0yIgogICAgICAgICBzdHlsZT0ic3RvcC1jb2xvcjojYTkwYzBjO3N0b3Atb3BhY2l0eToxIgogICAgICAgICBvZmZzZXQ9IjAiIC8+CiAgICAgIDxzdG9wCiAgICAgICAgIGlkPSJzdG9wMjg4NS01IgogICAgICAgICBzdHlsZT0ic3RvcC1jb2xvcjojZjA1NTMwO3N0b3Atb3BhY2l0eToxIgogICAgICAgICBvZmZzZXQ9IjEiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50CiAgICAgICBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDUuNjE5MDQ3NiwwLDAsNS42MTkwNDc2LC0zMy43MTQyODYsLTMzLjcxNDI4NikiCiAgICAgICB5Mj0iNS45ODc3MTcyIgogICAgICAgeDI9IjQ4IgogICAgICAgeTE9IjkwIgogICAgICAgeDE9IjQ4IgogICAgICAgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiCiAgICAgICBpZD0ibGluZWFyR3JhZGllbnQzNTc5IgogICAgICAgeGxpbms6aHJlZj0iI2xpbmVhckdyYWRpZW50Mjg4MS05IgogICAgICAgaW5rc2NhcGU6Y29sbGVjdD0iYWx3YXlzIiAvPgogIDwvZGVmcz4KICA8bWV0YWRhdGEKICAgICBpZD0ibWV0YWRhdGE3Ij4KICAgIDxyZGY6UkRGPgogICAgICA8Y2M6V29yawogICAgICAgICByZGY6YWJvdXQ9IiI+CiAgICAgICAgPGRjOmZvcm1hdD5pbWFnZS9zdmcreG1sPC9kYzpmb3JtYXQ+CiAgICAgICAgPGRjOnR5cGUKICAgICAgICAgICByZGY6cmVzb3VyY2U9Imh0dHA6Ly9wdXJsLm9yZy9kYy9kY21pdHlwZS9TdGlsbEltYWdlIiAvPgogICAgICAgIDxkYzp0aXRsZSAvPgogICAgICA8L2NjOldvcms+CiAgICA8L3JkZjpSREY+CiAgPC9tZXRhZGF0YT4KICA8ZwogICAgIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAsLTU0MC4zNjIxOCkiCiAgICAgaW5rc2NhcGU6bGFiZWw9IkxpdmVsbG8gMSIKICAgICBpbmtzY2FwZTpncm91cG1vZGU9ImxheWVyIgogICAgIGlkPSJsYXllcjEiIC8+CiAgPGcKICAgICB0cmFuc2Zvcm09Im1hdHJpeCgxLjEsMCwwLDAuNDQ0NDQsOTUuMDgxMDYzLDI1Ni4zOTI1NCkiCiAgICAgaWQ9ImcyMDM2Ij4KICAgIDxnCiAgICAgICB0cmFuc2Zvcm09Im1hdHJpeCgxLjA1MjYsMCwwLDEuMjg1NywtMS4yNjMyLC0xMy40MjkpIgogICAgICAgc3R5bGU9Im9wYWNpdHk6MC40IgogICAgICAgaWQ9ImczNzEyIiAvPgogIDwvZz4KICA8ZwogICAgIGlkPSJnMzU0MSIKICAgICB0cmFuc2Zvcm09InRyYW5zbGF0ZSg5Ny40ODEwNjMsMjMxLjI4MTU0KSIgLz4KICA8ZwogICAgIGlkPSJnMzUzNiIKICAgICB0cmFuc2Zvcm09InRyYW5zbGF0ZSg5Ny40ODEwNjMsMjMxLjI4MTU0KSIgLz4KICA8ZwogICAgIHRyYW5zZm9ybT0idHJhbnNsYXRlKC0xMS45ODUwNzEsLTU5Mi4xMTcxOSkiCiAgICAgaWQ9Imc0MTAzIj4KICAgIDxyZWN0CiAgICAgICBzdHlsZT0ib3BhY2l0eTowLjE7Y29sb3I6IzAwMDAwMDtmaWxsOnVybCgjbGluZWFyR3JhZGllbnQ0MTE0LTItNik7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuNTttYXJrZXI6bm9uZTt2aXNpYmlsaXR5OnZpc2libGU7ZGlzcGxheTppbmxpbmU7b3ZlcmZsb3c6dmlzaWJsZTtlbmFibGUtYmFja2dyb3VuZDphY2N1bXVsYXRlIgogICAgICAgaWQ9InJlY3Q2MTg3IgogICAgICAgd2lkdGg9IjQ4NyIKICAgICAgIGhlaWdodD0iNDg3IgogICAgICAgeD0iMzEuOTg1MDcxIgogICAgICAgeT0iNjEyLjExNzE5IgogICAgICAgcnk9IjEwMS40NTgzNCIgLz4KICAgIDxyZWN0CiAgICAgICByeT0iMTAyLjI5MTY3IgogICAgICAgeT0iNjEyLjExNzE5IgogICAgICAgeD0iMzEuOTg1MDcxIgogICAgICAgaGVpZ2h0PSI0OTEiCiAgICAgICB3aWR0aD0iNDkxIgogICAgICAgaWQ9InJlY3Q2MTkxIgogICAgICAgc3R5bGU9Im9wYWNpdHk6MC4wNzk5OTk5ODtjb2xvcjojMDAwMDAwO2ZpbGw6dXJsKCNsaW5lYXJHcmFkaWVudDQxMTItMi02KTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6bm9uemVybztzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MS41O21hcmtlcjpub25lO3Zpc2liaWxpdHk6dmlzaWJsZTtkaXNwbGF5OmlubGluZTtvdmVyZmxvdzp2aXNpYmxlO2VuYWJsZS1iYWNrZ3JvdW5kOmFjY3VtdWxhdGUiIC8+CiAgICA8cmVjdAogICAgICAgcnk9IjEwMC42MjUwMSIKICAgICAgIHk9IjYxMi4xMTcxOSIKICAgICAgIHg9IjMxLjk4NTA3MSIKICAgICAgIGhlaWdodD0iNDgzIgogICAgICAgd2lkdGg9IjQ4MyIKICAgICAgIGlkPSJyZWN0NjE4MyIKICAgICAgIHN0eWxlPSJvcGFjaXR5OjAuMjtjb2xvcjojMDAwMDAwO2ZpbGw6dXJsKCNsaW5lYXJHcmFkaWVudDQxMTAtNi03KTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6bm9uemVybztzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MS41O21hcmtlcjpub25lO3Zpc2liaWxpdHk6dmlzaWJsZTtkaXNwbGF5OmlubGluZTtvdmVyZmxvdzp2aXNpYmxlO2VuYWJsZS1iYWNrZ3JvdW5kOmFjY3VtdWxhdGUiIC8+CiAgICA8cmVjdAogICAgICAgc3R5bGU9Im9wYWNpdHk6MC4yNTtjb2xvcjojMDAwMDAwO2ZpbGw6dXJsKCNsaW5lYXJHcmFkaWVudDQxMTYtNi0zKTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6bm9uemVybztzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MS41O21hcmtlcjpub25lO3Zpc2liaWxpdHk6dmlzaWJsZTtkaXNwbGF5OmlubGluZTtvdmVyZmxvdzp2aXNpYmxlO2VuYWJsZS1iYWNrZ3JvdW5kOmFjY3VtdWxhdGUiCiAgICAgICBpZD0icmVjdDYxNzkiCiAgICAgICB3aWR0aD0iNDc5IgogICAgICAgaGVpZ2h0PSI0NzkiCiAgICAgICB4PSIzMS45ODUwNzEiCiAgICAgICB5PSI2MTIuMTE3MTkiCiAgICAgICByeT0iOTkuNzkxNjY0IiAvPgogICAgPHJlY3QKICAgICAgIHJ5PSI5OS4wNjI1IgogICAgICAgeT0iNjEyLjExNzE5IgogICAgICAgeD0iMzEuOTg1MDcxIgogICAgICAgaGVpZ2h0PSI0NzUuNSIKICAgICAgIHdpZHRoPSI0NzUuNSIKICAgICAgIGlkPSJyZWN0NTU3NCIKICAgICAgIHN0eWxlPSJvcGFjaXR5OjAuMjU7Y29sb3I6IzAwMDAwMDtmaWxsOnVybCgjbGluZWFyR3JhZGllbnQ1MzQyLTMpO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpub256ZXJvO3N0cm9rZTpub25lO3N0cm9rZS13aWR0aDoxLjU7bWFya2VyOm5vbmU7dmlzaWJpbGl0eTp2aXNpYmxlO2Rpc3BsYXk6aW5saW5lO292ZXJmbG93OnZpc2libGU7ZW5hYmxlLWJhY2tncm91bmQ6YWNjdW11bGF0ZSIgLz4KICA8L2c+CiAgPHBhdGgKICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIgogICAgIGlkPSJyZWN0NTUwNSIKICAgICBkPSJNIDExOC4zNDM3NSwyMCBDIDYzLjg2NzA4NywyMCAyMCw2My44NjcwODQgMjAsMTE4LjM0Mzc1IGwgMCwyMy4wNjI1IDAsMjUyLjI1IEMgMjAsNDQ4LjEzMjkxIDYzLjg2NzA4Nyw0OTIgMTE4LjM0Mzc1LDQ5MiBsIDI3NS4zMTI1LDAgQyA0NDguMTMyOTIsNDkyIDQ5Miw0NDguMTMyOTEgNDkyLDM5My42NTYyNSBsIDAsLTI1Mi4yNSAwLC0yMy4wNjI1IEMgNDkyLDYzLjg2NzA4NCA0NDguMTMyOTIsMjAgMzkzLjY1NjI1LDIwIGwgLTI3NS4zMTI1LDAgeiIKICAgICBzdHlsZT0iZmlsbDojY2QwZjBmO3N0cm9rZTpub25lO2NvbG9yOiMwMDAwMDA7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87bWFya2VyOm5vbmU7dmlzaWJpbGl0eTp2aXNpYmxlO2Rpc3BsYXk6aW5saW5lO292ZXJmbG93OnZpc2libGU7ZW5hYmxlLWJhY2tncm91bmQ6YWNjdW11bGF0ZSIgLz4KICA8ZwogICAgIHRyYW5zZm9ybT0idHJhbnNsYXRlKC02MDUuNTE5MzIsLTM1My45NjgzMykiCiAgICAgaWQ9Imc0MDc2Ij4KICAgIDxnCiAgICAgICBpZD0iZzQwMzgiCiAgICAgICB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtOTI2LjY2NzU4LDY4NC4zODQ0OCkiIC8+CiAgPC9nPgogIDxwYXRoCiAgICAgc3R5bGU9ImZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MC4yMzUyOTQxMjtzdHJva2U6bm9uZTtkaXNwbGF5OmlubGluZTtlbmFibGUtYmFja2dyb3VuZDpuZXciCiAgICAgZD0ibSAxMDYsMTA2IDEuNSwxLjUgODMuNTYyNSw4My41NjI1IEwgMTkyLjUsMTkyLjUgMTA2LDI3Ny45MDYyNSAxMDYsNDA2IGwgODYuNTYyNSw4NiAyMDEuMDkzNzUsMCBDIDQ0OC4xMzI5Miw0OTIgNDkyLDQ0OC4xMzI5MSA0OTIsMzkzLjY1NjI1IEwgNDkyLDE5Mi41NjI1IDQwNiwxMDYgeiBtIDg3LjUsODcuNSAxMjUsMCAwLDEyNC45Mzc1IC0xMjUsMC4wNjI1IHoiCiAgICAgaWQ9InBhdGg1MjkxIgogICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiCiAgICAgc29kaXBvZGk6bm9kZXR5cGVzPSJjY2NjY2Njc3NjY2NjY2NjYyIgLz4KICA8ZwogICAgIHRyYW5zZm9ybT0idHJhbnNsYXRlKC02MDUuNTE5MzcsLTM1My45NjgzMykiCiAgICAgaWQ9Imc0MDc2LTkiPgogICAgPGcKICAgICAgIGlkPSJnNDAzOC05IgogICAgICAgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTkyNi42Njc1OCw2ODQuMzg0NDgpIj4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InJlY3Q2ODA5LTItMyIKICAgICAgICAgZD0ibSAxNjUwLjQ5OTQsLTMxMC40MTYxNSBjIC01NC40NzY3LDAgLTk4LjMxMjUsNDMuODM1ODMgLTk4LjMxMjUsOTguMzEyNSBsIDAsMjc1LjM0Mzc0NyBjIDAsNTQuNDc2NjczIDQzLjgzNTgsOTguMzQzNzUzIDk4LjMxMjUsOTguMzQzNzUzIGwgMi45Mzc1LDAgYyAtNTMuMzIyNSwwIC05Ni4yNSwtNDIuOTI3NSAtOTYuMjUsLTk2LjI1MDAwMyBsIDAsLTI2OS40OTk5OTcgYyAwLC01My4zMjI1IDQyLjkyNzUsLTk2LjI1IDk2LjI1LC05Ni4yNSBsIDI2OS41MDAxLDAgYyA1My4zMjI1LDAgOTYuMjUsNDIuOTI3NSA5Ni4yNSw5Ni4yNSBsIDAsMjY5LjQ5OTk5NyBjIDAsNTMuMzIyNTAzIC00Mi45Mjc1LDk2LjI1MDAwMyAtOTYuMjUsOTYuMjUwMDAzIGwgMi45MDYyLDAgYyA1NC40NzY3LDAgOTguMzQzOCwtNDMuODY3MDggOTguMzQzOCwtOTguMzQzNzUzIGwgMCwtMjc1LjM0Mzc0NyBjIDAsLTU0LjQ3NjY3IC00My44NjcxLC05OC4zMTI1IC05OC4zNDM4LC05OC4zMTI1IGwgLTI3NS4zNDM4LDAgeiIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MC41O2NvbG9yOiMwMDAwMDA7ZmlsbDp1cmwoI2xpbmVhckdyYWRpZW50NDA4NC04KTtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6bm9uemVybztzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MS41O21hcmtlcjpub25lO3Zpc2liaWxpdHk6dmlzaWJsZTtkaXNwbGF5OmlubGluZTtvdmVyZmxvdzp2aXNpYmxlO2VuYWJsZS1iYWNrZ3JvdW5kOmFjY3VtdWxhdGUiCiAgICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiCiAgICAgICAgIHN0eWxlPSJvcGFjaXR5OjAuMjtjb2xvcjojMDAwMDAwO2ZpbGw6dXJsKCNsaW5lYXJHcmFkaWVudDQwODYtMTIpO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpub256ZXJvO3N0cm9rZTpub25lO3N0cm9rZS13aWR0aDoxLjU7bWFya2VyOm5vbmU7dmlzaWJpbGl0eTp2aXNpYmxlO2Rpc3BsYXk6aW5saW5lO292ZXJmbG93OnZpc2libGU7ZW5hYmxlLWJhY2tncm91bmQ6YWNjdW11bGF0ZSIKICAgICAgICAgZD0ibSAxNjUwLjQ5OTQsMTYxLjU4Mzg1IGMgLTU0LjQ3NjcsMCAtOTguMzEyNSwtNDMuODM1ODMgLTk4LjMxMjUsLTk4LjMxMjUwMyBsIDAsLTI3NS4zNDM3NDcgYyAwLC01NC40NzY2NyA0My44MzU4LC05OC4zNDM3NSA5OC4zMTI1LC05OC4zNDM3NSBsIDIuOTM3NSwwIGMgLTUzLjMyMjUsMCAtOTYuMjUsNDIuOTI3NSAtOTYuMjUsOTYuMjUgbCAwLDI2OS40OTk5OTcgYyAwLDUzLjMyMjUwMyA0Mi45Mjc1LDk2LjI1MDAwMyA5Ni4yNSw5Ni4yNTAwMDMgbCAyNjkuNTAwMSwwIGMgNTMuMzIyNSwwIDk2LjI1LC00Mi45Mjc1IDk2LjI1LC05Ni4yNTAwMDMgbCAwLC0yNjkuNDk5OTk3IGMgMCwtNTMuMzIyNSAtNDIuOTI3NSwtOTYuMjUgLTk2LjI1LC05Ni4yNSBsIDIuOTA2MiwwIGMgNTQuNDc2NywwIDk4LjM0MzgsNDMuODY3MDggOTguMzQzOCw5OC4zNDM3NSBsIDAsMjc1LjM0Mzc0NyBjIDAsNTQuNDc2NjczIC00My44NjcxLDk4LjMxMjUwMyAtOTguMzQzOCw5OC4zMTI1MDMgbCAtMjc1LjM0MzgsMCB6IgogICAgICAgICBpZD0icGF0aDM5ODEtNyIgLz4KICAgIDwvZz4KICA8L2c+CiAgPGcKICAgICBpZD0iZzM2NTEiCiAgICAgdHJhbnNmb3JtPSJtYXRyaXgoNS4yODg1MTU5LDAsMCw1LjI4ODUxNTksLTM1NjAuNDc4NSwtNDYyLjM0MzIpIiAvPgogIDxnCiAgICAgdHJhbnNmb3JtPSJtYXRyaXgoNS42MTkwNDc2LDAsMCw1LjYxOTA0NzYsLTU0Mi4wODUzNSwtMzAuMzM2MTc5KSIKICAgICBpZD0ibGF5ZXIxLTUiCiAgICAgc3R5bGU9ImRpc3BsYXk6aW5saW5lIiAvPgogIDxwYXRoCiAgICAgaWQ9InBvbHlsaW5lMyIKICAgICBkPSJNIDEwNiAxMDYgTCAxOTIuNSAxOTIuNSBMIDEwNiAyNzcuOTA2MjUgTCAxMDYgNDA2IEwgMjMyLjUgNDA2IEwgMzE4Ljg0Mzc1IDMxOC44NDM3NSBMIDQwNiA0MDUuMTU2MjUgTCA0MDYgMTA2IEwgMTA2IDEwNiB6IE0gMTkzLjUgMTkzLjUgTCAzMTguNSAxOTMuNSBMIDMxOC41IDMxOC40Mzc1IEwgMTkzLjUgMzE4LjUgTCAxOTMuNSAxOTMuNSB6ICIKICAgICBzdHlsZT0iZmlsbDojZmZmZmZmO2ZpbGwtb3BhY2l0eToxO3N0cm9rZTpub25lO2Rpc3BsYXk6aW5saW5lO2VuYWJsZS1iYWNrZ3JvdW5kOm5ldyIgLz4KPC9zdmc+Cg==
# ----------------------------------------------------------------------------------------------------

#!/bin/bash
#
# AMD GPU enablement for the FileFlows container: hardware video ENCODE plus
# optional GPU COMPUTE, using AMD's official package repositories and tooling.
# It always provisions the encode path that actually works on Linux (VA-API),
# adds the AMF runtime for the discrete GPUs AMF supports, and optionally the
# ROCm / OpenCL compute stack (opt-in). The mod auto-selects the right packages
# for the detected GPU; the encoder itself is chosen in your FileFlows flow.
#
# Why VA-API is the baseline (researched, see the guide .md):
#   On Linux, AMD hardware encode is delivered through VA-API (open, Mesa).
#   AMF on Linux is built on AMD's *closed* "Pro Vulkan" stack and is, per
#   Jellyfin's hardware-accel guide, "not recommended, limited support" — it
#   does not enumerate desktop Ryzen iGPUs at all. So we guarantee VA-API
#   (covers every AMD GPU, including iGPUs) and additionally install the AMF
#   runtime for the discrete RX/W cards where AMF works. This mod only installs
#   the encode capability; choosing/configuring the encoder is done in FileFlows.
#
# How it maps to AMD's documentation
#   * VA-API encode -> Mesa radeonsi VA driver (mesa-va-drivers)
#   * AMF runtime   -> AMD's AMF apt repo (repo.radeon.com/amf/<ver>):
#                      amf-amdgpu-pro + libamdenc-amdgpu-pro (RUNTIME, not -dev)
#   * Compute       -> amdgpu-install (repo.radeon.com/amdgpu-install) with
#                      --no-dkms and --usecase=rocm / opencl
#   Refs: https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/amd/
#         https://github.com/GPUOpen-LibrariesAndSDKs/AMF/wiki/Driver-Linux
#         https://amdgpu-install.readthedocs.io/en/latest/
#         AMD Radeon Software for Linux 26.12 release notes
#
# Container note: the amdgpu kernel module is provided by the host, so we only
# install user-space libraries; amdgpu-install always runs with --no-dkms.
# RADV (open Vulkan) ships in the Ubuntu base, so we do not install AMD's Mesa
# "graphics" usecase (AMD warns it can conflict with RADV on Ubuntu 25.10+).
#
# Self-maintaining: discovers the newest AMF + driver builds for this Ubuntu
# release, skips fast when current, upgrades + garbage-collects when AMD ships
# newer, and uninstalls cleanly.
#
# ---------------------------------------------------------------------------
# Configuration (set as container environment variables)
# ---------------------------------------------------------------------------
#   AMD_AMF_PROFILE   What to install. Default: auto. Every profile provisions
#                     encode (VA-API + AMF runtime). COMPUTE (ROCm/OpenCL) is
#                     OFF by default and opt-in (most FileFlows users only
#                     encode):
#       auto      Encode only (default) - VA-API + AMF runtime, no compute.
#       legacy    Encode only (same as auto, explicit).
#       standard  Encode + full ROCm compute (ROCm runtime + ROCr OpenCL).
#       opencl    Encode + ROCr OpenCL only (smaller; OpenCL compute only).
#
#   AMD_GFX_VERSION   (compute) GPU gfx group for the full ROCm stack. Default
#                     "auto" (amdgpu-install detects via lspci). Set for
#                     headless builds where the GPU isn't visible yet:
#                       RX 9000/W9000 (RDNA4) gfx120x   RX 7000/W7000 (RDNA3) gfx110x
#                       RX 6000 (RDNA2) gfx103x         RX 5000 (RDNA1) gfx101x
#   AMD_HSA_OVERRIDE  HSA_OVERRIDE_GFX_VERSION for AMD iGPUs without native
#                     ROCm packages (e.g. desktop gfx1036). Default "auto":
#                     when such an iGPU is detected the closest ROCm arch is
#                     installed and the matching override suggested. To take
#                     effect it MUST also be set as a *container* env var.
#                     Common: 10.3.0 (RDNA2 iGPU), 11.0.0 (RDNA3 iGPU).
#   AMD_AMF_VERSION   Pin the AMF repo version (e.g. 26.10). Default: newest.
#   AMD_DRIVER_VERSION Pin the amdgpu-install version. Default: newest.
#
# Note on AMF + iGPUs: AMF (hevc_amf/h264_amf/av1_amf) only enumerates the
# discrete GPUs / APUs AMD's closed Pro stack supports. Desktop Ryzen iGPUs
# (Raphael/Granite Ridge, gfx1036) are NOT AMF-capable on Linux — they encode
# via VA-API, which this mod also installs. Selecting/using an encoder is done
# in FileFlows (see the FileFlows docs); the mod only installs the capability.
# ---------------------------------------------------------------------------

set -uo pipefail

AMF_BASE="https://repo.radeon.com/amf"
AGI_BASE="https://repo.radeon.com/amdgpu-install"
FALLBACK_AMF_VERSION="26.10"
FALLBACK_AGI_DEB="https://repo.radeon.com/amdgpu-install/31.30/ubuntu/resolute/amdgpu-install_31.30.313000-1_all.deb"

AMF_KEYRING="/etc/apt/keyrings/amf-pub.asc"
AMF_LIST="/etc/apt/sources.list.d/amf.list"
MARKER="/var/lib/fileflows/amd-gpu.state"
OPENCL_ENV="/etc/profile.d/zz-amd-gpu-opencl.sh"
OPENCL_LDCONF="/etc/ld.so.conf.d/amd-gpu-opencl.conf"
TMP_DIR="/tmp/amd-gpu-install"

AMF_VER=""
DRIVER_VER=""
HSA_OVERRIDE_VALUE=""

export DEBIAN_FRONTEND=noninteractive

# Always clean the scratch dir, even on an early failure exit.
trap 'rm -rf "$TMP_DIR" 2>/dev/null || true' EXIT

log()  { echo "[AMD GPU] $*"; }
fail() { echo "[AMD GPU] ERROR: $*" >&2; exit 1; }

cleanup_apt() {
    apt-get -y autoremove >/dev/null 2>&1 || true
    apt-get clean >/dev/null 2>&1 || true
    rm -rf /var/lib/apt/lists/* "$TMP_DIR" 2>/dev/null || true
}

# ---------------------------------------------------------------------------
detect_distro() {
    # shellcheck source=/dev/null
    if [ -e /etc/os-release ]; then . /etc/os-release; else . /usr/lib/os-release; fi
    DISTRO_ID="${ID:-}"
    DISTRO_CODENAME="${UBUNTU_CODENAME:-${VERSION_CODENAME:-}}"
    DISTRO_VERSION="${VERSION_ID:-}"
}

# Enumerate AMD (vendor 0x1002) PCI device ids from sysfs. Echoes "0xNNNN ..."
amd_device_ids() {
    local dev vendor ids=""
    for dev in /sys/bus/pci/devices/*; do
        [ -r "$dev/vendor" ] || continue
        vendor="$(cat "$dev/vendor" 2>/dev/null)"
        [ "$vendor" = "0x1002" ] || continue
        ids+="$(cat "$dev/device" 2>/dev/null) "
    done
    echo "$ids"
}

# AMD iGPUs without native ROCm packages -> closest gfx group + HSA override.
# Echoes "<gfx-group> <override>" or empty.
igpu_rocm_override() {
    case " $1 " in
        *" 0x13c0 "*|*" 0x164e "*|*" 0x1681 "*|*" 0x1506 "*) echo "gfx103x 10.3.0" ;;  # RDNA2 iGPU
        *" 0x15bf "*|*" 0x1900 "*|*" 0x1901 "*) echo "gfx110x 11.0.0" ;;               # RDNA3 iGPU (Phoenix)
        *) echo "" ;;
    esac
}

# Report the encode path this GPU's hardware supports (factual; configuring the
# encoder itself is done in FileFlows). Logged at the end.
recommend_encoder() {
    local ids names=""
    ids="$(amd_device_ids)"
    if command -v lspci >/dev/null 2>&1; then
        # Match the AMD vendor string only. (Avoid a bare 'ATI' — it matches
        # "comp-ATI-ble" in "VGA compatible controller" and picks other vendors.)
        names="$(lspci -mm 2>/dev/null | grep -iE 'VGA|Display|3D' \
                 | grep -iE 'Advanced Micro Devices|\[AMD/ATI\]' | sed -E 's/"//g' || true)"
    fi
    if [ -z "$ids$names" ]; then
        log "No AMD GPU visible (pass --device /dev/dri to use one)."
        return
    fi
    [ -n "$names" ] && log "Detected AMD GPU: $(echo "$names" | head -n1 | cut -c1-80)"
    if [ -n "$(igpu_rocm_override "$ids")" ]; then
        log "Encode path: VA-API (hevc_vaapi / h264_vaapi). AMF does not support desktop Ryzen iGPUs on Linux."
    else
        log "Encode path: AMF (hevc_amf / h264_amf; av1_amf needs RDNA3+) and VA-API are both available."
    fi
}

profile_wants_compute() { [ "$1" = "standard" ] || [ "$1" = "opencl" ]; }

marker_val() { grep -E "^$1=" "$MARKER" 2>/dev/null | cut -d= -f2- | head -n1; }

# ---------------------------------------------------------------------------
# Discover the newest <ver> under a repo base that has a matching build.
# ---------------------------------------------------------------------------
discover_repo_version() {
    local base="$1" suffix="$2" ver versions
    versions="$(curl -fsSL --max-time 30 "$base/" 2>/dev/null \
        | grep -oE 'href="[0-9][0-9.]*/"' \
        | sed -E 's/href="([0-9.]+)\/"/\1/' | sort -Vr)"
    for ver in $versions; do
        if curl -fsS --max-time 15 -o /dev/null "$base/$ver/$suffix"; then
            echo "$ver"; return
        fi
    done
}
resolve_amf_version() {
    if [ -n "${AMD_AMF_VERSION:-}" ]; then echo "${AMD_AMF_VERSION}"; return; fi
    discover_repo_version "$AMF_BASE" "ubuntu/dists/$DISTRO_CODENAME/Release"
}
resolve_driver_version() {
    if [ -n "${AMD_DRIVER_VERSION:-}" ]; then echo "${AMD_DRIVER_VERSION}"; return; fi
    discover_repo_version "$AGI_BASE" "ubuntu/$DISTRO_CODENAME/"
}

# ---------------------------------------------------------------------------
# VA-API encode (the recommended, always-works Linux path). Best-effort: on
# the FileFlows base these are already present, on a bare base we add them.
# ---------------------------------------------------------------------------
install_vaapi() {
    log "Ensuring VA-API encode support (Mesa radeonsi)..."
    if ! apt-get install -yqq --no-install-recommends mesa-va-drivers vainfo libva2 libva-drm2; then
        log "WARNING: could not install all VA-API packages (may already be present)."
    fi
}

# ---------------------------------------------------------------------------
# AMF runtime (for the discrete GPUs / APUs AMF supports on Linux).
# ---------------------------------------------------------------------------
install_amf() {
    local ver
    ver="$(resolve_amf_version)"
    if [ -z "$ver" ]; then
        log "AMF version discovery failed; using pinned fallback $FALLBACK_AMF_VERSION."
        ver="$FALLBACK_AMF_VERSION"
    fi
    AMF_VER="$ver"   # recorded as the targeted version (idempotency intent)
    log "Installing AMF runtime (version $ver, codename $DISTRO_CODENAME)..."
    mkdir -p /etc/apt/keyrings
    # Fetch the signing key over TLS from AMD's official repo (same as AMD's
    # amf_installer.sh). Treat an empty/failed fetch as a hard skip.
    wget -qO - "$AMF_BASE/$ver/amf-pub.gpg" > "$AMF_KEYRING" 2>/dev/null || true
    if [ ! -s "$AMF_KEYRING" ]; then
        log "WARNING: could not fetch AMF signing key; skipping AMF (VA-API covers encode)."
        rm -f "$AMF_KEYRING" "$AMF_LIST"
        return 0
    fi
    echo "deb [arch=amd64 signed-by=$AMF_KEYRING] $AMF_BASE/$ver/ubuntu $DISTRO_CODENAME main" > "$AMF_LIST"
    # If the repo can't be validated, REMOVE it so it cannot break later apt runs.
    if ! apt-get -qq update; then
        log "WARNING: AMF repo unreachable for '$DISTRO_CODENAME'; removing it (VA-API covers encode)."
        rm -f "$AMF_KEYRING" "$AMF_LIST"
        apt-get -qq update >/dev/null 2>&1 || true
        return 0
    fi
    apt-get install -yqq amf-amdgpu-pro libamdenc-amdgpu-pro \
        || log "WARNING: AMF runtime packages failed to install; encode will use VA-API."
}

# ---------------------------------------------------------------------------
# Compute via amdgpu-install (--no-dkms): full ROCm or ROCr OpenCL.
# ---------------------------------------------------------------------------
install_compute() {
    local profile="$1" ver deb url localdeb gfx ig=""
    profile_wants_compute "$profile" || return 0

    log "Setting up AMD compute stack (profile: $profile)..."
    ver="$(resolve_driver_version)"
    url=""
    if [ -n "$ver" ]; then
        deb="$(curl -fsSL --max-time 20 "$AGI_BASE/$ver/ubuntu/$DISTRO_CODENAME/" 2>/dev/null \
               | grep -oE 'href="amdgpu-install[^"]*\.deb"' \
               | sed -E 's/href="([^"]+)"/\1/' | head -n1)"
        [ -n "$deb" ] && url="$AGI_BASE/$ver/ubuntu/$DISTRO_CODENAME/$deb"
    fi
    if [ -z "$url" ]; then
        log "amdgpu-install discovery failed; using pinned fallback."
        url="$FALLBACK_AGI_DEB"; ver="$(echo "$url" | sed -E 's#.*/amdgpu-install/([0-9.]+)/.*#\1#')"
    fi
    DRIVER_VER="$ver"

    log "amdgpu-install package: $url"
    localdeb="$TMP_DIR/$(basename "$url")"
    wget -q -O "$localdeb" "$url" \
        || { log "WARNING: amdgpu-install download failed; compute skipped."; return 0; }
    if ! apt-get install -yqq "$localdeb"; then
        log "WARNING: amdgpu-install package failed; compute skipped."
        apt-get purge -y amdgpu-install >/dev/null 2>&1 || true
        return 0
    fi
    # amdgpu-install registered AMD's repos. If they can't be validated, purge
    # the package so its repos cannot break later apt runs.
    if ! apt-get -qq update; then
        log "WARNING: AMD repo unreachable; removing amdgpu-install (compute skipped)."
        apt-get purge -y amdgpu-install >/dev/null 2>&1 || true
        return 0
    fi

    if [ "$profile" = "opencl" ]; then
        log "Running: amdgpu-install -y --no-dkms --usecase=opencl --opencl=rocr"
        amdgpu-install -y --no-dkms --usecase=opencl --opencl=rocr \
            || log "WARNING: ROCr OpenCL install failed."
        return 0
    fi

    # standard: full ROCm. ROCm packages are gfx-arch-specific (amdrocm-gfx120x,
    # gfx110x, ...); no bare 'amdrocm' meta. amdgpu-install resolves the group
    # via --gfxversion=auto when a supported GPU is visible. iGPUs get the
    # closest group + an HSA override; if nothing resolves we degrade to OpenCL.
    gfx="${AMD_GFX_VERSION:-}"
    if [ -z "$gfx" ]; then
        ig="$(igpu_rocm_override "$(amd_device_ids)")"
        if [ -n "$ig" ]; then
            gfx="${ig%% *}"; HSA_OVERRIDE_VALUE="${ig##* }"
            log "AMD iGPU without native ROCm packages -> installing '$gfx' (experimental iGPU ROCm)."
        else
            gfx="auto"
        fi
    fi
    [ -n "${AMD_HSA_OVERRIDE:-}" ] && [ "${AMD_HSA_OVERRIDE}" != "auto" ] && HSA_OVERRIDE_VALUE="${AMD_HSA_OVERRIDE}"

    log "Running: amdgpu-install -y --no-dkms --usecase=rocm --gfxversion=$gfx"
    if amdgpu-install -y --no-dkms --usecase=rocm --gfxversion="$gfx"; then
        return 0
    fi
    HSA_OVERRIDE_VALUE=""
    log "WARNING: full ROCm did not resolve (no ROCm-supported GPU visible, or unknown gfx)."
    log "         Falling back to ROCr OpenCL. For full ROCm set AMD_GFX_VERSION (e.g. gfx120x)."
    amdgpu-install -y --no-dkms --usecase=opencl --opencl=rocr \
        || log "WARNING: ROCr OpenCL fallback failed; compute unavailable."
}

# ---------------------------------------------------------------------------
# OpenCL path workaround (AMD 26.12 release notes): register the ROCm OpenCL
# ICD + libs with the system loader so OpenCL works without manual env vars.
# ---------------------------------------------------------------------------
apply_opencl_workaround() {
    local rocm_path="" icd
    if [ -d /opt/rocm ]; then
        rocm_path="/opt/rocm"
    else
        rocm_path="$(find /opt -maxdepth 1 -name 'rocm-*' -type d 2>/dev/null | sort -V | tail -n1)"
    fi
    [ -n "$rocm_path" ] && [ -d "$rocm_path" ] || { log "ROCm path not found; skipping OpenCL workaround."; return 0; }
    log "Applying OpenCL path workaround for ROCm at $rocm_path"

    mkdir -p /etc/OpenCL/vendors
    while IFS= read -r icd; do
        [ -n "$icd" ] || continue
        ln -sf "$icd" "/etc/OpenCL/vendors/$(basename "$icd")"
    done < <(find -L "$rocm_path/" -path '*OpenCL/vendors/*.icd' 2>/dev/null)

    : > "$OPENCL_LDCONF"
    find -L "$rocm_path/" \( -name 'libamdocl64.so*' -o -name 'libOpenCL.so*' \) \
        -printf '%h\n' 2>/dev/null | sort -u >> "$OPENCL_LDCONF"
    [ -d "$rocm_path/lib/opencl" ] && echo "$rocm_path/lib/opencl" >> "$OPENCL_LDCONF"
    if [ -s "$OPENCL_LDCONF" ]; then ldconfig; else rm -f "$OPENCL_LDCONF"; fi

    cat > "$OPENCL_ENV" <<EOF
# AMD ROCm OpenCL path workaround (AMD Radeon Software 26.12 release notes).
# All ROCm ICDs are symlinked into the loader's default vendor directory below.
export OCL_ICD_VENDORS=/etc/OpenCL/vendors
EOF
    chmod 0644 "$OPENCL_ENV"
}

# ---------------------------------------------------------------------------
do_uninstall() {
    log "Uninstalling AMD GPU stack..."
    apt-get purge -y amf-amdgpu-pro libamdenc-amdgpu-pro >/dev/null 2>&1 || true
    rm -f "$AMF_LIST" "$AMF_KEYRING" "$OPENCL_ENV" "$OPENCL_LDCONF"
    if command -v amdgpu-uninstall >/dev/null 2>&1; then
        amdgpu-uninstall -y || log "amdgpu-uninstall returned non-zero (continuing)."
    elif command -v amdgpu-install >/dev/null 2>&1; then
        amdgpu-install -y --uninstall || log "amdgpu-install --uninstall returned non-zero (continuing)."
    fi
    apt-get purge -y amdgpu-install >/dev/null 2>&1 || true
    # VA-API (mesa-va-drivers) is left in place: it is a base media library that
    # other tooling may rely on and is not AMD-proprietary.
    rm -f "$MARKER"
    cleanup_apt
    ldconfig 2>/dev/null || true
    log "Uninstall complete."
    exit 0
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
[ "${1:-}" = "--uninstall" ] && do_uninstall

detect_distro
[ "$DISTRO_ID" = "ubuntu" ] \
    || fail "This DockerMod targets the Ubuntu-based FileFlows image (got ID='$DISTRO_ID')."
[ -n "$DISTRO_CODENAME" ] || fail "Could not determine Ubuntu codename from /etc/os-release."

# AMD's amdgpu/AMF stack is amd64-only. On other arches (e.g. arm64) there is
# nothing to install — exit cleanly rather than error on every container start.
ARCH="$(dpkg --print-architecture 2>/dev/null || echo unknown)"
if [ "$ARCH" != "amd64" ]; then
    log "AMD GPU encode/compute (amdgpu/AMF) is amd64-only; this image is '$ARCH'. Nothing to do."
    exit 0
fi

REQUESTED="${AMD_AMF_PROFILE:-auto}"
case "$REQUESTED" in
    auto|standard|opencl|legacy) ;;
    *) fail "Invalid AMD_AMF_PROFILE='$REQUESTED' (use auto|standard|opencl|legacy)." ;;
esac

PROFILE=""

# Already installed (marker written only after a completed run)? Skip when
# current; upgrade when AMD shipped newer; reinstall on explicit profile change.
# Update checks are best-effort and never block container startup.
if [ -f "$MARKER" ]; then
    INST_PROFILE="$(marker_val profile)"
    if [ "$REQUESTED" != "auto" ] && [ "$REQUESTED" != "$INST_PROFILE" ]; then
        log "Profile change '$INST_PROFILE' -> '$REQUESTED'; reinstalling."
        if profile_wants_compute "$INST_PROFILE" && ! profile_wants_compute "$REQUESTED"; then
            log "Removing the previously installed ROCm compute stack..."
            if command -v amdgpu-uninstall >/dev/null 2>&1; then
                amdgpu-uninstall -y >/dev/null 2>&1 || true
            elif command -v amdgpu-install >/dev/null 2>&1; then
                amdgpu-install -y --uninstall >/dev/null 2>&1 || true
            fi
        fi
    else
        UPDATE=0
        if command -v curl >/dev/null 2>&1; then
            NEW_AMF="$(resolve_amf_version)"
            [ -n "$NEW_AMF" ] && [ "$NEW_AMF" != "$(marker_val amf)" ] && UPDATE=1
            if profile_wants_compute "$INST_PROFILE"; then
                NEW_DRV="$(resolve_driver_version)"
                [ -n "$NEW_DRV" ] && [ "$NEW_DRV" != "$(marker_val driver)" ] && UPDATE=1
            fi
        fi
        if [ "$UPDATE" -eq 0 ]; then
            log "Profile '$INST_PROFILE' installed and up to date (AMF $(marker_val amf), driver $(marker_val driver)). Nothing to do."
            exit 0
        fi
        log "A newer AMD release is available; upgrading and cleaning up old packages."
        PROFILE="$INST_PROFILE"
    fi
fi

mkdir -p "$TMP_DIR"
log "Installing prerequisites (wget, curl, ca-certificates, gnupg, pciutils)..."
apt-get -qq update || fail "apt-get update failed."
apt-get install -yqq --no-install-recommends \
    wget curl ca-certificates gnupg pciutils || fail "Failed to install prerequisites."

if [ -z "$PROFILE" ]; then
    PROFILE="$REQUESTED"
    # Default is encode-only. ROCm/OpenCL compute is opt-in (most FileFlows
    # users only need encoding), enabled via standard/opencl.
    [ "$PROFILE" = "auto" ] && PROFILE="legacy"
fi
log "Profile: $PROFILE  (Ubuntu $DISTRO_VERSION / $DISTRO_CODENAME)"
profile_wants_compute "$PROFILE" \
    || log "Compute off (encode only). Set AMD_AMF_PROFILE=standard (full ROCm) or opencl to enable it."

# Encode is always provisioned. VA-API is the universal Linux path; the AMF
# runtime is added for the discrete GPUs AMF supports. Compute is per-profile.
install_vaapi
if profile_wants_compute "$PROFILE"; then
    install_compute "$PROFILE"   # registers AMD repos before AMF
fi
install_amf
if profile_wants_compute "$PROFILE"; then
    apply_opencl_workaround
fi

# iGPU ROCm override: persist for shells + tell the user the one container env
# var they must set (it must live in the ffmpeg process environment).
if [ -n "$HSA_OVERRIDE_VALUE" ]; then
    {
        echo "# AMD iGPU ROCm override (experimental). Must ALSO be set as a"
        echo "# container env var to affect the FileFlows ffmpeg process."
        echo "export HSA_OVERRIDE_GFX_VERSION=$HSA_OVERRIDE_VALUE"
    } >> "$OPENCL_ENV"
    log "IMPORTANT: AMD iGPU ROCm compute needs HSA_OVERRIDE_GFX_VERSION=$HSA_OVERRIDE_VALUE"
    log "           set as a container env var (docker -e / compose 'environment:')."
fi

ldconfig
mkdir -p "$(dirname "$MARKER")"
{ echo "profile=$PROFILE"; echo "amf=$AMF_VER"; echo "driver=$DRIVER_VER"; } > "$MARKER"
cleanup_apt

# Verify.
log "Verifying installation..."
if command -v vainfo >/dev/null 2>&1 || [ -e /usr/lib/x86_64-linux-gnu/dri/radeonsi_drv_video.so ]; then
    log "VA-API encode available (Mesa radeonsi) — works on all AMD GPUs incl. iGPUs."
else
    log "WARNING: VA-API driver not detected."
fi
if ldconfig -p 2>/dev/null | grep -q 'libamfrt64.so'; then
    log "AMF runtime present (libamfrt64.so) — used on AMF-supported discrete GPUs."
else
    log "Note: AMF runtime not installed; encode will use VA-API."
fi
if profile_wants_compute "$PROFILE" && command -v clinfo >/dev/null 2>&1; then
    clinfo -l 2>/dev/null | sed 's/^/[AMD GPU] clinfo: /' || true
fi
recommend_encoder

log "--- AMD GPU setup finished (profile: $PROFILE, AMF ${AMF_VER:-none}, driver ${DRIVER_VER:-none}). ---"
log "Note: start the container with GPU access (e.g. --device /dev/dri --device /dev/kfd)."
exit 0
