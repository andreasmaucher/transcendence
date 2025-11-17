export default {
  topbar: {
    login: "Connexion",
    editProfile: "Modifier Profil",
    logout: "Déconnexion",
  },

  menu: {
    title: "PONG",
    playGame: "Lancer le Jeu",
    tournaments: "Tournois",
    localMatch: "Match Local",
    onlineMatch: "Match en Ligne",
  },

  game: {
    exit: "Quitter le Match",
  },

  tournaments: {
    title: "Tournois",
    back: "← Retour",
    loading: "Chargement…",
    none: "Aucun tournoi.",
    available: (n: number) => `${n} Tournois Prêts`,
    create: "+ Créer un Tournoi",
    details: "Détails",
    join: "Rejoindre",
    failed: "Erreur de chargement.",
  },

  auth: {
    welcome: "Bienvenue Challenger",
    login: "Connexion",
    register: "Inscription",
    username: "Nom d'utilisateur",
    password: "Mot de passe",

    errUsernameRequired: "Nom requis",
    errPasswordShort: "Mot de passe trop court",
    errFixForm: "Corrigez les erreurs.",
    errAuthFailed: "Échec de connexion.",
    errGeneric: "Erreur",
  },

  profile: {
    title: "Modifier Profil",
    backToMenu: "← Retour Menu",
    loading: "Chargement…",
    notLoggedIn: "Non connecté.",
    newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmer mot de passe",
    saveChanges: "Enregistrer",
    passwordsNoMatch: "Les mots ne correspondent pas.",
    passwordTooShort: "Mot de passe trop court.",
    saved: "Enregistré !",
    updateFailed: "Échec de mise à jour.",
  },
  
    gameOver: {
    leftWins: "Le joueur gauche gagne !",
    rightWins: "Le joueur droit gagne !",
    refresh: "Match terminé",
    replay: "Rejouer le match",
    },

};
