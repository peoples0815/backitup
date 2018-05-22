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


## 3. Backuptypen:

Das Backup-Script bietet drei (optional mit DB-Backup) verschiedene Backup-Aufrufe. Jedes Backup wird standardmäßig im Verzeichnis /opt/iobroker/backups/ abgelegt. Optional kann ein FTP-Upload eingerichtet werden, zudem gibt es seit dieser Version die Möglichkeit einen CIFS-Mount ein zu richten.

1. Minimales Backup
   - Dieses Backup entspricht dem in IoBroker enthaltenen Backup welches man in der Konsole über den Aufruf „./iobroker backup“     starten kann. Nur wird es hier durch die festgelegten Einstellungen in VIS aufgerufen ohne die Konsole verwenden zu müssen.
2. Komplettes Backup
   - Dieses Backup sichert den kompletten IoBroker Ordner inklusive aller Unterordner und deren Dateien samt Dateiberechtigungen. Hierbei sollte man die Dateigröße nicht aus dem Auge verlieren die jedes einzelne Backup hat, im Schnitt über 200MB. 
Im Zuge dieses Backups wird IoBroker neu gestartet!
3. Raspberrymatic Backup (Homematic)
   -  Dieses Backup nutzt die seit Version 2.27.8.20170410 in Raspberrymatic  integrierte Möglichkeit Systembackups auch über die Konsole anstoßen zu können. Auch  die Ausführung dieses Backups kann durch VIS konfiguriert werden ohne dass man die Konsole dazu benötigt.
4. Mysql-Backup
   - Dieses separat einstellbare Backup wird sofern es aktiviert ist, bei jedem zyklisch eingestellten Backup egal ob „minimal“ oder „komplett“ erstellt und nach Ablauf der angegebenen Vorhaltezeit auch gelöscht. FTP oder CIFS sind für dieses Backup ebenfalls gültig sofern bei den IoBroker-Backup-Typen eingestellt.

## 4. Vorbereitung:

Folgende Schritte müssen durchgeführt werden um das automatische Backup V2 verwenden zu können *(wenn das Backup-Script v1 verwendet wurde zuerst alle Datenpunkte löschen!)

1.	Wenn der mögliche FTP-Upload auf bspw. einen Nas gewünscht ist, und dies unter der Verwendung von lftp  passieren soll muss dieser Dienst installiert werden/sein. Sollte das noch nicht geschehen sein kann Dieser unter Debian in der Konsole durch den Befehl: 
„sudo apt-get install lftp“ installiert werden (Bild 1). 
Seit Version 2 ist es möglich alternativ euren vorhandenen Nas (o.Ä) mit Hilfe von CIFS in eure IoBroker – Dateistruktur zu mounten und das Backup direkt dort zu erstellen.

  - Vorteile:
    -	weniger Schreibzyklen auf euren Datenträger (evtl. relevant wenn Raspberry mit SD-Karte verwendet wird um Diese zu schonen)
    -	Es ist möglich die „Alten Backups“ automatisiert auf dem Nas löschen zu lassen
    -	Keine Notwendigkeit des lftp-Service da euer Nas direkt eingehängt ist.
  - Nachteile:
    -	Wenn ein Mounten nicht möglich ist, wird kein Backup erstellt!
    -	„Alte Backups“ können automatisiert auf dem Nas gelöscht werden. Im schlimmsten Fall ist somit kein Backup mehr vorhanden wenn ihr es benötigt.

![architecture](img/putty.png)
 (Bild 1)

2.	Wer das Raspberrymatic-Backup verwenden / ausführen möchte muss sicherstellen dass das sshpass-Paket installiert ist. Sofern nicht vorhanden kann dieses Paket ebenfalls in der Konsole (für Debian) mit dem Befehl: „sudo apt-get install sshpass“  installiert werden.

3.	Zusätzlich zu dem sshpass-Paket ist das aktivieren des SSH-Zugangs in der Raspberrymatic  (Homematic-Oberfläche) zwingend erforderlich. Hier den Haken bei SSH setzen, Passwort eintragen und speichern. Das Passwort muss ebenfalls im JavaScript eingetragen werden.

  
4.	Um das Script ausführen zu können müssen im IoBroker Javascript-Adapter die Hacken bei: Erlaube das Komando „setObject“  und Erlaube das Kommando „exec“ gesetzt sein (Bild 2).
 
(Bild 2)

5.	Das im Beitrag enthaltene Shell-Script muss in das IoBroker-Verzeichnis unter dem Namen backitup.sh gespeichert  (absoluter Pfad: /opt/iobroker/backitup.sh) und die Berechtigungen sollten auf 777 gesetzt werden. Bei mir läuft das Script mit Admin Rechten wenn ihr bei euch die nötigen Freigaben händisch einstellt ist dies jedoch nicht nötig.

6.	Das BackItUp - Java-Script aus dem Beitrag unter einem beliebigen Namen im IoBroker  bei Skripte abspeichern (nicht unter global). 

7.	Für die spätere Konfiguration durch VIS muss nun noch der View-Export in euer Projekt importiert werden.
