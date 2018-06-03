#!/bin/bash

# Beschreibung: Backupscript fuer IoBroker
#
# Basierend auf dem Script von Kuddel: http://forum.iobroker.net/viewtopic.php?f=21&t=9861
#
# Funktionen: - Erstellen eines normalen ioBroker-Backups
#             - Erstellen eines Backups des ganzen ioBroker-Ordners
#             - Optionales loeschen von Backups aelter x-Tage
#             - Optionales weiterkopieren auf einen FTP-Server
#
#
# Author: Steffen
# Version: 1.0   - Erster Entwurf des Backupscripts
# Version: 1.0.1 - Optionaler Upload auf FTP-Server
# Version: 2.0   - Raspberrymatic-Backup mit eingebunden
# Version: 2.0.1 - Optionale Verwendung von CIFS-Mount eingebunden
#		   Iobroker Stop und Start bei Komplettbackup eingefÃ¼gt
# Version: 2.0.2 - ZusÃ¤tzliches MYSQL-Backup inkl. upload auf FTP-Server
# Version: 2.0.3 - Erste Version auf Github
# Version: 2.0.4 - Backupmöglichkeit für Homematic-CCU und pivccu eingebunden
#
#
# Verwendung:  bash backup.sh "Backup_Typ|Namens_Zusatz|Loeschen_nach_X_Tagen|NAS_Host|NAS_Verzeichnis|NAS_User|NAS_Passwort|CCU-IP|CCU-USER|CCU-PW|CIFS_MNT|MYSQL_DBNAME|MYSQL_USR|MYSQL_PW|MYSQL_Loeschen_nach_X_Tagen"
#
#
#
STRING=$1
echo $STRING
IFS="|"
VAR=($STRING)


############################################################################
#									   #
# Definieren der Scriptvariablen                                           #
#                                                                          #
############################################################################

BKP_TYP=${VAR[0]}
NAME_ZUSATZ=${VAR[1]}
BKP_LOESCHEN_NACH=${VAR[2]}
NAS_HOST=${VAR[3]}
NAS_DIR=${VAR[4]}
NAS_USR=${VAR[5]}
NAS_PASS=${VAR[6]}
CCU_USER=${VAR[7]}
CCU_HOST=${VAR[8]}
CCU_PASS=${VAR[9]}
CIFS_MNT=${VAR[10]}
MYSQL_DBNAME=${VAR[11]}
MYSQL_USR=${VAR[12]}
MYSQL_PW=${VAR[13]}
MYSQL_LOESCHEN_NACH=${VAR[14]}


#Variable fuer optionales Weiterkopieren
BKP_OK="NEIN"

#Datum definieren fÃ¼r iobroker
datum=`date +%Y_%m_%d`

#Datum definieren fÃ¼r raspberrymatic
datum_rasp=`date +%Y-%m-%d`

#Uhrzeit bestimmten
uhrzeit=`date +%H_%M_%S`

#Stunde definieren
stunde=`date +%H`

#Minute definieren
minute=`date +%M`



############################################################################
#									   #
# Optionaler Mount auf CIFS-Server                    			   #
#                                                                          #
############################################################################

if [ $CIFS_MNT == "JA" ]; then
	echo Backup-Pfad auf CIFS mounten
	sudo umount /opt/iobroker/backups
	sudo mount -t cifs -o user=$NAS_USR,password=$NAS_PASS,rw,file_mode=0777,dir_mode=0777,vers=1.0 //$NAS_HOST/$NAS_DIR /opt/iobroker/backups && echo success "--- CIFS-Server verbunden ---" || echo error "--- Backup-Pfad wurde nicht auf CIFS-Server verbunden ---"
fi


############################################################################
#									   #
# Optionales MYSQL-Datenbank-Backup                 			   #
#                                                                          #
############################################################################

if [ -n "$MYSQL_DBNAME" ]; then
	echo "MYSQL-Backup wird erstellt"
	mysqldump -u $MYSQL_USR -p$MYSQL_PW $MYSQL_DBNAME > /opt/iobroker/backups/backupiobroker_mysql-$(date +"%d-%b-%Y")_$MYSQL_DBNAME_mysql_db.sql
fi
############################################################################
#									   #
# Erstellen eines normalen ioBroker Backups                                #
#                                                                          #
############################################################################

if [ $BKP_TYP == "minimal" ]; then

#	Backup ausfuehren
	echo --- Es wurde ein Normales Backup gestartet ---
	iobroker backup
	echo --- Backup Erstellt ---
	BKP_OK="JA"

#	Backup umbenennen
	mv /opt/iobroker/backups/$datum-$stunde* /opt/iobroker/backups/backupiobroker_minimal$NAME_ZUSATZ-$datum-$uhrzeit.tar.gz


############################################################################
#									   #
# Erstellen eines Backups des ganzen ioBroker-Ordners                      #
#                                                                          #
############################################################################

elif [ $BKP_TYP == "komplett" ]; then
#	IoBroker stoppen
	cd /opt/iobroker
	sleep 10
	iobroker stop
	echo --- IoBroker gestoppt ---

#	Ins ioBroker Verzeichnis wechseln um komplettes IoBroker Verzeichnis zu sichern
	cd /opt
#	Backup ausfuehren
	echo --- Es wurde ein Komplettes Backup gestartet ---
	tar -czf $datum-$uhrzeit-backup_komplett.tar.gz --exclude="/opt/iobroker/backups" /opt/iobroker
	echo --- Backup Erstellt ---
	BKP_OK="JA"

#	Backup umbenennen
	mv /opt/$datum-$stunde*_komplett.tar.gz /opt/iobroker/backups/backupiobroker_komplett$NAME_ZUSATZ-$datum-$uhrzeit.tar.gz

 	iobroker restart
#	cd /opt/iobroker
#	iobroker start
	echo --- IoBroker gestartet ---

############################################################################
#									   #
# Erstellen eines Backups der Raspberrymatic                               #
#                                                                          #
############################################################################

elif [ $BKP_TYP == "raspberrymatic" ]; then

#	Temporäres Backupverzeichnis auf Raspberry erstellen
	sshpass -p "$CCU_PASS" ssh root@$CCU_HOST mkdir -p /tmp/bkp

#	Anstoßen des Raspberrymatic-Backups
	sshpass -p "$CCU_PASS" ssh root@$CCU_HOST /bin/createBackup.sh /tmp/bkp/

#	Kopieren des Backups auf IoBroker Maschine
	sshpass -p "$CCU_PASS" scp -r root@$CCU_HOST:/tmp/bkp/* /opt/iobroker/backups/


#	Temporäres Backupverzeichnis auf Raspberry leeren
	sshpass -p "$CCU_PASS" ssh root@$CCU_HOST rm -r /tmp/bkp/*

	echo --- Backup Erstellt ---
	BKP_OK="JA"
	
############################################################################
#									   #
# Erstellen eines Backups der CCU2 / PIVCCU                                #
#                                                                          #
############################################################################

elif [ $BKP_TYP == "ccu" ]; then

# 	Meldung
	echo --- Es wurde ein CCU - PIVCCU Backup gestartet ---

	run=$0.lastrun
 
# 	Homematic Login
	wget --post-data '{"method":"Session.login","params":{"username":"'$CCU_USER'","password":"'$CCU_PASS'"}}' http://$CCU_HOST/api/homematic.cgi -O hm.login.response -q >$run 2>&1
 
# 	Login-Pruefung
	loginerror=`cat hm.login.response|cut -d "," -f3|awk '{print $2}'`
	if [ "$loginerror" != "null}" ]; then
		echo "Fehler beim Homematic-Login !"|tee -a $run
		cat hm.login.response|grep message|cut -d '"' -f4|tee -a $run
		exit 1
	fi
	sessionid=`cat hm.login.response|cut -d "," -f2|awk '{print $2}'|cut -d '"' -f2`
 
# 	Backupdatei herunterladen
	wget "http://$CCU_HOST/config/cp_security.cgi?sid=@$sessionid@&action=create_backup" -O /opt/iobroker/backups/$CCU_HOST-CCU-backup_$datum-$uhrzeit.tar.sbk -q >>$run 2>&1
 
# 	Homematic Logout
	wget --post-data '{"method":"Session.logout","params":{"_session_id_":"'$sessionid'"}}' http://$CCU_HOST/api/homematic.cgi -O hm.logout.response -q >>$run 2>&1
 
# 	temp. Dateien loeschen
	rm hm.login.response hm.logout.response >>$run 2>&1

# 	Meldung 
	echo --- Backup Erstellt ---
	BKP_OK="JA"
	
else
	echo "Kein gueltiger Backup Typ gewaehlt! Moegliche Auswahl: 'minimal', 'komplett', 'ccu' oder 'raspberrymatic'"
fi



############################################################################
#									   #
# Optionales Loeschen alter Backups                                        #
#                                                                          #
############################################################################

if [ -n "$MYSQL_LOESCHEN_NACH" ]; then
	find /opt/iobroker/backups -name "backupiobroker_mysql*.sql" -mtime +$MYSQL_LOESCHEN_NACH -exec rm '{}' \;
fi

if [ $BKP_OK == "JA" ]; then
	if [ -n "$BKP_LOESCHEN_NACH" ]; then
#		Backups Ã¤lter X Tage lÃ¶schen
		echo "--- Alte Backups entfernen ---"

		if [ $BKP_TYP == "raspberrymatic" ]; then
			find /opt/iobroker/backups -name "homematic-raspi*.sbk" -mtime +$BKP_LOESCHEN_NACH -exec rm '{}' \;
			sleep 10
		elif [ $BKP_TYP == "ccu" ]; then
			find /opt/iobroker/backups -name "*.tar.sbk" -mtime +$BKP_LOESCHEN_NACH -exec rm '{}' \;
			sleep 10
		else
			find /opt/iobroker/backups -name "backupiobroker_$BKP_TYP$NAME_ZUSATZ*.tar.gz" -mtime +$BKP_LOESCHEN_NACH -exec rm '{}' \;
			sleep 10
		fi
	else
		echo "--- Es werden keine alten Backups geloescht ---"
	fi


############################################################################
#									   #
# Optionaler Upload des Backups auf einen FTP-Server                       #
#                                                                          #
############################################################################
	if [ $CIFS_MNT == "NEIN" ]; then
		if [ -n "$NAS_HOST" ]; then
#			Backup-Files via FTP kopieren
			echo "--- Backup-File FTP-Upload wird gestartet ---"
#			Verzeichnis wechseln
			cd /opt/iobroker/backups/
			ls
#			Befehle wird mit lftp ausgeführt somit muss das instaliert sein! (debian apt-get install lftp)

			if [ -n "$MYSQL_DBNAME" ]; then
				lftp -e 'cd '$NAS_DIR'/; put backupiobroker_mysql-$(date +"%d-%b-%Y")_$MYSQL_DBNAME_mysql_db.sql; bye' -u $NAS_USR,$NAS_PASS $NAS_HOST && echo success "--- Backup-File wurde erfolgreich auf ein anderes Verzeichnis kopiert ---" || echo error "--- Backup-File wurde nicht auf ein anderes Verzeichnis kopiert ---"
			fi


			if [ $BKP_TYP == "raspberrymatic" ]; then

				lftp -e "mput -O $NAS_DIR /opt/iobroker/backups/homematic-raspi-*-$datum_rasp-$stunde$minute.sbk; bye" -u $NAS_USR,$NAS_PASS $NAS_HOST && echo success "--- Backup-File wurde erfolgreich auf ein anderes Verzeichnis kopiert ---" || echo error "--- Backup-File wurde nicht auf ein anderes Verzeichnis kopiert ---"
			elif [ $BKP_TYP == "ccu" ]; then

				lftp -e "mput -O $NAS_DIR /opt/iobroker/$CCU_HOST'-CCU-backup_'$datum-$uhrzeit'.tar.sbk; bye" -u $NAS_USR,$NAS_PASS $NAS_HOST && echo success "--- Backup-File wurde erfolgreich auf ein anderes Verzeichnis kopiert ---" || echo error "--- Backup-File wurde nicht auf ein anderes Verzeichnis kopiert ---"

			else
				lftp -e 'cd '$NAS_DIR'/; put backupiobroker_'$BKP_TYP$NAME_ZUSATZ-$datum-$uhrzeit'.tar.gz; bye' -u $NAS_USR,$NAS_PASS $NAS_HOST && echo success "--- Backup-File wurde erfolgreich auf ein anderes Verzeichnis kopiert ---" || echo error "--- Backup-File wurde nicht auf ein anderes Verzeichnis kopiert ---"

			fi
		fi
	fi
	BKP_OK="NEIN"
else
	echo "Kein Backup erstellt!"
fi


############################################################################
#									   #
# Optionaler Umount des CIFS-Servers                    		   #
#                                                                          #
############################################################################

if [ $CIFS_MNT == "JA" ]; then

	Backup-Pfad auf CIFS umounten
	sudo umount /opt/iobroker/backups && echo success "--- Umount CIFS Server ---" || echo error "--- Backup-Pfad wurde nicht vom CIFS-Server getrennt ---"
fi


