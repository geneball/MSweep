# AltoDecode
decoder of Alto .dsk files, &amp; .RUN and .SYMS files on those disks

npm run dev
   runs app from  webpack incremental server in localhost:8080 
   
Click on Disk: 
to select a .dsk file--  a Xerox Alto disk image like those stored in
    https://github.com/livingcomputermuseum/ContrAlto/tree/master/Contralto/Disk
  and documented at 
    https://xeroxalto.computerhistory.org/xerox_alto_file_system_archive.html#Disk_image_files
  and other places.

Use the file selector that appears to select a file to decod:
  .BCPL, .BT, and other text files have their contents displayed--  check 'txt' at the top to display as readable text
binary files are displayed as hex dumps

.SYMS files are decoded to show Alto symbols defined

.RUN files are decoded to show the statics and codes defined within the file
  clicking on 'cd' displays a C language source definition that attempts to correspond to the Alto 
  emulator code in the run file.  The decompiler can recognize many code sequences that were generated by the Alto Bcpl compiler.
  
