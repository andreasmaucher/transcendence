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
    title: "Profil Bearbeiten",
    backToMenu: "← Zurück zum Menü",
    loading: "Laden…",
    notLoggedIn: "Nicht eingeloggt.",
    newPassword: "Neues Passwort",
    confirmPassword: "Passwort bestätigen",
    saveChanges: "Speichern",
    passwordsNoMatch: "Passwörter stimmen nicht überein.",
    passwordTooShort: "Passwort zu kurz.",
    saved: "Gespeichert!",
    updateFailed: "Speichern fehlgeschlagen.",
    changeAvatar: "Avatar Hochladen",
  },

  gameOver: {
  leftWins: "Linker Spieler gewinnt!",
  rightWins: "Rechter Spieler gewinnt!",
  refresh: "Match beendet",
  replay: "Match wiederholen",
},

};
