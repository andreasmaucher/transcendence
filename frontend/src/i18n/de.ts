export default {
  topbar: {
    login: "Anmelden",
    editProfile: "Profil bearbeiten",
    logout: "Abmelden",
  },
  menu: {
    title: "PONG",
    playGame: "Spiel Starten",
    tournaments: "Turniere",
    localMatch: "Lokales Spiel",
    onlineMatch: "Online Spiel",
  },
  game: {
    exit: "Spiel Beenden",
  },
  tournaments: {
    title: "Turniere",
    back: "← Zurück",
    loading: "Lade Turniere…",
    none: "Noch keine Turniere.",
    available: (n: number) => `${n} Verfügbare Turniere`,
    create: "+ Turnier Erstellen",
    details: "Details",
    join: "Beitreten",
    failed: "Turniere konnten nicht geladen werden.",
  },
  auth: {
    welcome: "Willkommen",
    login: "Anmelden",
    register: "Registrieren",
    username: "Benutzername",
    password: "Passwort",

    errUsernameRequired: "Benutzername erforderlich",
    errPasswordShort: "Passwort zu kurz",
    errFixForm: "Bitte beheben Sie die Fehler.",
    errAuthFailed: "Authentifizierung fehlgeschlagen.",
    errGeneric: "Fehler",
  },
};
