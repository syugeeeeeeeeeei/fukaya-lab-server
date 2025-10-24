$busid = (usbipd list | Select-String "RC-S380/P").ToString().Substring(0,3)
usbipd bind --busid $busid
usbipd attach --wsl --busid $busid