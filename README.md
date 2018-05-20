# backitup

Backitup ist eine Script Zusammenstellung zum zyklischen Sichern einer IoBroker / Homematic (Raspberrymatic) -Installation konfigurierbar in VIS 

## Inhaltsverzeichnis:
1. Backup Typen
  - 1.1 Minimales Backup (Standard IoBroker Backup)
  - 1.2 Komplettes Backup
  - 1.3 Raspberrymatic Backup (Homematic auf Raspberry)
  - 1.4 Optionales Mysql-Backup (Localhost) 
2. Vorbereitung
  - 2.1 Vorbereitung für lftp / Cifs (wenn gewünscht)
  - 2.2 Vorbereitungen für das Raspberrymatic - Backup
  - 4.3 Vorbereitung IoBroker - Javascript Adapter
3. Konfiguration
  - 3.1 Konfigurationen für Minimal und Komplett Backup
  - 3.2 Konfigurationen für Raspberrymatic Backup
  - 3.3 Konfigurationen für Mysql-Datenbank Backup
4. Verwendung
  - 4.1 Der erste Druchlauf des JavaScripts
  - 4.2 Verwendung des VIS-Widget-Exports
5. Restore eines Backups
  - 5.1 Minimal Backup wiederherstellen
  - 5.2 Komplett Backup wiederherstellen
  - 5.3 Raspberrymatic Backup wiederherstellen
6. Fehlersuche
  - 6.1 Logging aktivieren
  - 6.2 Debugging aktivieren
7. Bekannte Fehler / Lösungen
  - 7.1 Webinterface nach Restore nicht erreichbar
  - 7.2 JS-Datenbunkt nicht beschreibbar
8. Todo
