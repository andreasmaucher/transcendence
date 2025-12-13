export default {
  topbar: {
    login: "Login",
    editProfile: "Profil Bearbeiten",
    logout: "Logout",
  },

  menu: {
    title: "PONG",
    playGame: "Spiel Starten",
    tournaments: "Turniere",
    localMatch: "Lokaler Kampf",
    onlineMatch: "Online-Duell",
  },

  game: {
    exit: "Match Verlassen",
    leave: "Zurück zur Lobby",
  },

  tournaments: {
    title: "Turniere",
    back: "← Zurück",
    loading: "Lade Turniere…",
    none: "Keine Turniere verfügbar.",
    available: (n: number) => `${n} Turniere Bereit`,
    create: "+ Turnier Erstellen",
    details: "Details",
    join: "Beitreten",
    failed: "Fehler beim Laden.",
    semiFinals: "Halbfinale",
    finalMatch: "Finale",
    thirdPlaceFinal: "3. Platz + Finale",
    roundComplete: "Runde abgeschlossen",
    tournamentFinished: "Turnier beendet",
    thirdPlaceDecided: "3. Platz entschieden",
    nameLabel: "Turniername",
    namePlaceholder: "Turniername eingeben (optional)",
    nameError: "Nur alphanumerische Zeichen erlaubt",
    displayNameLabel: "Dein Anzeigename",
    displayNamePlaceholder: "Anzeigename eingeben (optional)",
  },

  auth: {
    welcome: "Willkommen Herausforderer",
    login: "Login",
    register: "Registrieren",
    username: "Benutzername",
    password: "Passwort",

    errUsernameRequired: "Benutzername erforderlich",
    errPasswordShort: "Passwort zu kurz",
    errFixForm: "Bitte Fehler korrigieren.",
    errAuthFailed: "Authentifizierung fehlgeschlagen.",
    errGeneric: "Fehler",
    loginGitHub: "Mit GitHub anmelden",
  },

  profile: {
    title: "Profil",
    backToMenu: "Zurück zum Menü",
    loading: "Profil wird geladen…",
    notLoggedIn: "Du bist nicht eingeloggt.",
    joined: "Beigetreten am: ",
    changePassword: "Passwort ändern",
    newPassword: "Neues Passwort",
    confirmPassword: "Passwort bestätigen",
    savePassword: "Passwort speichern",
    passwordsNoMatch: "Passwörter stimmen nicht überein.",
    passwordTooShort: "Das Passwort muss mindestens 4 Zeichen haben.",
    saved: "Gespeichert!",
    updateFailed: "Aktualisierung fehlgeschlagen.",
    friends: "Freunde",
    noFriends: "Keine Freunde hinzugefügt."
  },

  gameOver: {
  leftWins: "Linker Spieler gewinnt!",
  rightWins: "Rechter Spieler gewinnt!",
  refresh: "Match beendet",
  replay: "Match wiederholen",
},

  online: {
    title: "Online-Spiele",
    loading: "Offene Spiele werden geladen…",
    createGame: "Neues Spiel erstellen",
    none: "Keine offenen Spiele",
    available: "Verfügbare Spiele: ",
    join: "Beitreten",
    game: "Spiel"
  },
  
  userProfile: {
    title: "Benutzerprofil",
    loading: "Profil wird geladen...",
    joined: "Beigetreten am: ",
    addFriend: "Als Freund hinzufügen",
    removeFriend: "Freund entfernen",
    block: "Blockieren",
    unblock: "Entblocken",
    youBlocked: "Du hast blockiert: ",
    youUnblocked: "Du hast entblockt: ",
    friends: "Freunde",
    noFriends: "Keine Freunde.",
    failedLoad: "Profil konnte nicht geladen werden."
  },
};
