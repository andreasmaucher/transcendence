export default {
  topbar: {
    login: "Connexion",
    editProfile: "Modifier le profil",
    logout: "Déconnexion",
  },
  menu: {
    title: "PONG",
    playGame: "Jouer",
    tournaments: "Tournois",
    localMatch: "Match Local",
    onlineMatch: "Match en Ligne",
  },
  game: {
    exit: "Quitter la Partie",
  },
  tournaments: {
    title: "Tournois",
    back: "← Retour",
    loading: "Chargement des tournois…",
    none: "Aucun tournoi pour le moment.",
    available: (n: number) => `${n} Tournois Disponibles`,
    create: "+ Créer un Tournoi",
    details: "Détails",
    join: "Rejoindre",
    failed: "Impossible de charger les tournois.",
  },
  auth: {
    welcome: "Bienvenue",
    login: "Connexion",
    register: "Inscription",
    username: "Nom d'utilisateur",
    password: "Mot de passe",

    errUsernameRequired: "Nom d'utilisateur requis",
    errPasswordShort: "Mot de passe trop court",
    errFixForm: "Veuillez corriger les erreurs.",
    errAuthFailed: "Échec de l'authentification.",
    errGeneric: "Erreur",
  },
};
