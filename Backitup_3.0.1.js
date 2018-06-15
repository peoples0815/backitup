// *******************************************************************************************************
//
// BackItUp - Script V3
//
//
// Backuptypen: 1. Typisches Backup wie es der Befehl ./iobroker backup erstellt
//              2. Großes Backup das den ganzen IoBroker Ordner inkl. aller Unterordner/Dateien Sichert 
//              3. CCU Backup 
//
// Funktionen:  - Erstellen einen "OneClick" Sofort Backups
//              - Automatisierte Backups je nach gewähltem Typ und Zeitstempel
//              - Sicherung dieser Backups auf Remote-Server (lftp notwendig) alternativ CIFS
//              - Optionales Sichern einer vorhandenen Mysql-Datenbank
//
//
//
// Changelog:
// V1.0   - 22.12.2017  - Automatisches Backupscript
// V1.0.1 - 12.01.2018  - Uploadmöglichkeit auf einen FTP-Server eingebaut
//                      - Hier wird die lftp-Funktion benutzt somit muss diese auch in Debian vorhanden sein!
//                        lftp kann mit dem Befehl: apt-get install lftp installiert werden.
//
// v1.0.2 - 12.02.2018  - Datenpunkt für letzten Backupdurchlauf eingepflegt.
//
// v2.0   - 09.03.2018  - Schedule für komplettes Backup von 7mal/Woche auf 4 Termine im Monat geändert
//                      Neue Funktionen:
//                      - Automatisches Backup der Raspberrymatic über Vis möglich
//                      - Verschieben des Raspberrymatic Backups in das Iobroker-BKP Verzeichnis
//                      - Datum des letzten Backups für jeden Backup-Typ separiert
//                      - OnClick-Sofort-Backup für jeden Typ eingepflegt
//
// V2.0.1 - 28.03.2018  Neue Funktionen:
//                      - CIFS als Alternative zu lftp
//                      - Optionales sichern vorhandener Mysql-Datenbanken
//
// V2.0.2 - 29.04.2018  - If-Abfrage bei Clear-Schedule
//                      - Sekundenangabe bei Schedule da bei komplettem Backup immer wieder nichts passiert ist
// V2.0.3 - 10.05.2018  - Änderungen beim History anlegen
// V3.0.0 - 31.05.2018  - Backup-Schedule geändert auf Backup alle X - Tage
//                      - Backup Möglichkeit für CCU und pivCCU eingebunden (Shell angepasst durch simatec)
//                      - Neue Variable Username für Backup bei CCU usw.
// V3.0.1 - 15.06.2018  - Konfigurationseinstellungen in Datenpunkte ausgelagert keine Einstellungen
//                        im Script nicht mehr nötig.
//                      - Stop/Start des IoBrokers bei komplett Backup nun einstellbar
//                      - Neustart des Scripts bei Änderung eines Datenpunktes um geänderte Werte
//                        einzulesen
// *******************************************************************************************************




// -----------------------------------------------------------------------------
// allgemeine Variablen
// -----------------------------------------------------------------------------
var logging = true;                                         // Logging on/off
var debugging = true;										// Detailiertere Loggings
var instanz = 'javascript.0';  instanz = instanz + '.';     // 
                                                            //
var pfad0 =   'System.Iobroker.Backup.';					// Pfad innerhalb der Instanz - Status allgemien


var bash_script = 'bash /opt/iobroker/backitup.sh ';        // Pfad zu backup.sh Datei

var anzahl_eintraege_history = 13;                          // Anzahl der Einträge in der History


//#################################################################################################
//###                                                                                           ###
//###  Ab hier nichts mehr ändern alle Einstellungen sind in den angelegten Datenpunkten oder   ###
//###  den paar wenigen obigen Variablen zu tätigen                                             ###
//###                                                                                           ###
//#################################################################################################


var Backup = [];                                        // Array für die Definition der Backuptypen und deren Details

// Konfigurationen für das Standard-IoBroker Backup

    Backup[0] = [];
    Backup[0][0] = 'minimal';   // Backup Typ (nicht verändern!)
    Backup[0][1] = getState(instanz + pfad0 + 'Konfiguration.minimal.NamensZusatz').val;        // Names Zusatz, wird an den Dateinamen angehängt bspw. Master/Slave (falls gewünscht, ansonsten leer lassen) 
    Backup[0][2] = getState(instanz + pfad0 + 'Konfiguration.minimal.BackupLoeschenNach').val;  // Alte Backups löschen nach X Tagen (falls gewünscht, ansonsten leer lassen)
    Backup[0][3] = getState(instanz + pfad0 + 'Konfiguration.minimal.FtpHost').val;             // FTP-Host
    Backup[0][4] = getState(instanz + pfad0 + 'Konfiguration.minimal.FtpDir').val;              // genaue Verzeichnissangabe bspw. /volume1/Backup/ auf FTP-Server (falls gewünscht, ansonsten leer lassen)
    Backup[0][5] = getState(instanz + pfad0 + 'Konfiguration.minimal.FtpUser').val;             // Username für FTP Server - Verbindung
    Backup[0][6] = getState(instanz + pfad0 + 'Konfiguration.minimal.FtpPw').val;               // Passwort für FTP Server - Verbindung
    Backup[0][7] = ''; // Nicht benötigt bei diesem BKP-Typ (nicht verändern!)
    Backup[0][8] = ''; // Nicht benötigt bei diesem BKP-Typ (nicht verändern!)
    Backup[0][9] = ''; // Nicht benötigt bei diesem BKP-Typ (nicht verändern!)
    Backup[0][10] = getState(instanz + pfad0 + 'Konfiguration.minimal.CifsMount').val;         // Festlegen ob CIFS-Mount genutzt werden soll 
    Backup[0][11] = ''; // Nicht benötigt bei diesem BKP-Typ (nicht verändern!)


// Konfigurationen für das Komplette-IoBroker Backup

    Backup[1] = [];
    Backup[1][0] = 'komplett';  // Backup Typ (nicht verändern)
    Backup[1][1] = getState(instanz + pfad0 + 'Konfiguration.komplett.NamensZusatz').val;       // Names Zusatz, wird an den Dateinamen angehängt bspw. Master/Slave (falls gewünscht, ansonsten leer lassen)
    Backup[1][2] = getState(instanz + pfad0 + 'Konfiguration.komplett.BackupLoeschenNach').val; // Alte Backups löschen nach X Tagen (falls gewünscht, ansonsten leer lassen)
    Backup[1][3] = getState(instanz + pfad0 + 'Konfiguration.komplett.FtpHost').val;            // FTP-Host
    Backup[1][4] = getState(instanz + pfad0 + 'Konfiguration.komplett.FtpDir').val;             // genaue Verzeichnissangabe bspw. /volume1/Backup/ auf FTP-Server (falls gewünscht, ansonsten leer lassen)
    Backup[1][5] = getState(instanz + pfad0 + 'Konfiguration.komplett.FtpUser').val;            // Username für FTP Server - Verbindung
    Backup[1][6] = getState(instanz + pfad0 + 'Konfiguration.komplett.FtpPw').val;              // Passwort für FTP Server - Verbindung
    Backup[1][7] = ''; // Nicht benötigt bei diesem BKP-Typ (nicht verändern!)
    Backup[1][8] = ''; // Nicht benötigt bei diesem BKP-Typ (nicht verändern!)
    Backup[1][9] = ''; // Nicht benötigt bei diesem BKP-Typ (nicht verändern!)
    Backup[1][10] = getState(instanz + pfad0 + 'Konfiguration.minimal.CifsMount').val;       // Festlegen ob CIFS-Mount genutzt werden soll 
    Backup[1][11] = getState(instanz + pfad0 + 'Konfiguration.komplett.IoStopStart').val;         // Festlegen ob IoBroker gestoppt/gestartet wird 

// Konfiguration für das CCU / pivCCU / Raspberrymatic Backup

    Backup[2] = [];
    Backup[2][0] = 'ccu'; // Backup Typ (nicht verändern)
    Backup[2][1] = ''; // Nicht benötigt bei diesem BKP-Typ (nicht verändern!)
    Backup[2][2] = getState(instanz + pfad0 + 'Konfiguration.ccu.BackupLoeschenNach').val; // Alte Backups löschen nach X Tagen (falls gewünscht, ansonsten leer lassen)
    Backup[2][3] = getState(instanz + pfad0 + 'Konfiguration.ccu.FtpHost').val;            // FTP-Host
    Backup[2][4] = getState(instanz + pfad0 + 'Konfiguration.ccu.FtpDir').val;             // genaue Verzeichnissangabe bspw. /volume1/Backup/ auf FTP-Server (falls gewünscht, ansonsten leer lassen)
    Backup[2][5] = getState(instanz + pfad0 + 'Konfiguration.ccu.FtpUser').val;            // Username für FTP Server - Verbindung
    Backup[2][6] = getState(instanz + pfad0 + 'Konfiguration.ccu.FtpPw').val;              // Passwort für FTP Server - Verbindung
    Backup[2][7] = getState(instanz + pfad0 + 'Konfiguration.ccu.CcuIp').val;              // IP-Adresse der CCU
    Backup[2][8] = getState(instanz + pfad0 + 'Konfiguration.ccu.CcuUser').val;            // Username der CCU
    Backup[2][9] = getState(instanz + pfad0 + 'Konfiguration.ccu.CcuPw').val;              // Passwort der CCU
    Backup[2][10] = getState(instanz + pfad0 + 'Konfiguration.ccu.CifsMount').val;         // Festlegen ob CIFS-Mount genutzt werden soll 
    Backup[2][11] = ''; // Nicht benötigt bei diesem BKP-Typ (nicht verändern!)

var Mysql_DBname = getState(instanz + pfad0 + 'Konfiguration.Mysql.DbName').val;           // Name der Datenbank (wenn nicht verwendet leer lassen!)
var Mysql_User = getState(instanz + pfad0 + 'Konfiguration.Mysql.DbUser').val;           // Benutzername für Datenbank (wenn nicht verwendet leer lassen!)
var Mysql_PW = getState(instanz + pfad0 + 'Konfiguration.Mysql.DbPw').val;           // Passwort für Datenbank (wenn nicht verwendet leer lassen!)
var Mysql_LN = getState(instanz + pfad0 + 'Konfiguration.Mysql.BackupLoeschenNach').val;           // DB-Backup löschen nach (wenn nicht verwendet leer lassen!)

var BkpZeit_Schedule = [];                              // Array für die Backup Zeiten

var Enum_ids =[];                                       // Array für die ID's die später in der enum.function erstellt werden

var history_array = [];                                // Array für das anlegen der Backup-Historie
// =============================================================================
// Objekte
// =============================================================================
// Objekt zur Prüfung ob Auto_Backup aktiv ist.
createState(instanz + pfad0 + 'Auto_Backup', {def: 'false',type: 'boolean',name: 'Automatisches Backup'});

// Neu seit V2 Objekt zur Erstellung der enum.functions Einträge
createState(instanz + pfad0 + 'Konfiguration.Konfig_abgeschlossen', {def: 'false',type: 'boolean',name: 'Alle benoetigten Objekte erstellt'});

// Neu seit V2 Objekt zum Prüfen ob IoBroker wegen einem kompletten Backup neu gestartet ist.
createState(instanz + pfad0 + 'Konfiguration.IoRestart_komp_Bkp', {def: 'false',type: 'boolean',name: 'Restart IoBroker wegen komplett Backup'});

//Neu seit V2 HistoryLog für die ausgeführen Backups
createState(instanz + pfad0 + 'History.' + 'Backup_history',  {def: '<span class="bkptyp_komplett">Noch kein Backup</span>', type: 'string', name: 'History der Backups'});

//Neu seit V2 einen separaten Zeitstempel für jeden Backuptyp
createState(instanz + pfad0 + 'History.letztes_minimal_Backup',  {def: 'Noch kein Backup', type: 'string', name: 'Letztes minimal Backup'});
createState(instanz + pfad0 + 'History.letztes_komplett_Backup',  {def: 'Noch kein Backup', type: 'string', name: 'Letztes komplett Backup'});
createState(instanz + pfad0 + 'History.letztes_ccu_Backup',  {def: 'Noch kein Backup', type: 'string', name: 'Letztes CCU Backup'});

//Neu seit V2 ein jetzt Backup durchführen für jeden Backuptyp
createState(instanz + pfad0 + 'OneClick.start_minimal_Backup',  {def: 'false', type: 'boolean', name: 'Minimal Backup ausfuehren'});
createState(instanz + pfad0 + 'OneClick.start_komplett_Backup',  {def: 'false', type: 'boolean', name: 'Komplett Backup ausfuehren'});
createState(instanz + pfad0 + 'OneClick.start_ccu_Backup',  {def: 'false', type: 'boolean', name: 'CCU Backup ausfuehren'});




// $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
// $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
// $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
// $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

// #############################################################################
// #                                                                           #
// #  Funktion zum anlegen eines Schedules für Backupzeit                      #
// #                                                                           #
// #############################################################################

function BackupStellen() {
    setState(instanz + pfad0 +'Auto_Backup', false);
    Backup.forEach(function(Bkp) {
        // -----------------------------------------------------------------------------
        //  Erstellen der Backupdatenpunkte
        // -----------------------------------------------------------------------------
        
        
        createState(instanz + pfad0 + 'Einstellungen.' + Bkp[0] +'.BackupState',  {def: 'false',type: 'boolean',name: Bkp[0] +' Backup Status'});
        createState(instanz + pfad0 + 'Einstellungen.' + Bkp[0] +'.BackupZeit',  {def: '02:00',type: 'string',name: Bkp[0] +' Backup Zeit'});
        createState(instanz + pfad0 + 'Einstellungen.' + Bkp[0] +'.BackupTageZyklus',  {def: '3',type: 'number',name: Bkp[0] +' Backup Tages-Zyklus'});

        createState(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.NamensZusatz',  {def: '',type: 'string',name: Bkp[0] +' NamensZusatz'});
        createState(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.BackupLoeschenNach',  {def: '5',type: 'number',name: Bkp[0] +' Loeschen nach'});
        createState(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.FtpHost',  {def: '',type: 'string',name: Bkp[0] +' FTP Host'});
        createState(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.FtpDir',  {def: '',type: 'string',name: Bkp[0] +' FTP Dir'});
        createState(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.FtpUser',  {def: '',type: 'string',name: Bkp[0] +' FTP User'});
        createState(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.FtpPw',  {def: '',type: 'string',name: Bkp[0] +' FTP Passwort'});
        createState(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.CifsMount',  {def: 'false',type: 'boolean',name: Bkp[0] +' CIFS Mount'});
        if(Bkp[0] == 'ccu') {
            createState(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.CcuIp',  {def: '',type: 'string',name: Bkp[0] +' CCU IP'});
            createState(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.CcuUser',  {def: '',type: 'string',name: Bkp[0] +' CCU User'});
            createState(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.CcuPw',  {def: '',type: 'string',name: Bkp[0] +' CCU PW'});
        }
        if(Bkp[0] == 'komplett') {
            createState(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.IoStopStart',  {def: 'true',type: 'boolean',name: Bkp[0] +' IoStopStart'});
            createState(instanz + pfad0 + 'Konfiguration.Mysql.DbName',  {def: '',type: 'string',name:' Datenbank Name'});
            createState(instanz + pfad0 + 'Konfiguration.Mysql.DbUser',  {def: '',type: 'string',name:' Datenbank User'});
            createState(instanz + pfad0 + 'Konfiguration.Mysql.DbPw',  {def: '',type: 'string',name:' Datenbank Passwort'});
            createState(instanz + pfad0 + 'Konfiguration.Mysql.BackupLoeschenNach',  {def: '5',type: 'number',name:' Datenbank Loeschen nach'});
        }
        
            if(getState(instanz + pfad0 + 'Einstellungen.' + Bkp[0] +'.BackupState').val === true) {
                var BkpUhrZeit = getState(instanz + pfad0 + 'Einstellungen.' + Bkp[0] + '.BackupZeit').val.split(':');
                if(logging) log('Ein '+Bkp[0]+' Backup wurde um '+getState(instanz + pfad0 + 'Einstellungen.' + Bkp[0] +'.BackupZeit').val+' Uhr jeden '+getState(instanz + pfad0 + 'Einstellungen.' + Bkp[0] +'.BackupTageZyklus').val+' Tag  aktiviert');
                if(BkpZeit_Schedule[Bkp[0]]) clearSchedule(BkpZeit_Schedule[Bkp[0]]);

                BkpZeit_Schedule[Bkp[0]] = schedule('10 '+BkpUhrZeit[1] + ' ' + BkpUhrZeit[0] + ' */'+getState(instanz + pfad0 + 'Einstellungen.' + Bkp[0] +'.BackupTageZyklus').val+' * * ', function (){backup_erstellen(Bkp[0], Bkp[1], Bkp[2], Bkp[3], Bkp[4], Bkp[5], Bkp[6], Bkp[7], Bkp[8], Bkp[9], Bkp[10], Bkp[11], Mysql_DBname, Mysql_User, Mysql_PW, Mysql_LN)});

                if(debugging) log('10 '+BkpUhrZeit[1] + ' ' + BkpUhrZeit[0] + ' */'+getState(instanz + pfad0 + 'Einstellungen.' + Bkp[0] +'.BackupTageZyklus').val+' * * ');
            } 
            else{
                if(logging) log ('Das '+Bkp[0]+' Backup wurde deaktiviert');
                if(BkpZeit_Schedule[Bkp[0]]) clearSchedule(BkpZeit_Schedule[Bkp[0]]);
            }
            // -----------------------------------------------------------------------------
            //  Erstellen der Aufzählungen für die Backupdatenpunkte
            // -----------------------------------------------------------------------------
            if(!getState(instanz + pfad0 + 'Konfiguration.' + 'Konfig_abgeschlossen').val) {
                
                Enum_ids.push(instanz + pfad0 + 'Einstellungen.' + Bkp[0] +'.BackupState');
                Enum_ids.push(instanz + pfad0 + 'Einstellungen.' + Bkp[0] +'.BackupZeit');
                Enum_ids.push(instanz + pfad0 + 'Einstellungen.' + Bkp[0] +'.BackupTageZyklus');
                
                Enum_ids.push(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.NamensZusatz');
                Enum_ids.push(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.BackupLoeschenNach');
                Enum_ids.push(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.FtpHost');
                Enum_ids.push(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.FtpDir');
                Enum_ids.push(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.FtpUser');
                Enum_ids.push(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.FtpPw');
                Enum_ids.push(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.CifsMount');
                
                if(Bkp[0] == 'ccu') {
                    Enum_ids.push(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.CcuIp');
                    Enum_ids.push(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.CcuUser');
                    Enum_ids.push(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.CcuPw');
                }
                if(Bkp[0] == 'komplett') {
                    Enum_ids.push(instanz + pfad0 + 'Konfiguration.' + Bkp[0] +'.IoStopStart');
                    Enum_ids.push(instanz + pfad0 + 'Konfiguration.Mysql.DbName');
                    Enum_ids.push(instanz + pfad0 + 'Konfiguration.Mysql.DbUser');
                    Enum_ids.push(instanz + pfad0 + 'Konfiguration.Mysql.DbPasswort');
                    Enum_ids.push(instanz + pfad0 + 'Konfiguration.Mysql.LoeschenNach');
                }
            }  
       
    });
    
    if(!getState(instanz + pfad0 + 'Konfiguration.Konfig_abgeschlossen').val) {
        var Enum_obj = {};
        Enum_obj.type = 'enum';
        Enum_obj.common = {};
        Enum_obj.common.name = 'BackItUp';
        Enum_obj.common.members = Enum_ids;
        setObject('enum.functions.BackItUp', Enum_obj);
    }
setState(instanz + pfad0 + 'Konfiguration.Konfig_abgeschlossen', true);
}

// #############################################################################
// #                                                                           #
// #  Funktion zum Ausführen des Backups mit obigen Einstellungen              #
// #                                                                           #
// #############################################################################


function backup_erstellen(typ, name, zeit, host, pfad, user, passwd, ccuip, ccuusr, ccupw, cifsmnt, bkpiors, mysqldb, mysqlusr, mysqlpw, mysqlln) {
    if(cifsmnt === true){ 
        cifsmnt = 'JA';         // Festlegen ob CIFS-Mount genutzt werden soll 
    }
    else{
        cifsmnt = 'NEIN';       // Festlegen ob CIFS-Mount genutzt werden soll 
    }    
    if(bkpiors === true){ 
        bkpiors = 'JA';         // Festlegen ob IoBroker gestoppt/gestartet wird 
    }
    else{
        bkpiors = 'NEIN';       // Festlegen ob IoBroker gestoppt/gestartet wird 
    }    
    
    if(debugging) log(bash_script+'"'+typ+'|'+name+'|'+zeit+'|'+host+'|'+pfad+'|'+user+'|'+passwd+'|'+ccuip+'|'+ccuusr+'|'+ccupw+'|'+cifsmnt+'|'+bkpiors+'|'+mysqldb+'|'+mysqlusr+'|'+mysqlpw+'|'+mysqlln+'"');

    if(typ == 'komplett' && bkpiors === true){
        setState(instanz + pfad0 + 'IoRestart_komp_Bkp', true);
    }    
    setState(instanz + pfad0 + 'History.letztes_'+typ+'_Backup', formatDate(new Date(), 'DD.MM.YYYY') +' um '+ formatDate(new Date(), 'hh:mm:ss')+' Uhr');
    
    var ftp_bkp_u;
    if(host === '') ftp_bkp_u = 'NEIN'; else ftp_bkp_u = 'JA';
    backup_history_anlegen(formatDate(new Date(), 'DD.MM.YYYY') +' um '+ formatDate(new Date(), 'hh:mm:ss')+' Uhr',typ,ftp_bkp_u);
    

    exec((bash_script+' "'+typ+'|'+name+'|'+zeit+'|'+host+'|'+pfad+'|'+user+'|'+passwd+'|'+ccuip+'|'+ccuusr+'|'+ccupw+'|'+cifsmnt+'|'+bkpiors+'|'+mysqldb+'|'+mysqlusr+'|'+mysqlpw+'|'+mysqlln+'"'), function(err, stdout, stderr) {
        if(logging){
            if(err) log(stderr, 'error');
            else log('exec: ' + stdout);
        }
    });

}

// #############################################################################
// #                                                                           #
// #  Backupdurchführung in History eintragen                                  #
// #                                                                           #
// #############################################################################

function backup_history_anlegen(zeitstempel,typ,ftp_bkp_u) {
     var history_liste = (getState(instanz + pfad0 + 'History.Backup_history').val);
         history_array = history_liste.split('&nbsp;');
     
     
     if(history_array.length >= anzahl_eintraege_history){
        history_array.splice((anzahl_eintraege_history - 1),1);
     }
     history_array.unshift('<span class="bkptyp_'+ typ +'">' + zeitstempel + ' - Typ:' + typ + ' - Ftp-Sicherung:' + ftp_bkp_u + '</span>');
     setState(instanz + pfad0 + 'History.Backup_history', history_array.join('&nbsp;'));
}

// #############################################################################
// #                                                                           #
// #  Abläufe nach Neustart des Backupscripts                                  #
// #                                                                           #
// #############################################################################

function ScriptStart() {
    if(getState(instanz + pfad0 + 'Konfiguration.IoRestart_komp_Bkp').val === true){
        setStateDelayed(instanz + pfad0 + 'Konfiguration.IoRestart_komp_Bkp', false, 5000);
    }
    
    BackupStellen();

}

function WerteAktuallisieren() {
    setState(instanz + "scriptEnabled.Wandtablet.System.BackitUp_V3", false);
    setStateDelayed(instanz + "scriptEnabled.Wandtablet.System.BackitUp_V3", true, 1000);
}
// #############################################################################
// #                                                                           #
// #  Beim ersten Start alle benötigten Datenpunkte / Enum.funcitons erstellen #
// #                                                                           #
// #############################################################################

if(!getObject('enum.functions.BackItUp') || !getObject(instanz + pfad0 + 'Konfiguration.Konfig_abgeschlossen') || getState(instanz + pfad0 + 'Konfiguration.Konfig_abgeschlossen').val === false) {
    BackupStellen();
}    

// #############################################################################
// #                                                                           #
// #  Beobachten der drei One-Click-Backup Datenpunkte                         #
// #  - Bei Aktivierung start des jeweiligen Backups                           #
// #                                                                           #
// #############################################################################
on({id: instanz + pfad0 + 'OneClick.start_minimal_Backup', change: "ne"}, function (dp) {
    if(dp.state.val === true){
        log('OneClick Minimal Backup gestartet');
        backup_erstellen(Backup[0][0], Backup[0][1], Backup[0][2], Backup[0][3], Backup[0][4], Backup[0][5], Backup[0][6], Backup[0][7], Backup[0][8], Backup[0][9], Backup[0][10], Backup[0][11], Mysql_DBname, Mysql_User, Mysql_PW, Mysql_LN);
        if(debugging)log('backup_erstellen('+Backup[0][0]+','+Backup[0][1]+','+Backup[0][2]+','+Backup[0][3]+','+Backup[0][4]+','+Backup[0][5]+','+Backup[0][6]+','+Backup[0][7]+','+Backup[0][8]+','+Backup[0][9]+','+Backup[0][10]+','+Backup[0][11]+','+Mysql_DBname+','+Mysql_User+','+Mysql_PW+','+Mysql_LN+')');
        setStateDelayed(instanz + pfad0 + 'OneClick.start_minimal_Backup', false, 20000);
    }
});
on({id: instanz + pfad0 + 'OneClick.start_komplett_Backup', change: "ne"}, function (dp) {
    if(dp.state.val === true){
        log('OneClick Komplett Backup gestartet');
        backup_erstellen(Backup[1][0], Backup[1][1], Backup[1][2], Backup[1][3], Backup[1][4], Backup[1][5], Backup[1][6], Backup[1][7], Backup[1][8], Backup[1][9], Backup[1][10], Backup[1][11], Mysql_DBname, Mysql_User, Mysql_PW, Mysql_LN);
        if(debugging)log('backup_erstellen('+Backup[1][0]+','+Backup[1][1]+','+Backup[1][2]+','+Backup[1][3]+','+Backup[1][4]+','+Backup[1][5]+','+Backup[1][6]+','+Backup[1][7]+','+Backup[1][8]+','+Backup[1][9]+','+Backup[1][10]+','+Backup[1][11]+','+Mysql_DBname+','+Mysql_User+','+Mysql_PW+','+Mysql_LN+')');
        setStateDelayed(instanz + pfad0 + 'OneClick.start_komplett_Backup', false, 5000);
    }
});   
on({id: instanz + pfad0 + 'OneClick.start_ccu_Backup', change: "ne"}, function (dp) {
    if(dp.state.val === true){
        log('OneClick CCU Backup gestartet');
        backup_erstellen(Backup[2][0], Backup[2][1], Backup[2][2], Backup[2][3], Backup[2][4], Backup[2][5], Backup[2][6], Backup[2][7], Backup[2][8], Backup[2][9], Backup[2][10], Backup[2][11], Mysql_DBname, Mysql_User, Mysql_PW, Mysql_LN);
        if(debugging)log('backup_erstellen('+Backup[2][0]+','+Backup[2][1]+','+Backup[2][2]+','+Backup[2][3]+','+Backup[2][4]+','+Backup[2][5]+','+Backup[2][6]+','+Backup[2][7]+','+Backup[2][8]+','+Backup[2][9]+','+Backup[2][10]+','+Backup[2][11]+','+Mysql_DBname+','+Mysql_User+','+Mysql_PW+','+Mysql_LN+')');
        setStateDelayed(instanz + pfad0 + 'OneClick.start_ccu_Backup', false, 20000);
    }
});
// #############################################################################
// #                                                                           #
// #  Beobachten aller Backupdatenpunkte                                       #
// #                                                                           #
// #############################################################################

$('state(functions=BackItUp)').on(function(obj) {

    WerteAktuallisieren();

});

// #############################################################################
// #                                                                           #
// #  Bei Scriptstart Schedules setzen                                         #
// #                                                                           #
// #############################################################################

ScriptStart();


