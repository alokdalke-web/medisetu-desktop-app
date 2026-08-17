!macro customInstall
  ; Add Firewall Rule for MediSetu P2P Sync
  ExecWait 'netsh advfirewall firewall add rule name="MediSetu P2P Sync" dir=in action=allow protocol=TCP localport=5000,5002'
!macroend

!macro customUnInstall
  ; Remove Firewall Rule when uninstalling
  ExecWait 'netsh advfirewall firewall delete rule name="MediSetu P2P Sync"'
!macroend
